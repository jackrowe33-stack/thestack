# The Stack — V12 Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6.
**Golden rule:** Change ONLY what's specified. Preserve data, routines, completions, sync, theme. Back up first. Commit each item labelled. **Bump BUILD** (`'2026-06-28 · v12'`). **Commit AND push to main.**

---

## 1. Today checklist — collapse sub-steps when a step is completed (with peek chevron)

**Current:** in `checklistHTML` (~line 786-810), when a product has application sub-steps (`psteps`), they always render. When the step is ticked (`isTicked`), the sub-steps get a strikethrough (`done` class) but STAY fully visible, making completed steps tall and cluttered.

**Desired:** when a step is completed (`isTicked` true), **collapse the numbered sub-steps by default**, showing just the product name (and its one-line role/why note). Provide a **small expand chevron** on the row so the user can peek at the sub-steps if needed, then collapse again.

**Implement:**
- When `isTicked` is true: do NOT render the `psteps` block by default. Show product name + the `cnote` (role) line only — compact.
- Add a **small chevron toggle** (e.g. ⌄/⌃, ~minimal footprint) on completed rows. Tapping it expands the `psteps` for that row; tapping again collapses. Track per-step expand state in transient UI (e.g. `UI.todayStepPeek={['${rid}:${s.p}']:true}`), keyed by routine id + product id. Default collapsed.
- When NOT ticked: render sub-steps fully as now (no chevron needed — they're the active how-to).
- Keep the wait-chip/countdown logic below the row unchanged.
- Don't change tick behaviour or completion logic — purely a display collapse of the sub-steps on done rows.

**Result:** completed steps shrink to a tidy single line; active steps still show their full numbered how-to; the chevron lets you re-check a done step's instructions without un-ticking.

## 2. Home — add the progress ring to the Today summary card (it was missed)

**Current:** the Today summary card header (~line 906-909) shows the status text ("Today isn't done yet" / "All done for today ✓") on the LEFT and the "Open Today →" button on the RIGHT. **There is no progress ring** — it was in the agreed mockup but never built.

**Add a circular progress ring** showing completed-vs-total streak-scoped routines (e.g. "1/3"), placed as follows:

**EXACT placement:** inside the header row at ~line 906, as the FIRST element on the LEFT, immediately BEFORE the status text. So the left side becomes: `[ring] "Today isn't done yet"` as a horizontal group (ring + text with a gap), and "Open Today →" stays on the right. Structure:
```
<div style="display:flex;justify-content:space-between;align-items:center;...">
  <div style="display:flex;align-items:center;gap:11px">   <!-- LEFT group -->
    [PROGRESS RING SVG]                                    <!-- new, first -->
    <span ...>Today isn't done yet</span>                  <!-- existing status text -->
  </div>
  <button ...>Open Today →</button>                        <!-- existing, right -->
</div>
```

**Ring spec:**
- Small (~34px), SVG: a muted track circle + a copper (`--cu`) arc showing fraction complete.
- Count = streak-scoped routines done / total scheduled today (use the SAME numbers as the streak math — `todayDoneCount()` / `todayTotalCount()`, NOT all-scheduled). This keeps the ring consistent with the streak number.
- Center the fraction text inside the ring (e.g. "1/3"), small bold.
- When all done (`todayComplete`): ring full copper, optionally a ✓ in the center instead of the fraction.
- If total is 0 (nothing scheduled / nothing scoped), hide the ring gracefully.

## Verification (real phone)
- Today: tick a step with sub-steps → its numbered sub-steps collapse to a tidy line; a chevron appears; tapping it peeks the sub-steps; active (un-ticked) steps still show full how-to.
- Home: the Today summary card shows a copper progress ring on the LEFT before "Today isn't done yet"; fraction matches the streak-scoped done/total; fills as routines complete; ✓ when all done.
- BUILD bumped; pushed to main; footer shows new build.

## Out of scope
Streak logic internals, timer engine, data model, hair merge.
