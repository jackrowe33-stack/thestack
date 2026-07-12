# The Stack — V11 Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6.
**Golden rule:** Change ONLY what's specified. Preserve data, routines, completions, sync, theme, prompt generator. Back up first. Commit each item labelled. **Bump BUILD** (`'2026-06-28 · v11'`). **Commit AND push to main.**

---

## 1. Hair on Today — ONE merged list (base + chosen look), no duplication

**Current:** when a hair routine and a look both apply, Today renders the base hair routine section AND the look's routine section as two separate product blocks (they're two separate routine records sharing nothing but intent). This shows hair "twice" — the user dislikes it.

**Desired model:** a hair routine = its base steps + the selected look's steps, **appended into ONE continuous checklist.** The look is just "which finishing products get added to the end." The look selector swaps which finishing steps are appended; there is never a second separate block.

**Implement:**
- In the Today hair render (~line 691-697 and 712-717), when showing hair for a period:
  - Show the **look selector** (see item 2 for spacing) at the top of the hair view.
  - Render a **single checklist** = `[...baseHairRoutine.steps, ...selectedLook.steps]` merged in order (base first, look's finishing steps appended). One `routineSection`/checklist, one labelled header (e.g. "Hair — Morning"), not two.
  - Completion/ticking should treat the merged list as the hair routine for the day. Ensure ticking the look's appended steps works and persists (decide a consistent completion key — e.g. track the base routine's completion including appended look steps; keep it simple and consistent so the streak/done logic still works).
  - Remove the separate look routine block that currently renders after the base — the look's steps now live inline in the merged list only.
- The selected look still defaults by weekday/weekend context (`lookByContext`) and can be overridden for the day (existing behaviour) — only the RENDERING merges; the look-selection logic is unchanged.
- Do NOT change the underlying data model (looks remain `hairLooks[]` + their step-holding routine). This is a RENDER-time merge: read the base hair routine's steps and concat the selected look's steps for display. Don't duplicate or migrate data.

## 2. Hair look selector — spacing (it's cramped against the Skin|Hair toggle)

`lookSelectorHTML()` is output immediately after the Skin|Hair `seg` toggle with no gap, so two segmented controls sit flush and look cramped.

**Fix:** add clear separation between the Skin|Hair toggle and the look selector — a small labelled divider, e.g. a `sec-label` "Look" above the look selector, plus vertical margin (~12-14px) so the two controls breathe. The look selector should read as its own distinct control, not crammed onto the toggle.

## 3. Header still moves between Home and Today (structural, not CSS)

The header CSS now matches (`.top` and `.today-header` share padding). The REMAINING movement is structural: **Home renders in normal `#app` flow (no top padding, `min-height:100vh`); Today renders as `.today-page` (`position:fixed; inset:0`) with a `.today-sticky` (`position:sticky; top:0`) wrapper.** Two different layout mechanisms can land the logo a few px apart despite identical header padding.

**Fix — align the structural top offset:**
- Ensure the Today overlay's content starts at the SAME effective top as Home. Check whether `.today-sticky`'s sticky positioning or the `.today-page` fixed container introduces an offset vs `#app`. 
- Make the Today header's top padding produce the identical logo Y-position as Home. If `.today-sticky` adds/removes space, compensate so the wordmark's top edge matches Home's wordmark top edge exactly.
- Verify on a real device with a notch (safe-area inset is 0 on desktop, so desktop can hide the difference). This may need a small device measurement + adjustment; the target is: wordmark top edge identical on Home and Today.
- Also confirm Routines/Scent/Setup match (they should after V10, but re-verify the wordmark Y-position against Home).

## Verification (real phone)
- Hair on Today: ONE merged checklist (base steps then look's finishing steps); no second hair block; ticking works for all steps; switching look changes only the appended finishing steps.
- Look selector visually separated from the Skin|Hair toggle (not cramped).
- Logo wordmark top edge is identical across Home, Today, Routines, Scent, Setup — no movement flipping tabs.
- BUILD bumped; pushed to main; footer shows new build.

## Out of scope
Data model changes, streak logic internals, timer engine. Looks stay as hairLooks[] + routine; merge is render-only.
