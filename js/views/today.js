// TODAY: the tasks for today's plan day, day type, Minimum Day checklist, overdue tasks and reflection.
import { plan, dayNumber, currentDay, getPlanDay, phaseOf, allTasks, isBufferTask, dateOf, TOTAL_DAYS } from '../plan.js';
import { getDay, updateDay, setTaskStatus, getTask, isDone, save } from '../store.js';
import { esc, fmtDate, pct, plural, debounce, TRACK_ORDER, toast } from '../utils.js';
import { taskRow, bindTaskRows, bar } from '../components.js';

const DAY_TYPES = [
  { id: 'full', label: 'Full day', hint: 'About 5 hours. Do every block in order: DSA → Build → Aptitude → Learn → Speak → Job.' },
  { id: 'normal', label: 'Normal day', hint: 'About 3.5 hours. 1 DSA problem, 90 min of Build, Aptitude, Speak. Whatever is left goes to the catch-up day.' },
  { id: 'minimum', label: 'Minimum day', hint: 'About 1 hour. The 3 boxes below keep your streak alive. Bad days still count.' },
];

const MIN_ITEMS = [
  { id: 'lc', label: '1 LeetCode problem (the easiest one from today)' },
  { id: 'code', label: '30 minutes of coding' },
  { id: 'speak', label: '10 minutes of speaking out loud' },
];

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => TRACK_ORDER.indexOf(a.track) - TRACK_ORDER.indexOf(b.track));
}

export function overdueTasks(beforeDay) {
  return allTasks().filter(t => t.day < beforeDay && !isBufferTask(t) && !isDone(t.id));
}

