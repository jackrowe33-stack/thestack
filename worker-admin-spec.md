# Worker changes for the admin console — usage logging & admin endpoints

Extends the v100 Worker spec (plan claim, model routing, taster counter). Same
KV binding `THESTACK`. The console works partially without these (users, plans
in Firestore, prompts, pricing, accounting, flags in Firestore, audit) — but AI
usage/cost, KV plan sync, the kill switch and user emails all need this deploy.

---

## 1 · Admin guard

The Worker already verifies Firebase ID tokens (RS256/JWKS). Admin routes add
one check on the **verified** payload — the custom claim set by
`set-admin-claim.mjs` lands in the token as a top-level field:

```js
function requireAdmin(payload){          // payload = verified ID token claims
  if (payload.admin !== true) throw new HttpError(403, 'not_admin');
}
```

Route everything under `/admin/*` through token verify → `requireAdmin` →
handler. Never trust a client-supplied flag; only the verified token.

## 2 · Usage logging (inside the existing `/ai` handler)

After each **successful** Anthropic response, read `usage.input_tokens` /
`usage.output_tokens` from the response body and fold them into two KV
JSON blobs (read-modify-write — KV has no atomic increment; at your scale a
lost race costs a rounding error, ignore it):

```
KV key: usage:{YYYY-MM}
value:  {
  days:     { "YYYY-MM-DD": { calls, in, out } },
  byModel:  { "claude-sonnet-4-6": { calls, in, out }, ... },
  topUsers: { "{uid}": { calls, in, out }, ... },
  totals:   { calls, in, out }
}
```

One key per month keeps reads cheap (console fetches exactly one). Write with
`expirationTtl: 400*86400` (~13 months of history, self-cleaning).

Cap `topUsers` at, say, 200 entries (evict smallest) so the blob can't grow
unbounded. KV values max 25 MiB — you will never get close.

## 3 · Directory mirror (emails for the console)

Same `/ai` success path, throttled to once per uid per day (KV marker
`seen:{uid}:{YYYY-MM-DD}`, TTL 2 days): upsert a Firestore doc via REST —

```
PATCH https://firestore.googleapis.com/v1/projects/the-stack-prod/databases/(default)/documents/directory/{uid}
body: { fields: { email:{stringValue}, plan:{stringValue}, lastSeen:{integerValue} } }
```

Firestore REST needs an OAuth token. Two options:
- **A (simple, recommended):** skip REST entirely — keep the directory in KV
  (`dir:{uid}` → `{email, plan, lastSeen}`) and serve it from `/admin/directory`
  (below). No service account, no OAuth. The console already falls back
  gracefully; wire it to `/admin/directory` later if you choose this.
- **B (Firestore):** store a service-account key as a Worker secret, mint a
  JWT with SubtleCrypto, exchange at `oauth2.googleapis.com/token`
  (scope `datastore`), cache the access token ~55 min in KV. More moving
  parts; only worth it if you want emails visible without a Worker call.

Note: admin.html currently reads the Firestore `directory` collection (option
B) and tolerates its absence. If you pick option A, tell Claude next session
and the console gets a one-line change to read `/admin/directory` instead.

## 4 · Admin endpoints

```
GET  /admin/usage?month=YYYY-MM
     → 200 with the usage:{month} blob (or {days:{},totals:{calls:0,in:0,out:0}})

POST /admin/setPlan   { uid, plan }     plan ∈ free|standard|pro|comp|suspended
     → writes KV plan:{uid}; 'suspended' must be treated by /ai as "no AI at
       all" (403 {error:'suspended'}). Console writes Firestore plan itself;
       this endpoint only syncs the KV enforcement copy.

POST /admin/setFlag   { key, value }    // e.g. key:'ai_disabled', value:'1'|''
     → writes KV flag:{key}. Empty string = delete the key.

GET  /admin/directory                   // only if you chose option A above
     → { "{uid}": { email, plan, lastSeen }, ... }
```

All return JSON; all guarded per §1. CORS: allow origin
`https://jackrowe33-stack.github.io` (and localhost for testing) on `/admin/*`,
same as `/ai`.

## 5 · Kill switch in `/ai`

First check in the handler, before token verify (cheapest possible rejection):

```js
if (await env.THESTACK.get('flag:ai_disabled'))
  return json(503, { error:'ai_disabled' });
```

App-side: on 503 `ai_disabled`, show "assistant temporarily unavailable" —
same UX slot as a network failure, so minimal app change.

## 6 · Deploy & verify

1. `wrangler deploy`.
2. In the console: Dashboard should show calls/tokens after your next AI chat
   (make one from your comp account).
3. Users: change a test account's plan → toast should say "KV synced".
4. Flags: toggle AI off → chat in the app must fail with the unavailable
   message → toggle back on.
5. Confirm a non-admin account gets 403 from `/admin/usage` (curl with a
   normal user's ID token).
