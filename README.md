# Vet Shift Swap: clickable demo

A single-page demo of a **free** shift-swap tool for a two-location vet practice.
Vanilla HTML/CSS/JS with no build step. Demo data lives in your browser's `localStorage`.

> **All data is fake sample data.** "Dr. Sample A–E", "Location 1/2", the managers and the front desk are placeholders.
> Nothing connects to Cornerstone (IDEXX). Appointments are still moved by hand.

## Run it
Open `index.html` in any browser (double-click it, or `python3 -m http.server` in this folder and go to http://localhost:8000).
Use **Reset demo data** in the footer to start over. Deep links: `#board`, `#vet-swap`, `#manager`, `#desk`.

## What's in the demo
- **Schedule:** week/month view of shifts by vet and location (closed Sundays; Location 2 closed Saturdays).
  Dashed = request pending, outlined = my shifts (Vet view), **orange striped ★ = Available shift** (approved PTO, open for pick-up).
  On phones, chips show the vet letter only.
- **Role switcher** (Vet / Manager / Front desk) at the top, plus a "Signed in as" picker to act as different sample vets.
- **Vet view**
  - **📋 Swap board** (default tab):
    - **★ Available shifts** banner at the top: shifts opened by approved PTO. *Pick up* goes to the manager.
    - **Post a shift** you need swapped, optionally with "dates I could work instead".
    - Colleagues **offer one of their shifts** in return (with a live conflict check) or **offer to just cover** it.
    - The **poster reviews the offers and picks one**. Only then does it go to the manager.
  - **⇄ Direct swap:** pick one of my shifts and a colleague's shift (one step), with a live conflict preview.
  - **🏖 PTO / coverage:** mark one or more shifts as **PTO** (manager approves, then the shift becomes ★ Available), or ask a specific colleague or anyone to cover.
  - **Incoming requests** to accept or decline, plus a nudge when offers on my board posts are waiting for review.
- **Manager view:** approval queue for agreed swaps, picked board offers, PTO requests (with a staffing check: is the location left with no vet?) and Available-shift pick-ups.
  The conflict check flags a vet already working that day, double-booking across locations, a stale schedule, or another pending request on the same shift.
  Approving updates the schedule.
- **Front desk view:** checklist items like *"Move appointments in Cornerstone: Dr. Sample D's appointments on Thu Oct 8 at Location 1 → Dr. Sample B"*, each with a checkbox. The request completes when every line is ticked.
- **Status timeline on every request:**
  - Direct swap / coverage: Requested → Accepted → Approved → Appts moved
  - Swap board: Posted → Offers in → Poster picked → Mgr approved → Appts moved
  - PTO: PTO requested → PTO approved (★ Available) → Picked up → Pickup approved → Appts moved

Screenshots (headless Chromium, 1280×800): `screenshot-vet.png` (direct swap request), `screenshot-board.png` (swap board with Available shifts + offer review), `screenshot-manager.png` (queue with a PTO pick-up and a cross-location conflict), `screenshot-desk.png` (front desk checklist).

## Making it real (still free)
This demo is single-browser only. A shared version needs a shared data store. Two no-cost options:

### Option A: Google Sheets + Apps Script (recommended for this practice)
- Data stays in **the practice's own Google account**: a Sheet with `Shifts`, `Requests` and `Offers` tabs. The manager can read and fix it like a spreadsheet.
- Apps Script serves this same HTML as a web app (`HtmlService`) and reads and writes the Sheet. Optional free email notifications go out via `MailApp` (for example "You have a swap request" or "2 moves to do in Cornerstone").
- Sign-in uses the staff's Google accounts (Workspace) or "anyone with the link" plus a simple name picker.
- **Pros:** $0, no new vendor, the data owner is the practice, easy export and audit, a manager can edit shifts directly in the Sheet.
- **Cons:** slower (~1–2 s per action), Apps Script quotas (fine for ~10 staff), concurrency needs `LockService`, the UI lives under a script.google.com URL, and it's less polished on mobile. Someone has to maintain the script.

### Option B: Firebase (Firestore + Auth) or Supabase (Postgres + Auth) free tier
- Host the static page free (Firebase Hosting, Netlify or GitHub Pages) and store data in Firestore or Supabase.
- **Pros:** real-time updates across phones, proper auth (email magic links), faster, scales well past this practice's size, row-level security (Supabase).
- **Cons:** data sits with a third-party vendor in a developer's account rather than the practice's. Free-tier limits and policies can change (Supabase pauses free projects after inactivity). It needs a bit more developer setup (security rules or RLS), and non-technical staff can't just open a spreadsheet to fix things.

**In either case** the Cornerstone step stays manual (there's no integration). The tool only produces the front desk checklist and tracks that it got done. The schedule would still need to be seeded or kept in sync with Cornerstone, for example by the manager pasting the monthly shift grid into the Sheet.

## Files
- `index.html`: layout and role switcher
- `styles.css`: styling (responsive at ≤900 px)
- `app.js`: sample data, swap/board/PTO workflow, conflict checks, rendering
- `screenshot-*.png`: screenshots
