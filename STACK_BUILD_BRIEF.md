# The Stack — Redesign Build Brief

**Repo:** `jackrowe33-stack/thestack` · single file `index.html` (vanilla JS PWA, localStorage key `stack_v1`, Cloudflare Worker + KV sync)

**Golden rule:** Do not change anything not specified here. Preserve all real product data, routines, sync behaviour, theme, completion tracking, and the prompt generator. Every data change must be an **additive, run-once, non-destructive migration**. Confirm the app loads and sync still works before moving between stages.

Build in **two stages**. Land and verify stage one before starting stage two.

---

## STAGE ONE — data model + navigation (low risk)

### 1. Data model (new `v6` migration)

Follow the existing `migrate(d)` pattern (versioned `if(d.v<N)` blocks, additive only). Add a `v6` block that:

- Adds `steps: []` to every product if missing. (`steps` = ordered array of `{text: ''}` application-instruction rows. Keep the existing `notes`/`why`/`role` fields untouched — `steps` is new and separate.)
- Adds new category `supplements`. Products may now have `cat: 'supplements'`. Do **not** seed any supplement products — the category starts empty.
- Adds `d.lookByContext = { weekday: <existing weekday look id or null>, weekend: <existing weekend look id or null> }`. Migrate sensibly from current `hairLooks` if obvious; otherwise null.
- Adds `d.settings.streakScope = { skin:true, hair:false, scent:false, supplements:false }` **only if not present**. Default must reproduce current streak behaviour (whatever categories currently count — set defaults to match so nothing shifts).
- Sets `d.v = 6`.

Update `SEED` to `v:6`, give the `P()` helper a default `steps:[]`, and add `supplements` as a valid `cat` everywhere category is switched on (inventory `invCat`, routine `cat`, prompt generators).

**Test before continuing:** load app with existing stored data; confirm no data loss, products intact, sync round-trips.

### 2. Navigation → three tabs

Current `renderTabs()` (around line 438) defines 5 tabs: home/skin/hair/scent/setup. Replace with **three**: `home`, `today`, `routines`.

- Tabs are equal size. **Active tab shows copper accent** (icon + label); inactive muted. Use a **filled icon when active, outline when inactive** if feasible.
- `today` tab opens the Today overlay (reuse existing `openToday()` — Today is currently an overlay, keep it that way; the tab is just a new entry point).
- `routines` is a new tab (see §3).
- **Remove the standalone `setup`/Settings tab.** Settings moves into the foot of Home (see §4).
- **Default landing tab = `today`** (or Home — confirm with Jack; spec leans Today-as-default, but Home holds the streak hero).

### 3. Routines tab — list-first, two levels

- **Level 1:** four-way segmented control: Skin · Hair · Scent · Supplements. (Segments are fine here — 4 fixed peers.)
- **Level 2:** a **vertical list** of the routines within the selected category (NOT the old horizontal toggle bar — that's the thing being removed; it doesn't scale). Each row: routine name + one-line summary (e.g. "6 steps · Mon") + chevron. Tapping a row opens that routine's **read-only product view** with **inventory levels shown inline** next to each product.
- If natural, group routines into labelled sections (e.g. Morning / Evening) within the list.
- Scales to unlimited routines. No horizontal scrolling.

### 4. Home — stripped + Settings at foot

