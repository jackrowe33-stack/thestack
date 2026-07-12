/* ============================================================
   The Stack — Cloudflare Worker (secured /ai proxy)

   DEPLOY: paste this whole file over the worker script in the Cloudflare
   dashboard (Workers & Pages → thestack → Edit code) or `wrangler deploy`.
   This file is the source of truth — edit here, then deploy.

   CHANGELOG:
   v4 (2026-07-12) — users & scheduled plans:
     - POST /admin/checkUsers {uids:[..]} — looks the uids up in Firebase
       Auth (Identity Toolkit) and returns their emails + which uids no
       longer exist (auth record deleted). Powers the console's email
       column and "deleted" detection. Admin claim required.
     - Scheduled plan changes: if the core doc carries planUntil (ms) and
       it has passed, the effective plan becomes planAfter (default free)
       and the Worker PATCHes the doc to make the downgrade permanent —
       self-healing on the next AI call, no cron needed. The app enforces
       the same rule client-side at boot/sync.
   v3 (2026-07-12) — admin console integration:
     - Usage tracking: every successful /ai call records calls + tokens
       per user per day in KV (key u:{YYYY-MM-DD}:{uid}, 40-day TTL).
     - GET /admin/usage?month=YYYY-MM — aggregates those records for the
       console dashboard (totals, per-day, top users, byModel for cost).
       Requires a Firebase ID token with the admin custom claim.
     - POST /admin/setPlan {uid,plan} — writes the legacy KV plan:{uid}
       so the console's plan-change toast reports success. Entitlement
       itself is Firestore-read; this KV entry is informational only.
     - /ai: a token with the admin claim is always entitled (lets the
       console use AI for prompt regeneration regardless of its plan).
   v2 (2026-07-12) — entitlement updated for the v100 tier model. The old
     check only accepted plan === 'premium' | 'comp', which predates the
     rename to free/standard/pro — so every real paid user (plan 'pro' or
     'standard') was refused with 402 and no new account could ever use
     Loop. Now: pro, standard, premium (legacy alias) and comp are entitled;
     free and suspended are refused. NOTE: the admin console's "KV plan
     sync" warning is vestigial with this Worker — Firestore is the
     authority for entitlement, read fresh on every request.

   WHAT CHANGED vs the old (pre-auth) worker:
   - /ai requires a valid Firebase ID token (Authorization: Bearer <token>),
     NOT a shared PIN. Each call is tied to a real, verified user.
   - The Worker reads the user's `plan` directly from Firestore
     (users/{uid}/core/current) using a service account, and only allows AI
     for entitled plans (see ENTITLED below). Free users are refused (402).
   - Per-user daily cap (100) and a global daily kill-switch (5000), in KV.
     comp is exempt from the per-user cap; all calls count globally.
   - The legacy KV sync routes (PUT/GET /) are removed — Firestore handles sync now.

   SECRETS / VARS you must set (wrangler secret put, or dashboard → Variables):
     ANTHROPIC_API_KEY        (secret)  your Anthropic key
     FIREBASE_PROJECT_ID      (var)     the-stack-prod
     GCP_SA_CLIENT_EMAIL      (var)     service account email
     GCP_SA_PRIVATE_KEY       (secret)  service account private key (PEM, with \n)
   BINDINGS:
     THESTACK  (KV namespace)  reused for rate-limit counters

   HOW TO GET THE SERVICE ACCOUNT:
     Firebase console → Project settings → Service accounts →
     "Generate new private key" → downloads a JSON. From it:
       client_email  -> GCP_SA_CLIENT_EMAIL
       private_key   -> GCP_SA_PRIVATE_KEY  (keep the -----BEGIN...-----)
     NEVER commit that JSON or paste the private key anywhere but the Worker secret.
   ============================================================ */

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const PER_USER_DAILY = 100;
const GLOBAL_DAILY = 5000;

/* v100 tier model: 'standard' and 'pro' are the live paid tiers;
   'premium' is a legacy alias for pro; 'comp' is a comped account.
   'free' and 'suspended' get no AI. Tier DEPTH (Standard = one focus
   stack, Pro = everything) is shaped client-side; the Worker only
   gates paid vs not. */