export function render(root, ctx) {
  const n = dayNumber();
  const before = n < 1;
  const after = n > TOTAL_DAYS;
  const dayN = currentDay();
  const pd = getPlanDay(dayN);
  const rec = getDay(dayN);
  const phase = phaseOf(dayN);
  const tasks = sortTasks(pd.tasks);
  const doneCount = tasks.filter(t => isDone(t.id)).length;
  const overdue = before ? [] : overdueTasks(dayN);
  const pending = overdue.filter(t => getTask(t.id).status === 'not_started');
  const skipped = overdue.filter(t => getTask(t.id).status === 'skipped');
  const minDone = MIN_ITEMS.filter(m => rec.minimum?.[m.id]).length;
  const type = DAY_TYPES.find(d => d.id === rec.dayType) || DAY_TYPES[0];

  let hero = '';
  if (before) {
    const left = 1 - n;
    hero = `<div class="banner info"><h2>Your challenge starts in ${plural(left, 'day')}</h2>
      <p>Day 1 is ${fmtDate(dateOf(1))}. Here's what Day 1 looks like. You can tick things early if you want a head start.</p></div>`;
  } else if (after) {
    hero = `<div class="banner good"><h2>You reached the end of the 90 days</h2>
      <p>Look at the Big Goals page to see what you achieved. Unfinished tasks are still listed below.</p></div>`;
  }

  root.innerHTML = `
  <div class="stack">
    ${hero}
    <div class="page-head row between">
      <div>
        <h1>Day ${dayN} <span class="muted" style="font-weight:500">of 90</span></h1>
        <p>${fmtDate(dateOf(dayN), { year: true })} · ${esc(phase.name)} · ${esc(pd.theme)}</p>
      </div>
      <div class="row">
        <button class="btn sm" data-nav="${dayN - 1}" ${dayN <= 1 ? 'disabled' : ''} aria-label="Previous day">← Day ${Math.max(1, dayN - 1)}</button>
        <a class="btn sm" href="#/plan">All days</a>
      </div>
    </div>

    <div id="drift-strip"></div>

    ${pd.type === 'catchup' ? `<div class="banner warn"><h3>Catch-up day</h3><p>No new work today. Clear the overdue tasks below. Every one you finish pulls your finish date back.</p></div>` : ''}
    ${pd.type === 'review' ? `<div class="banner info"><h3>Milestone review day</h3><p>Open <a href="#/goals">Big Goals</a> and tick off what you achieved. About 70% is a pass, so keep going either way.</p></div>` : ''}

    <div class="card">
      <div class="card-head">
        <h2>How much energy do you have today?</h2>
        <div class="seg" role="group" aria-label="Day type">
          ${DAY_TYPES.map(d => `<button data-type="${d.id}" class="${d.id === type.id ? 'on' : ''}">${d.label}</button>`).join('')}
        </div>
      </div>
      <p class="muted small">${esc(type.hint)}</p>
      ${type.id === 'minimum' ? `
        <div style="margin-top:8px">
          ${MIN_ITEMS.map(m => `<label class="checkline"><input type="checkbox" data-min="${m.id}" ${rec.minimum?.[m.id] ? 'checked' : ''}> <span>${esc(m.label)}</span></label>`).join('')}
          <p class="small ${minDone === 3 ? 'good-ink' : 'muted'}" style="margin-top:6px">${minDone === 3 ? 'Minimum Day done. Today counts.' : `${minDone} of 3 done`}</p>
        </div>` : ''}
    </div>

    <div class="card">
      <div class="card-head">
        <h2>Today's tasks</h2>
        <span class="muted small">${doneCount} of ${tasks.length} done</span>
      </div>
      ${bar(pct(doneCount, tasks.length))}
      <div style="margin-top:6px" id="today-tasks">${tasks.map(t => taskRow({ ...t, day: dayN })).join('')}</div>
      <p class="tiny" style="margin-top:8px">Grammar topic this week: ${esc(pd.grammarTopic)}</p>
    </div>

    ${overdue.length ? `
    <div class="card">
      <div class="card-head">
        <h2>Overdue <span class="muted" style="font-weight:500">(${pending.length})</span></h2>
        <span class="tiny">Each one adds to your drift. Clear them on catch-up days.</span>
      </div>
      <div id="overdue-tasks">
        ${pending.slice(0, 12).map(t => taskRow(t, { showDay: true })).join('') || '<p class="empty">Nothing overdue. You are on track.</p>'}
      </div>
      ${pending.length > 12 ? `<p class="tiny">${pending.length - 12} more on the <a href="#/plan">90 Days</a> page.</p>` : ''}
      ${skipped.length ? `<details style="margin-top:8px"><summary>Skipped on purpose (${skipped.length})</summary><div id="skipped-tasks">${skipped.map(t => taskRow(t, { showDay: true })).join('')}</div></details>` : ''}
    </div>` : ''}

    <div class="card">
      <h2>End-of-day reflection</h2>
      <p class="muted small">Write 3 small wins. On bad days, read old wins. They show you're improving.</p>
      <div class="grid grid-3" style="margin-top:8px">
        ${[0, 1, 2].map(i => `<input data-win="${i}" placeholder="Win ${i + 1}" value="${esc(rec.wins?.[i] || '')}">`).join('')}
      </div>
      <div class="form-grid" style="margin-top:10px">
        <label class="field">Energy today
          <select data-energy>
            ${['', 'Low', 'Okay', 'Good', 'Great'].map(e => `<option ${rec.energy === e ? 'selected' : ''} value="${e}">${e || 'Choose'}</option>`).join('')}
          </select>
        </label>
      </div>
      <label class="field" style="margin-top:10px">Notes (what I learned, where I got stuck)
        <textarea data-notes placeholder="e.g. Got stuck on the base case; watched the solution, then rewrote it myself.">${esc(rec.notes || '')}</textarea>
      </label>
    </div>
  </div>`;

  // --- events ---
  const rerender = () => ctx.rerender();
  root.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => {
    updateDay(dayN, { dayType: b.dataset.type }); rerender();
  }));
  root.querySelectorAll('[data-min]').forEach(cb => cb.addEventListener('change', () => {
    const minimum = { ...(getDay(dayN).minimum || {}), [cb.dataset.min]: cb.checked };
    updateDay(dayN, { minimum });
    if (MIN_ITEMS.every(m => minimum[m.id])) toast('Minimum Day done. Your streak is safe.');
    rerender();
  }));
  root.querySelectorAll('[data-nav]').forEach(b => b.addEventListener('click', () => {
    location.hash = `#/plan/${b.dataset.nav}`;
  }));
  const onTask = (id, status) => {
    if (status === 'done' || status === 'done_with_help') {
      const left = tasks.filter(t => !isDone(t.id)).length;
      toast(left === 0 ? 'All of today is done. Brilliant.' : 'Nice. One more step.');
    }
    rerender();
  };
  ['today-tasks', 'overdue-tasks', 'skipped-tasks'].forEach(id => {
    const el = root.querySelector('#' + id);
    if (el) bindTaskRows(el, onTask, setTaskStatus);
  });
  const saveWins = debounce(() => {
    updateDay(dayN, { wins: [0, 1, 2].map(i => root.querySelector(`[data-win="${i}"]`).value) });
  });
  root.querySelectorAll('[data-win]').forEach(i => i.addEventListener('input', saveWins));
  root.querySelector('[data-energy]').addEventListener('change', e => updateDay(dayN, { energy: e.target.value }));
  root.querySelector('[data-notes]').addEventListener('input', debounce(e => updateDay(dayN, { notes: e.target.value })));

  ctx.afterRender?.(root, dayN);
  save();
}