Remove from Home: product stats/counts, the Refresh & Go shortcut (it's a routine, lives in Routines), and the always-on low-stock panel.

Home becomes, top to bottom:
1. **Streak hero card** (see below) — the single focal point.
2. **Today's suggested scent** — one quiet line.
3. **Low-stock whisper** — a single subtle line ONLY when something is actually low ("2 products running low ›"); absent otherwise (conditional, not persistent).
4. **Settings entry** — quiet row at the very bottom; opens the existing settings pages (preserve all current settings content/pages, just relocate the entry point here).

**Streak hero card:**
- Large copper numeral + quiet label ("day streak").
- Slim **seven-dot week strip** beneath (filled = day completed, copper). Today's dot reflects today's state.
- Copper is the only colour on Home — that's what makes it the hero (state/colour, not size).
- The card **doubles as the entry into Today** — tapping it (or a CTA on it) calls `openToday()`. No separate hero button needed.
- When today is incomplete, gently invite (today's dot subtly pulsing or a quiet "Open Today →" on the card). A broken streak resets quietly — **no red, no punitive messaging.**

**Verify stage one fully** (load, navigate all three tabs, settings reachable from Home, sync intact) before stage two.

---

## STAGE TWO — Today render path (higher risk; iterate)

Touches `renderTodayPage()` (around line 478) and the timer FAB.

### 5. Collapse completed routines
- When a routine's steps are all ticked, collapse it to a summary row (name + ✓ + "6/6"). Pinned **below** active routines.
- **Animate** the collapse on moment-of-completion (~250ms ease-out). On initial load, already-complete routines render collapsed with **no** animation.
- Tapping a collapsed routine re-expands it.

### 6. Close button → top-left
- Move Today's dismiss control from top-right to **top-left**. Use a **downward chevron (⌄) or ×** (dismiss semantics, not a back arrow — Today is an overlay). Min 44×44pt target.

### 7. Three-state step model + display-only persistent timer
- Each step: **pending → applied(waiting) → done.**
- Ticking a step = "applied": it marks the step and **starts the wait countdown to the NEXT step**. The wait belongs to the *transition*, displayed on the step you just ticked.
- The wait is **display-only** — it never blocks ticking the next step. Tick ahead freely.
- A ticked-but-waiting step shows a live countdown chip ("wait 2:00 ⏱") that **persists until the next step is ticked**, then clears (step → done).
- **Persistent timer pill:** reuse the existing global timer FAB. When a wait is live, a pill persists across ALL screens (Home/Today/Routines/Settings) showing the countdown. Tapping it returns to the relevant step on Today.
- Timer counts **real elapsed time** — leaving and returning resumes from actual time elapsed (don't pause on screen change or app backgrounding). Decide resume-from-timestamp logic accordingly.
- Edge cases to handle: un-ticking a waiting step (cancel its countdown); ticking out of order (each tick starts its own transition timer); reopening Today mid-wait (resume from elapsed).

### 8. Per-product instruction steps as primary Today content
- Render each product line's `steps[]` as a **numbered list** (1-2-3) as the **primary content** under the product name.
- The old `desc`/`why` shows **small and muted** beneath the steps (kept, de-emphasised — not removed).
- This makes rows taller → reinforces why §5 (collapse) matters.

### 9. ⓘ detail affordance + sheet
- Each Today product row: left ~80% toggles the tick; a **trailing ⓘ button** (44pt target) opens a **detail sheet**.
- Detail sheet shows: current product info (role/why/notes/inventory) + the full application instructions.
- The split target must be **signposted by the ⓘ icon** — no invisible hit zones.

### 10. Hair look selector on Today
- Hair section gets a compact look selector (segmented control or a "Look: Weekday ⌄" pill opening the existing `lookPickSheet`).
- **Defaults by context:** infer weekday (Mon–Fri) vs weekend (Sat–Sun) from the date, preselect `lookByContext.weekday`/`.weekend`.
- Changing the look on Today is an **override for that day only**; the contextual default (in `lookByContext`) is what persists. Writing a new default happens elsewhere (or via a "set as default" action — confirm with Jack).
- Selecting a look immediately drives the hair products shown.

### 11. Supplements on Today — lightweight
- Render scheduled supplements as a **plain tickable list. No wait timers, no instruction-step complexity** (steps optional/simple). Ticks count toward completion.

### 12. Streak scope wiring
- Wire streak completion logic to respect `settings.streakScope` — a day counts complete only when the included categories' scheduled routines are done.
- Add a **Settings control** to toggle which categories count (Skin / Hair / Scent / Supplements).

### 13. Product settings — instruction editor
- In the product edit modal, add a **structured add/remove step-row editor** for `steps[]` (each row a text input, add button, remove ✕, reorderable if cheap). This is net-new UI.

### 14. Empty states
- Provide quiet, intentional empty states: no supplements yet, routine with no instruction steps, empty Routines category. Never a blank panel — a calm one-liner ("No supplements yet — add one in Settings").

---

## Explicitly OUT of scope this batch
- Streak **forgiveness/grace-day** mechanic (design the card to *allow* it later; don't build it).
- Any change to real product data, routine schedules, theme, or sync transport.

## Delivery
- Commit in **labelled stages** (stage one as one or more commits, verified, before stage two). Keep commits small enough to roll back. If multi-device, update devices close together — the `v6` migration changes schema, so make the migration tolerant of receiving either old or new shape over sync.
