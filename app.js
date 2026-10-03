/* Shift Swap demo: vanilla JS + localStorage. ALL DATA IS FAKE SAMPLE DATA. */
(function () {
  'use strict';
  var KEY = 'vetShiftSwapDemo.v2';
  var LOCS = ['Location 1', 'Location 2'];
  var VETS = [
    { id: 'A', name: 'Dr. Sample A', bg: '#dbeafe', fg: '#1e3a8a' },
    { id: 'B', name: 'Dr. Sample B', bg: '#fce7f3', fg: '#831843' },
    { id: 'C', name: 'Dr. Sample C', bg: '#dcfce7', fg: '#14532d' },
    { id: 'D', name: 'Dr. Sample D', bg: '#fef3c7', fg: '#78350f' },
    { id: 'E', name: 'Dr. Sample E', bg: '#ede9fe', fg: '#4c1d95' }
  ];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var BADGE = { requested: 'requested', offered: 'offers in', accepted: 'accepted', approved: 'approved', done: 'complete',
    ptoApproved: 'available', pickedUp: 'picked up', declined: 'declined', denied: 'denied', cancelled: 'cancelled' };

  var S;
  var ui = { view: 'week', anchor: defAnchor(), vetTab: 'board', flash: [] };

  // ---------- dates ----------
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function defAnchor() { var d = today(), w = d.getDay(); return w === 6 ? addDays(d, 2) : w === 0 ? addDays(d, 1) : d; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], p[1] - 1, +p[2]); }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function monday(d) { var x = new Date(d); x.setDate(x.getDate() - (x.getDay() + 6) % 7); return x; }
  function fmtDate(s) { var d = parse(s); return DOW[d.getDay()] + ' ' + MON[d.getMonth()] + ' ' + d.getDate(); }
  function fmtTime(t) { var d = new Date(t), h = d.getHours(); return MON[d.getMonth()] + ' ' + d.getDate() + ', ' + ((h % 12) || 12) + ':' + pad(d.getMinutes()) + (h >= 12 ? ' PM' : ' AM'); }
  function now() { return new Date().toISOString(); }
  function ago(h) { return new Date(Date.now() - h * 3600e3).toISOString(); }

  // ---------- data helpers ----------
  function vet(id) { return VETS.filter(function (v) { return v.id === id; })[0]; }
  function vname(id) { return id ? vet(id).name : 'Any colleague'; }
  function shift(id) { return S.shifts.filter(function (s) { return s.id === id; })[0]; }
  function shiftLabel(s) { return fmtDate(s.date) + ' · ' + s.loc; }
  function uid() { return 'r' + Math.random().toString(36).slice(2, 8); }
  function find(id) { return S.requests.filter(function (r) { return r.id === id; })[0]; }
  function mkReq(o) {
    return { id: uid(), type: o.type, board: !!o.board, from: o.from, to: o.to || null, shiftA: o.shiftA, shiftB: o.shiftB || null,
      note: o.note || '', reason: o.reason || '', canWork: o.canWork || '', status: 'requested', coveredBy: null, pickedBy: null,
      offers: [], declinedBy: [], timeline: [{ status: 'requested', at: o.at || now(), by: o.from }], moves: [] };
  }
  function step(r, status, by, at) { r.status = status; r.timeline.push({ status: status, at: at || now(), by: by }); }

  // ---------- seed ----------
  function seed() {
    var start = addDays(monday(today()), -7), shifts = [], n = 0;
    for (var i = 0; i < 49; i++) {
      var d = addDays(start, i), dow = d.getDay(), ds = iso(d);
      var r = function (k) { return VETS[(i + k) % 5].id; };
      if (dow === 0) continue;                               // closed Sundays
      if (dow === 6) { shifts.push({ id: 's' + n++, date: ds, loc: LOCS[0], vetId: r(3) }); continue; } // Sat: Location 1 only
      shifts.push({ id: 's' + n++, date: ds, loc: LOCS[0], vetId: r(0) });
      shifts.push({ id: 's' + n++, date: ds, loc: LOCS[0], vetId: r(1) });
      shifts.push({ id: 's' + n++, date: ds, loc: LOCS[1], vetId: r(2) });
    }
    S = { shifts: shifts, requests: [], role: 'vet', me: 'A' };
    var t0 = iso(addDays(today(), 2)), used = {};
    function works(v, date, except) { return S.shifts.filter(function (s) { return s.vetId === v && s.date === date && s.id !== except; }).length > 0; }
    function free(v, freeVet, skip) {   // a future shift of v (unused), on a day freeVet is off
      var l = S.shifts.filter(function (s) { return s.vetId === v && s.date >= t0 && !used[s.id] && (!freeVet || !works(freeVet, s.date)); });
      var s0 = l[skip || 0] || l[0]; used[s0.id] = 1; return s0;
    }
    function pair(x, y, wantConflict) {
      var xs = S.shifts.filter(function (s) { return s.vetId === x && s.date >= t0 && !used[s.id]; });
      var ys = S.shifts.filter(function (s) { return s.vetId === y && s.date >= t0 && !used[s.id]; });
      for (var i = 0; i < xs.length; i++) for (var j = 0; j < ys.length; j++) {
        var a = xs[i], b = ys[j]; if (a.date === b.date) continue;
        var c = works(x, b.date, a.id) || works(y, a.date, b.id);
        if (c === !!wantConflict) { used[a.id] = used[b.id] = 1; return [a, b]; }
      }
    }
    function add(o) { var q = mkReq(o); S.requests.push(q); return q; }
    var p, q;
    // Direct swap waiting on Dr. Sample A
    p = pair('B', 'A'); add({ type: 'swap', from: 'B', to: 'A', shiftA: p[0].id, shiftB: p[1].id, at: ago(20), note: "Kid's school event that day. Happy to take your shift instead." });
    // Open coverage request (any colleague)
    add({ type: 'cover', from: 'D', shiftA: free('D', 'A', 2).id, at: ago(7), reason: 'Conflict', note: 'Specialist referral visit, can anyone cover?' });
    // Board trade: poster C picked E's offer -> manager queue
    p = pair('C', 'E'); q = add({ type: 'swap', board: true, from: 'C', shiftA: p[0].id, at: ago(30), canWork: 'Any Mon/Thu', note: 'CE conference day.' });
    q.offers.push({ id: uid(), by: 'E', shiftId: p[1].id, at: ago(27) }); step(q, 'offered', 'E', ago(27));
    q.to = 'E'; q.shiftB = p[1].id; step(q, 'accepted', 'C', ago(25));
    // Direct swap with conflict -> manager queue
    p = pair('E', 'B', true); q = add({ type: 'swap', from: 'E', to: 'B', shiftA: p[0].id, shiftB: p[1].id, at: ago(12), note: 'Dentist appointment.' });
    step(q, 'accepted', 'B', ago(3));
    // Coverage of A's shift accepted by C -> manager queue
    q = add({ type: 'cover', from: 'A', shiftA: free('A', 'C').id, at: ago(40), reason: 'Vacation', note: 'Long weekend away.' });
    q.coveredBy = 'C'; step(q, 'accepted', 'C', ago(35));
    // Approved swap waiting on the front desk
    p = pair('D', 'B'); q = add({ type: 'swap', from: 'D', to: 'B', shiftA: p[0].id, shiftB: p[1].id, at: ago(50) });
    step(q, 'accepted', 'B', ago(48)); applyApproval(q, 'manager', ago(4)); q.moves[0].done = true;
    // PTO approved -> AVAILABLE shift anyone can pick up
    q = add({ type: 'pto', from: 'B', shiftA: free('B', 'A').id, at: ago(26), reason: 'PTO', note: 'Out of town.' });
    step(q, 'ptoApproved', 'manager', ago(22)); shift(q.shiftA).vetId = null;
    // PTO picked up by D -> manager queue
    q = add({ type: 'pto', from: 'C', shiftA: free('C', 'D', 1).id, at: ago(30), reason: 'PTO', note: 'Moving house.' });
    step(q, 'ptoApproved', 'manager', ago(28)); shift(q.shiftA).vetId = null; q.pickedBy = 'D'; step(q, 'pickedUp', 'D', ago(1));
    // PTO requested -> manager queue
    add({ type: 'pto', from: 'E', shiftA: free('E', null, 4).id, at: ago(5), reason: 'PTO', note: 'Vacation week, first day.' });
    // Dr. Sample A's own board post with two offers to review
    var aShift = free('A', 'B', 3);
    q = add({ type: 'swap', board: true, from: 'A', shiftA: aShift.id, at: ago(10), canWork: 'Fridays or Saturdays', note: 'Recital that evening.' });
    var bOffer = S.shifts.filter(function (s) { return s.vetId === 'B' && s.date >= t0 && !used[s.id] && !works('A', s.date); })[0]; used[bOffer.id] = 1;
    q.offers.push({ id: uid(), by: 'B', shiftId: bOffer.id, at: ago(6) }); step(q, 'offered', 'B', ago(6));
    var coverer = ['D', 'E', 'C'].filter(function (v) { return !works(v, aShift.date); })[0];
    if (coverer) q.offers.push({ id: uid(), by: coverer, shiftId: null, at: ago(2) });
    // Open board post from E
    add({ type: 'swap', board: true, from: 'E', shiftA: free('E', 'A', 1).id, at: ago(4), canWork: 'Prefer Location 2, any weekday', note: 'Jury duty summons.' });
    save();
  }
  function load() { try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) { S = null; } if (!S || !S.shifts) seed(); }
  function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

  // ---------- core logic ----------
  function takerOf(r) { return r.type === 'pto' ? r.pickedBy : r.type === 'cover' ? (r.coveredBy || r.to) : r.to; }
  function newOwners(r) {
    var a = shift(r.shiftA);
    if (r.type === 'swap') return [{ s: a, from: r.from, to: r.to }, { s: shift(r.shiftB), from: r.to, to: r.from }];
    return [{ s: a, from: r.from, to: takerOf(r) }];
  }
  // conflicts for a request r (taker may be overridden for previews)
  function conflicts(r, taker) {
    var out = [], a = shift(r.shiftA), t = taker || takerOf(r);
    if (r.type === 'pto') {
      if (r.status === 'requested') return [];
      if (a.vetId) out.push('This shift was already reassigned to ' + vname(a.vetId) + '.');
    } else if (a.vetId !== r.from) out.push(vname(r.from) + ' no longer holds the ' + shiftLabel(a) + ' shift (schedule changed).');
    var moves = (r.type === 'swap' && r.shiftB) ? [{ s: a, to: t, keep: r.shiftB }, { s: shift(r.shiftB), to: r.from, keep: r.shiftA }] : [{ s: a, to: t, keep: null }];
    if (moves[1] && moves[1].s.vetId !== t) out.push(vname(t) + ' no longer holds the ' + shiftLabel(moves[1].s) + ' shift.');
    moves.forEach(function (m) {
      if (!m.to) return;
      S.shifts.forEach(function (o) {
        if (o.vetId !== m.to || o.date !== m.s.date || o.id === m.s.id || o.id === m.keep) return;
        out.push(o.loc !== m.s.loc
          ? vname(m.to) + ' would be double-booked across locations on ' + fmtDate(o.date) + ' (already at ' + o.loc + ', would also be at ' + m.s.loc + ').'
          : vname(m.to) + ' is already working ' + fmtDate(o.date) + ' at ' + o.loc + '.');
      });
      S.requests.forEach(function (x) {
        if (x.id === r.id || !/accepted|pickedUp/.test(x.status)) return;
        if (x.shiftA === m.s.id || x.shiftB === m.s.id) out.push('Another pending request also involves the ' + shiftLabel(m.s) + ' shift.');
      });
    });
    return out.filter(function (v, i, arr) { return arr.indexOf(v) === i; });
  }
  function staffing(r) {   // for PTO approval: who is left at that location that day
    var a = shift(r.shiftA);
    var left = S.shifts.filter(function (s) { return s.date === a.date && s.loc === a.loc && s.id !== a.id && s.vetId; }).length;
    return left ? { ok: true, msg: a.loc + ' still has ' + left + ' vet' + (left > 1 ? 's' : '') + ' on ' + fmtDate(a.date) + '. Shift will be posted as Available.' }
      : { ok: false, msg: a.loc + ' would have NO vet on ' + fmtDate(a.date) + ' until someone picks up the Available shift.' };
  }
  function applyApproval(r, by, at) {
    var owners = newOwners(r);
    r.moves = owners.map(function (o) { return { from: o.from, to: o.to, date: o.s.date, loc: o.s.loc, done: false }; });
    owners.forEach(function (o) { o.s.vetId = o.to; });
    step(r, 'approved', by, at);
    ui.flash = owners.map(function (o) { return o.s.id; });
  }

  // ---------- render helpers ----------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : a.loc < b.loc ? -1 : 1; }
  function last(r) { return r.timeline[r.timeline.length - 1].at; }
  function byNew(a, b) { return last(a) < last(b) ? 1 : -1; }
  function pendingIds() {
    var m = {};
    S.requests.forEach(function (r) { if (/^(requested|offered|accepted|pickedUp)$/.test(r.status)) { m[r.shiftA] = 1; if (r.shiftB) m[r.shiftB] = 1; } });
    return m;
  }
  function ptoFor(shiftId) { return S.requests.filter(function (r) { return r.type === 'pto' && r.shiftA === shiftId && /ptoApproved|pickedUp/.test(r.status); })[0]; }
  function chip(s, pend, dot) {
    if (!s.vetId) {
      var pr = ptoFor(s.id), picked = pr && pr.status === 'pickedUp';
      return '<span class="' + (dot ? 'dot' : 'chip') + ' avail' + (picked ? ' pending' : '') + '" title="Available shift (PTO' + (pr ? ': ' + esc(vname(pr.from)) : '') + ')' + (picked ? ', pickup pending' : '') + '">' + (dot ? '★' : '<span class="full">★ Available</span><span class="short">★</span>') + '</span>';
    }
    var v = vet(s.vetId), mine = S.role === 'vet' && s.vetId === S.me;
    return '<span class="' + (dot ? 'dot' : 'chip') + (mine ? ' mine' : '') + (pend[s.id] ? ' pending' : '') + (ui.flash.indexOf(s.id) > -1 ? ' flash' : '') +
      '" style="background:' + v.bg + ';color:' + v.fg + '" title="' + esc(v.name + ' · ' + shiftLabel(s) + (pend[s.id] ? ' (request pending)' : '')) + '">' + (dot ? v.id : '<span class="full">' + esc(v.name.replace('Dr. ', '')) + '</span><span class="short">' + v.id + '</span>') + '</span>';
  }

  function renderSchedule() {
    var pend = pendingIds(), html = '', t = iso(today());
    if (ui.view === 'week') {
      var m = monday(ui.anchor), days = [];
      for (var i = 0; i < 7; i++) days.push(addDays(m, i));
      $('rangeLabel').textContent = MON[m.getMonth()] + ' ' + m.getDate() + ' – ' + MON[days[6].getMonth()] + ' ' + days[6].getDate();
      html = '<div class="week"><div class="hd"></div>' + days.map(function (d) { return '<div class="hd' + (iso(d) === t ? ' today' : '') + '">' + DOW[d.getDay()] + '<br>' + d.getDate() + '</div>'; }).join('');
      LOCS.forEach(function (loc) {
        html += '<div class="loc">' + loc + '</div>';
        days.forEach(function (d) {
          var ss = S.shifts.filter(function (s) { return s.date === iso(d) && s.loc === loc; });
          html += '<div class="cell' + (ss.length ? '' : ' closed') + '">' + ss.map(function (s) { return chip(s, pend); }).join('') + '</div>';
        });
      });
      html += '</div>';
    } else {
      var first = new Date(ui.anchor.getFullYear(), ui.anchor.getMonth(), 1), gs = monday(first);
      $('rangeLabel').textContent = MON[first.getMonth()] + ' ' + first.getFullYear();
      html = '<div class="month">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d) { return '<div class="hd">' + d + '</div>'; }).join('');
      for (var k = 0; k < 42; k++) {
        var d = addDays(gs, k), ds = iso(d);
        if (k >= 35 && d.getMonth() !== first.getMonth()) break;
        html += '<div class="' + (d.getMonth() !== first.getMonth() ? 'out' : '') + (ds === t ? ' today' : '') + '"><span class="dn">' + d.getDate() + '</span>';
        LOCS.forEach(function (loc, li) {
          var ss = S.shifts.filter(function (s) { return s.date === ds && s.loc === loc; });
          if (ss.length) html += '<div class="row"><span class="ln">L' + (li + 1) + '</span>' + ss.map(function (s) { return chip(s, pend, true); }).join('') + '</div>';
        });
        html += '</div>';
      }
      html += '</div>';
    }
    $('schedule').innerHTML = html;
    $('legend').innerHTML = VETS.map(function (v) { return '<span class="chip" style="background:' + v.bg + ';color:' + v.fg + '">' + v.name + '</span>'; }).join('') +
      '<span class="chip avail">★ Available shift (PTO)</span><span class="chip pending" style="background:#fff">dashed = request pending</span>' +
      (S.role === 'vet' ? '<span class="chip mine" style="background:#fff">outlined = my shifts</span>' : '') +
      ' <span>Placeholder vets, not real staff. Closed Sun; Location 2 closed Sat.</span>';
    document.querySelectorAll('.seg button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === ui.view); });
  }

  function steps(r) {
    if (r.type === 'pto') return [['requested', 'PTO requested'], ['ptoApproved', 'PTO approved'], ['pickedUp', 'Picked up'], ['approved', 'Pickup approved'], ['done', 'Appts moved']];
    if (r.board) return [['requested', 'Posted'], ['offered', 'Offers in'], ['accepted', 'Poster picked'], ['approved', 'Mgr approved'], ['done', 'Appts moved']];
    return [['requested', 'Requested'], ['accepted', 'Accepted'], ['approved', 'Approved'], ['done', 'Appts moved']];
  }
  function timeline(r) {
    var reached = {}, fail = null, st = steps(r), failIdx = -1;
    r.timeline.forEach(function (e) { reached[e.status] = e; if (/declined|denied|cancelled/.test(e.status)) fail = e; });
    if (fail) for (var i = 0; i < st.length; i++) if (!reached[st[i][0]]) { failIdx = i; break; }
    return '<div class="tl">' + st.map(function (x, i) {
      if (i === failIdx) return '<div class="st fail">' + cap(fail.status) + '<span class="t">' + fmtTime(fail.at) + '</span></div>';
      var e = reached[x[0]], cur = !fail && !e && (i === 0 || reached[st[i - 1][0]]);
      return '<div class="st' + (e ? ' done' : '') + (cur ? ' cur' : '') + '">' + x[1] + (e ? '<span class="t">' + fmtTime(e.at) + '</span>' : '') + '</div>';
    }).join('') + '</div>';
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function describe(r) {
    var a = shift(r.shiftA);
    if (r.type === 'pto') {
      var sub = 'Time off on <b>' + shiftLabel(a) + '</b>';
      if (r.status === 'ptoApproved') sub += '<br><span class="availtxt">★ Available shift, open for pick-up</span>';
      if (r.pickedBy) sub += '<br>Picked up by <b>' + vname(r.pickedBy) + '</b>';
      return { title: 'PTO: ' + vname(r.from), sub: sub };
    }
    if (r.board && !r.shiftB && r.type === 'swap') {
      return { title: 'Swap board: ' + vname(r.from) + ' needs a trade', sub: 'Shift <b>' + shiftLabel(a) + '</b>' +
        (r.canWork ? '<br>Could work instead: <b>' + esc(r.canWork) + '</b>' : '') + (r.offers.length ? '<br>' + r.offers.length + ' offer' + (r.offers.length > 1 ? 's' : '') + ' received' : '') };
    }
    if (r.type === 'swap') {
      return { title: (r.board ? 'Board swap: ' : 'Swap: ') + vname(r.from) + ' ⇄ ' + vname(r.to),
        sub: vname(r.from) + ' gives <b>' + shiftLabel(a) + '</b><br>' + vname(r.to) + ' gives <b>' + shiftLabel(shift(r.shiftB)) + '</b>' };
    }
    return { title: (r.board ? 'Board cover: ' : (r.reason || 'Coverage') + ': ') + vname(r.from) + ' needs cover',
      sub: 'Shift <b>' + shiftLabel(a) + '</b> → ' + (r.coveredBy ? 'covered by <b>' + vname(r.coveredBy) + '</b>' : 'offered to <b>' + vname(r.to) + '</b>') };
  }
  function card(r, extra, cls) {
    var d = describe(r);
    return '<div class="req ' + (cls || '') + '"><div class="top"><div><div class="title">' + esc(d.title) + '</div><div class="sub">' + d.sub + '</div></div>' +
      '<span class="badge b-' + r.status + '">' + BADGE[r.status] + '</span></div>' + (r.note ? '<div class="note">“' + esc(r.note) + '”</div>' : '') + (extra || '') + timeline(r) + '</div>';
  }
  function checkBox(list, label) {
    return list.length ? '<div class="check bad">⚠ ' + (label || 'Conflict check') + ': ' + list.length + ' issue' + (list.length > 1 ? 's' : '') + '<ul>' + list.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>'
      : '<div class="check ok">✓ ' + (label || 'Conflict check') + ' passed: no double-booking, vets free those days.</div>';
  }
  function btns(arr) { return '<div class="actions">' + arr.join('') + '</div>'; }
  function btn(act, id, label, cls, extra) { return '<button class="' + (cls || '') + '" data-act="' + act + '" data-id="' + id + '"' + (extra || '') + '>' + label + '</button>'; }
  function opt(s, sel) { return '<option value="' + s.id + '"' + (sel ? ' selected' : '') + '>' + shiftLabel(s) + '</option>'; }

  // ---------- vet view ----------
  function myFree() { var p = pendingIds(), t = iso(today()); return S.shifts.filter(function (s) { return s.vetId === S.me && s.date >= t && !p[s.id]; }).sort(byDate); }
  function availPtos() { return S.requests.filter(function (r) { return r.type === 'pto' && r.status === 'ptoApproved'; }).sort(function (a, b) { return byDate(shift(a.shiftA), shift(b.shiftA)); }); }
  function boardPosts() { return S.requests.filter(function (r) { return r.board && /^(requested|offered)$/.test(r.status); }).sort(byNew); }

  function renderVet() {
    var me = S.me, t = iso(today()), pend = pendingIds(), free = myFree();
    var others = S.shifts.filter(function (s) { return s.vetId && s.vetId !== me && s.date >= t; }).sort(byDate);
    var nBoard = availPtos().length + boardPosts().filter(function (r) { return r.from !== me || r.offers.length; }).length;
    var html = '<div class="card"><div class="tabs">' +
      '<button data-tab="board" class="' + (ui.vetTab === 'board' ? 'on' : '') + '">📋 Swap board' + (nBoard ? '<span class="count">' + nBoard + '</span>' : '') + '</button>' +
      '<button data-tab="swap" class="' + (ui.vetTab === 'swap' ? 'on' : '') + '">⇄ Direct swap</button>' +
      '<button data-tab="cover" class="' + (ui.vetTab === 'cover' ? 'on' : '') + '">🏖 PTO / coverage</button></div>';
    if (ui.vetTab === 'board') html += boardHtml(free);
    else if (ui.vetTab === 'swap') {
      html += '<div class="field"><label>1. My shift to give away</label><select id="fMine">' + free.map(function (s) { return opt(s); }).join('') + '</select></div>' +
        '<div class="field"><label>2. Colleague\'s shift I\'ll take</label><select id="fTheirs">' + VETS.filter(function (v) { return v.id !== me; }).map(function (v) {
          return '<optgroup label="' + v.name + '">' + others.filter(function (s) { return s.vetId === v.id; }).map(function (s) {
            return '<option value="' + s.id + '"' + (pend[s.id] ? ' disabled' : '') + '>' + v.name + ' · ' + shiftLabel(s) + (pend[s.id] ? ' (pending)' : '') + '</option>'; }).join('') + '</optgroup>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Note (optional)</label><select id="fNote"><option value="">-</option><option>Personal conflict</option><option>Medical appointment</option><option>Family event</option><option>CE / conference</option></select></div>' +
        '<div id="swapCheck"></div><div class="actions"><button class="primary" id="sendSwap">Send swap request</button></div>' +
        '<p class="hint">One step: your colleague accepts, a manager approves, then the front desk moves appointments in Cornerstone.</p>';
    } else {
      html += '<div class="field"><label>Shifts (pick one or more for a vacation)</label><div class="pick">' +
        free.map(function (s) { return '<label><input type="checkbox" class="fCov" value="' + s.id + '"> ' + shiftLabel(s) + '</label>'; }).join('') + '</div></div>' +
        '<div class="field"><label>What do you need?</label><select id="fKind"><option value="pto">Mark as PTO / time off (manager approves, shift becomes ★ Available for anyone)</option><option value="cover">Ask a colleague to cover</option></select></div>' +
        '<div class="field" id="toWrap" style="display:none"><label>Offer to</label><select id="fTo"><option value="">Any colleague (first to accept)</option>' + VETS.filter(function (v) { return v.id !== me; }).map(function (v) { return '<option value="' + v.id + '">' + v.name + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>Note (optional)</label><input id="fCovNote" class="inp" placeholder="e.g. family vacation"></div>' +
        '<div class="actions"><button class="primary" id="sendCover">Submit</button></div><p class="hint">One request per shift. PTO: manager approves, then the shift shows as ★ Available on the schedule and swap board; a pick-up goes back to the manager, then the front desk.</p>';
    }
    html += '</div>';

    var incoming = S.requests.filter(function (r) { return r.status === 'requested' && r.from !== me && !r.board && r.type !== 'pto' && (r.to === me || (r.type === 'cover' && !r.to && r.declinedBy.indexOf(me) < 0)); });
    var toReview = S.requests.filter(function (r) { return r.board && r.from === me && r.status === 'offered'; });
    html += '<div class="card"><h3>Incoming requests' + ((incoming.length + toReview.length) ? '<span class="count">' + (incoming.length + toReview.length) + '</span>' : '') + '</h3>' +
      (toReview.length ? '<div class="check warnbox">📋 You have offers to review on ' + toReview.length + ' swap board post' + (toReview.length > 1 ? 's' : '') + '. <button class="link" data-tab="board">Review on Swap board</button></div>' : '') +
      (incoming.length ? incoming.map(function (r) {
        var c = conflicts(r, r.type === 'cover' ? me : null);
        var acts = r.type === 'swap' ? [btn('accept', r.id, 'Accept swap', 'primary'), btn('decline', r.id, 'Decline', 'danger')] : [btn('accept', r.id, 'I\'ll cover it', 'primary'), btn('decline', r.id, r.to ? 'Decline' : 'Not me', 'danger')];
        return card(r, (c.length ? checkBox(c) : '') + btns(acts));
      }).join('') : (toReview.length ? '' : '<div class="empty">Nothing waiting on you.</div>')) + '</div>';

    var mineReqs = S.requests.filter(function (r) {
      if (incoming.indexOf(r) > -1 || (r.board && r.from === me && /requested|offered/.test(r.status))) return false;
      return r.from === me || r.to === me || r.coveredBy === me || r.pickedBy === me;
    }).sort(byNew);
    html += '<div class="card"><h3>My requests &amp; history</h3>' + (mineReqs.length ? mineReqs.map(function (r) {
      return card(r, r.from === me && /^(requested|accepted)$/.test(r.status) ? btns([btn('cancel', r.id, 'Cancel request', 'danger')]) : '');
    }).join('') : '<div class="empty">No requests yet.</div>') + '</div>';
    $('panel').innerHTML = html;
    if (ui.vetTab === 'swap') updateSwapCheck();
    if (ui.vetTab === 'board') updateOfferChecks();
  }

  function boardHtml(free) {
    var me = S.me, posts = boardPosts(), avail = availPtos();
    var h = '<p class="hint" style="margin:-4px 0 10px">Post a shift you need to trade. Colleagues offer one of their shifts (or to cover it); you pick the offer you want, then it goes to the manager and the front desk.</p>';
    // Available shifts banner
    h += '<div class="availbox"><div class="availhead">★ Available shifts <span class="badge b-ptoApproved">' + avail.length + ' open</span></div>' +
      (avail.length ? avail.map(function (r) {
        var s = shift(r.shiftA), c = conflicts(r, me);
        return '<div class="availrow"><div><b>' + shiftLabel(s) + '</b><div class="sub">Open because of approved PTO (' + esc(vname(r.from)) + ')</div>' +
          (c.length ? '<div class="sub" style="color:var(--bad)">⚠ ' + esc(c.join(' ')) + '</div>' : '') + '</div>' +
          btn('pickup', r.id, 'Pick up', c.length ? '' : 'primary') + '</div>';
      }).join('') : '<div class="empty" style="padding:4px 0">No open shifts right now.</div>') +
      '<div class="hint">Pick-ups go to the manager for approval, then to the front desk to move appointments.</div></div>';
    // My posts: review offers
    var own = posts.filter(function (r) { return r.from === me; });
    if (own.length) h += '<h3>My posts: review offers</h3>' + own.map(function (r) {
      var offers = r.offers.length ? r.offers.map(function (o) {
        var trial = o.shiftId ? { id: r.id, type: 'swap', from: me, to: o.by, shiftA: r.shiftA, shiftB: o.shiftId } : { id: r.id, type: 'cover', from: me, shiftA: r.shiftA, coveredBy: o.by };
        var c = conflicts(trial);
        return '<div class="offer"><div><b>' + esc(vname(o.by)) + '</b> ' + (o.shiftId ? 'offers <b>' + shiftLabel(shift(o.shiftId)) + '</b> in return' : 'offers to <b>just cover it</b>') +
          '<div class="sub">' + fmtTime(o.at) + (c.length ? ' · <span style="color:var(--bad)">⚠ ' + esc(c.join(' ')) + '</span>' : ' · <span style="color:var(--ok)">✓ no conflicts</span>') + '</div></div>' +
          btn('pick', r.id, 'Pick this offer', 'primary', ' data-offer="' + o.id + '"') + '</div>';
      }).join('') : '<div class="empty" style="padding:6px 0">No offers yet.</div>';
      return card(r, '<div class="offers">' + offers + '</div>' + btns([btn('cancel', r.id, 'Remove post', 'danger')]), 'mine');
    }).join('');
    // Colleagues' posts
    var others = posts.filter(function (r) { return r.from !== me; });
    h += '<h3 style="margin-top:12px">Open posts from colleagues</h3>' + (others.length ? others.map(function (r) {
      var myOffer = r.offers.filter(function (o) { return o.by === me; })[0];
      if (myOffer) return card(r, '<div class="check ok">You offered ' + (myOffer.shiftId ? shiftLabel(shift(myOffer.shiftId)) : 'to cover it') + '. Waiting for ' + esc(vname(r.from)) + ' to pick an offer.</div>');
      var best = free.filter(function (s) { return !conflicts({ id: r.id, type: 'swap', from: r.from, to: me, shiftA: r.shiftA, shiftB: s.id }).length; })[0];
      var cov = conflicts({ id: r.id, type: 'cover', from: r.from, shiftA: r.shiftA, coveredBy: me });
      return card(r, '<div class="field" style="margin:8px 0 0"><label>Offer one of my shifts in return</label><select data-offersel="' + r.id + '">' +
        free.map(function (s) { return opt(s, best && best.id === s.id); }).join('') + '</select></div><div data-offercheck="' + r.id + '"></div>' +
        (cov.length ? '<div class="check bad" style="font-size:12px">If I just cover it: ' + esc(cov.join(' ')) + '</div>' : '') +
        btns([btn('offer', r.id, 'Offer this trade', 'primary'), btn('boardcover', r.id, 'Offer to just cover')]));
    }).join('') : '<div class="empty">No open posts right now.</div>');
    // Post form
    h += '<h3 style="margin-top:12px">Post a shift to the board</h3>' +
      '<div class="field"><label>Shift I need swapped</label><select id="bShift">' + free.map(function (s) { return opt(s); }).join('') + '</select></div>' +
      '<div class="field"><label>Dates I could work instead (optional)</label><input id="bCan" class="inp" placeholder="e.g. any Tue/Thu, or Oct 20-24"></div>' +
      '<div class="field"><label>Note (optional)</label><input id="bNote" class="inp" placeholder="e.g. family event"></div>' +
      '<div class="actions"><button class="primary" id="sendBoard">Post to swap board</button></div>';
    return h;
  }
  function updateOfferChecks() {
    document.querySelectorAll('select[data-offersel]').forEach(function (sel) {
      var r = find(sel.dataset.offersel), box = document.querySelector('[data-offercheck="' + r.id + '"]');
      box.innerHTML = sel.value ? checkBox(conflicts({ id: r.id, type: 'swap', from: r.from, to: S.me, shiftA: r.shiftA, shiftB: sel.value })) : '<div class="hint">No free upcoming shifts to offer.</div>';
    });
  }
  function updateSwapCheck() {
    var a = $('fMine'), b = $('fTheirs'); if (!a || !b || !a.value || !b.value) return;
    var r = { type: 'swap', from: S.me, to: shift(b.value).vetId, shiftA: a.value, shiftB: b.value };
    $('swapCheck').innerHTML = '<div class="hint" style="margin-bottom:6px">Preview: you take <b>' + shiftLabel(shift(b.value)) + '</b>, ' + vname(r.to) + ' takes <b>' + shiftLabel(shift(a.value)) + '</b>.</div>' + checkBox(conflicts(r));
  }

  // ---------- manager view ----------
  function renderManager() {
    var q = S.requests.filter(function (r) { return r.status === 'accepted' || (r.type === 'pto' && /^(requested|pickedUp)$/.test(r.status)); }).sort(byNew);
    var waiting = S.requests.filter(function (r) { return /^(requested|offered|ptoApproved)$/.test(r.status) && !(r.type === 'pto' && r.status === 'requested'); }).sort(byNew);
    var recent = S.requests.filter(function (r) { return /approved|denied|done/.test(r.status) && r.status !== 'ptoApproved'; }).sort(byNew);
    $('panel').innerHTML = '<div class="card"><h3>Approval queue' + (q.length ? '<span class="count">' + q.length + '</span>' : '') + '</h3>' +
      '<p class="hint" style="margin:-4px 0 10px">Swaps both vets agreed to, PTO requests and Available-shift pick-ups. Approving a trade or pick-up updates the schedule and sends a move list to the front desk.</p>' +
      (q.length ? q.map(function (r) {
        if (r.type === 'pto' && r.status === 'requested') {
          var st = staffing(r);
          return card(r, '<div class="check ' + (st.ok ? 'ok' : 'bad') + '">' + (st.ok ? '✓ ' : '⚠ ') + 'Staffing check: ' + esc(st.msg) + '</div>' +
            btns([btn('approvePto', r.id, 'Approve PTO → post as Available', 'primary'), btn('deny', r.id, 'Deny', 'danger')]), 'ptoq');
        }
        var c = conflicts(r), pick = r.type === 'pto';
        return card(r, checkBox(c) + btns([btn('approve', r.id, (c.length ? 'Approve anyway' : pick ? 'Approve pick-up' : 'Approve'), c.length ? '' : 'primary'), btn('deny', r.id, 'Deny', 'danger')]), pick ? 'ptoq' : '');
      }).join('') : '<div class="empty">Queue is empty. 🎉</div>') + '</div>' +
      '<div class="card"><h3>In progress (waiting on vets) · ' + waiting.length + '</h3>' + (waiting.map(function (r) { return card(r); }).join('') || '<div class="empty">None.</div>') + '</div>' +
      '<div class="card"><h3>Recent decisions</h3>' + (recent.map(function (r) { return card(r); }).join('') || '<div class="empty">None yet.</div>') + '</div>';
  }

  // ---------- front desk view ----------
  function renderDesk() {
    var todo = S.requests.filter(function (r) { return r.status === 'approved'; }).sort(byNew);
    var done = S.requests.filter(function (r) { return r.status === 'done'; }).sort(byNew);
    function list(r) {
      return r.moves.map(function (m, i) {
        return '<label class="todo' + (m.done ? ' done' : '') + '"><input type="checkbox" data-act="move" data-id="' + r.id + '" data-i="' + i + '"' + (m.done ? ' checked' : '') + (r.status === 'done' ? ' disabled' : '') + '>' +
          '<span>Move appointments in Cornerstone: <b>' + esc(vname(m.from)) + '</b>\'s appointments on <b>' + fmtDate(m.date) + '</b> at <b>' + m.loc + '</b> → <b>' + esc(vname(m.to)) + '</b></span></label>';
      }).join('');
    }
    $('panel').innerHTML = '<div class="card"><h3>To do in Cornerstone' + (todo.length ? '<span class="count">' + todo.length + '</span>' : '') + '</h3>' +
      '<p class="hint" style="margin:-4px 0 10px">Approved changes. Move each vet\'s appointments by hand in Cornerstone, then tick the box. The request completes when every line is ticked.</p>' +
      (todo.length ? todo.map(function (r) { return card(r, list(r)); }).join('') : '<div class="empty">All caught up.</div>') + '</div>' +
      '<div class="card"><h3>Completed</h3>' + (done.map(function (r) { return card(r, list(r)); }).join('') || '<div class="empty">None yet.</div>') + '</div>';
  }

  function render() {
    document.querySelectorAll('.roles button').forEach(function (b) { b.classList.toggle('on', b.dataset.role === S.role); });
    $('who').innerHTML = S.role === 'vet'
      ? '<span>Signed in as</span><select id="me">' + VETS.map(function (v) { return '<option value="' + v.id + '"' + (v.id === S.me ? ' selected' : '') + '>' + v.name + ' (sample)</option>'; }).join('') + '</select>'
      : '<span>Signed in as <b>' + (S.role === 'manager' ? 'Sample Practice Manager' : 'Sample Front Desk') + '</b></span>';
    renderSchedule();
    ({ vet: renderVet, manager: renderManager, desk: renderDesk })[S.role]();
    ui.flash = [];
  }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(function () { t.hidden = true; }, 2600); }

  // ---------- events ----------
  document.addEventListener('click', function (e) {
    var el = e.target.closest('button'); if (!el) return;
    if (el.dataset.role) { S.role = el.dataset.role; history.replaceState(null, '', '#' + S.role); save(); render(); return; }
    if (el.dataset.view) { ui.view = el.dataset.view; renderSchedule(); return; }
    if (el.dataset.tab) { ui.vetTab = el.dataset.tab; renderVet(); window.scrollTo(0, 0); return; }
    if (el.id === 'prev' || el.id === 'next') {
      var dir = el.id === 'prev' ? -1 : 1;
      ui.anchor = ui.view === 'week' ? addDays(ui.anchor, 7 * dir) : new Date(ui.anchor.getFullYear(), ui.anchor.getMonth() + dir, 1);
      renderSchedule(); return;
    }
    if (el.id === 'today') { ui.anchor = defAnchor(); renderSchedule(); return; }
    if (el.id === 'reset') { if (confirm('Reset all demo data?')) { var role = S.role; seed(); S.role = role; save(); render(); toast('Demo data reset'); } return; }
    if (el.id === 'sendSwap') {
      var a = $('fMine').value, b = $('fTheirs').value; if (!a || !b) return toast('Pick both shifts');
      S.requests.push(mkReq({ type: 'swap', from: S.me, to: shift(b).vetId, shiftA: a, shiftB: b, note: $('fNote').value }));
      save(); render(); toast('Swap request sent to ' + vname(shift(b).vetId)); return;
    }
    if (el.id === 'sendBoard') {
      var bs = $('bShift').value; if (!bs) return toast('No free shift to post');
      S.requests.push(mkReq({ type: 'swap', board: true, from: S.me, shiftA: bs, canWork: $('bCan').value.trim(), note: $('bNote').value.trim() }));
      save(); render(); toast('Posted to the swap board'); return;
    }
    if (el.id === 'sendCover') {
      var ids = Array.prototype.map.call(document.querySelectorAll('.fCov:checked'), function (c) { return c.value; });
      if (!ids.length) return toast('Pick at least one shift');
      var kind = $('fKind').value;
      ids.forEach(function (id) { S.requests.push(mkReq({ type: kind, from: S.me, to: kind === 'cover' ? ($('fTo').value || null) : null, shiftA: id, reason: kind === 'pto' ? 'PTO' : 'Coverage', note: $('fCovNote').value.trim() })); });
      save(); render(); toast(ids.length + (kind === 'pto' ? ' PTO request(s) sent to manager' : ' coverage request(s) sent')); return;
    }
    var r = el.dataset.id && find(el.dataset.id); if (!r) return;
    var c;
    switch (el.dataset.act) {
      case 'accept':
        if (r.type === 'cover') r.coveredBy = S.me;
        step(r, 'accepted', S.me); toast('Accepted. Sent to manager for approval'); break;
      case 'decline':
        if (r.type === 'cover' && !r.to) { r.declinedBy.push(S.me); toast('Hidden for you; still open to others'); break; }
        step(r, 'declined', S.me); toast('Declined'); break;
      case 'cancel': step(r, 'cancelled', S.me); toast('Cancelled'); break;
      case 'offer':
        var sel = document.querySelector('select[data-offersel="' + r.id + '"]'); if (!sel || !sel.value) return toast('No shift to offer');
        c = conflicts({ id: r.id, type: 'swap', from: r.from, to: S.me, shiftA: r.shiftA, shiftB: sel.value });
        if (c.length && !confirm('Conflict check:\n\n- ' + c.join('\n- ') + '\n\nOffer anyway?')) return;
        r.offers.push({ id: uid(), by: S.me, shiftId: sel.value, at: now() });
        if (r.status === 'requested') step(r, 'offered', S.me);
        toast('Offer sent. ' + vname(r.from) + ' will review offers'); break;
      case 'boardcover':
        r.offers.push({ id: uid(), by: S.me, shiftId: null, at: now() });
        if (r.status === 'requested') step(r, 'offered', S.me);
        toast('Offer sent. ' + vname(r.from) + ' will review offers'); break;
      case 'pick':
        var o = r.offers.filter(function (x) { return x.id === el.dataset.offer; })[0];
        if (o.shiftId) { r.to = o.by; r.shiftB = o.shiftId; } else { r.type = 'cover'; r.coveredBy = o.by; }
        step(r, 'accepted', S.me); toast('Offer picked. Sent to manager for approval'); break;
      case 'pickup':
        c = conflicts(r, S.me);
        if (c.length && !confirm('Conflict check:\n\n- ' + c.join('\n- ') + '\n\nPick up anyway?')) return;
        r.pickedBy = S.me; step(r, 'pickedUp', S.me); toast('Pick-up sent to manager for approval'); break;
      case 'approvePto':
        step(r, 'ptoApproved', 'manager'); shift(r.shiftA).vetId = null; ui.flash = [r.shiftA]; toast('PTO approved. Shift is now ★ Available'); break;
      case 'approve':
        c = conflicts(r);
        if (c.length && !confirm('Conflict check found issues:\n\n- ' + c.join('\n- ') + '\n\nApprove anyway?')) return;
        applyApproval(r, 'manager'); toast('Approved. Schedule updated, front desk notified'); break;
      case 'deny':
        if (r.type === 'pto' && r.status === 'pickedUp') {   // pick-up denied: shift stays Available
          r.timeline = r.timeline.filter(function (x) { return x.status !== 'pickedUp'; }); r.status = 'ptoApproved'; r.pickedBy = null;
          toast('Pick-up denied. Shift stays Available'); break;
        }
        step(r, 'denied', 'manager'); toast('Denied'); break;
      default: return;
    }
    save(); render();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'me') { S.me = t.value; save(); render(); return; }
    if (t.id === 'fMine' || t.id === 'fTheirs') { updateSwapCheck(); return; }
    if (t.id === 'fKind') { $('toWrap').style.display = t.value === 'cover' ? '' : 'none'; return; }
    if (t.dataset.offersel) { updateOfferChecks(); return; }
    if (t.dataset.act === 'move') {
      var r = find(t.dataset.id); r.moves[+t.dataset.i].done = t.checked;
      if (r.moves.every(function (m) { return m.done; })) { step(r, 'done', 'front desk'); toast('All appointments moved. Request complete'); }
      save(); render();
    }
  });
  function route() {
    var h = location.hash.slice(1);
    if (/^(vet|manager|desk)$/.test(h)) S.role = h;
    if (h === 'board') { S.role = 'vet'; ui.vetTab = 'board'; }
    if (h === 'vet-swap') { S.role = 'vet'; ui.vetTab = 'swap'; }
  }
  window.addEventListener('hashchange', function () { route(); save(); render(); });
  load(); route(); render();
})();