const ENTITLED = ['pro', 'standard', 'premium', 'comp'];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/ai' && request.method === 'POST') {
      return handleAI(request, env, ctx);
    }
    if (url.pathname === '/admin/usage' && request.method === 'GET') {
      return handleAdminUsage(request, env, url);
    }
    if (url.pathname === '/admin/setPlan' && request.method === 'POST') {
      return handleAdminSetPlan(request, env);
    }
    if (url.pathname === '/admin/checkUsers' && request.method === 'POST') {
      return handleAdminCheckUsers(request, env);
    }
    return json({ error: 'not found' }, 404);
  },
};

async function handleAI(request, env, ctx) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'server not configured' }, 500);

  // --- 1. Verify Firebase ID token ---
  const authz = request.headers.get('Authorization') || '';
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return json({ error: 'missing token' }, 401);
  let claims;
  try {
    claims = await verifyFirebaseToken(m[1], env.FIREBASE_PROJECT_ID);
  } catch (e) {
    return json({ error: 'invalid token', detail: String(e.message || e) }, 401);
  }
  const uid = claims.sub;
  if (!uid) return json({ error: 'invalid token' }, 401);
  const isAdmin = claims.admin === true;

  // --- 2. Read plan from Firestore ---
  let plan = 'free';
  try {
    plan = await getUserPlan(uid, env);
  } catch (e) {
    // If entitlement can't be read, fail closed (treat as free) rather than open.
    plan = 'free';
  }
  // Admin tokens are always entitled — the console uses AI for prompt
  // regeneration and shouldn't depend on the admin account's own plan.
  const entitled = isAdmin || ENTITLED.includes(plan);
  if (!entitled) {
    return json({ error: 'upgrade_required', message: 'Loop is a premium feature.' }, 402);
  }

  // --- 3. Rate limits (KV) ---
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
  const globalKey = 'rl:global:' + day;
  const userKey = 'rl:user:' + uid + ':' + day;

  const globalCount = parseInt((await env.THESTACK.get(globalKey)) || '0', 10);
  if (globalCount >= GLOBAL_DAILY) {
    return json({ error: 'rate_limited', scope: 'global', message: 'The assistant is temporarily unavailable. Please try again later.' }, 429);
  }
  // comp and admin exempt from the per-user cap; paid tiers are counted
  if (plan !== 'comp' && !isAdmin) {
    const userCount = parseInt((await env.THESTACK.get(userKey)) || '0', 10);
    if (userCount >= PER_USER_DAILY) {
      return json({ error: 'rate_limited', scope: 'user', message: "You've reached today's assistant limit. It resets tomorrow." }, 429);
    }
    await env.THESTACK.put(userKey, String(userCount + 1), { expirationTtl: 60 * 60 * 26 });
  }
  await env.THESTACK.put(globalKey, String(globalCount + 1), { expirationTtl: 60 * 60 * 26 });

  // --- 4. Proxy to Anthropic ---
  let payload;
  try { payload = await request.json(); }
  catch { return json({ error: 'bad request' }, 400); }
  const { system, messages, useWebSearch } = payload;
  if (!Array.isArray(messages) || !messages.length) {
    return json({ error: 'messages required' }, 400);
  }

  const body = { model: MODEL, max_tokens: MAX_TOKENS, system: system || '', messages };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }];
  }

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return json({ error: 'upstream network error' }, 502);
  }
  const data = await r.json();
  if (!r.ok) return json({ error: 'anthropic error', detail: data }, r.status);

  // --- 5. Usage accounting (for the admin console dashboard) ---
  const rec = recordUsage(env, day, uid, data.usage || {});
  if (ctx && ctx.waitUntil) ctx.waitUntil(rec); else await rec.catch(() => {});

  const text = (data.content || [])
    .filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
  return json({ text, raw: data.stop_reason }, 200);
}

/* ---------- Usage accounting + admin endpoints ---------- */

/* One KV record per user per day: u:{YYYY-MM-DD}:{uid} → {c,i,o,m}.
   Aggregated on demand by /admin/usage. Read-modify-write races between
   concurrent same-user calls can undercount slightly — fine for ops
   dashboards, and it keeps the hot path to a single small KV write. */
async function recordUsage(env, day, uid, usage) {
  try {
    const key = 'u:' + day + ':' + uid;
    const cur = JSON.parse((await env.THESTACK.get(key)) || '{"c":0,"i":0,"o":0}');
    cur.c += 1;
    cur.i += usage.input_tokens || 0;
    cur.o += usage.output_tokens || 0;
    cur.m = MODEL;
    await env.THESTACK.put(key, JSON.stringify(cur), { expirationTtl: 60 * 60 * 24 * 40 });
  } catch (e) { /* accounting must never break the chat */ }
}

