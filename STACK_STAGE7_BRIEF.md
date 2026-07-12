# The Stack — Stage Seven Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · data version **v6** (no model change). Stages 1–6 live.

**Golden rule:** Change ONLY what's specified. Preserve all real data, routines, completions, sync, theme, prompt generator. Back up `index.html` first. Commit in labelled, rollback-able steps. Verify real data intact and sync round-trips after.

---

## 1. Today detail sheet — "why it matters" ABOVE the steps

In the product detail sheet (the ⓘ card from Today / the product view modal), the `role` / `why` ("why it matters") content currently renders BELOW the application steps. Move it so **`why` (why it matters) appears ABOVE the steps list**, not after. Order within the sheet: product name/brand → role → **why it matters** → application steps → notes (and other fields per existing hide-empty rules). Steps should come after the why, since the why is context the user wants before the how.

(Check the product info card / detail render — the `s.why` block and `stepsHTML`/steps block need their order swapped so why precedes steps.)

---

## 2. Hair look (hair styles) editing is broken — make it work like every other routine edit

**Diagnosis:** Hair looks have a SPLIT data model. The routine record (`hair-look-weekday`, etc. — `cat:'hair', type:'morning'`) holds the `steps`, but the look's **name and description live separately in `DB.hairLooks[]`** (lines ~282-285), linked only by matching `id`. The routines appear in Setup → Edit Routines (under Hair — Morning) and their STEPS can be edited via the normal routine editor, BUT:
   - There is **no editor for the look's name/description** (the `hairLooks[]` entry), so name/desc changes can't be made or saved.
   - The link between the routine and its `hairLooks[]` entry is fragile.

**Fix — make hair-look editing use the SAME edit experience as other routines, and reconcile the split model:**
   - When editing a hair-look routine in `vRoutineEditPage`, **also expose its `hairLooks[]` name + description fields** in the same edit screen (so the user can rename the look and edit its description alongside its steps). Save writes both the routine and the matching `hairLooks[]` entry.
   - Ensure **adding products (steps) to a look works** through the standard add-step picker (same as any routine) and **Save persists** — verify the add-step → `steps.push` → `save()` path works for look routines (it should; confirm no `hair-look` id exclusion is blocking it in the edit path, as opposed to the read-only Routines tab which intentionally hides looks via `!r.id.startsWith('hair-look')`).
   - The edit screen for a look must look and behave **identically to other routine edit screens** — same layout, same add-step, same day selector (or hide days for looks since looks aren't day-scheduled — keep consistent with current look behaviour), same Save.
   - If a look routine exists without a `hairLooks[]` entry (or vice versa), handle gracefully — create the missing side on save rather than erroring.

**Verify:** open a hair look in Setup, add a product, change its name/description, save, reopen — changes persisted; the look's new products appear when that look is selected on Today.

---

## 3. Add-step product picker — filter by the routine's category

**Current:** `addStepSheet(routineId)` (~line 1423) lists ALL active products regardless of category — so adding a step to a hair routine shows skin/scent/supplement products too.

**Fix:** filter the picker to the **category of the routine being edited.** Get the routine via `routineById(routineId)`, read its `cat`, and show only products where `p.cat === routine.cat` (and `p.active`). E.g. adding to a hair routine shows only hair products; a supplement routine shows only supplements.
   - Edge case: if a routine legitimately mixes categories (rare), still default to the routine's own category. Optionally allow an "all categories" toggle, but default filtered. Keep it simple: filter to the routine's cat.

## 4. Add-step picker — search/filter box

Add a **search input** at the top of the add-step picker sheet that filters the (already category-filtered) product list live by name/brand as the user types. Standard contains-match on `name`+`brand`, case-insensitive. Store the query in transient UI state (e.g. `UI._stepSearch`) and re-filter on input. Clear it when the sheet closes. This makes long product lists manageable.

(Apply the same search box to any other product-selection list where the list can get long — e.g. if the inventory or product pickers would benefit — but the primary target is the add-step sheet.)

---

## Verification
- Today detail sheet: "why it matters" sits ABOVE the application steps.
- Hair looks: editable exactly like other routines — add products, rename, edit description, Save persists; verified by reopening.
- Add-step picker: shows ONLY products matching the routine's category (hair routine → hair products only).
- Add-step picker: search box filters the list live by name/brand.
- Real data intact; sync round-trips.

## Out of scope
Timer state machine, streak logic, v6 model. Streak forgiveness deferred.
