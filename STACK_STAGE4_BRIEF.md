# The Stack — Stage Four Brief (refinements on top of stage 3)

**Repo:** `jackrowe33-stack/thestack` · `index.html` · data version **v6** (no model change needed). Stage 3 is built and live.

**Golden rule:** Change only what's listed. Preserve real data, routines, completions, sync, theme, prompt generator. Back up `index.html` first. Commit in labelled, rollback-able steps. No data migration required. Copper `#b87040` accent; calm over dense.

---

## 1. Today — remove the close/back button entirely
The bottom nav now persists on Today, so the dismiss control is redundant. **Remove the close button** (currently `<button class="close-btn" onclick="closeToday()">⌄</button>` at ~line 623 in `.today-header`). Today is exited via the bottom nav tabs. Keep `closeToday()` defined if other code calls it, but remove the visible button. With the button gone, the header just carries the logo top-right (and date/title as-is) — no left-side control needed.

## 2. Product edit — "add step" must not jump to top
In `addProductStep(id)` (~line 1313), adding a step calls `renderModal()` which resets scroll to the top of the edit sheet. **Preserve scroll position** when adding a step row (capture the sheet's `scrollTop` before re-render, restore it after), and keep focusing the newly added input (the focus logic is already there). The new row should appear in place with the view staying where the user was.

## 3. Home — more breathing room, kill the dead space
Two spacing problems on Home:
- The **streak card + "today isn't done" block feels cramped** on a phone. Give the streak card more vertical padding and internal spacing so the hero feels generous (it's the focal point). Increase `.streak-card` padding and the spacing between the numeral, week-dots, and the next-step line.
- There's **~half a screen of empty space between the Settings pill and the bottom navbar.** The Home content isn't filling the viewport height. Fix the layout so content distributes naturally to the navbar with no large void — either by letting the page fill height and anchoring the Settings pill toward the bottom, or removing the fixed-height assumption causing the gap. No big white gap above the navbar.

## 4. Home — add a "today overview" list + one actionable element
Add a card to Home (this is NEW on Home; note it currently lives on Today — see item 6, where it's being removed from Today):
- **Today overview:** lists ALL routines scheduled for today by name. **Completed routines render greyed out**; incomplete ones in normal text. This previews/explains the day before the user opens Today. (Reuse the existing `overviewRs` logic from the Today version — names joined, but with per-routine completed styling.)
- **Plus one actionable element alongside it** (NOT a product count — Jack explicitly doesn't want vanity stats). Use something the user can act on: the **low-stock line** ("N products running low ›") and/or a "next to reorder" pointer. Actionable, not decorative.

## 5. Today — completed routine keeps the routine-header look (not a pill)
Currently a completed routine collapses into a distinct `.routine-collapsed-row` pill (~lines 75-77, 592-594). Change this so a completed routine **keeps the same visual treatment as the normal routine header**, just collapsed, with an **expand/collapse control (chevron that flips ⌄ ↔ ⌃)**:
- Don't morph it into a differently-shaped pill — same header styling as active routines.
- The chevron toggles expand/collapse both ways (the toggle already works post-stage-3; keep that).
- **Make the touch target larger** — the current collapse button (~line 602) is a tiny `padding:0 4px` glyph. Give it a proper ≥44px tap target.

## 6. Today — remove the "today's routines" overview card
Remove the `today-overview` card from the **Today** screen (CSS ~lines 147-150, render ~lines 614-635, the `overviewHTML` block). Jack finds it unhelpful at the top of Today (you're already doing the routine there). Its function moves to Home (item 4).

## 7. Refresh & Go — open the full Today routine engine
Currently `openRefresh()` (~line 852) opens `{type:'routine-view',id:'skin-refresh'}` — a read-only routine view. Change it so Refresh & Go opens the **same interactive Today runner** used for the daily routine: tickable steps, three-state model, the built-in wait timer — the full engine, **as its own view** (not scrolled within the main Today list, but the Today runner pointed at the Refresh & Go routine). The user should be able to tick steps and use the timer exactly as on Today. Reuse the Today rendering/engine with `skin-refresh` as the target routine rather than duplicating UI.

---

## Verification
- Today: no close button; exits via nav. Header clean, logo top-right.
- Edit a product, add a step → view stays put, new input focused, no jump to top.
- Home: streak hero feels roomy; no dead space above navbar; today-overview lists routines with completed ones greyed; an actionable (low-stock) element present, no product count.
- Today: completed routine looks like a normal routine header (collapsed) with a flipping chevron and a big tap target; expands/collapses both ways.
- Today: old top-of-screen overview card gone.
- Refresh & Go: opens the full interactive runner — ticking + timer work.
- Real data intact; sync round-trips.

## Out of scope
Timer state machine internals, streak scope, v6 model. Streak forgiveness still deferred.
