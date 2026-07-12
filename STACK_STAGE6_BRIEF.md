# The Stack — Stage Six Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · data version **v6** (no model change). Stages 1–5 live.

**Golden rule:** Change ONLY what's specified. Preserve all real data, routines, completions, sync, theme, prompt generator. Back up `index.html` first. Commit in labelled, rollback-able steps. Verify real data intact and sync round-trips after.

**⚠ CRITICAL — streak safety:** Item 1 changes how scheduling and streak-counting relate. Done carelessly this will recalculate the streak and could break the user's current 7-day streak. Follow the function split EXACTLY as written. Before committing item 1, verify the streak number is unchanged from before the edit.

---

## 1. Decouple "what's scheduled/shown" from "what counts toward the streak"

**Current problem:** `scheduledForDay(day)` (~line 351) gates routines by `streakScope` — `if(scope.hair)` (line 355) — so hair is excluded from BOTH display AND streak when hair scope is off. The user wants hair (and all categories) always SHOWN, with `streakScope` only controlling what COUNTS toward the streak.

**Do this:**

**(a) Add a new function `allScheduledForDay(day)`** that returns EVERY scheduled routine that day — skin, hair, supplements — ignoring `streakScope`:
```
function allScheduledForDay(day){
  const slots=[['morning','skin'],['evening','skin'],['morning','hair'],['evening','hair']];
  const rs=slots.map(([type,cat])=>routineForDay(day,type,cat)).filter(Boolean);
  // include scheduled supplement routines
  DB.routines.filter(r=>r.cat==='supplements'&&r.days.includes(day)).forEach(r=>rs.push(r));
  return rs;
}
```

**(b) Keep `scheduledForDay(day)` as the STREAK-SCOPED set** (what it returns now — scope-filtered). This continues to drive streak math ONLY.

**(c) Repoint usages precisely:**
- **Streak / counting math — KEEP on `scheduledForDay` (scoped):** `dayComplete` (358), `streak` calc, `todayDoneCount`/`todayTotalCount` (368-369), the consistency calc (375), the Home progress ring + "~X min remaining" + `todayComplete`, and the Today header `done/total` count (577-578). These all reflect only streak-scoped routines so the numbers match the streak. **Do NOT change the streak result.**
- **Display lists — SWITCH to `allScheduledForDay` (everything):** the Home "Today summary" list (~line 837 `todayScheduled`) and the Today screen's rendered routine sections (so hair always appears even when hair scope is off).

**(d) Result:** Home summary lists all routines incl. hair (hair tickable, greyed when done), but the progress ring and remaining-minutes count only scoped routines. Hair completion does not affect the streak. Verify the 7-day streak still reads 7 after this change.

---

## 2. Home — richer streak card (fill the empty space with intent)

The streak card currently has the number + tiny dots crammed left with empty space right (see screenshot). Rebuild `.streak-card` content:

- **Large numeral** — make the streak number genuinely large (~64-72px) as the visual anchor.
- Beside it: "DAY STREAK" eyebrow, and a **second line "Personal best: N days"** (compute longest historical streak; if you don't already track it, derive the max run from completion history, fallback to current streak if none). This fills the right-side dead space with something motivating.
- **Replace the small dots with a full-width row of 7 larger day-circles** (~26px) labelled M T W T F S S beneath. Filled copper = that day complete; today-incomplete = hollow with copper ring + copper label. The circles span the card width.
- Keep the existing subtle copper radial glow (`.streak-card::after`).
- Whole card stays tappable → `openToday()`. Keep the ✓ "all done" state.

Goal: the card should feel generous and designed, not like a number stranded in whitespace.

## 3. Home — scent & Refresh stay full-width stacked
No change to layout of the scent row and Refresh & Go row — keep them full-width stacked as they are now. (Explicitly NOT side-by-side.)

## 4. Home — low-stock as an actionable strip
Upgrade the low-stock line from bare text to a subtle copper-tinted strip: alert icon + "N products running low" + a "Reorder ›" action on the right. Only shown when `low.length` > 0. Keep the existing onclick that jumps to inventory.

## 5. Home — fill to navbar (no big void)
The lower third is empty above the Settings pill (see screenshot). The page already uses `min-height:calc(100vh - 132px)` flex column with a `flex:1` spacer — but the void remains. Ensure the flex column actually fills the viewport and the spacer pushes Settings to the bottom so there's no large gap. Test on a real phone viewport (mobile browser chrome changes the height).

---

## 6. Today — Skin | Hair toggle tabs per day section

**Current:** Today renders skin section then hair section stacked vertically per period (morning/evening), with the hair-look selector pinned awkwardly (now at the bottom). The user wants, within each day section, a **Skin | Hair segmented toggle** so they complete skin, switch to hair, pick a look, and complete it there.

**Do this:**
- For each period section (Morning, Evening), render a **Skin | Hair segmented toggle** at the top of that section.
- Default to Skin. Toggle is local UI state per period (e.g. `UI.todaySeg={morning:'skin',evening:'skin'}`).
- When **Skin** is selected: show that period's skin routine checklist (as now).
- When **Hair** is selected: show that period's hair routine checklist, with the **hair-look selector at the TOP of the hair sub-view** (not pinned at the bottom of the whole screen). Remove the bottom-pinned look selector.
- The look selector behaviour itself is unchanged (defaults by weekday/weekend context, override for the day) — just relocated to the top of the hair sub-view.
- Hair appears here regardless of streak scope (per item 1).
- Supplements render in their correct period section (the stage-5 morning/evening fix) — they are not part of the skin/hair toggle; render them below the toggled content in their period, or as their own labelled block within the period.

**Keep:** the three-state step model, wait timer, completed-routine collapse, all existing Today behaviour. This is a layout/navigation change to how skin vs hair are presented within a period, not a change to the step engine.

---

## Verification (hands-on, real phone)
- **Streak unchanged:** still reads 7 (or whatever it was) after item 1. Confirm first.
- **Home summary** lists ALL routines incl. hair; hair tickable + greyed when done; progress ring + "~min remaining" reflect only streak-scoped routines (so they match the streak).
- **Streak card** feels full: large number, personal-best line, 7 labelled day-circles spanning the card.
- **Scent + Refresh** still full-width stacked.
- **Low-stock** is a copper strip with Reorder action (only when low).
- **No big empty gap** above Settings on a real phone.
- **Today:** each period has a Skin | Hair toggle; hair look selector sits at top of the hair sub-view; switching works; nothing pinned at the bottom.
- Real data intact; sync round-trips.

## Out of scope
Timer state machine internals, v6 model. Streak forgiveness still deferred. Do not alter streak calculation logic beyond the function-split repointing in item 1.
