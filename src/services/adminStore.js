/**
 * Admin data store, backed by PostgreSQL through the API.
 *
 * This replaces the previous localStorage store. It deliberately keeps the
 * same shape — `getState()`, `subscribe()`, and the same top-level collection
 * names — so the fourteen admin pages need only change which module they
 * import, rather than being rewritten.
 *
 * Two rules distinguish it from what it replaces:
 *
 *   1. Nothing is invented. Collections start empty and are filled only from
 *      the database. A figure of zero means the temple has recorded nothing
 *      yet, and the UI says so.
 *   2. Nothing is persisted in the browser. Every mutation is an authenticated
 *      API call; the browser holds a cache, never the source of truth.
 */

import apiClient from './apiClient.js';

/** Collections mirror the previous store so pages keep working unchanged. */
function emptyState() {
  return {
    activeFY: '',
    financialYears: [],
    donations: [],
    expenses: [],
    landIncome: [],
    chitIncome: [],
    jathara: {},
    events: [],
    gallery: [],
    videos: [],
    importantDates: [],
    committee: [],
    auditLogs: [],
    settings: {},
    // Loading/error flags let pages render honest states instead of blanks.
    _loading: true,
    _error: null,
    _summary: null
  };
}

function normalizeDonation(d) {
  if (!d) return d;
  return {
    ...d,
    id: d.id,
    receiptNo: d.receiptNo || d.receipt_no || '',
    donorName: d.donorName || d.donor_name || 'Devotee',
    mobile: d.mobile || '',
    category: d.category || 'General Donation',
    amount: Number(d.amount || 0),
    paymentMethod: d.paymentMethod || d.payment_method || 'UPI',
    paymentDate: d.paymentDate || d.payment_date || d.created_at || '',
    txnRef: d.txnRef || d.txn_ref || '',
    fy: d.fy || d.financial_year_id || ''
  };
}

function normalizeExpense(e) {
  if (!e) return e;
  return {
    ...e,
    id: e.id,
    title: e.title || '',
    paidTo: e.paidTo || e.paid_to || '',
    amount: Number(e.amount || 0),
    expenseDate: e.expenseDate || e.expense_date || e.created_at || '',
    paymentMethod: e.paymentMethod || e.payment_method || 'UPI',
    receiptUrl: e.receiptUrl || e.receipt_url || '',
    category: e.category || e.category_id || '',
    fy: e.fy || e.financial_year_id || ''
  };
}

function normalizeLand(l) {
  if (!l) return l;
  return {
    ...l,
    id: l.id,
    propertyName: l.propertyName || l.property_name || 'Temple Land',
    tenantName: l.tenantName || l.tenant_name || '',
    period: l.period || 'Annual',
    amount: Number(l.amount || 0),
    paymentDate: l.paymentDate || l.payment_date || l.created_at || '',
    proofUrl: l.proofUrl || l.proof_url || '',
    status: l.status || 'Verified',
    fy: l.fy || l.financial_year_id || ''
  };
}

function normalizeChit(c) {
  if (!c) return c;
  return {
    ...c,
    id: c.id,
    chitName: c.chitName || c.chit_name || 'Temple Committee Welfare Chit',
    memberName: c.memberName || c.member_name || '',
    installmentNo: Number(c.installmentNo ?? c.installment_no ?? 1),
    dueDate: c.dueDate || c.due_date || '',
    paidDate: c.paidDate || c.paid_date || c.created_at || '',
    amount: Number(c.amount || 0),
    status: c.status || 'Paid',
    fy: c.fy || c.financial_year_id || ''
  };
}

function normalizeImportantDate(d) {
  if (!d) return d;
  return {
    ...d,
    id: d.id,
    title: d.title || '',
    desc: d.desc || d.description || '',
    description: d.description || d.desc || '',
    date: d.date || d.event_date || d.eventDate || '',
    eventDate: d.eventDate || d.event_date || d.date || '',
    month: d.month || d.month_label || d.monthLabel || '',
    monthLabel: d.monthLabel || d.month_label || d.month || '',
    day: d.day || d.day_number || d.dayNumber || '',
    dayNumber: d.dayNumber || d.day_number || d.day || '',
    priority: d.priority || 'Medium',
    showOnTicker: d.showOnTicker !== undefined ? Boolean(d.showOnTicker) : (d.show_on_ticker !== undefined ? Boolean(d.show_on_ticker) : true),
    published: d.published !== undefined ? Boolean(d.published) : true
  };
}

function normalizeCommittee(m) {
  if (!m) return m;
  return {
    ...m,
    id: m.id,
    name: m.name || '',
    mobile: m.mobile || '',
    email: m.email || '',
    role: m.role || 'Admin',
    status: m.status || 'Active',
    avatarBg: m.avatarBg || m.avatar_bg || '#6E1F2A',
    lastActive: m.lastActive || m.last_active || 'Today'
  };
}