async function verifyAdmin(request, env) {
  const authz = request.headers.get('Authorization') || '';
  const m = authz.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const claims = await verifyFirebaseToken(m[1], env.FIREBASE_PROJECT_ID);
    return claims.admin === true ? claims : null;
  } catch (e) { return null; }
}

/* GET /admin/usage?month=YYYY-MM → shape the console dashboard expects:
   { totals:{calls,in,out}, days:{date:{calls,in,out}}, topUsers:{uid:{calls,in,out}}, byModel:{model:{in,out}} } */
async function handleAdminUsage(request, env, url) {
  const admin = await verifyAdmin(request, env);
  if (!admin) return json({ error: 'admin only' }, 401);
  const month = (url.searchParams.get('month') || new Date().toISOString().slice(0, 7)).slice(0, 7);
  const out = { totals: { calls: 0, in: 0, out: 0 }, days: {}, topUsers: {}, byModel: {} };
  let cursor;
  do {
    const page = await env.THESTACK.list({ prefix: 'u:' + month, cursor, limit: 1000 });
    for (const k of page.keys) {
      const v = JSON.parse((await env.THESTACK.get(k.name)) || 'null');
      if (!v) continue;
      // key: u:YYYY-MM-DD:uid
      const rest = k.name.slice(2);
      const day = rest.slice(0, 10);
      const uid = rest.slice(11);
      out.totals.calls += v.c || 0; out.totals.in += v.i || 0; out.totals.out += v.o || 0;
      const d = out.days[day] || (out.days[day] = { calls: 0, in: 0, out: 0 });
      d.calls += v.c || 0; d.in += v.i || 0; d.out += v.o || 0;
      const u = out.topUsers[uid] || (out.topUsers[uid] = { calls: 0, in: 0, out: 0 });
      u.calls += v.c || 0; u.in += v.i || 0; u.out += v.o || 0;
      const model = v.m || MODEL;
      const bm = out.byModel[model] || (out.byModel[model] = { in: 0, out: 0 });
      bm.in += v.i || 0; bm.out += v.o || 0;
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return json(out, 200);
}

/* POST /admin/setPlan {uid,plan} — entitlement is Firestore-read on every /ai
   call, so this KV entry is informational/legacy only; it exists so the
   console's plan-change flow completes without its "KV NOT synced" warning. */
async function handleAdminSetPlan(request, env) {
  const admin = await verifyAdmin(request, env);
  if (!admin) return json({ error: 'admin only' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const { uid, plan } = body || {};
  if (!uid || typeof plan !== 'string') return json({ error: 'uid and plan required' }, 400);
  await env.THESTACK.put('plan:' + uid, plan);
  return json({ ok: true, note: 'entitlement is read from Firestore; KV entry is informational' }, 200);
}

/* ---------- Firebase ID token verification (RS256, Google public keys) ---------- */

let _certCache = { keys: null, exp: 0 };
async function getGoogleKeys() {
  const now = Date.now();
  if (_certCache.keys && now < _certCache.exp) return _certCache.keys;
  // JWKS endpoint returns keys in JWK format, which WebCrypto imports directly
  // (the classic x509 endpoint returns full certs that importKey('spki') rejects).
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  const jwks = await res.json();
  const byKid = {};
  (jwks.keys || []).forEach(k => { byKid[k.kid] = k; });
  const cc = res.headers.get('cache-control') || '';
  const mm = cc.match(/max-age=(\d+)/);
  const ttl = mm ? parseInt(mm[1], 10) * 1000 : 3600 * 1000;
  _certCache = { keys: byKid, exp: now + ttl };
  return byKid;
}

async function verifyFirebaseToken(token, projectId) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('malformed');
  const [h, p, s] = parts;
  const header = JSON.parse(b64urlToStr(h));
  const claims = JSON.parse(b64urlToStr(p));

  // Standard Firebase checks
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) throw new Error('expired');
  if (claims.iat > now + 300) throw new Error('iat in future');
  if (claims.aud !== projectId) throw new Error('bad audience');
  if (claims.iss !== 'https://securetoken.google.com/' + projectId) throw new Error('bad issuer');
  if (!claims.sub) throw new Error('no subject');

  // Signature: find the JWK matching header.kid, import as RSA public key
  const keys = await getGoogleKeys();
  const jwk = keys[header.kid];
  if (!jwk) throw new Error('unknown key');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(s),
    new TextEncoder().encode(h + '.' + p)
  );
  if (!ok) throw new Error('bad signature');
  return claims;
}

/* ---------- Firestore read via service-account OAuth ---------- */

const _tokenCache = {}; // scope -> {token,exp}
async function getAccessToken(env, scope) {
  scope = scope || 'https://www.googleapis.com/auth/datastore';
  const now = Math.floor(Date.now() / 1000);
  const hit = _tokenCache[scope];
  if (hit && now < hit.exp - 60) return hit.token;

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: env.GCP_SA_CLIENT_EMAIL,
    scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const jwt = await signJwtRS256(header, payload, env.GCP_SA_PRIVATE_KEY);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + encodeURIComponent(jwt),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('oauth failed: ' + JSON.stringify(data));
  _tokenCache[scope] = { token: data.access_token, exp: now + (data.expires_in || 3600) };
  return data.access_token;
}

async function getUserPlan(uid, env) {
  const token = await getAccessToken(env);
  const path = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/users/${uid}/core/current`;
  const res = await fetch('https://firestore.googleapis.com/v1/' + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  if (res.status === 404) return 'free'; // no core doc yet
  if (!res.ok) throw new Error('firestore read failed: ' + res.status);
  const doc = await res.json();
  const f = doc.fields || {};
  const str = k => (f[k] && typeof f[k].stringValue === 'string') ? f[k].stringValue : null;
  const num = k => f[k] ? Number(f[k].integerValue ?? f[k].doubleValue ?? NaN) : NaN;
  let plan = str('plan') || 'free';
  // Scheduled change: planUntil (ms epoch) + planAfter. Once passed, the
  // effective plan is planAfter, and we PATCH the doc so the change sticks
  // (fieldPaths in updateMask but absent from the body are deleted).
  const until = num('planUntil');
  if (until && Date.now() > until) {
    plan = str('planAfter') || 'free';
    try {
      await fetch('https://firestore.googleapis.com/v1/' + path
        + '?updateMask.fieldPaths=plan&updateMask.fieldPaths=planUntil&updateMask.fieldPaths=planAfter&updateMask.fieldPaths=updatedAt', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { plan: { stringValue: plan }, updatedAt: { integerValue: String(Date.now()) } } }),
      });
    } catch (e) { /* revert retries on the next call */ }
  }
  return plan;
}

/* POST /admin/checkUsers {uids:[...]} → { found:{uid:{email,lastLoginAt}}, missing:[uids] }
   Looks the uids up in Firebase Auth so the console can show emails and
   flag accounts whose auth record was deleted but whose data lingers. */
async function handleAdminCheckUsers(request, env) {
  const admin = await verifyAdmin(request, env);
  if (!admin) return json({ error: 'admin only' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const uids = Array.isArray(body && body.uids) ? body.uids.slice(0, 1000) : [];
  if (!uids.length) return json({ error: 'uids required' }, 400);
  const token = await getAccessToken(env, 'https://www.googleapis.com/auth/identitytoolkit');
  const found = {};
  for (let i = 0; i < uids.length; i += 100) {
    const batch = uids.slice(i, i + 100);
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ localId: batch }),
    });
    if (!res.ok) return json({ error: 'auth lookup failed', status: res.status }, 502);
    const data = await res.json();
    (data.users || []).forEach(u => {
      found[u.localId] = { email: u.email || '', lastLoginAt: Number(u.lastLoginAt || 0) };
    });
  }
  const missing = uids.filter(u => !found[u]);
  return json({ found, missing }, 200);
}

async function signJwtRS256(header, payload, privateKeyPem) {
  const enc = s => strToB64url(JSON.stringify(s));
  const signingInput = enc(header) + '.' + enc(payload);
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(privateKeyPem.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  return signingInput + '.' + bytesToB64url(new Uint8Array(sig));
}

/* ---------- encoding helpers ---------- */

function b64urlToStr(s) { return new TextDecoder().decode(b64urlToBytes(s)); }
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function strToB64url(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function pemToDer(pem) {
  let s = String(pem);
  s = s.replace(/^["']|["']$/g, '');
  s = s.replace(/\\r/g, '').replace(/\\n/g, '\n');
  s = s.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '');
  const b64 = s.replace(/[^A-Za-z0-9+/=]/g, '');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
