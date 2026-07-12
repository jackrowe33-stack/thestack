# The Stack — Stage Five Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · data version **v6** (no model change). Stages 1–4 are live.

**Golden rule:** Change ONLY what's specified. Preserve all real data, routines, completions, sync, theme, prompt generator. Back up `index.html` first. Commit in labelled, rollback-able steps. Verify real data intact and sync round-trips after.

**IMPORTANT — read before coding item 1:** The previous Home rebuild did NOT do what was asked and produced a poor result. This time the Home layout is specified exactly: the precise cards, their order, their data sources, and their internal structure. Follow it literally. Do not improvise alternative layouts, do not merge or reorder cards, do not invent new elements. If something is ambiguous, keep it simple and match the described structure rather than guessing.

---

## 1. Home screen — EXACT layout (rebuild `vHome`)

The Home screen, top to bottom, is exactly these elements in this order. Each is a separate visual card unless stated. Use existing theme tokens (`--card`, `--card-edge`, `--cu`, `--ink`, `--ink-mid`, `--ink-soft`). Reference: agreed mockup.

**(a) Header** — date on the LEFT (`--ink-soft`, ~13px), "The Stack" wordmark on the RIGHT. Same top padding/height as it currently is on Home — this is the reference height for all other screens (see item 2).

**(b) Streak card — ITS OWN CARD, streak only.** Contains ONLY:
   - Large copper numeral (the streak count) + "day streak" label beside it.
   - The seven-dot week strip below (filled copper = day complete; today-incomplete = hollow with copper outline).
   - Generous padding — this is the hero, give it room.
   - The WHOLE card is tappable → `openToday()`.
   - **Do NOT put the "Today isn't done" text or "Open Today" button or next-step line inside this card.** Those move to card (c). The streak card is purely the streak number + week dots.

**(c) Today summary card — ITS OWN SEPARATE SUB-CARD, directly below the streak card.** This is the day's routine summary + reminder combined. Contains:
   - A header row: left = status text ("Today isn't done yet", or "All done for today ✓" when complete); right = "Open Today →" in copper, tappable → `openToday()`.
   - Below the header row, a **list of ALL routines scheduled for today** — across EVERY category (skin, hair, scent if scheduled, supplements) — NOT just skin. Use `scheduledForDay(day)` to get the full list (the existing function that already returns all scheduled routines), not the hardcoded skin/hair-only `overviewRs` from the old Today overview.
   - Each routine row shows: the routine name + its **estimated time** (sum of that routine's step waits, formatted as minutes, e.g. "~6 min"). Completed routines render **greyed out and struck through**; incomplete routines in normal `--ink` text.
   - At the foot of this card, a total: "~X min remaining" summing estimated time of all INCOMPLETE routines today. (This replaces the separate next-step line — the per-routine times plus this total give the same info more clearly.)

**(d) Scent card** — icon in a soft copper circle, "TODAY'S SCENT" overline, scent name, context tag pill on the right. (Existing recommended-scent logic.)

**(e) Refresh & Go card** — icon + name + one-line sub + chevron → `openRefresh()`.

**(f) Low-stock line** — copper text "N products running low ›" with a small alert icon, ONLY when something is low; absent otherwise.

**(g) Settings** — small self-sized pill tucked BOTTOM-RIGHT (not full width), recessed grey, gear + "Settings".

**Layout:** the page must FILL to the bottom navbar — no large empty gap between the Settings pill and the navbar. Use a flex column that grows, with a spacer pushing the Settings pill toward the bottom. Test on a real phone viewport.

**Helper to add:** a function that returns a routine's estimated minutes = `Math.round(sum of activeSteps(r.steps) waits / 60)` (waits are in seconds). Reuse for both per-row times and the remaining-total.

---

## 2. Today screen — remove top white space, match Home logo height
The Today header currently has `padding:52px 22px 4px` (`.today-header`, ~line 109) creating excessive white space at the top. Reduce the top padding so the **logo begins at the SAME vertical height as on the Home screen.** Match Home's header top padding exactly. The logo position (top-right) stays.

## 3. Today — supplements must respect morning/evening type
**Bug:** supplement routines always render at the very bottom (after the evening section), regardless of their `type`. See the supplements block (~line 690) which appends after `#section-evening` and ignores `r.type`.
**Fix:** a supplement routine with `type==='morning'` must render in the **morning section** (`#section-morning`), and `type==='evening'` in the evening section — same as skin/hair. Pull scheduled supplement routines for the day, split by `type`, and render morning supplements inside the morning section and evening supplements inside the evening section, each with its own labelled sub-header ("Supplements — [name] · Morning/Evening") matching the `routineSection` pattern. Remove the always-bottom supplements block.

## 4. Today — hair look selector missing in some contexts
**Bug:** the hair-look selector (~line 661) only renders `if(hairMR)` — i.e. only when a MORNING hair routine is scheduled that day. On days without a morning hair routine the selector disappears, which is why it shows on some dates (e.g. yesterday) but not today.
**Fix:** show the hair-look selector whenever there are looks defined (`DB.hairLooks` non-empty) AND any hair routine (morning OR evening) is scheduled that day — not gated solely on `hairMR`. Render it in the section appropriate to where hair appears. The selector and its chosen look's checklist should appear consistently regardless of which hair routine (morning/evening) is on for the day.

## 5. Routines tab — edit button when a routine is open
When you open a routine from the Routines tab (the `{type:'routine-view',id:...}` modal), add an **Edit button at the bottom** of that view that takes you into editing that routine (jump to the routine editor in Setup, e.g. `UI.tab='setup'` + open that routine's edit page, or open the existing routine-edit modal). Currently the routine-view is read-only with no way to edit from there.

## 6. Routines tab — remove the Scent category
Remove **Scent** from the Routines tab category control. The category list `[['skin','Skin'],['hair','Hair'],['scent','Scent'],['supplements','Supplements']]` (~line 855 in `vRoutines`) becomes `[['skin','Skin'],['hair','Hair'],['supplements','Supplements']]`. (Scent is accessed via the Home scent card / scent screen, not as a routine category.) Ensure removing it doesn't break the default `UI.routinesCat`.

## 7. Routine-view modal — reliable close + swipe-to-dismiss
**Bug:** the close button on the open routine view (from the Routines tab) doesn't always work.
**Fix two things:**
   - Make the **close button reliably dismiss** the routine-view modal every time (check the handler clears `UI.modal` and re-renders; ensure no stale state or event issue prevents it).
   - Add **swipe-down-to-dismiss** on the routine-view card — a downward swipe gesture on the card closes it (same as pressing close). Standard bottom-sheet dismiss behaviour.

---

## Verification (hands-on, on a real phone)
- **Home:** streak is its own card (number + dots only); a separate Today summary card below it lists ALL today's routines (every category) with per-routine est. time, completed ones greyed/struck, and a "~X min remaining" total; scent card; Refresh & Go; low-stock only when low; Settings pill bottom-right; NO big gap above navbar.
- **Today:** logo starts at same height as Home (no big top white space).
- **Today:** a morning-type supplement routine appears in the MORNING section, not at the bottom.
- **Today:** hair look selector appears whether the day has a morning or evening hair routine.
- **Routines:** opening a routine shows an Edit button at the bottom that reaches the editor.
- **Routines:** no Scent category; Skin/Hair/Supplements only.
- **Routines:** routine-view closes every time via button AND via swipe-down.
- Real data intact; sync round-trips.

## Out of scope
Timer state machine internals, streak scope logic, v6 model. Streak forgiveness still deferred.
