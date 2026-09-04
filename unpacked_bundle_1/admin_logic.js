class Component extends DCLogic {
  state = { loggedIn: true, view: 'dashboard', donModal: false, donSaved: false, expForm: false, jYear: 2026, adName: '', adAmt: '' };
  componentDidMount() {
    const sv = this.props.startView;
    if (sv === 'login') this.setState({ loggedIn: false });
    else if (sv) this.setState({ loggedIn: true, view: sv });
  }
  componentDidUpdate(prev) {
    if (prev.startView !== this.props.startView) {
      const sv = this.props.startView;
      if (sv === 'login') this.setState({ loggedIn: false });
      else if (sv) this.setState({ loggedIn: true, view: sv });
    }
  }
  fmt(n) { return '₹' + n.toLocaleString('en-IN'); }
  go(v) { return () => { this.setState({ view: v }); window.scrollTo(0, 0); }; }
  renderVals() {
    const s = this.state, fmt = this.fmt;
    const chip = (bg, col) => `background:${bg};color:${col};font-size:11px;font-weight:700;padding:4px 10px;border-radius:99px;display:inline-block`;
    const crumbs = { dashboard:'Dashboard', donations:'Donations', expenses:'Expenses', land:'Land / Chit Income', jathara:'Jathara', reports:'Reports', committee:'Committee Members', dates:'Important Dates', events:'Events', gallery:'Gallery', videos:'Videos', settings:'Settings', income:'Income' };
    const items = [
      { h:'OVERVIEW' }, ['Dashboard','dashboard','▦'],
      { h:'FINANCIAL MANAGEMENT' }, ['Donations','donations','🙏'], ['Income','income','₹'], ['Expenses','expenses','▤'], ['Land / Chit Income','land','◱'], ['Jathara','jathara','✦'], ['Reports','reports','▣'],
      { h:'TEMPLE CONTENT' }, ['Events','events','📅'], ['Gallery','gallery','🖼'], ['Videos','videos','▶'], ['Important Dates','dates','◔'],
      { h:'ADMINISTRATION' }, ['Committee Members','committee','☰'], ['Settings','settings','⚙'],
    ];
    const sideItems = items.map(it => it.h ? { isHeader: true, isLink: false, label: it.h } : {
      isHeader: false, isLink: true, label: it[0], icon: it[2], go: this.go(it[1]),
      style: 'display:flex;align-items:center;text-align:left;width:100%;border:none;cursor:pointer;font-family:Manrope,sans-serif;font-size:13px;padding:10px 12px;border-radius:9px;transition:all 0.18s;box-sizing:border-box;' + (s.view===it[1] ? 'background:rgba(184,145,70,0.16);color:#FDFBF6;font-weight:700;box-shadow:inset 2.5px 0 0 #B89146' : 'background:none;color:rgba(253,251,246,0.72);font-weight:500')
    });
    const kpis = [
      { label:'TOTAL INCOME', icon:'₹', value: fmt(248500), color:'#2E7D5B', trend:'▲ 12.4%', trendColor:'#2E7D5B', compare:'vs last year' },
      { label:'TOTAL EXPENSES', icon:'▤', value: fmt(82300), color:'#B23A48', trend:'▲ 3.1%', trendColor:'#B23A48', compare:'vs last year' },
      { label:'AVAILABLE BALANCE', icon:'◈', value: fmt(166200), color:'#6E1F2A', trend:'▲ 17.6%', trendColor:'#2E7D5B', compare:'vs last year' },
      { label:'THIS MONTH COLLECTION', icon:'◔', value: fmt(32500), color:'#252525', trend:'▲ 8.2%', trendColor:'#2E7D5B', compare:'vs August' },
    ];
    const mLabels = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const incV = [18500,15200,13800,26400,21900,32500,16800,19200,17400,13600,54800,15400];
    const expV = [6200,5400,4900,9800,7300,11450,5600,7100,5800,5200,18900,6100];
    const months = mLabels.map((label, i) => ({ label, incFmt: fmt(incV[i]), expFmt: fmt(expV[i]),
      incStyle: `width:10px;background:#2E7D5B;border-radius:3px 3px 0 0;height:${Math.round(incV[i]/54800*100)}%`,
      expStyle: `width:10px;background:#B23A48;border-radius:3px 3px 0 0;height:${Math.round(expV[i]/54800*100)}%` }));
    const bdData = [['Donations',62500,'#D9772B'],['Jathara',145000,'#6E1F2A'],['Land Income',41000,'#B89146'],['Other Income',0,'#2E7D5B']];
    const breakdown = bdData.map(([label, v, col]) => ({ label, amt: fmt(v), barStyle: `height:100%;width:${Math.round(v/145000*100)}%;background:${col};border-radius:99px` }));
    const tIn = chip('rgba(46,125,91,0.12)','#2E7D5B'), tOut = chip('rgba(178,58,72,0.12)','#B23A48');
    const verified = chip('rgba(46,125,91,0.12)','#2E7D5B'), pending = chip('rgba(217,119,43,0.14)','#D9772B');
    const transactions = [
      { date:'01 Sep 26', type:'Income', typeStyle:tIn, desc:'Donation — Kumkuma Archana seva', cat:'General Donation', amt:'+₹1,001', amtColor:'#2E7D5B', by:'Ramesh G.', status:'Verified', statusStyle:verified },
      { date:'31 Aug 26', type:'Expense', typeStyle:tOut, desc:'Pooja materials — flowers & camphor', cat:'Pooja Materials', amt:'−₹2,340', amtColor:'#B23A48', by:'Venkat R.', status:'Verified', statusStyle:verified },
      { date:'30 Aug 26', type:'Income', typeStyle:tIn, desc:'Chit income — September instalment', cat:'Chit Income', amt:'+₹5,500', amtColor:'#2E7D5B', by:'Lakshmi D.', status:'Verified', statusStyle:verified },
      { date:'29 Aug 26', type:'Expense', typeStyle:tOut, desc:'Electricity bill — August', cat:'Utilities', amt:'−₹1,860', amtColor:'#B23A48', by:'Venkat R.', status:'Pending', statusStyle:pending },
      { date:'28 Aug 26', type:'Income', typeStyle:tIn, desc:'Donation — Temple development', cat:'Development', amt:'+₹5,001', amtColor:'#2E7D5B', by:'Ramesh G.', status:'Verified', statusStyle:verified },
      { date:'27 Aug 26', type:'Expense', typeStyle:tOut, desc:'Annadanam groceries', cat:'Annadanam', amt:'−₹4,750', amtColor:'#B23A48', by:'Sujatha K.', status:'Verified', statusStyle:verified },
    ];
    const donations = [
      { no:'BAT-2026-0847', date:'01 Sep 26', name:'K. Anasuya', mobile:'98481 22334', cat:'General', amt:fmt(1001), method:'UPI', by:'Ramesh G.' },
      { no:'BAT-2026-0846', date:'01 Sep 26', name:'M. Srinivas Rao', mobile:'90001 45678', cat:'Jathara', amt:fmt(501), method:'Cash', by:'Ramesh G.' },
      { no:'BAT-2026-0845', date:'01 Sep 26', name:'P. Yadagiri', mobile:'96520 78901', cat:'General', amt:fmt(101), method:'UPI', by:'Lakshmi D.' },
      { no:'BAT-2026-0844', date:'31 Aug 26', name:'G. Padma', mobile:'98850 11223', cat:'Development', amt:fmt(5001), method:'Bank Transfer', by:'Venkat R.' },
      { no:'BAT-2026-0843', date:'31 Aug 26', name:'B. Narsimha', mobile:'91334 55667', cat:'Jathara', amt:fmt(1001), method:'UPI', by:'Ramesh G.' },
      { no:'BAT-2026-0842', date:'30 Aug 26', name:'T. Swapna', mobile:'99590 33445', cat:'General', amt:fmt(501), method:'Cash', by:'Lakshmi D.' },
      { no:'BAT-2026-0841', date:'30 Aug 26', name:'D. Ravinder', mobile:'93901 66778', cat:'Special Event', amt:fmt(2116), method:'UPI', by:'Venkat R.' },
    ];
    const rOk = chip('rgba(46,125,91,0.12)','#2E7D5B'), rMiss = chip('rgba(217,119,43,0.14)','#D9772B');
    const expenses = [
      { date:'31 Aug 26', title:'Pooja materials — flowers & camphor', cat:'Pooja Materials', paidTo:'Sri Lakshmi Flower Depot', amt:fmt(2340), rcpt:'📄 View', rcptStyle:'cursor:pointer;font-size:12px;color:#6E1F2A;font-weight:600', by:'Venkat R.' },
      { date:'29 Aug 26', title:'Electricity bill — August', cat:'Utilities', paidTo:'TSSPDCL', amt:fmt(1860), rcpt:'Missing', rcptStyle:rMiss, by:'Venkat R.' },
      { date:'27 Aug 26', title:'Annadanam groceries', cat:'Annadanam', paidTo:'Venkateshwara Traders', amt:fmt(4750), rcpt:'📄 View', rcptStyle:'cursor:pointer;font-size:12px;color:#6E1F2A;font-weight:600', by:'Sujatha K.' },
      { date:'22 Aug 26', title:'Sanctum painting work', cat:'Maintenance', paidTo:'A. Mallesh (painter)', amt:fmt(8500), rcpt:'📄 View', rcptStyle:'cursor:pointer;font-size:12px;color:#6E1F2A;font-weight:600', by:'Ramesh G.' },
      { date:'18 Aug 26', title:'Water tanker — festival week', cat:'Utilities', paidTo:'Bhargav Water Supply', amt:fmt(1200), rcpt:'Missing', rcptStyle:rMiss, by:'Sujatha K.' },
      { date:'12 Aug 26', title:'Speaker system repair', cat:'Maintenance', paidTo:'Sai Electronics', amt:fmt(950), rcpt:'📄 View', rcptStyle:'cursor:pointer;font-size:12px;color:#6E1F2A;font-weight:600', by:'Venkat R.' },
    ];
    const landChip = chip('rgba(184,145,70,0.16)','#8a6c30'), chitChip = chip('rgba(110,31,42,0.1)','#6E1F2A');
    const landRows = [
      { src:'Land Lease', srcStyle:landChip, name:'Temple agricultural land — 2.4 acres (Survey 214)', month:'Annual', amt:fmt(30000), date:'12 Jun 2026' },
      { src:'Chit', srcStyle:chitChip, name:'Committee chit fund — monthly instalment', month:'Sep 2026', amt:fmt(5500), date:'30 Aug 2026' },
      { src:'Chit', srcStyle:chitChip, name:'Committee chit fund — monthly instalment', month:'Aug 2026', amt:fmt(5500), date:'28 Jul 2026' },
      { src:'Chit', srcStyle:chitChip, name:'Committee chit fund — monthly instalment', month:'Jul 2026', amt:fmt(0), date:'—' },
    ];
    const jd = { 2026:{coll:145000,exp:58200,n:412}, 2025:{coll:132500,exp:54800,n:389}, 2024:{coll:118000,exp:49500,n:341} }[s.jYear];
    const jYearBtns = [2024,2025,2026].map(y => ({ label:String(y), pick:()=>this.setState({jYear:y}),
      style:'padding:9px 20px;border-radius:99px;cursor:pointer;font-family:Manrope,sans-serif;font-size:13px;font-weight:700;transition:all 0.2s;'+(s.jYear===y?'background:#6E1F2A;color:#F8F5EF;border:1.5px solid #6E1F2A':'background:#FDFBF6;color:#6B6B6B;border:1.5px solid #DDD3BF') }));
    const jTimeline = [
      { title:'Village-wise collection drive completed', date:'10 Feb ' + s.jYear, amt:'+'+fmt(Math.round(jd.coll*0.52)), color:'#2E7D5B', dot:'#2E7D5B' },
      { title:'Devotee donations during Jathara days', date:'18–20 Feb ' + s.jYear, amt:'+'+fmt(Math.round(jd.coll*0.34)), color:'#2E7D5B', dot:'#2E7D5B' },
      { title:'Hundi count — post festival', date:'21 Feb ' + s.jYear, amt:'+'+fmt(Math.round(jd.coll*0.14)), color:'#2E7D5B', dot:'#2E7D5B' },
      { title:'Annadanam & prasadam expenses settled', date:'22 Feb ' + s.jYear, amt:'−'+fmt(Math.round(jd.exp*0.46)), color:'#B23A48', dot:'#B23A48' },
      { title:'Decoration, lighting & sound settled', date:'24 Feb ' + s.jYear, amt:'−'+fmt(Math.round(jd.exp*0.33)), color:'#B23A48', dot:'#B23A48' },
      { title:'Final summary published to transparency page', date:'28 Feb ' + s.jYear, amt:'Balance '+fmt(jd.coll-jd.exp), color:'#6E1F2A', dot:'#B89146' },
    ];
    const jcData = [['Annadanam & Prasadam',0.46],['Decoration & Lighting',0.23],['Sound & Stage',0.10],['Procession & Utsavam',0.13],['Miscellaneous',0.08]];
    const jExpCats = jcData.map(([label,p]) => ({ label, amt: fmt(Math.round(jd.exp*p)), barStyle:`height:100%;width:${Math.round(p*100/0.46*100)/100}%;background:#B23A48;border-radius:99px;max-width:100%` }));
    const rRow = 'display:flex;justify-content:space-between;padding:13px 0;border-bottom:1px solid #F4F1EA;font-size:14px';
    const rTotal = 'display:flex;justify-content:space-between;padding:15px 0;border-bottom:2px solid #6E1F2A;font-size:15px';
    const reportRows = [
      { label:'Opening Balance (1 Apr 2026)', val:fmt(139800), rowStyle:rRow, labelStyle:'color:#6B6B6B', valStyle:'font-weight:700;font-variant-numeric:tabular-nums' },
      { label:'Total Donations', val:fmt(62500), rowStyle:rRow, labelStyle:'color:#6B6B6B', valStyle:'font-weight:700;font-variant-numeric:tabular-nums' },
      { label:'Jathara Collection', val:fmt(145000), rowStyle:rRow, labelStyle:'color:#6B6B6B', valStyle:'font-weight:700;font-variant-numeric:tabular-nums' },
      { label:'Land Income', val:fmt(30000), rowStyle:rRow, labelStyle:'color:#6B6B6B', valStyle:'font-weight:700;font-variant-numeric:tabular-nums' },
      { label:'Other Income (Chit)', val:fmt(11000), rowStyle:rRow, labelStyle:'color:#6B6B6B', valStyle:'font-weight:700;font-variant-numeric:tabular-nums' },
      { label:'TOTAL INCOME', val:fmt(248500), rowStyle:rTotal, labelStyle:'font-weight:800;color:#2E7D5B;letter-spacing:0.5px', valStyle:'font-weight:800;color:#2E7D5B;font-variant-numeric:tabular-nums' },
      { label:'TOTAL EXPENSES', val:'−'+fmt(82300), rowStyle:rTotal, labelStyle:'font-weight:800;color:#B23A48;letter-spacing:0.5px', valStyle:'font-weight:800;color:#B23A48;font-variant-numeric:tabular-nums' },
      { label:'CLOSING BALANCE', val:fmt(306000), rowStyle:'display:flex;justify-content:space-between;padding:15px 0;font-size:16px', labelStyle:'font-weight:800;color:#6E1F2A;letter-spacing:0.5px', valStyle:'font-weight:800;color:#6E1F2A;font-variant-numeric:tabular-nums;font-size:20px;font-family:Cormorant Garamond,serif' },
    ];
    const roleSuper = chip('rgba(110,31,42,0.12)','#6E1F2A'), roleAdmin = chip('rgba(184,145,70,0.18)','#8a6c30'), roleFin = chip('rgba(217,119,43,0.14)','#b05e1c'), roleView = chip('rgba(107,107,107,0.12)','#6B6B6B');
    const active = chip('rgba(46,125,91,0.12)','#2E7D5B'), inactive = chip('rgba(107,107,107,0.12)','#6B6B6B');
    const members = [
      { name:'Ramesh Goud', initials:'RG', mobile:'98480 12345', role:'Super Admin', roleStyle:roleSuper, status:'Active', statusStyle:active, last:'Today, 9:12 AM', avatarBg:'#6E1F2A' },
      { name:'Venkat Reddy', initials:'VR', mobile:'90001 23456', role:'Finance Manager', roleStyle:roleFin, status:'Active', statusStyle:active, last:'Today, 8:40 AM', avatarBg:'#B89146' },
      { name:'Lakshmi Devi', initials:'LD', mobile:'96520 34567', role:'Admin', roleStyle:roleAdmin, status:'Active', statusStyle:active, last:'Yesterday', avatarBg:'#D9772B' },
      { name:'Sujatha K.', initials:'SK', mobile:'98850 45678', role:'Admin', roleStyle:roleAdmin, status:'Active', statusStyle:active, last:'2 days ago', avatarBg:'#2E7D5B' },
      { name:'Narsimha B.', initials:'NB', mobile:'91334 56789', role:'Viewer', roleStyle:roleView, status:'Active', statusStyle:active, last:'1 week ago', avatarBg:'#6B6B6B' },
      { name:'Yadagiri P.', initials:'YP', mobile:'93901 67890', role:'Viewer', roleStyle:roleView, status:'Inactive', statusStyle:inactive, last:'3 weeks ago', avatarBg:'#6B6B6B' },
    ];
    const audit = [
      { initials:'RG', who:'Ramesh Goud', what:'recorded a donation of ₹1,001 (Receipt BAT-2026-0847)', when:'Today, 9:12 AM' },
      { initials:'VR', who:'Venkat Reddy', what:'added an expense of ₹2,340 — Pooja materials', when:'Yesterday, 6:05 PM' },
      { initials:'LD', who:'Lakshmi Devi', what:'updated Jathara collection entry for Feb 2026', when:'Yesterday, 11:30 AM' },
      { initials:'RG', who:'Ramesh Goud', what:'generated the FY 2025–26 annual report (PDF)', when:'28 Aug, 4:15 PM' },
      { initials:'SK', who:'Sujatha K.', what:'uploaded receipt for Annadanam groceries expense', when:'27 Aug, 2:48 PM' },
      { initials:'VR', who:'Venkat Reddy', what:'recorded chit income of ₹5,500 — September instalment', when:'30 Aug, 10:02 AM' },
    ];
    const pHigh = chip('rgba(178,58,72,0.12)','#B23A48'), pMed = chip('rgba(217,119,43,0.14)','#D9772B'), pLow = chip('rgba(107,107,107,0.12)','#6B6B6B');
    const dates = [
      { month:'FEB', day:'18', title:'Annual Jathara 2026', desc:'Three-day grand festival · banner published on homepage', prio:'High', prioStyle:pHigh },
      { month:'SEP', day:'12', title:'Sravana Masam Special Pooja', desc:'Friday abhishekam series · shown in announcement ticker', prio:'Medium', prioStyle:pMed },
      { month:'OCT', day:'11', title:'Devi Navaratri', desc:'Nine-day alankaram schedule', prio:'High', prioStyle:pHigh },
      { month:'NOV', day:'05', title:'Temple Anniversary Utsavam', desc:'Consecration anniversary homam & annadanam', prio:'Medium', prioStyle:pMed },
      { month:'DEC', day:'14', title:'Karthika Masam Annadanam', desc:'Community meal for 500+ devotees', prio:'Low', prioStyle:pLow },
    ];
    const contentViews = ['events','gallery','videos','settings','income'];
    return {
      loggedIn: s.loggedIn, loggedOut: !s.loggedIn,
      login: () => this.setState({ loggedIn: true }), logout: () => this.setState({ loggedIn: false }),
      crumb: crumbs[s.view] || 'Dashboard', sideItems, kpis, months, breakdown, transactions, donations, expenses, landRows,
      vDashboard: s.view==='dashboard', vDonations: s.view==='donations', vExpenses: s.view==='expenses', vLand: s.view==='land',
      vJathara: s.view==='jathara', vReports: s.view==='reports', vCommittee: s.view==='committee', vDates: s.view==='dates',
      vContent: contentViews.includes(s.view),
      goExpenses: this.go('expenses'), goLand: this.go('land'),
      expFormOpen: s.expForm, toggleExpForm: () => this.setState({ expForm: !s.expForm }),
      donModalOpen: s.donModal, donSaved: s.donSaved, donNotSaved: !s.donSaved,
      openDonModal: () => this.setState({ donModal: true, donSaved: false }),
      closeDonModal: () => this.setState({ donModal: false }),
      stop: e => e.stopPropagation(),
      saveDonation: () => this.setState({ donSaved: true }),
      addAnother: () => this.setState({ donSaved: false, adName: '', adAmt: '' }),
      adName: s.adName, adAmt: s.adAmt,
      setAdName: e => this.setState({ adName: e.target.value }), setAdAmt: e => this.setState({ adAmt: e.target.value }),
      adNameShown: s.adName || 'Devotee', adAmtFmt: fmt(parseInt(s.adAmt, 10) || 1001),
      jYear: String(s.jYear), jYearBtns, jColl: fmt(jd.coll), jExp: fmt(jd.exp), jBal: fmt(jd.coll - jd.exp), jContrib: String(jd.n),
      jExpBar: `height:100%;width:${Math.round(jd.exp/jd.coll*100)}%;background:#B23A48;border-radius:99px`,
      jTimeline, jExpCats, reportRows, members, audit, dates,
    };
  }
}