# The Stack — Stage Nine Brief (consolidates hotfix + remaining 7 + all of 8)

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6. Header-alignment pass is live.
**Golden rule:** Change ONLY what's specified. Preserve real data, routines, completions, sync, theme, prompt generator. Back up first. Commit each numbered item as a labelled step. Verify data + sync after each.

**Note:** Stage 7's commits exist, but several things are still broken or were applied to the wrong surface. This brief is written against the ACTUAL current code state (verified), not against what was nominally done. Fix what's described regardless of prior commit messages.

---

## 1. HOTFIX — "+ Add product" / picker breaks on product names with apostrophes

**Root cause:** inline `onclick` handlers interpolate product names/data into JS strings. Product names with apostrophes (e.g. Kérastase "L'Huile", "L'Oréal") break the generated HTML/JS, throwing an error that silently aborts the render — so buttons/sheets "do nothing."

**Fix (apply file-wide, not just one spot):**
- Audit ALL inline `onclick=` (and similar) handlers that interpolate product `name`, `brand`, or any user-editable string. 
- Stop inlining product data into handler strings. Pass only the **product id** (ids are safe — generated `p<timestamp>`), and have the handler look up the product. Where a name must appear in markup, ensure it goes through `esc()` AND is not inside a JS string literal in an attribute.
- Primary offenders to fix: `addStepSheet` (~line 1453) product buttons, `lkAdd`/`lookSheet` (~line 1501), and any picker listing products.
- **Verify with a real apostrophe:** temporarily confirm a product named like `Test L'Huile` can be added to a routine and a look without breaking the sheet.

## 2. Look add-product — replace `prompt()` with the real picker

`lkAdd(idx)` (~line 1501) still uses a browser `prompt()` to choose a product — clunky and inconsistent. Replace it so adding a product to a hair look uses the **same category-filtered + searchable picker** as `addStepSheet` (hair products only, empty-list fallback to all, live search). The look's add-product flow should look and behave identically to adding a step to any other routine.

## 3. Add-step picker — empty-list fallback

In `addStepSheet` (~line 1453), the category filter (`p.cat!==cat`) is live. Add a **fallback**: if the category-filtered list is empty, show all active products instead of an empty sheet (so the user is never stuck), optionally with a note. Keep the search box.

## 4. Today CHECKLIST — "why it matters" above the steps (the MAIN list, not the popup)

Stage 7 reordered the popup detail sheet (which was already why-first). The surface the user actually means is the **main Today checklist they tick through.** In the Today step-row render (~line 774, the `.cbody` block), the product `role`/`why` note (`cnote`) currently renders AFTER the numbered application steps (`psteps`). 

**Fix:** render the `role`/`why` note BEFORE the `psteps` block. Order within `.cbody`: product name → why/role note → numbered application steps (→ wait chip as now). Preserve the `isTicked` greying on all parts.

## 5. Home summary — order routines + "Category — Name" labels

**`allScheduledForDay(day)` (~line 358)** appends supplements last, so they always sit at the bottom; the summary (~line 880-884) shows only `r.name`.

**Fix:**
- **Order:** sort by time-of-day then category: rank `type` (morning=0, evening=1), then `cat` (skin=0, hair=1, supplements=2, scent=3); sort by `[typeRank, catRank]`. Morning routines group first, then evening — no more supplements stranded at the end.
- **Labels:** render each summary row as **"Category — Name"** (e.g. "Skin — Morning Routine", "Hair — Evening"). Use `${Capitalised cat} — ${r.name}`. Keep greyed/struck styling for completed routines.

## 6. Universal modal dismiss — tap-outside AND swipe-down on EVERY sheet

`renderModal` (~line 1289): `ov.onclick` backdrop-tap-to-close works for all modals, BUT the swipe-down handler is attached ONLY to `routine-view` (~line 1306+).

**Fix:** extract the swipe-down dismiss into a small helper and apply it to the `.sheet` of EVERY modal type (product, product-detail, edit, addstep, look, lookpick, new-routine, routine-view) after append. Threshold ~72px down → close. Use `renderModal()` for the close so the overlay is removed; verify `render()` also calls `renderModal()` so existing `UI.modal=null;render()` closers still dismiss. Every sheet must close by both tapping outside and swiping down.

---

## Verification (real phone)
1. Product named with an apostrophe (e.g. "L'Huile") can be added to a routine AND a look; no sheet breaks.
2. Adding a product to a hair look uses the searchable hair-filtered picker (no browser prompt).
3. Add-step picker never shows an empty sheet (falls back to all products).
4. Today checklist: within each product, why/role text sits ABOVE the numbered steps.
5. Home summary: morning-first then by-category order (no supplements at bottom); rows read "Category — Name"; completed greyed.
6. Every popup closes by tapping outside AND by swiping down — test all sheet types.
7. Real data intact; sync round-trips.

## Out of scope
Streak logic, timer engine, v6 model. Streak forgiveness deferred.
