// SETTINGS: your reason, start date, re-plan after a break, backup / restore, reset.
import { load, save, exportJSON, importJSON, resetAll, storageWorks } from '../store.js';
import { plan, dayNumber, startDate, dateOf } from '../plan.js';
import { firstUnfinishedDay, replanTarget, shiftFor, replanTo, undoLastShift, shiftSummary } from '../replan.js';
import { esc, fmtDate, todayISO, toast, debounce, plural, diffDays } from '../utils.js';

export function render(root, ctx) {
  const s = load();
  const n = dayNumber();
  const started = n >= 1;
  const target = replanTarget();
  const first = firstUnfinishedDay();
  const shift = shiftFor(target);
  const backupAge = s.lastBackup ? diffDays(s.lastBackup, todayISO()) : null;

  root.innerHTML = `
  <div class="stack">
    <div class="page-head"><h1>Settings</h1><p>Your reason, your dates, your data.</p></div>

    <div class="card">
      <h2>Why I'm doing this</h2>
      <p class="muted small">Write it for the version of you who wants to quit on Day 23. It shows on the Drift page.</p>
      <textarea id="why" rows="4" placeholder="e.g. I want to prove to myself that I can finish something. I want my parents to see me get my first job.">${esc(s.why || '')}</textarea>
    </div>

    <div class="card">
      <h2>Restart after a break (re-plan)</h2>
      ${shift <= 0 ? `<p class="small">You're on track, so there's nothing to re-plan right now. If you fall behind after a break, this moves your dates by exactly your drift.</p>` : ''}
      <p class="small" ${shift <= 0 ? 'hidden' : ''}>You're ${plural(Math.max(0, shift), 'day')} behind (oldest unfinished task: Day ${first}). Re-planning makes today <strong>Day ${target}</strong> and moves every later date by ${plural(Math.max(0, shift), 'day')}. Your progress is kept, and the shift is recorded so you can still see what the break cost.</p>
      <div class="row" style="margin-top:8px">
        <button class="btn primary" id="replan" ${!started || shift <= 0 ? 'disabled' : ''}>Re-plan: today becomes Day ${target}</button>
        <button class="btn" id="undo" ${s.shifts.length ? '' : 'disabled'}>Undo last re-plan</button>
      </div>
      ${!started ? '<p class="tiny" style="margin-top:6px">Available once the challenge has started.</p>' : ''}
      ${s.shifts.length ? `<p class="small muted" style="margin-top:10px">${shiftSummary()}</p>` : ''}
    </div>

    <div class="card">
      <h2>Start date</h2>
      <p class="small">Day 1 is <strong>${fmtDate(startDate(), { year: true })}</strong>, Day 90 is <strong>${fmtDate(dateOf(90), { year: true })}</strong>.</p>
      ${!started ? `<div class="row" style="margin-top:8px"><input type="date" id="start" value="${startDate()}" style="max-width:200px"><button class="btn" id="set-start">Change start date</button></div>`
        : '<p class="tiny">The challenge has started. To change dates now, use re-plan above so the change stays visible.</p>'}
    </div>

    <div class="card">
      <h2>Backup</h2>
      <p class="small">Your progress is saved only in <strong>this browser on this device</strong>. Clearing browser data deletes it. Download a backup every week (Sunday is a good habit).</p>
      ${!storageWorks() ? '<div class="banner bad small">This browser is blocking storage. Download a backup now, or your progress will be lost when you close the tab.</div>' : ''}
      <p class="tiny">${backupAge === null ? 'No backup downloaded yet.' : `Last backup: ${plural(backupAge, 'day')} ago.`}</p>
      <div class="row" style="margin-top:8px">
        <button class="btn primary" id="export">Download backup</button>
        <label class="btn" style="cursor:pointer">Restore from file<input type="file" id="import" accept="application/json,.json" hidden></label>
      </div>
      <p class="tiny" style="margin-top:6px">To use the tracker on your phone too, download a backup here and restore it on the phone (progress doesn't sync on its own).</p>
    </div>

    <div class="card">
      <h2>Reset</h2>
      <p class="small">Deletes all progress in this browser. Download a backup first.</p>
      <button class="btn danger" id="reset">Reset everything</button>
    </div>

    <p class="tiny">Plan version ${plan().meta.version} · generated ${esc(plan().meta.generated)} · Tip: add <kbd>?today=2026-11-20</kbd> to the address to preview another day.</p>
  </div>`;

  root.querySelector('#why').addEventListener('input', debounce(e => { s.why = e.target.value; save(); toast('Saved'); }, 600));
  root.querySelector('#replan').addEventListener('click', () => {
    if (!confirm(`Make today Day ${target}? Every later date moves by ${shift} days.`)) return;
    const d = replanTo(target, 'Re-planned from Settings');
    toast(`Re-planned. Dates moved ${d} days. Today is Day ${target}.`); ctx.rerender();
  });
  root.querySelector('#undo').addEventListener('click', () => {
    const last = undoLastShift(); if (last) { toast(`Undid the ${last.days}-day shift.`); ctx.rerender(); }
  });
  root.querySelector('#set-start')?.addEventListener('click', () => {
    const v = root.querySelector('#start').value;
    if (!v) return;
    s.startDate = v; save(); toast('Start date changed.'); ctx.rerender();
  });
  root.querySelector('#export').addEventListener('click', () => {
    s.lastBackup = todayISO(); save();
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `90-day-backup-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    ctx.rerender();
  });
  root.querySelector('#import').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      importJSON(await file.text());
      toast('Backup restored.'); location.reload();
    } catch (err) { toast(err.message || 'Could not read that file.'); }
  });
  root.querySelector('#reset').addEventListener('click', () => {
    const typed = prompt('Type RESET to delete all progress in this browser.');
    if (typed !== 'RESET') return;
    resetAll(); location.reload();
  });
}
