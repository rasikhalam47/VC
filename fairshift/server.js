'use strict';
// FairShift demo server: Node built-ins only, in-memory fictional data, no credentials.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 8080, DAY = 864e5;
const HTML = fs.readFileSync(path.join(__dirname, 'public', 'index.html'));

const SITES = {
  lakeview: { name: 'Lakeview Towers, Block A', industry: 'Construction', after: 48, x: 2 },
  metro: { name: 'Metro Depot Extension', industry: 'Construction', after: 48, x: 2 },
  stanne: { name: "St. Anne's College Campus Facilities", industry: 'College support', after: 40, x: 1.5 }
};
// week = hours for the 7 days before today (oldest first). null = rest day, 0 = absent. off = rest weekday (0=Sun).
const W = [
  { id: 'ravi', name: 'Ravi Kumar', role: 'Mason', site: 'lakeview', rate: 120, time: '06:30-16:30', off: 0, week: [10, 10, 10, 10, 10, 10, null],
    skills: [['Working at Height', 'Certified until Mar 2027'], ['Scaffold Inspection', 'Expires soon (Nov 2026)'], ['First Aid Basics', 'In progress']] },
  { id: 'meena', name: 'Meena Selvam', role: 'Site Helper', site: 'lakeview', rate: 95, time: '07:00-15:30', off: 0, week: [8, 8, 8, 0, 8, 8, null],
    skills: [['Site Safety Induction', 'Certified until Jan 2027'], ['Manual Handling', 'Certified until Aug 2027']] },
  { id: 'arjun', name: 'Arjun Das', role: 'Crane Signaller', site: 'metro', rate: 140, time: '06:00-15:00', off: 3, week: [9, 9, null, 9, 9, 9, 9],
    skills: [['Crane Signalling', 'Certified until Jun 2027'], ['Lifting Plan Basics', 'Certified until Dec 2026'], ['Working at Height', 'In progress']] },
  { id: 'selvi', name: 'Selvi Murugan', role: 'Rebar Fixer', site: 'metro', rate: 110, time: '07:00-15:00', off: 0, week: [8, 8, 8, 8, 8, 8, null],
    skills: [['Rebar Cutting & Bending', 'Certified until Oct 2027'], ['PPE Use', 'Certified until Jan 2027']] },
  { id: 'lakshmi', name: 'Lakshmi Devi', role: 'Housekeeping Supervisor', site: 'stanne', rate: 90, time: '06:00-14:00', off: 0, week: [8, 8, 8, 8, 8, null, null],
    skills: [['Chemical Safety (cleaning)', 'Certified until May 2027'], ['Infection Control', 'Certified until Feb 2027']] },
  { id: 'farah', name: 'Farah Khan', role: 'Campus Electrician', site: 'stanne', rate: 150, time: '08:00-17:00', off: 6, week: [9, 9, 9, 9, 9, null, 0],
    skills: [['Electrical Isolation (LOTO)', 'Certified until Apr 2027'], ['Fire Safety Warden', 'Expires soon (Nov 2026)']] },
  { id: 'thomas', name: 'Thomas Joseph', role: 'Night Security & Grounds', site: 'stanne', rate: 85, time: '18:00-05:00', off: 6, week: [11, 11, 11, 11, 11, null, null],
    skills: [['Fire Safety Warden', 'Certified until Sep 2027'], ['Emergency Response Drill', 'In progress']] }
];
const CATS = ['Safety hazard', 'Unsafe equipment', 'Pay or hours', 'Harassment', 'Other'];
const SAFETY = ['Safety hazard', 'Unsafe equipment'];
const STATUSES = ['Submitted', 'Under review', 'Action taken', 'Resolved'];
const HINT = { 'Submitted': 'Received. Waiting for a supervisor.', 'Under review': 'Someone is looking into this.', 'Action taken': 'A fix has been started.', 'Resolved': 'Closed. Tell us if it comes back.' };
let seq = 3;
const R = [
  { id: 'R1', site: 'lakeview', cat: 'Safety hazard', text: 'Guardrail missing on 4th floor slab edge near the lift shaft.', anon: false, by: 'ravi', status: 'Submitted', at: Date.now() - 3 * DAY },
  { id: 'R2', site: 'stanne', cat: 'Unsafe equipment', text: 'Ladder in the science block store has a cracked rung.', anon: true, by: null, status: 'Under review', at: Date.now() - 1 * DAY },
  { id: 'R3', site: 'metro', cat: 'Pay or hours', text: 'Sunday shift was not on my payslip last week.', anon: false, by: 'arjun', status: 'Resolved', at: Date.now() - 6 * DAY }
];

const fmt = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
const wk = d => d.toLocaleDateString('en-US', { weekday: 'short' });
const total = w => w.week.reduce((a, h) => a + (h || 0), 0);
function pay(w) {
  const s = SITES[w.site], t = total(w), reg = Math.min(t, s.after), ot = Math.max(0, t - s.after);
  return { total: t, reg, ot, rate: w.rate, x: s.x, after: s.after, regPay: reg * w.rate, otPay: ot * w.rate * s.x, amount: reg * w.rate + ot * w.rate * s.x };
}
const age = r => Math.floor((Date.now() - r.at) / DAY);
const pub = r => ({ id: r.id, site: r.site, siteName: SITES[r.site].name, cat: r.cat, text: r.text, status: r.status, age: age(r), anon: r.anon });

