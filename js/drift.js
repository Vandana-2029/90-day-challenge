// DRIFT ENGINE
// Turns unfinished work into "days your big goal moves back".
//
//   required  = minutes of every task on days that are already over (catch-up days are buffers, not counted)
//   done      = minutes of tasks you finished from those days + anything you finished early from future days
//   backlog   = required - done
//   drift     = backlog / minutes in a typical day      (> 0 = behind, < 0 = ahead)
//
// Today's own tasks never count against you until the day is over.
import { plan, allTasks, isBufferTask, dayNumber, dateOf, startDate, getPlanDay, TOTAL_DAYS } from './plan.js';
import { load, DONE_STATUSES } from './store.js';
import { addDays, diffDays, todayISO, parseISO } from './utils.js';

let CAP = null;

/** Drift below this (about 1 hour of work) counts as on track. */
export const BEHIND = 0.25;

/** Average minutes of planned work on a normal (non catch-up, non review) day. */
export function dailyCapacity() {
  if (CAP) return CAP;
  const normal = plan().days.filter(d => d.type === 'normal');
  CAP = Math.round(normal.reduce((s, d) => s + d.tasks.reduce((a, t) => a + t.minutes, 0), 0) / normal.length);
  return CAP;
}

function doneBy(taskId, asOf) {
  const rec = load().tasks[taskId];
  return rec && DONE_STATUSES.has(rec.status) && rec.at <= asOf;
}

/** Drift as of a given date (default: today). */
export function computeDrift(asOf = todayISO()) {
  const n = dayNumber(asOf);
  const cap = dailyCapacity();
  let required = 0, donePast = 0, doneAhead = 0;
  const byTrack = {};
  for (const t of allTasks()) {
    if (isBufferTask(t)) continue;
    const finished = doneBy(t.id, asOf);
    if (t.day < n) {
      required += t.minutes;
      if (finished) donePast += t.minutes;
      else byTrack[t.track] = (byTrack[t.track] || 0) + t.minutes;
    } else if (t.day > n && finished) {
      doneAhead += t.minutes;
    }
  }
  const backlog = required - donePast - doneAhead;
  const days = backlog / cap;
  return {
    dayNumber: n,
    required, donePast, doneAhead, backlog,
    days,                                     // can be negative (ahead)
    shift: days > BEHIND ? Math.max(1, Math.round(days)) : 0, // whole days the finish date moves
    byTrack,
    cap,
  };
}

/** Total days the plan was re-based ("I restarted after a break"). */
export function shiftedDays() {
  return load().shifts.reduce((s, x) => s + x.days, 0);
}

/** Original and projected calendar date for plan day m. */
export function projection(m, drift = computeDrift()) {
  const original = addDays(plan().meta.startDate, m - 1);
  const planned = dateOf(m);                       // includes re-plans
  const projected = addDays(planned, drift.shift);
  return { original, planned, projected, lateBy: diffDays(original, projected) };
}

/** Dates she showed up: finished at least 1 task, or completed a Minimum Day. */
export function showedUpDates() {
  const s = load();
  const set = new Set();
  for (const rec of Object.values(s.tasks)) if (DONE_STATUSES.has(rec.status)) set.add(rec.at);
  for (const [n, d] of Object.entries(s.days)) {
    const m = d.minimum || {};
    if (m.lc && m.code && m.speak) set.add(d.minDoneOn || dateOf(Number(n))); // date it was done, so re-plans don't move it
  }
  return set;
}

export function streaks(asOf = todayISO()) {
  const set = showedUpDates();
  // current: count back from today; if today isn't done yet, start from yesterday
  let cur = 0;
  let d = set.has(asOf) ? asOf : addDays(asOf, -1);
  const first = [startDate(), plan().meta.startDate].sort()[0]; // count from the original start, even after re-plans
  while (set.has(d) && d >= first) { cur++; d = addDays(d, -1); }
  // longest
  let best = 0, run = 0;
  const end = asOf;
  for (let x = first; x <= end; x = addDays(x, 1)) {
    run = set.has(x) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  // showed-up days inside the challenge window
  const last = addDays(startDate(), TOTAL_DAYS - 1);
  let showed = 0, missed = 0;
  for (let x = first; x <= asOf && x <= last; x = addDays(x, 1)) {
    if (set.has(x)) showed++;
    else if (x < asOf) missed++;
  }
  return { current: cur, longest: best, showed, missed };
}

/** Drift for each past day, for the chart. */
export function driftHistory(asOf = todayISO()) {
  const out = [];
  const start = startDate();
  const n = dayNumber(asOf);
  if (n < 2) return out;
  const last = Math.min(n, TOTAL_DAYS + 30);
  for (let i = 1; i <= last; i++) {
    const date = addDays(start, i - 1);
    out.push({ day: i, date, drift: computeDrift(date).days });
  }
  return out;
}

/** The next catch-up day after today, if any. */
export function nextCatchup(asOf = todayISO()) {
  const n = dayNumber(asOf);
  for (let i = Math.max(1, n); i <= TOTAL_DAYS; i++) {
    if (getPlanDay(i).type === 'catchup') return i;
  }
  return null;
}

// Typical mass-hiring windows for freshers (based on past years; dates vary, always check official portals).
export const HIRING_WINDOWS = [
  { from: '2027-01-01', to: '2027-01-31', label: 'January mass drives', who: 'TCS NQT, Cognizant GenC, Capgemini, LTIMindtree' },
  { from: '2027-02-01', to: '2027-02-28', label: 'February drives', who: 'Infosys, Accenture, IBM, HCLTech' },
];

/** Where the projected test-ready date (Day 60) lands relative to the hiring windows. */
export function hiringVerdict(drift = computeDrift()) {
  const ready = projection(60, drift).projected;
  const jan = HIRING_WINDOWS[0];
  if (ready < jan.from) return { level: 'good', ready, text: `You'd be test-ready before the January drives open.` };
  if (ready <= jan.to) {
    const lost = diffDays(jan.from, ready) + 1;
    return { level: 'warn', ready, text: `You'd be test-ready ${lost} day${lost === 1 ? '' : 's'} into the January drives. You could miss the early tests.` };
  }
  return { level: 'bad', ready, text: `You'd only be test-ready after the January drives. February drives (Infosys, Accenture) would be your first real chance.` };
}

export function isPast(iso) { return parseISO(iso) < parseISO(todayISO()); }
