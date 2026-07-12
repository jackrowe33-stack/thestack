# The Stack — Build Version Footer Brief

**Repo:** `jackrowe33-stack/thestack` · `index.html` · v6.
**Golden rule:** Small additive change only. Back up first. One labelled commit.

## Goal
Add a visible build identifier so the user knows which version they're testing (browser/PWA caching makes this ambiguous).

## Implementation

**1. Add a BUILD constant** near the top of the script (next to where `DB`/`SEED`/version live):
```
const BUILD = '2026-06-28 · stage9';  // bump this every commit
```
Format: `YYYY-MM-DD · <short label>`. 

**2. Show it at the very bottom of the Setup/Settings menu** (`vSetupMenu`, after the Data card and the hidden file input `<input id="imp">`):
```
<div style="text-align:center;padding:18px 22px 8px;font-size:11px;color:var(--ink-soft)">
  The Stack · build ${BUILD}
</div>
```
Muted, centred, unobtrusive — it's a diagnostic, not a feature.

**3. Optionally also append the data version** so both are visible: `build ${BUILD} · data v${DB.v}`. This helps confirm migrations ran.

## STANDING INSTRUCTION for Claude Code (important)
From now on, **every commit that changes index.html must also bump the `BUILD` constant** to the current date and a short label for that change (e.g. `'2026-06-28 · stage10 home fixes'`). This is what makes the version meaningful — if it isn't bumped, it's worse than useless. Treat updating BUILD as part of committing, not an optional extra.

## Verification
- Open Settings, scroll to the bottom → see "The Stack · build YYYY-MM-DD · …".
- After the next change, the build string reflects the new date/label.
- Hard-refresh the browser; if the build string doesn't change when you expect it to, that's a caching signal (you're seeing a stale cached file) — useful diagnostic in itself.

## Out of scope
Everything else.
