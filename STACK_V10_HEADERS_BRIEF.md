# The Stack — V10 Brief: Header Alignment (Today + Routines)

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6.
**Golden rule:** Header alignment only. Back up first. One labelled commit. **Bump BUILD** (e.g. `'2026-06-28 · v10-headers'`). **Commit AND push to main.**

**Reference:** Home's header is correct — match it exactly. Home uses `.top`:
`padding: calc(env(safe-area-inset-top,0px) + 12px) 22px 8px; display:flex; justify-content:space-between; align-items:flex-end;` with the date on the LEFT and `.wordmark` on the RIGHT.

## Problem 1 — Today header (logo position + completion info placement)
The Today header (`out` ~line 651, and the single-routine variant ~line 622) uses `<div class="today-header" style="justify-content:flex-end">` with BOTH the logo and the "${done}/${total} routines complete" text stacked in a right-aligned column. This puts the logo in the wrong place and the completion info on the right.

**Fix:**
- Today header must use **`space-between`** (not `flex-end`), matching Home.
- **Logo top-RIGHT** (`.wordmark`), identical position/size to Home.
- **"${done}/${total} routines complete" moves to the LEFT slot** (where Home's date sits), left-aligned, same muted styling.
- `.today-header` CSS (line 106): change bottom padding from `4px` to `8px` so it matches `.top` exactly. Top padding already matches (safe-area + 12px). Result: logo starts at the SAME height as Home.
- Apply to BOTH the main Today header (~651) and the single-routine/Refresh runner header (~622). For the single-routine one, put the routine name in the left slot and the logo right, using space-between.

## Problem 2 — Routines header (hardcoded padding → wrong logo height)
The Routines header (~line 946) uses inline `padding:52px 22px 8px` instead of the safe-area calc, so its logo sits at a different height than Home/Today.

**Fix:**
- Change the Routines header to use the **same padding as `.top`**: `calc(env(safe-area-inset-top,0px) + 12px) 22px 8px`, `display:flex; justify-content:space-between; align-items:flex-end`. Simplest: give it `class="top"` and put the "Routines" `<h1>` in the left slot and `.wordmark` in the right slot.
- Logo top-right, identical to Home.

## Consistency check (do this for ALL screens while here)
Audit every screen's header — Home, Today, Routines, Scent, Setup/Settings — and ensure each uses the identical top padding (`calc(env(safe-area-inset-top,0px) + 12px) 22px 8px`), `space-between`, `align-items:flex-end`, logo top-right via `.wordmark`. Replace any remaining hardcoded `52px` or `4px` header paddings with the canonical values. The goal: flipping between any two tabs, the logo does not move even one pixel, and the first element below the header starts at the same height.

## Verification (real phone)
- Today: logo top-right at SAME height as Home; "X/Y routines complete" is top-LEFT.
- Routines: logo top-right at same height as Home.
- Flip Home ↔ Today ↔ Routines ↔ Scent ↔ Setup — logo is pixel-identical in position and size on all; first element below header at same height.
- BUILD bumped; pushed to main; footer shows new build.

## Out of scope
Content, data, logic. Headers only.
