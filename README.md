# 90-Day Challenge Tracker

My personal tracker for a 90-day job-ready challenge (Day 1 = 1 Nov 2026, Day 90 = 29 Jan 2027): DSA, MERN, aptitude, CS core, communication and job hunting.

The idea: **daily goals feed big goals.** When a day's tasks aren't done, the tracker shows how far the big goal *drifts*: how many days Day 30, 60 and 90 move back, and whether I'll still be test-ready before the January hiring drives.

## Pages

| Page | What it does |
| --- | --- |
| **Today** | Today's tasks (done / done with help / skip), Full, Normal or Minimum day, overdue tasks, 3 wins, energy, notes |
| **Drift** | Days behind, original vs projected milestone dates, hiring-season check, drift chart, which tracks cause the drift, streak |
| **Big Goals** | Overall progress, 3 phases, Day 30/60/90 checklists (LeetCode count, days showed up, applications and mock interviews tracked automatically), my own goals |
| **90 Days** | Heatmap of all 90 days, every overdue task, detail page for any day |
| **Jobs** | Application log with follow-up reminders, portal + eligibility checklist, hiring calendar, referral message template |
| **Practice** | Extra LeetCode counter, mock test log, score trend, most common weak topics |
| **Focus** | 25/5, 50/10, 90/15 focus timer that logs focused minutes |
| **Settings** | Why I'm doing this, re-plan after a break, backup / restore |

## How drift is calculated

```
required = minutes of all tasks on days that are over (catch-up days are buffers)
done     = minutes finished from those days + anything finished early
drift    = (required - done) / minutes in an average day
```

Today's tasks never count against me until the day ends. Catch-up days add no new work, so clearing overdue tasks on those days brings the drift back down. Re-planning after a break moves the dates by the current drift and is recorded, so the lost days stay visible.

## Rules I'm following

1. **Never zero.** A Minimum Day (1 problem + 30 min coding + 10 min speaking) still counts.
2. **Never double up.** Missed work goes to the next catch-up day (every 7th day).
3. **Back after 3+ days?** Re-plan and continue. Don't restart from Day 1.
4. **Days 30, 60, 90 are reviews.** Cut scope, not sleep.

## Run it

It's plain HTML, CSS and JavaScript (ES modules), with no build step.

- **Online:** GitHub Pages serves it straight from the `main` branch.
- **Locally:** run `npx serve .` or `python3 -m http.server` in this folder and open the address it prints. (Double-clicking `index.html` won't work, because browsers block loading `data/plan.json` from a file.)
- **Preview another date:** add `?today=2026-11-20` to the address.

Progress is saved in the browser's localStorage, so it stays on that device only. Download a backup from Settings every week.

## Files

```
index.html          page shell + navigation
css/styles.css      design tokens (light + dark), components
data/plan.json      the 90-day plan: 90 days, 567 tasks, milestones, tracks
js/app.js           router and startup
js/store.js         saving progress (localStorage), backup / restore
js/plan.js          reading the plan + start date
js/drift.js         drift engine, projections, streaks, hiring check
js/replan.js        re-plan + welcome-back screen
js/views/*.js       one file per page
```

Built with help from Claude (Anthropic's AI) as a personal tool. The plan comes from my 90-day challenge notes.
