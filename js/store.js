// All progress lives in this browser's localStorage under one key.
// The plan itself (data/plan.json) is never changed, so updating the plan never wipes progress.
import { todayISO, toast } from './utils.js';

const KEY = 'ndc-tracker-v1';
export const DONE_STATUSES = new Set(['done', 'done_with_help']);

function defaults() {
  return {
    version: 1,
    startDate: null,        // set from plan.meta.startDate on first load
    tasks: {},              // taskId -> { status, at: 'YYYY-MM-DD' }
    days: {},               // planDay -> { dayType, minimum: {lc, code, speak}, notes, wins: [], energy }
    milestones: {},         // milestone item id -> true
    apps: [],               // job applications
    mocks: [],              // aptitude / coding / interview mock results
    lcExtra: 0,             // contests, re-solves, daily problems not in the plan
    portals: {},            // portal id -> true when registered
    focus: {},              // 'YYYY-MM-DD' -> minutes focused
    why: '',                // her reason for doing this
    shifts: [],             // [{ on, days, reason }] each time the plan was re-based
    lastActive: null,
    theme: null,
  };
}

let memory = null;
let storageOk = true;

export function load() {
  if (memory) return memory;
  let saved = null;
  try {
    const raw = localStorage.getItem(KEY);
    saved = raw ? JSON.parse(raw) : null;
  } catch {
    storageOk = false;
  }
  memory = { ...defaults(), ...(saved || {}) };
  return memory;
}

export function save() {
  if (!memory) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    if (storageOk) toast('Could not save in this browser. Export a backup from Settings.');
    storageOk = false;
  }
}

/** Record that she did something today (used for the welcome-back screen). */
export function touch() {
  load().lastActive = todayISO();
  save();
}

export function getTask(id) {
  return load().tasks[id] || { status: 'not_started' };
}

export function setTaskStatus(id, status) {
  const s = load();
  if (status === 'not_started') delete s.tasks[id];
  else s.tasks[id] = { status, at: todayISO() };
  touch();
}

export function isDone(id) {
  return DONE_STATUSES.has(getTask(id).status);
}

export function getDay(n) {
  const s = load();
  if (!s.days[n]) s.days[n] = { dayType: 'full', minimum: {}, notes: '', wins: ['', '', ''], energy: '' };
  return s.days[n];
}

export function updateDay(n, patch) {
  Object.assign(getDay(n), patch);
  touch();
}

export function exportJSON() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), key: KEY, data: load() }, null, 2);
}

export function importJSON(text) {
  const parsed = JSON.parse(text);
  const data = parsed.data || parsed;
  if (typeof data !== 'object' || !data.tasks) throw new Error('This file is not a tracker backup.');
  memory = { ...defaults(), ...data };
  save();
}

export function resetAll() {
  memory = defaults();
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function storageWorks() {
  return storageOk;
}