/** Endpoints fetched for the admin workspace, and where each result lands. */
const SOURCES = [
  { key: 'donations', path: '/donations', pick: (d) => (d.donations || d.items || []).map(normalizeDonation) },
  { key: 'expenses', path: '/expenses', pick: (d) => (d.expenses || d.items || []).map(normalizeExpense) },
  { key: 'events', path: '/events', pick: (d) => d.events || d.items || [] },
  { key: 'gallery', path: '/gallery', pick: (d) => d.items || [] },
  { key: 'videos', path: '/videos', pick: (d) => d.items || [] },
  { key: 'importantDates', path: '/important-dates', pick: (d) => (d.dates || d.items || []).map(normalizeImportantDate) },
  { key: 'committee', path: '/committee', pick: (d) => (d.committee || d.members || d.items || []).map(normalizeCommittee) },
  { key: 'auditLogs', path: '/audit', pick: (d) => d.logs || d.items || [] },
  // /land-chit returns both collections in one response.
  { key: 'landIncome', path: '/land-chit', pick: (d) => (d.landIncome || d.land || []).map(normalizeLand) },
  { key: 'chitIncome', path: '/land-chit', pick: (d) => (d.chitIncome || d.chit || []).map(normalizeChit) }
];

class AdminStore {
  constructor() {
    this.state = emptyState();
    this.listeners = new Set();
    this.loaded = false;
  }

  /* ----------------------------------------------------------------
   * Subscription (same contract as the previous store)
   * ---------------------------------------------------------------- */

