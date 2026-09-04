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

/** Endpoints fetched for the admin workspace, and where each result lands. */
const SOURCES = [
  { key: 'donations', path: '/donations', pick: (d) => d.donations || d.items || [] },
  { key: 'expenses', path: '/expenses', pick: (d) => d.expenses || d.items || [] },
  { key: 'events', path: '/events', pick: (d) => d.events || d.items || [] },
  { key: 'gallery', path: '/gallery', pick: (d) => d.items || [] },
  { key: 'videos', path: '/videos', pick: (d) => d.items || [] },
  { key: 'importantDates', path: '/important-dates', pick: (d) => d.dates || d.items || [] },
  { key: 'committee', path: '/committee', pick: (d) => d.committee || d.members || d.items || [] },
  { key: 'auditLogs', path: '/audit', pick: (d) => d.logs || d.items || [] },
  // /land-chit returns both collections in one response.
  { key: 'landIncome', path: '/land-chit', pick: (d) => d.landIncome || d.land || [] },
  { key: 'chitIncome', path: '/land-chit', pick: (d) => d.chitIncome || d.chit || [] }
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
    // temple actually has. financialYears was declared in the initial state
    // but never filled, so the reports screen could never offer a year to
    // choose. It comes from the database now, and stays empty when the
    // database has none rather than assuming a current year.
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

  /**
   * Financial summary. Values come from /api/reports, which aggregates the
   * database. When nothing has been recorded every figure is zero — that is
   * the correct answer, not a placeholder.
   */
  getFinancialSummary(fy = this.state.activeFY) {
    const s = this.state._summary;
    return {
      fy: fy || this.state.activeFY || '',
      totalIncome: Number(s?.totalIncome || 0),
      totalExpenses: Number(s?.totalExpenses || 0),
      balance: Number(s?.balance || 0),
      totalDonations: Number(s?.totalDonations || 0),
      totalLand: Number(s?.totalLand || 0),
      totalChit: Number(s?.totalChit || 0),
      jatharaCollection: Number(s?.jatharaCollections || 0),
      devoteeCount: new Set(
        (this.state.donations || []).map((d) => d.mobile || d.donor_name).filter(Boolean)
      ).size,
      hasData: Boolean(s) && Number(s.totalIncome || 0) + Number(s.totalExpenses || 0) > 0
    };
  }

  /**
   * Dashboard cards. Captions describe what the number is, and never assert
   * unverifiable claims such as a year-on-year trend or where funds are held.
   */
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
    return this.createThenRefresh('/donations', donation, (d) => d.donation);
  }

  addExpense(expense) {
    return this.createThenRefresh('/expenses', expense, (d) => d.expense);
  }

  addEvent(event) {
    return this.createThenRefresh('/events', event, (d) => d.event);
  }

  deleteEvent(id) {
    return this.removeThenRefresh(`/events/${encodeURIComponent(id)}`);
  }

  addGalleryItem(item) {
    return this.createThenRefresh('/gallery', item, (d) => d.item);
  }

  deleteGalleryItem(id) {
    return this.removeThenRefresh(`/gallery/${encodeURIComponent(id)}`);
  }

  addVideo(item) {
    return this.createThenRefresh('/videos', item, (d) => d.item);
  }

  deleteVideo(id) {
    return this.removeThenRefresh(`/videos/${encodeURIComponent(id)}`);
  }

  addImportantDate(date) {
    return this.createThenRefresh('/important-dates', date, (d) => d.date);
  }

  deleteImportantDate(id) {
    return this.removeThenRefresh(`/important-dates/${encodeURIComponent(id)}`);
  }

  addCommitteeMember(member) {
    return this.createThenRefresh('/committee', member, (d) => d.member);
  }

  addLandIncome(record) {
    return this.createThenRefresh('/land-chit', { ...record, kind: 'land' }, (d) => d.record);
  }

  addChitIncome(record) {
    return this.createThenRefresh('/land-chit', { ...record, kind: 'chit' }, (d) => d.record);
  }

  async updateSettings(settings) {
    const data = await apiClient.put('/settings', settings);
    await this.refresh();
    return data;
  }

  /**
   * Audit entries are written server-side by the API for every privileged
   * action, so the client neither can nor should create them.
   */
  addAuditLog() {
    console.warn('[adminStore] Audit entries are recorded by the server.');
  }

  /** The previous store could reset itself; real records must not be wiped. */
  resetToDefault() {
    console.warn('[adminStore] Temple records cannot be reset from the browser.');
    return this.refresh();
  }

  /** Compatibility shim: the old store persisted to localStorage. */
  saveState() {
    console.warn('[adminStore] State is persisted in PostgreSQL, not the browser.');
  }
}

const adminStore = new AdminStore();
export default adminStore;
