// JOBS: hiring calendar from research, portal + eligibility checklist, application log with follow-ups, referral template.
import { load, save, touch } from '../store.js';
import { esc, fmtDate, todayISO, addDays, uid, toast, diffDays } from '../utils.js';
import { stat } from '../components.js';

const PORTALS = [
  { id: 'tcs', name: 'TCS NextStep (choose the IT category, then "Apply for Drive")', url: 'https://nextstep.tcs.com/' },
  { id: 'infosys', name: 'Infosys careers', url: 'https://www.infosys.com/careers/' },
  { id: 'cognizant', name: 'Cognizant careers (GenC)', url: 'https://careers.cognizant.com/' },
  { id: 'accenture', name: 'Accenture India careers', url: 'https://www.accenture.com/in-en/careers' },
  { id: 'capgemini', name: 'Capgemini India careers', url: 'https://www.capgemini.com/in-en/careers/' },
  { id: 'naukri', name: 'Naukri profile + job alerts', url: 'https://www.naukri.com/' },
  { id: 'linkedin', name: 'LinkedIn profile + job alerts', url: 'https://www.linkedin.com/jobs/' },
  { id: 'wellfound', name: 'Wellfound (startups)', url: 'https://wellfound.com/' },
];

const ELIGIBILITY = [
  { id: 'elig-10', name: '10th marks are 60% or more' },
  { id: 'elig-12', name: '12th marks are 60% or more' },
  { id: 'elig-deg', name: 'Degree marks are 60% (6.0 CGPA) or more' },
  { id: 'elig-backlog', name: 'No active backlogs' },
];

const CALENDAR = [
  { when: 'Nov 2026', what: 'Last push before year-end. Mostly product companies; good month to finish your resume and portal profiles.' },
  { when: 'Dec 2026', what: 'Quiet month. Prepare: mocks, DSA, referrals. A few companies (Zoho, Freshworks, Nagarro, startups) post early.' },
  { when: 'Jan 2027', what: 'Largest mass IT drives: TCS NQT (Ninja / Digital / Prime), Cognizant GenC, Capgemini, LTIMindtree, Persistent, Virtusa.' },
  { when: 'Feb 2027', what: 'TCS NQT registrations + Infosys (SE / DSE / Power Programmer), Accenture, IBM, HCLTech, DXC, NTT Data.' },
];

const STATUSES = ['Applied', 'Test scheduled', 'Test done', 'Interview', 'Offer', 'Rejected', 'No response'];
const FINAL = new Set(['Offer', 'Rejected']);
const SOURCES = ['Company portal', 'LinkedIn', 'Naukri', 'Referral', 'Wellfound', 'Mass drive', 'Other'];

const TEMPLATE = `Hi [Name], I'm Vandana, a 2026 B.Tech graduate from MIET. I saw you work at [Company] as [Role]. I've been building MERN projects (live link: [link]) and practising DSA in C++. I'm applying for the [Job title] role ([job link]). Would you be open to referring me? I've attached my resume. Thank you for your time!`;

