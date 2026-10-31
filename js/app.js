// Entry point: loads the plan, then routes between pages using the URL hash (#/today, #/plan/12 ...).
import { load, save } from './store.js';
import { loadPlan, dayNumber, TOTAL_DAYS } from './plan.js';
import * as today from './views/today.js';

const routes = { today };

const app = document.getElementById('app');

function applyTheme() {
  const t = load().theme;
  if (t) document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}

function updatePill() {
  const n = dayNumber();
  const pill = document.getElementById('day-pill');
  if (n < 1) pill.textContent = `Starts in ${1 - n}d`;
  else if (n > TOTAL_DAYS) pill.textContent = 'Finished';
  else pill.textContent = `Day ${n} / 90`;
}

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'today', params: parts.slice(1) };
}

function render() {
  const { name, params } = parseHash();
  const view = routes[name];
  document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.route === name));
  updatePill();
  if (!view) {
    app.innerHTML = `<div class="card"><h2>Coming soon</h2><p class="muted">This page is still being built.</p></div>`;
    return;
  }
  view.render(app, { params, rerender: render });
}

async function boot() {
  load();
  applyTheme();
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const s = load();
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!s.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    s.theme = dark ? 'light' : 'dark';
    save();
    applyTheme();
  });
  try {
    await loadPlan();
  } catch (err) {
    app.innerHTML = `<div class="banner bad"><h2>Could not load the plan</h2>
      <p>Open this site through a web server (GitHub Pages, or run <kbd>npx serve</kbd> in this folder), not by double-clicking index.html.</p></div>`;
    return;
  }
  window.addEventListener('hashchange', () => { render(); app.focus({ preventScroll: true }); window.scrollTo(0, 0); });
  render();
}

boot();
