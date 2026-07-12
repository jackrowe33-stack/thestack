# The Stack — Add-Step Picker Feedback Fix

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6.
**Golden rule:** Targeted change only. Back up first. One labelled commit. **Bump the BUILD constant** (date + label, e.g. `'2026-06-28 · addstep-feedback'`). Push to main.

## Problem
In `addStepSheet` (~line 1452), tapping a product runs:
`steps.push(...);save();UI.modal={type:'addstep',routineId};render()` — it adds the step and re-opens the SAME picker with no visible change, so it looks like nothing happened (no UI response). The step IS being added; there's just no feedback.

## Desired behaviour — stay open for multiple adds, with feedback
The picker should STAY OPEN so the user can add several products in a row, but give clear feedback for each add, and "Done" closes back to the routine.

**Implement:**
1. **Keep the sheet open after an add** (it already re-renders the addstep sheet — keep that), but:
2. **Mark already-added products with a ✓** — when rendering the product list, check whether each product is already a step in the routine (`routineById(routineId).steps.some(s=>s.p===id)`). If so, show a ✓ and an "Added" label on that row, and style it as added (muted / copper check). This gives persistent visual confirmation of what's in the routine.
3. **Brief "Added" feedback on tap** — when a product is tapped and pushed, show a quick confirmation (e.g. a small toast "Added <name>" for ~1.5s, or the row immediately flips to its ✓/Added state). The row flipping to ✓ is the minimum; a toast is a bonus.
4. **Allow toggling** (nice-to-have, optional): tapping an already-added product could remove it (toggle off), with the ✓ disappearing. If simple, do it; if not, at least make already-added rows clearly non-duplicating or allow duplicates knowingly. Keep it simple — priority is the feedback, not toggle logic.
5. **"Done" button** closes the sheet (`UI.modal=null;render()` — ensure it returns to the routine edit view showing all added steps). It already does this; confirm it works and the routine view reflects every added step.
6. **Apply the same feedback to ALL add-step entry points** — the routine-edit page "+ Add step" (~line 1208), the hair-look "+ Add product" (~line 1185 / `lkAdd` ~line 1512), and any other place using the addstep sheet. All should show the same stay-open + ✓ feedback behaviour.

## Verification
- Open a routine, "+ Add step", tap a product → the row immediately shows ✓ Added (and/or a brief toast); sheet stays open.
- Tap another product → it too shows added; both stay marked.
- Press Done → sheet closes, routine edit view shows BOTH new steps.
- Same behaviour when adding products to a hair look.
- BUILD constant bumped; pushed to main; version footer shows the new build.

## Out of scope
Streak, timer, data model.