export function render(root, ctx) {
  const s = load();
  const today = todayISO();
  const apps = [...s.apps].sort((a, b) => b.date.localeCompare(a.date));
  const due = apps.filter(a => a.followUp && a.followUp <= today && !FINAL.has(a.status));
  const weekAgo = addDays(today, -6);
  const count = st => apps.filter(a => a.status === st).length;

  root.innerHTML = `
  <div class="stack">
    <div class="page-head"><h1>Jobs</h1><p>Where to apply, when the big drives happen, and every application you send.</p></div>

    <div class="grid grid-4">
      ${stat('Applications', apps.length, `${apps.filter(a => a.date >= weekAgo).length} in the last 7 days`)}
      ${stat('Referral requests', apps.filter(a => a.source === 'Referral').length, 'target: 20+ by Day 90')}
      ${stat('Tests + interviews', count('Test scheduled') + count('Test done') + count('Interview'), `${count('Interview')} interviews`)}
      ${stat('Offers', count('Offer'), count('Offer') ? 'Well done!' : 'it only takes one')}
    </div>

    ${due.length ? `<div class="banner warn"><h3>${due.length} follow-up${due.length > 1 ? 's' : ''} due</h3><p class="small">${due.map(a => esc(a.company)).join(', ')}. Send a short, polite message or check the portal.</p></div>` : ''}

    <div class="card">
      <h2>Log an application</h2>
      <form id="app-form" class="form-grid">
        <label class="field">Company<input name="company" required placeholder="e.g. TCS"></label>
        <label class="field">Role<input name="role" placeholder="e.g. Ninja / Digital"></label>
        <label class="field">Source<select name="source">${SOURCES.map(x => `<option>${x}</option>`).join('')}</select></label>
        <label class="field">Date<input type="date" name="date" value="${today}"></label>
        <label class="field">Follow up on<input type="date" name="followUp" value="${addDays(today, 7)}"></label>
        <label class="field">Link<input name="link" placeholder="job or portal link"></label>
        <button class="btn primary" type="submit">Add</button>
      </form>
    </div>

    <div class="card">
      <div class="card-head"><h2>My applications</h2><span class="tiny">Rows turn yellow when a follow-up is due</span></div>
      ${apps.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Company</th><th>Role</th><th>Source</th><th>Applied</th><th>Status</th><th>Follow up</th><th></th></tr></thead>
        <tbody>${apps.map(a => `<tr class="${due.includes(a) ? 'due' : ''}">
          <td><strong>${a.link ? `<a href="${esc(a.link)}" target="_blank" rel="noopener">${esc(a.company)}</a>` : esc(a.company)}</strong></td>
          <td>${esc(a.role || '')}</td>
          <td class="small">${esc(a.source)}</td>
          <td class="small">${fmtDate(a.date, { weekday: false })}</td>
          <td><select data-status="${a.id}" aria-label="Status">${STATUSES.map(x => `<option ${x === a.status ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
          <td class="small">${a.followUp && !FINAL.has(a.status) ? `${fmtDate(a.followUp, { weekday: false })}${a.followUp <= today ? ' · due' : ` · in ${diffDays(today, a.followUp)}d`}` : '—'}
            ${a.followUp && !FINAL.has(a.status) ? `<button class="btn sm" data-snooze="${a.id}" title="Followed up; remind me again in 7 days">done +7d</button>` : ''}</td>
          <td><button class="btn sm danger" data-del="${a.id}" aria-label="Delete">✕</button></td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="empty">No applications yet. Your first one is the hardest. Log it here.</p>'}
    </div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Before January: get ready</h2>
        <p class="small muted">Profiles take time and drives fill up fast. Plan Day 26.</p>
        ${PORTALS.map(p => `<label class="checkline"><input type="checkbox" data-portal="${p.id}" ${s.portals[p.id] ? 'checked' : ''}><span>${esc(p.name)} <a href="${p.url}" target="_blank" rel="noopener">open ↗</a></span></label>`).join('')}
        <h3 style="margin-top:14px">Eligibility check</h3>
        <p class="small muted">Most mass drives ask for these. TCS has usually allowed a total gap of up to 24 months, so your gap is fine.</p>
        ${ELIGIBILITY.map(p => `<label class="checkline"><input type="checkbox" data-portal="${p.id}" ${s.portals[p.id] ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}
      </div>
      <div class="card">
        <h2>Hiring calendar</h2>
        <ul class="clean">${CALENDAR.map(c => `<li><strong>${c.when}</strong><div class="small muted">${esc(c.what)}</div></li>`).join('')}</ul>
        <p class="tiny" style="margin-top:8px">Typical pattern from past years (sources: Let's Code calendar, Weekday, OwnYourCareer; researched 31 Oct 2026). Always confirm dates on the official portal. Registration is free, so never pay anyone for a job or test slot.</p>
        <h3 style="margin-top:14px">Test pattern to practise for</h3>
        <ul class="small">
          <li><strong>TCS NQT:</strong> about 190 min. Numerical, verbal and reasoning, then advanced quant + 2–3 coding problems. No negative marking.</li>
          <li><strong>Cognizant GenC:</strong> aptitude, reasoning, verbal, coding (Next/Elevate) and an automated spoken-English test.</li>
        </ul>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h2>Referral message template</h2><button class="btn sm" id="copy-tpl">Copy</button></div>
      <p class="small" style="white-space:pre-wrap" id="tpl">${esc(TEMPLATE)}</p>
      <p class="tiny">Fill in the brackets. Send it to MIET seniors first: they're the most likely to reply.</p>
    </div>
  </div>`;

  root.querySelector('#app-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    s.apps.push({ id: uid(), company: f.company.trim(), role: f.role.trim(), source: f.source, date: f.date || today, followUp: f.followUp, link: f.link.trim(), status: 'Applied' });
    touch(); toast('Application logged. That counts.'); ctx.rerender();
  });
  root.querySelectorAll('[data-status]').forEach(sel => sel.addEventListener('change', () => {
    const a = s.apps.find(x => x.id === sel.dataset.status); a.status = sel.value; touch(); ctx.rerender();
  }));
  root.querySelectorAll('[data-snooze]').forEach(b => b.addEventListener('click', () => {
    const a = s.apps.find(x => x.id === b.dataset.snooze); a.followUp = addDays(today, 7); touch(); ctx.rerender();
  }));
  root.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    if (!confirm('Delete this application?')) return;
    s.apps = s.apps.filter(x => x.id !== b.dataset.del); save(); ctx.rerender();
  }));
  root.querySelectorAll('[data-portal]').forEach(cb => cb.addEventListener('change', () => {
    s.portals[cb.dataset.portal] = cb.checked; touch();
  }));
  root.querySelector('#copy-tpl').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(TEMPLATE); toast('Copied'); } catch { toast('Select the text and copy it manually'); }
  });
}
