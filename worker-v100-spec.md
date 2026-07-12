# Worker changes for v100 — taster counter & model routing
**Deploys separately from the app (Cloudflare Worker, KV binding `THESTACK`). The app never talks to Anthropic directly, so tier enforcement and cost control both live here — clients can't bypass what they can't reach.**

---

## 1 · Plan claim

The Worker already verifies the Firebase ID token (RS256/JWKS). Tier must come from a **server-side source, not the request body** — the client's `DB.plan` is user-editable local state. Simplest robust source: a KV entry written by you (and later by the billing engine in Phase 5):

```
KV key:  plan:{uid}        value: "free" | "standard" | "pro" | "comp"
Missing key ⇒ "free".
```

Your own account: `plan:{your-uid}` → `comp`.

## 2 · Model routing by tier

```js
const MODEL_BY_TIER = {
  free:     'claude-haiku-4-5-20251001',  // taster: cheap, fast, fine for Q&A
  standard: 'claude-sonnet-4-6',
  pro:      'claude-sonnet-4-6',          // same model; richer prompts + proactive jobs
  comp:     'claude-sonnet-4-6'
};
const MAX_TOKENS_BY_TIER = { free: 400, standard: 1200, pro: 2000, comp: 2000 };
```

Ignore any `model` / `max_tokens` fields from the client; the Worker sets both. Free-tier answers at 400 tokens stay genuinely useful for "do I need a toner?" while capping worst-case cost per question at well under a cent.

## 3 · Taster counter (free tier: 3 questions / calendar month)

Month-keyed KV counter — resets by key rollover, no cron needed:

```
KV key:  taster:{uid}:{YYYY-MM}     value: integer count
```

Flow for a `free` uid:
1. Read count (missing ⇒ 0).
2. `count >= 3` → respond `402` with `{error:'taster_exhausted', resetMonth:'YYYY-MM', used:3, limit:3}` — **do not** call Anthropic.
3. Else call Anthropic, then increment with `expirationTtl: 40*86400` (self-cleaning keys).
4. Include `x-taster-remaining: N` on every free-tier success so the app can render "2 questions left this month" without a second request.

Notes:
- Count **increments only on a successful model call** — network/model failures don't eat a question.
- Requires a signed-in free account by design (anonymous local-only users have no ID token, so they never reach the Worker — that's the account-gate working, not a bug).
- KV is eventually consistent; a determined user might squeeze in a 4th question during a race. Cost impact: ~a cent. Ignore.

## 4 · Standard-tier focus enforcement (server side)

The app already gates out-of-focus stacks in the UI (v100 `assistantPick`), but the Worker should enforce it too:

```
KV key:  focus:{uid}      value: {"stack":"supplements","setMonth":"2026-07"}
```

- App sends its category per request (it already scopes chats by stack).
- `standard` + category ≠ focus.stack → `403 {error:'out_of_focus', focus:'supplements'}`.
- Worker accepts a focus **write** from the client only when `setMonth ≠ current month` (mirrors `canSwitchFocus()`), then stamps `setMonth` itself with the server's current month — the client never supplies the month.

## 5 · Rate limits (unchanged mechanism, per-tier values)

Existing KV rate limiting stays; suggested ceilings so runaway loops can't burn money even on paid tiers:
`free: 3/month (above) · standard: 60/day · pro: 200/day`.

## 6 · Deploy & verify

1. `wrangler deploy` (existing project).
2. Seed `plan:{your-uid}` = `comp`.
3. Verify: request with a test free account → 3 succeed with decrementing `x-taster-remaining`, 4th returns 402; your comp account is uncapped and gets Sonnet (check `model` in the Anthropic response passthrough or log it).

**App-side counterpart (already handled / upcoming):** v100 ships the plan tiers and focus model; v101's paywall surfaces will consume `x-taster-remaining` and the `402`/`403` responses to render the counter, the gate, and the focus boundary.