function workerView(id, mine) {
  const w = W.find(x => x.id === id); if (!w) return null;
  const up = []; for (let n = 0; n < 8 && up.length < 4; n++) { const d = new Date(Date.now() + n * DAY); if (d.getDay() !== w.off) up.push({ date: fmt(d), time: w.time }); }
  return { id: w.id, name: w.name, role: w.role, site: SITES[w.site], upcoming: up, pay: pay(w), skills: w.skills,
    week: w.week.map((h, i) => ({ d: wk(new Date(Date.now() + (i - 7) * DAY)), h })),
    reports: R.filter(r => r.by === id || mine.includes(r.id)).map(pub).reverse() };
}
function adminView(industry, site) {
  const ws = W.filter(w => (!site || w.site === site) && (!industry || SITES[w.site].industry === industry));
  const rows = ws.map(w => {
    const p = pay(w), sch = w.week.filter(h => h !== null).length, pres = w.week.filter(h => h > 0).length, flags = [];
    if (p.total > 54 || Math.max(...w.week.map(h => h || 0)) >= 11) flags.push('Excessive hours');
    return { name: w.name, role: w.role, site: SITES[w.site].name, sch, pres, total: p.total, ot: p.ot, flags };
  });
  const reps = R.filter(r => (!site || r.site === site) && (!industry || SITES[r.site].industry === industry));
  const open = reps.filter(r => r.status !== 'Resolved');
  const alerts = [];
  rows.forEach(r => r.flags.length && alerts.push({ level: 'high', text: `${r.name} (${r.site}): ${r.total} h in 7 days, ${r.ot} h overtime. Check rest and fatigue risk.` }));
  open.filter(r => SAFETY.includes(r.cat)).forEach(r => alerts.push({ level: age(r) >= 2 || r.status === 'Submitted' ? 'high' : 'warn', text: `${r.id} ${r.cat} at ${SITES[r.site].name} is "${r.status}" after ${age(r)} day(s).` }));
  const sch = rows.reduce((a, r) => a + r.sch, 0), pres = rows.reduce((a, r) => a + r.pres, 0);
  return { k: { att: sch ? Math.round(100 * pres / sch) : 0, hours: rows.reduce((a, r) => a + r.total, 0), ot: rows.reduce((a, r) => a + r.ot, 0), open: open.length },
    rows, alerts, reports: reps.map(r => ({ ...pub(r), who: r.anon ? 'Anonymous' : W.find(w => w.id === r.by).name })).reverse() };
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname, q = u.searchParams;
  const send = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(o)); };
  const body = () => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 1e4) { no(new Error('Request too large')); req.destroy(); } }); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch (e) { no(new Error('Invalid JSON')); } }); });
  try {
    if (p === '/healthz') return send(200, { ok: true });
    // Optional greeting video: drop public/intro.mp4 (or .webm) in and the intro plays it; otherwise the built-in animation runs.
    const MEDIA = { '/intro.mp4': 'video/mp4', '/intro.webm': 'video/webm' };
    if (req.method === 'GET' && MEDIA[p]) { const f = path.join(__dirname, 'public', p); if (!fs.existsSync(f)) return send(404, { error: 'No intro video' }); res.writeHead(200, { 'Content-Type': MEDIA[p], 'Cache-Control': 'public, max-age=3600' }); return fs.createReadStream(f).pipe(res); }
    if (req.method === 'GET' && p === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }); return res.end(HTML); }
    if (req.method === 'GET' && p === '/api/meta') return send(200, { sites: SITES, cats: CATS, statuses: STATUSES, hint: HINT, workers: W.map(w => ({ id: w.id, name: w.name, role: w.role, site: w.site })) });
    let m;
    if (req.method === 'GET' && (m = p.match(/^\/api\/worker\/(\w+)$/))) { const v = workerView(m[1], (q.get('mine') || '').split(',')); return v ? send(200, v) : send(404, { error: 'Unknown worker' }); }
    if (req.method === 'GET' && p === '/api/admin') return send(200, adminView(q.get('industry') || '', q.get('site') || ''));
    if (req.method === 'POST' && p === '/api/reports') {
      const b = await body(), w = W.find(x => x.id === b.workerId), text = String(b.text || '').trim().slice(0, 500);
      if (!w || !CATS.includes(b.cat) || !text) return send(400, { error: 'Choose a worker, a type and describe the concern.' });
      const r = { id: 'R' + (++seq), site: w.site, cat: b.cat, text, anon: !!b.anon, by: b.anon ? null : w.id, status: 'Submitted', at: Date.now() };
      R.push(r); return send(201, { id: r.id });
    }
    if (req.method === 'PATCH' && (m = p.match(/^\/api\/reports\/(R\d+)$/))) {
      const b = await body(), r = R.find(x => x.id === m[1]);
      if (!r || !STATUSES.includes(b.status)) return send(400, { error: 'Unknown report or status.' });
      r.status = b.status; return send(200, pub(r));
    }
    send(404, { error: 'Not found' });
  } catch (e) { send(400, { error: e.message }); }
}).listen(PORT, () => console.log('FairShift on :' + PORT));