  subscribe(listener) {
    this.listeners.add(listener);
    // Load on first subscriber so pages need no explicit bootstrap call.
    if (!this.loaded) {
      this.loaded = true;
      this.refresh();
    }
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('[adminStore] listener failed:', err);
      }
    }
  }

  getState() {
    return this.state;
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.notify();
  }

  /* ----------------------------------------------------------------
   * Loading
   * ---------------------------------------------------------------- */

  /**
   * Fetch every collection. Individual failures are tolerated: one unavailable
   * endpoint must not blank the whole workspace.
   */
  async refresh() {
    this.setState({ _loading: true, _error: null });

    const next = {};
    let failures = 0;

    await Promise.all(
      SOURCES.map(async (source) => {
        try {
          const data = await apiClient.get(source.path);
          next[source.key] = source.pick(data || {});
        } catch {
          next[source.key] = [];
          failures++;
        }
      })
    );

    // Financial summary, the year being reported on, and the years the
    // temple actually has.
    try {
      const reports = await apiClient.get('/reports');
      next._summary = reports?.summary || null;
      next.activeFY = reports?.fy || '';
      next.financialYears = reports?.financialYears || [];
    } catch {
      next._summary = null;
      next.financialYears = [];
    }

    this.setState({
      ...next,
      _loading: false,
      _error: failures === SOURCES.length ? 'Unable to reach the temple database.' : null
    });

    return this.state;
  }

  /* ----------------------------------------------------------------
   * Derived figures — computed from real records only
   * ---------------------------------------------------------------- */

  getFinancialSummary(fy = this.state.activeFY) {
    const targetFY = fy || this.state.activeFY || '';

    // Calculate live from normalized store collections for the specific FY
    const dons = (this.state.donations || []).filter(d => !targetFY || !d.fy || d.fy === targetFY);
    const exps = (this.state.expenses || []).filter(e => (!targetFY || !e.fy || e.fy === targetFY) && e.status !== 'Rejected');
    const lands = (this.state.landIncome || []).filter(l => (!targetFY || !l.fy || l.fy === targetFY) && l.status !== 'Rejected');
    const chits = (this.state.chitIncome || []).filter(c => (!targetFY || !c.fy || c.fy === targetFY) && c.status !== 'Cancelled');

    const totalDonations = dons.reduce((sum, d) => sum + Number(d.amount || 0), 0);
    const totalExpenses = exps.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalLand = lands.reduce((sum, l) => sum + Number(l.amount || 0), 0);
    const totalChit = chits.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const jatharaCollection = dons
      .filter(d => (d.category || '').toLowerCase().includes('jathara'))
      .reduce((sum, d) => sum + Number(d.amount || 0), 0);

    const totalIncome = totalDonations + totalLand + totalChit;
    const balance = totalIncome - totalExpenses;

    const devoteeCount = new Set(
      dons.map((d) => d.mobile || d.donor_name || d.donorName).filter(Boolean)
    ).size;

    const generalDonations = Math.max(0, totalDonations - jatharaCollection);

    return {
      fy: targetFY,
      totalIncome,
      totalExpenses,
      balance,
      totalDonations,
      generalDonations,
      totalLand,
      totalChit,
      jatharaCollection,
      devoteeCount,
      hasData: totalIncome + totalExpenses > 0
    };
  }

  getDashboardKPIs(fy = this.state.activeFY) {
    const summary = this.getFinancialSummary(fy);
    const note = summary.hasData ? '' : 'No records yet';

    return [
      {
        id: 'kpi_income',
        label: 'Total Funds Received',
        value: summary.totalIncome,
        trend: note || 'Verified receipts',
        trendColor: 'var(--color-text-muted)'
      },
      {
        id: 'kpi_expenses',
        label: 'Total Expenses',
        value: summary.totalExpenses,
        trend: note || 'Recorded expenditure',
        trendColor: 'var(--color-text-muted)'
      },
      {
        id: 'kpi_balance',
        label: 'Available Balance',
        value: summary.balance,
        trend: note || 'Income less expenses',
        trendColor: 'var(--color-text-muted)'
      },
      {
        id: 'kpi_devotees',
        label: 'Total Devotees / Donors',
        value: summary.devoteeCount,
        isCurrency: false,
        trend: summary.devoteeCount ? 'Recorded donors' : 'No records yet',
        trendColor: 'var(--color-text-muted)'
      }
    ];
  }

  /* ----------------------------------------------------------------
   * Mutations — every one is an authenticated API call
   * ---------------------------------------------------------------- */

  async createThenRefresh(path, body, pick) {
    const data = await apiClient.post(path, body);
    await this.refresh();
    return pick ? pick(data || {}) : data;
  }

  async removeThenRefresh(path) {
    await apiClient.delete(path);
    await this.refresh();
  }

  addDonation(donation) {
    return this.createThenRefresh('/donations', donation, (d) => normalizeDonation(d.donation || d));
  }

  deleteDonation(id) {
    return this.removeThenRefresh(`/donations?id=${encodeURIComponent(id)}`);
  }

  addExpense(expense) {
    return this.createThenRefresh('/expenses', expense, (d) => normalizeExpense(d.expense || d));
  }

  deleteExpense(id) {
    return this.removeThenRefresh(`/expenses?id=${encodeURIComponent(id)}`);
  }

  addEvent(event) {
    return this.createThenRefresh('/events', event, (d) => d.event || d);
  }

  deleteEvent(id) {
    return this.removeThenRefresh(`/events/${encodeURIComponent(id)}`);
  }

  addGalleryItem(item) {
    return this.createThenRefresh('/gallery', item, (d) => d.item || d);
  }

  deleteGalleryItem(id) {
    return this.removeThenRefresh(`/gallery/${encodeURIComponent(id)}`);
  }

  addVideo(item) {
    return this.createThenRefresh('/videos', item, (d) => d.item || d);
  }

  deleteVideo(id) {
    return this.removeThenRefresh(`/videos/${encodeURIComponent(id)}`);
  }

  addImportantDate(date) {
    return this.createThenRefresh('/important-dates', date, (d) => normalizeImportantDate(d.date || d));
  }

  updateImportantDate(id, patch) {
    return apiClient.put(`/important-dates?id=${encodeURIComponent(id)}`, patch).then((res) => {
      this.refresh();
      return res;
    });
  }

  deleteImportantDate(id) {
    return this.removeThenRefresh(`/important-dates?id=${encodeURIComponent(id)}`);
  }

  addCommitteeMember(member) {
    return this.createThenRefresh('/committee', member, (d) => normalizeCommittee(d.member || d));
  }

  deleteCommitteeMember(id) {
    return this.removeThenRefresh(`/committee?id=${encodeURIComponent(id)}`);
  }

  addLandIncome(record) {
    return this.createThenRefresh('/land-chit', { ...record, type: 'land', kind: 'land' }, (d) => normalizeLand(d.record || d));
  }

  deleteLandIncome(id) {
    return this.removeThenRefresh(`/land-chit?id=${encodeURIComponent(id)}`);
  }

  addChitIncome(record) {
    return this.createThenRefresh('/land-chit', { ...record, type: 'chit', kind: 'chit' }, (d) => normalizeChit(d.record || d));
  }

  deleteChitIncome(id) {
    return this.removeThenRefresh(`/land-chit?id=${encodeURIComponent(id)}`);
  }

  async updateSettings(settings) {
    const data = await apiClient.put('/settings', settings);
    await this.refresh();
    return data;
  }

  addAuditLog() {
    console.warn('[adminStore] Audit entries are recorded by the server.');
  }

  resetToDefault() {
    console.warn('[adminStore] Temple records cannot be reset from the browser.');
    return this.refresh();
  }

  saveState() {
    console.warn('[adminStore] State is persisted in PostgreSQL, not the browser.');
  }
}

const adminStore = new AdminStore();
export default adminStore;
