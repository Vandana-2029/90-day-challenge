// Entry point. Loads the plan data and shows a placeholder until the views are built.
async function boot() {
  const app = document.getElementById('app');
  try {
    const res = await fetch('data/plan.json');
    const plan = await res.json();
    app.innerHTML = `<h1>${plan.meta.title}</h1>
      <p class="muted">${plan.days.length} days loaded. Views are coming next.</p>`;
  } catch (err) {
    app.innerHTML = `<p>Could not load the plan. Open this site through a web server (GitHub Pages or <kbd>npx serve</kbd>), not by double-clicking the file.</p>`;
  }
}
boot();
