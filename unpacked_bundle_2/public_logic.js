class Component extends DCLogic {
  state = { page: 'home', year: 2026, galleryCat: 'All', ...Component.freshDonation() };
  static freshDonation() {
    return { dStep: 1, donPurpose: 'General Temple Donation', donAmt: 501, dCustomOpen: false, dCustomVal: '', donName: '', donMobile: '', donEmail: '', donAddr: '', dNameError: false, dMobileError: false, dAmtError: false, payTab: 'QR Code', dTxnRef: '' };
  }
  fmt(n) { return '₹' + n.toLocaleString('en-IN'); }
  go(p) { return () => { this.setState(p === 'donate' ? { page: p, ...Component.freshDonation() } : { page: p }); window.scrollTo(0, 0); }; }
  dAmount() { const s = this.state; return s.dCustomOpen ? (parseInt(String(s.dCustomVal).replace(/[^0-9]/g, ''), 10) || 0) : s.donAmt; }
  renderVals() {
    const s = this.state, fmt = this.fmt;
    const pages = [['Home','home'],['About','home'],['Events','events'],['Gallery','gallery'],['Videos','videos'],['Transparency','transparency'],['Contact','contact']];
    const navItems = [['Home','home'],['Events','events'],['Gallery','gallery'],['Videos','videos'],['Transparency','transparency'],['Contact','contact']].map(([label,key]) => ({
      label, go: this.go(key),
      style: 'background:none;border:none;cursor:pointer;font-family:Manrope,sans-serif;font-size:13.5px;padding:9px 13px;border-radius:99px;transition:all 0.2s;' + (s.page===key ? 'color:#6E1F2A;font-weight:700;background:#F1E8D8' : 'color:#6B6B6B;font-weight:600')
    }));
    const quickCards = [
      { icon:'🙏', title:'Donate', desc:'Offer your seva with an instant digital receipt.', go: this.go('donate') },
      { icon:'📅', title:'Upcoming Events', desc:'Jathara, festivals and special poojas.', go: this.go('events') },
      { icon:'🖼', title:'Gallery', desc:'Photographs of the temple through the years.', go: this.go('gallery') },
      { icon:'▶', title:'Temple Videos', desc:'Recordings of celebrations and utsavams.', go: this.go('videos') },
    ];
    const step = s.dStep, amt = this.dAmount();
    const stepMeta = {
      1: ['Offer Your Contribution', 'Every contribution supports the temple, its traditions, and the community.'],
      2: ['Choose Your Contribution', 'Select a preset amount or enter your own.'],
      3: ['Your Details', 'Used only for your receipt — never displayed publicly.'],
      4: ['Review Your Donation', 'Please confirm the details before proceeding to payment.'],
      5: ['Complete Your Payment', 'Pay securely via UPI, QR code, or bank transfer.'],
    };
    const dSteps = ['Purpose','Amount','Details','Review','Payment'].map((label, i) => {
      const n = i + 1, done = step > n, cur = step === n;
      return { n: done ? '✓' : String(n), label, hasLine: n < 5,
        dotStyle: 'width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;transition:all 0.3s;' + (done ? 'background:#B89146;color:#FDFBF6' : cur ? 'background:#6E1F2A;color:#F8F5EF;box-shadow:0 0 0 4px rgba(110,31,42,0.15)' : 'background:#F1E8D8;color:#6B6B6B'),
        lblStyle: 'font-size:11px;font-weight:700;letter-spacing:0.6px;' + (cur ? 'color:#6E1F2A' : 'color:#6B6B6B'),
        lineStyle: 'width:34px;height:2px;margin:0 -22px 22px;flex-shrink:0;' + (done ? 'background:#B89146' : 'background:#E5DAC5') };
    });
    const purposeDescs = {
      'General Temple Donation': 'For daily poojas, upkeep and temple services',
      'Annual Jathara Contribution': 'Support the grand annual festival of Amma Vari',
      'Temple Development': 'Construction, renovation and long-term projects',
      'Special Pooja / Seva': 'Sponsor an archana, abhishekam or annadanam',
      'Other Contribution': 'Any other offering to the Devasthanam',
    };
    const dPurposes = Object.keys(purposeDescs).map(label => {
      const sel = s.donPurpose === label;
      return { label, desc: purposeDescs[label], pick: () => this.setState({ donPurpose: label }),
        mark: sel ? '✓' : '', markStyle: 'width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;flex-shrink:0;transition:all 0.2s;' + (sel ? 'background:#B89146;color:#FDFBF6' : 'background:transparent;border:1.5px solid #DDD3BF'),
        style: 'display:flex;align-items:center;gap:18px;padding:20px 24px;border-radius:14px;cursor:pointer;transition:all 0.22s;background:#FDFBF6;' + (sel ? 'border:1.5px solid #B89146;box-shadow:0 8px 24px rgba(184,145,70,0.15)' : 'border:1.5px solid #EAE2D2') };
    });
    const dAmounts = [101, 501, 1001, 2501, 5001].map(a => {
      const sel = !s.dCustomOpen && s.donAmt === a;
      return { label: fmt(a), pick: () => this.setState({ donAmt: a, dCustomOpen: false, dAmtError: false }),
        style: 'padding:18px 10px;border-radius:14px;cursor:pointer;font-family:Manrope,sans-serif;font-size:17px;font-weight:700;transition:all 0.22s;' + (sel ? 'background:#6E1F2A;color:#F8F5EF;border:1.5px solid #B89146;box-shadow:0 8px 24px rgba(110,31,42,0.22)' : 'background:#FDFBF6;color:#252525;border:1.5px solid #DDD3BF') };
    });
    dAmounts.push({ label: 'Custom Amount', pick: () => this.setState({ dCustomOpen: true, dAmtError: false }),
      style: 'padding:18px 10px;border-radius:14px;cursor:pointer;font-family:Manrope,sans-serif;font-size:15px;font-weight:700;transition:all 0.22s;' + (s.dCustomOpen ? 'background:#6E1F2A;color:#F8F5EF;border:1.5px solid #B89146;box-shadow:0 8px 24px rgba(110,31,42,0.22)' : 'background:#FDFBF6;color:#252525;border:1.5px solid #DDD3BF') });
    const dPayTabs = ['QR Code','UPI ID','Bank Transfer'].map(t => ({ label: t, pick: () => this.setState({ payTab: t }),
      style: 'flex:1;border:none;padding:11px 8px;border-radius:9px;cursor:pointer;font-family:Manrope,sans-serif;font-size:13px;font-weight:700;transition:all 0.2s;' + (s.payTab===t ? 'background:#FDFBF6;color:#6E1F2A' : 'background:transparent;color:rgba(253,251,246,0.7)') }));
    const inputBase = 'width:100%;box-sizing:border-box;padding:15px 16px;border-radius:12px;font-family:Manrope,sans-serif;font-size:15px;background:#F8F5EF;outline-color:#B89146;';
    const mobileOk = /^[0-9]{10}$/.test(s.donMobile.replace(/\s/g, ''));
    const dNext = () => {
      if (step === 2 && !(amt > 0)) { this.setState({ dAmtError: true }); return; }
      if (step === 3) {
        const nameBad = !s.donName.trim(), mobBad = !mobileOk;
        this.setState({ dNameError: nameBad, dMobileError: mobBad });
        if (nameBad || mobBad) return;
      }
      const patch = { dStep: step + 1 };
      if (step === 4) patch.dTxnRef = 'TXN-' + Math.random().toString(36).slice(2, 10).toUpperCase();
      this.setState(patch); window.scrollTo(0, 0);
    };
    const waMsg = '🙏 శ్రీ భవానీ అమ్మవారి ఆశీస్సులతో\n\nThank you for your contribution to Sri Bhavani Amma Vari Devasthanam.\n\nDonation Amount: ' + fmt(amt) + '\nReceipt No: BAV-2026-000184\n\nYour contribution has been successfully recorded.\n\nMay Amma Vari bless you and your family. 🙏';
    const fy = {
      2024: { jathara: 118000, donations: 44200, land: 32000, other: 6800, expenses: 74500 },
      2025: { jathara: 132500, donations: 51800, land: 36500, other: 8200, expenses: 79800 },
      2026: { jathara: 145000, donations: 62500, land: 41000, other: 0, expenses: 82300 },
    };
    const d = fy[s.year];
    const yIncome = d.jathara + d.donations + d.land + d.other;
    const maxInc = d.jathara;
    const incomeRows = [['Annual Jathara Collection', d.jathara, '#6E1F2A'], ['Other Donations', d.donations, '#D9772B'], ['Land / Chit Income', d.land, '#B89146'], ['Other Income', d.other, '#2E7D5B']].map(([label, amt, col]) => ({
      label, amtFmt: fmt(amt), barStyle: `height:100%;width:${Math.round(amt/maxInc*100)}%;background:${col};border-radius:99px;transition:width 0.6s ease`
    }));
    const yearBtns = [2024, 2025, 2026].map(y => ({
      label: 'FY ' + y, pick: () => this.setState({ year: y }),
      style: 'padding:10px 24px;border-radius:99px;cursor:pointer;font-family:Manrope,sans-serif;font-size:13.5px;font-weight:700;transition:all 0.2s;' + (s.year===y ? 'background:#6E1F2A;color:#F8F5EF;border:1.5px solid #6E1F2A' : 'background:transparent;color:#6B6B6B;border:1.5px solid #DDD3BF')
    }));
    const seed = s.year % 3;
    const mLabels = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const incP = [8,6,5,11,9,7,6,8,7,5,22,6], expP = [4,3,3,5,4,3,3,4,3,3,9,3];
    const months = mLabels.map((label, i) => {
      const inc = Math.round(yIncome * incP[(i+seed)%12] / 100), exp = Math.round(d.expenses * expP[(i+seed)%12] / 45);
      return { label, incFmt: fmt(inc), expFmt: fmt(exp),
        incStyle: `width:9px;background:#2E7D5B;border-radius:3px 3px 0 0;height:${Math.max(4, Math.round(inc/(yIncome*0.22)*100))}%`,
        expStyle: `width:9px;background:#B23A48;border-radius:3px 3px 0 0;height:${Math.max(3, Math.round(exp/(yIncome*0.22)*100))}%` };
    });
    const yearSummary = [2026, 2025, 2024].map(y => { const v = fy[y]; const inc = v.jathara + v.donations + v.land + v.other; return { year: 'FY ' + y, inc: fmt(inc), exp: fmt(v.expenses), bal: fmt(inc - v.expenses) }; });
    const events = [
      { imgId:'ev1', imgHint:'Jathara procession photo', month:'FEB', day:'18', name:'Annual Jathara 2026', time:'3 days', place:'Temple grounds', desc:'The grand annual festival of Amma Vari with processions, annadanam and cultural programs.' },
      { imgId:'ev2', imgHint:'Special pooja photo', month:'SEP', day:'12', name:'Sravana Masam Special Pooja', time:'6:00 AM', place:'Main sanctum', desc:'Special abhishekam and kumkuma archana every Friday of the holy month.' },
      { imgId:'ev3', imgHint:'Anniversary utsavam photo', month:'NOV', day:'05', name:'Temple Anniversary Utsavam', time:'All day', place:'Temple premises', desc:'Celebrating the consecration anniversary with homam and annadanam for all devotees.' },
      { imgId:'ev4', imgHint:'Bonalu celebration photo', month:'JUL', day:'20', name:'Bonalu Celebrations', time:'5:00 PM', place:'Village procession', desc:'Traditional Bonalu offerings to Amma Vari with folk performances.' },
      { imgId:'ev5', imgHint:'Navaratri photo', month:'OCT', day:'11', name:'Devi Navaratri', time:'9 days', place:'Main sanctum', desc:'Nine nights of alankaram, lalitha sahasranama parayanam and evening harathi.' },
      { imgId:'ev6', imgHint:'Annadanam photo', month:'DEC', day:'14', name:'Karthika Masam Annadanam', time:'12:00 PM', place:'Community hall', desc:'Free meals served to over 500 devotees, sponsored by community donations.' },
    ];
    const galleryCats = ['All','Temple','Amma Vari','Jathara','Special Events','Old Memories'].map(c => ({
      label: c, pick: () => this.setState({ galleryCat: c }),
      style: 'padding:9px 18px;border-radius:99px;cursor:pointer;font-family:Manrope,sans-serif;font-size:13px;font-weight:600;transition:all 0.2s;' + (s.galleryCat===c ? 'background:#6E1F2A;color:#F8F5EF;border:1.5px solid #6E1F2A' : 'background:#FDFBF6;color:#6B6B6B;border:1.5px solid #DDD3BF')
    }));
    const gAll = [
      ['g1','Temple',300,'Temple gopuram'],['g2','Amma Vari',380,'Amma Vari alankaram'],['g3','Jathara',260,'Jathara crowd'],
      ['g4','Special Events',320,'Bonalu offerings'],['g5','Old Memories',280,'Temple in the 1980s'],['g6','Jathara',340,'Night procession'],
      ['g7','Temple',260,'Sanctum entrance'],['g8','Amma Vari',300,'Festival decoration'],['g9','Old Memories',360,'Founding committee'],
    ];
    const galleryItems = gAll.filter(g => s.galleryCat==='All' || g[1]===s.galleryCat).map(([id, cat, h, hint]) => ({ id, cat, hint: hint + ' photo', boxStyle: `height:${h}px` }));
    const videos = [
      { imgId:'v1', hint:'2024 Jathara video thumbnail', title:'2024 Jathara Highlights', meta:'YouTube · 24 min' },
      { imgId:'v2', hint:'2025 festival video thumbnail', title:'2025 Annual Festival', meta:'YouTube · 41 min' },
      { imgId:'v3', hint:'Celebrations video thumbnail', title:'Temple Celebrations & Utsavams', meta:'YouTube · playlist' },
    ];
    return {
      isHome: s.page==='home', isDonate: s.page==='donate', isTransparency: s.page==='transparency',
      isEvents: s.page==='events', isGallery: s.page==='gallery', isVideos: s.page==='videos', isContact: s.page==='contact',
      goHome: this.go('home'), goDonate: this.go('donate'), goEvents: this.go('events'), goGallery: this.go('gallery'), goTransparency: this.go('transparency'),
      navItems, quickCards, yearBtns, incomeRows, months, yearSummary, events, galleryCats, galleryItems, videos,
      dInFlow: step <= 5, dStep1: step===1, dStep2: step===2, dStep3: step===3, dStep4: step===4, dStep5: step===5, dStep6: step===6, dStep7: step===7,
      dStepHeading: (stepMeta[step] || ['',''])[0], dStepSub: (stepMeta[step] || ['',''])[1],
      dSteps, dPurposes, dAmounts, dPayTabs,
      dCustomOpen: s.dCustomOpen, dCustomVal: s.dCustomVal,
      dSetCustom: e => this.setState({ dCustomVal: e.target.value, dAmtError: false }),
      dAmtError: s.dAmtError, dAmtErrorMsg: 'Please enter a valid amount greater than zero.',
      dNameError: s.dNameError, dMobileError: s.dMobileError,
      dNameInputStyle: inputBase + (s.dNameError ? 'border:1.5px solid #B23A48' : 'border:1px solid #DDD3BF'),
      dMobileInputStyle: inputBase + (s.dMobileError ? 'border:1.5px solid #B23A48' : 'border:1px solid #DDD3BF'),
      donAmountFmt: fmt(amt || 0), donCat: s.donPurpose, donName: s.donName, donMobile: s.donMobile, donEmail: s.donEmail, donAddr: s.donAddr,
      donNameShown: s.donName.trim() || 'Devotee',
      dPurposeUpper: s.donPurpose.toUpperCase(),
      dMobileMasked: mobileOk ? s.donMobile.replace(/\s/g,'').replace(/^(\d{2})\d{5}(\d{3})$/, '$1XXXXX$2') : 'XXXXXXXXXX',
      setDonName: e => this.setState({ donName: e.target.value, dNameError: false }),
      setDonMobile: e => this.setState({ donMobile: e.target.value, dMobileError: false }),
      setDonEmail: e => this.setState({ donEmail: e.target.value }),
      setDonAddr: e => this.setState({ donAddr: e.target.value }),
      dShowNav: step >= 1 && step <= 5, dShowNext: step <= 4,
      dNext, dNextLabel: { 1:'Continue', 2:'Continue', 3:'Review Donation', 4:'Proceed to Payment' }[step] || '',
      dBack: () => { if (step === 1) { this.setState({ page: 'home' }); } else { this.setState({ dStep: step - 1 }); } window.scrollTo(0, 0); },
      dBackStyle: 'background:transparent;color:#6B6B6B;border:1px solid #DDD3BF;padding:14px 26px;border-radius:999px;font-family:Manrope,sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s',
      dPayQR: s.payTab==='QR Code', dPayUPI: s.payTab==='UPI ID', dPayBank: s.payTab==='Bank Transfer',
      dConfirmPayment: () => { this.setState({ dStep: 6 }); window.scrollTo(0, 0); },
      dViewReceipt: () => { this.setState({ dStep: 7 }); window.scrollTo(0, 0); },
      dReceiptNo: 'BAV-2026-000184', dTxnRef: s.dTxnRef || 'TXN-XXXXXXXX',
      dWhatsApp: () => window.open('https://wa.me/?text=' + encodeURIComponent(waMsg), '_blank'),
      dPrint: () => window.print(),
      yearLabel: String(s.year), yIncomeFmt: fmt(yIncome), yExpenseFmt: fmt(d.expenses), yBalanceFmt: fmt(yIncome - d.expenses),
    };
  }
}