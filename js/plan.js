// Helpers for reading the static plan (data/plan.json) together with the start date.
import { load } from './store.js';
import { addDays, diffDays, todayISO } from './utils.js';

let PLAN = null;

export async function loadPlan() {
  const res = await fetch('data/plan.json');
  if (!res.ok) throw new Error('plan.json not found');
  PLAN = await res.json();
  const s = load();
  if (!s.startDate) s.startDate = PLAN.meta.startDate;
  return PLAN;
}

export function plan() { return PLAN; }
export const TOTAL_DAYS = 90;

export function startDate() { return load().startDate || PLAN.meta.startDate; }

/** Calendar date of plan day n (1-based). */
export function dateOf(n) { return addDays(startDate(), n - 1); }

/** Plan day number for a date. Can be < 1 (not started) or > 90 (finished). */
export function dayNumber(iso = todayISO()) { return diffDays(startDate(), iso) + 1; }

/** Today's plan day, clamped to 1..90 for display. */
export function currentDay() { return Math.min(TOTAL_DAYS, Math.max(1, dayNumber())); }

export function getPlanDay(n) { return PLAN.days[n - 1]; }

export function phaseOf(n) { return PLAN.phases.find(p => n >= p.startDay && n <= p.endDay); }

export function allTasks() {
  return PLAN.days.flatMap(d => d.tasks.map(t => ({ ...t, day: d.day, dayType: d.type })));
}

/** Catch-up days are buffers: their own tasks don't count as required work. */
export function isBufferTask(t) { return t.dayType === 'catchup'; }

export function track(id) { return PLAN.tracks.find(t => t.id === id); }
