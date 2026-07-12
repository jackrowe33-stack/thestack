# The Stack — Stage Three Build Brief

**Repo:** `jackrowe33-stack/thestack` · single file `index.html` · currently at data version **v6** (live on `main`).

**Golden rule:** Change only what's specified here. Preserve all real product data, routines, completions, sync, theme, and the prompt generator. No data-model migration is required for this stage (no new persisted fields except the optional scent routine, which reuses the existing routine structure). Back up `index.html` to a temp copy before editing. Commit in labelled, rollback-able stages. Verify the app loads with real data intact before and after.

**Theme reminder:** copper `#b87040` (dark) / `#8c5430` (light) on dark base `#121418`. Copper is the only accent; everything else muted. Calm over dense.

---

## A. Today screen fixes

### A1. Completed routines — expand/collapse is broken
Completed routines collapse by default (correct), but once expanded they **cannot be collapsed again**. Fix the toggle so tapping a collapsed routine expands it AND tapping an expanded (completed) routine collapses it back. It must toggle both directions. State lives in `UI.todayExpanded` (already present) — ensure the click handler flips the boolean rather than only setting it true.

### A2. Close button → top-left, clearer affordance
The close control (`closeToday()`, currently `⌄` at line ~610 in `.today-header`) should:
- Move to **top-left** of the Today header.
- Stay a **downward chevron / dismiss arrow** (Jack confirmed the arrow is nicer than an X) — but make it visually clearer it's a dismiss control (slightly larger, clear tap target ≥44px, maybe a subtle circular backing).
- The Stack **logo moves to the top-right** of the header (see section E).

### A3. Today routines-overview card
Add a card near the top of the Today screen (below the header, above the routine steps) that gives a **quick overview of today's routines** — list the names of the routines scheduled for today (e.g. "Morning · Evening B — Retinol · Daily hair") as a glanceable summary. Calm, muted card treatment; not interactive beyond optionally scrolling to a section. This is an at-a-glance "what am I doing today" card.

---

## B. Home screen — final layout

Rebuild Home to this exact top-to-bottom order (see the agreed mockup):

1. **Header:** date top-left, "The Stack" logo top-right (section E).
2. **Streak hero card** (the focal point):
   - Large copper numeral + "day streak" label.
   - Seven-dot week strip (filled copper = completed; today incomplete = hollow with copper outline).
   - Divider, then a row: "Today isn't done yet" (left) + "Open Today →" in copper (right) — tapping anywhere on this card/row calls `openToday()`.
   - **Below that, a second muted line:** `Next: [next incomplete routine name]` · clock icon · `~X min remaining` where X = **total estimated time across all still-incomplete routines today** (not just the next one). When the day is complete, replace the whole bottom block with a quiet "All done for today ✓" and drop the next-step line.
3. **Scent card:** icon in a soft copper circle, "TODAY'S SCENT" overline, scent name, and the scent's context tag (e.g. "weekday") as a small pill on the right. (Keep the existing recommended-scent logic.)
4. **Refresh & Go shortcut card:** icon + name + one-line sub + chevron; opens the Refresh & Go routine.
5. **Low-stock whisper:** single copper text line "N products running low ›" ONLY when something is actually low; absent otherwise.
6. **Settings:** a small self-sized pill **tucked bottom-right** (not full-width) — gear icon + "Settings" label, recessed grey (`#4a4a54`-ish), quiet surface. Opens the existing settings pages.

Remove from Home: any product stats/counts. (Streak, scent, Refresh & Go, low-stock-when-low, settings are the only elements.)

---

## C. Routines screen

### C1. "Add a routine" button
Add a clear **"+ Add routine"** button on the Routines screen (top or foot of the routine list for the selected category). It navigates to the **settings area** where routines are created/edited (`UI.tab='setup'` + the relevant routine-builder page). It should pre-select the currently viewed category if the builder supports it.

---

## D. Scent screen (rebuild from original)

### D1. Scent detail/inventory screen on tap
When the scent icon/card is tapped (the Home scent card, and/or the Scent category), open a dedicated **scent screen** showing the **scent inventory**: each scent with its **description** and its **tags** displayed (e.g. weekday / office / evening / occasion). This screen existed in an earlier version — rebuild it: a clean scrollable list of scent products, each showing name, brand, description (`why`/`notes`), and tag pills. Read-only list; tapping a scent opens its product info card (section F).

### D2. Scent routine builder in Settings
In Settings, add the ability to **build a scent routine** (Jack may not use it, but wants the option). Reuse the existing routine structure with `wait:0` throughout (scents don't layer with timed waits). The recommended-scent card on Home stays regardless — this is additive, not a replacement.

---

## E. The Stack logo — consistent placement everywhere

Place "The Stack" wordmark logo in the **top-right corner**, in the **same position and same size** on every screen: Home, Today, Routines, the new Scent screen, and the Setup/Settings screen. Use the existing voice/serif treatment. Back/close icons go top-left; logo goes top-right — consistent across all screens. Build a single shared header component/pattern so placement and size can't drift between screens.

---

## F. Product info card (the detail sheet)

### F1. Edit buttons restored
The product info card that pops up from the Today screen (the ⓘ detail sheet) must include the **edit buttons from the previous build** — i.e. the ability to jump into editing that product (edit fields, mark restocked, etc.), matching the edit affordances that existed before. Don't lose edit access from the detail sheet.

### F2. Hide empty fields
On the info card, **show only fields that have content; hide any empty field entirely.** No blank labels, no "—" placeholders. If `notes`, `link`, `next`, `steps`, etc. are empty, omit their rows. Render only populated fields.

### F3. Inventory tap → read-only first, then edit
In the inventory screens, tapping a product should open the **read-only info card first** (same card as F1/F2), which then has the **same edit button** to enter edit mode. So the flow is: tap product → read-only detail → (edit button) → edit form. Currently inventory may jump straight to edit or straight to read-only without the edit affordance — unify it so both Today's ⓘ sheet and inventory taps lead to the same read-only-then-edit card.

---

## Verification (hands-on)
- Today: completed routine collapses, expands, AND collapses again. Close arrow top-left dismisses. Overview card lists today's routines. Logo top-right.
- Home: streak hero with next-step + total-remaining line; scent card with tag pill; Refresh & Go opens; low-stock only when low; Settings pill bottom-right opens settings.
- Routines: "Add routine" reaches the settings builder.
- Scent screen: opens from tap, shows descriptions + tags; tapping a scent opens its info card.
- Settings: scent routine can be built (wait:0); existing settings intact.
- Info card: edit buttons present from both Today's ⓘ and inventory tap (read-only → edit); empty fields hidden.
- Logo identical position/size on Home, Today, Routines, Scent, Setup.
- Real product data intact throughout; sync still round-trips.

## Out of scope
- No changes to the timer state machine, streak scope settings, or the v6 data model beyond the optional scent routine.
- Streak forgiveness mechanic still deferred.
