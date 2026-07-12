import { initializeApp } from "https://www.gstatic.com/firebasejs/11.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-auth.js";
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
  doc, getDoc, setDoc, addDoc, collection, getDocs, onSnapshot, query, where
} from "https://www.gstatic.com/firebasejs/11.1.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAH0DLSAC3XdmLSU38UF0c_ADbgmaMR10I",
  authDomain: "the-stack-prod.firebaseapp.com",
  projectId: "the-stack-prod",
  storageBucket: "the-stack-prod.firebasestorage.app",
  messagingSenderId: "1069568516086",
  appId: "1:1069568516086:web:6694285bee2b10946ef1d7"
};
let auth, db;
try{
  const fbApp = initializeApp(firebaseConfig);
  auth = getAuth(fbApp);
  // Offline-first: IndexedDB cache, multi-tab safe.
  db = initializeFirestore(fbApp, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
}catch(e){ console.error('Firebase init failed',e); }

/* ── Firestore persistence API, exposed to the classic app script ──
   Layout:  users/{uid}/core/current
            users/{uid}/journal/{YYYY-MM-DD}
            users/{uid}/completions/{YYYY-MM-DD}
   The app keeps flat DB.journal[ds] / DB.completions[key]; this layer
   translates to/from the split docs. */
window.stackFS = (function(){
  let uid=null;
  function setUid(u){ uid=u; }
  function getUid(){ return uid; }
  // date extractor: journal keys ARE dates; completion keys end in _YYYY-MM-DD(_slot)
  function dateOfCompKey(k){
    const m=k.match(/(\d{4}-\d{2}-\d{2})/);
    return m?m[1]:null;
  }
  async function loadAll(){
    if(!db||!uid) return null;
    const out={ core:null, journal:{}, completions:{} };
    // core
    try{ const cs=await getDoc(doc(db,'users',uid,'core','current')); if(cs.exists()) out.core=cs.data(); }catch(e){ console.warn('core load',e); }
    // journal docs
    try{ const js=await getDocs(collection(db,'users',uid,'journal')); js.forEach(d=>{ const v=d.data(); if(v&&typeof v.text==='string') out.journal[d.id]=v.text; }); }catch(e){ console.warn('journal load',e); }
    // completions docs (each doc = one date, holding a map of keys->entry)
    try{ const cs=await getDocs(collection(db,'users',uid,'completions')); cs.forEach(d=>{ const v=d.data(); if(v&&v.entries){ Object.assign(out.completions, v.entries); } }); }catch(e){ console.warn('completions load',e); }
    return out;
  }
  async function saveCore(coreObj){
    if(!db||!uid) return;
    try{ await setDoc(doc(db,'users',uid,'core','current'), coreObj); }catch(e){ console.warn('core save',e); throw e; }
  }
  async function saveJournalDay(ds,text){
    if(!db||!uid) return;
    try{ await setDoc(doc(db,'users',uid,'journal',ds), { text, updatedAt: Date.now() }); }catch(e){ console.warn('journal save',e); }
  }
  async function saveCompletionDay(ds,entriesForDay){
    if(!db||!uid) return;
    try{ await setDoc(doc(db,'users',uid,'completions',ds), { entries: entriesForDay, updatedAt: Date.now() }); }catch(e){ console.warn('completion save',e); throw e; }
  }
  function subscribe(onChange){
    if(!db||!uid) return ()=>{};
    const unsubs=[];
    unsubs.push(onSnapshot(doc(db,'users',uid,'core','current'), s=>{ if(s.exists()&&!s.metadata.hasPendingWrites) onChange('core', s.data()); }, e=>console.warn('core sub',e)));
    unsubs.push(onSnapshot(collection(db,'users',uid,'journal'), qs=>{ if(!qs.metadata.hasPendingWrites){ const j={}; qs.forEach(d=>{const v=d.data(); if(v&&typeof v.text==='string')j[d.id]=v.text;}); onChange('journal', j); } }, e=>console.warn('journal sub',e)));
    unsubs.push(onSnapshot(collection(db,'users',uid,'completions'), qs=>{ if(!qs.metadata.hasPendingWrites){ const c={},meta={}; qs.forEach(d=>{const v=d.data(); if(v&&v.entries){Object.assign(c,v.entries); meta[d.id]=v.updatedAt||0;}}); onChange('completions', {entries:c,meta:meta}); } }, e=>console.warn('completion sub',e)));
    return ()=>unsubs.forEach(u=>{try{u();}catch(e){}});
  }
  /* ── Feedback: user → `feedback` collection → admin console (which writes
     a reply back onto the same doc). Requires Firestore rules allowing
     authenticated users to create feedback docs and read their own. ── */
  async function sendFeedback(text,meta){
    if(!db||!uid) throw new Error('not signed in');
    const email=(auth&&auth.currentUser&&auth.currentUser.email)||'';
    await addDoc(collection(db,'feedback'),{
      uid, email, text:String(text).slice(0,4000),
      createdAt:Date.now(), status:'new', reply:'', repliedAt:0,
      build:(meta&&meta.build)||'', plan:(meta&&meta.plan)||''
    });
  }
  async function loadMyFeedback(){
    if(!db||!uid) return [];
    const qs=await getDocs(query(collection(db,'feedback'),where('uid','==',uid)));
    const out=[]; qs.forEach(d=>out.push({id:d.id,...d.data()}));
    out.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    return out;
  }
  return { setUid, getUid, loadAll, saveCore, saveJournalDay, saveCompletionDay, subscribe, dateOfCompKey, sendFeedback, loadMyFeedback };
})();

/* ── Admin-configurable AI prompt blocks: config/prompts (public read, edited
   in the admin console). Cached copy is applied instantly so chats work
   offline or before the network fetch lands; fresh copy overwrites it. ── */
try{ const c=localStorage.getItem('stack_prompts_cfg'); if(c) window.REMOTE_PROMPTS=JSON.parse(c); }catch(e){}
(async()=>{
  if(!db) return;
  try{
    const s=await getDoc(doc(db,'config','prompts'));
    if(s.exists()){
      window.REMOTE_PROMPTS=s.data();
      try{ localStorage.setItem('stack_prompts_cfg',JSON.stringify(s.data())); }catch(e){}
    }
  }catch(e){ console.warn('prompt config load',e); }
})();

const gate = document.getElementById('authgate');
let mode='signin';
let booted=false;

// Expose sign-out for the app's Setup screen to call later.
window.stackSignOut = ()=>{ return auth ? signOut(auth) : Promise.resolve(); };
// Current user's Firebase ID token, for authenticating Worker /ai calls.
window.stackGetToken = async ()=>{
  try{
    let u = auth && auth.currentUser;
    // currentUser can be briefly null before auth state resolves; wait once.
    if(!u && auth){
      u = await new Promise(res=>{
        const off = onAuthStateChanged(auth, usr=>{ off(); res(usr); });
        setTimeout(()=>{ try{off();}catch(e){} res(auth.currentUser||null); }, 3000);
      });
    }
    if(!u) return null;
    return await u.getIdToken();
  }catch(e){ console.error('stackGetToken failed', e); return null; }
};

const GLYPH=`<svg class="ag-glyph" viewBox="0 0 32 32" fill="none"><path d="M16 3C13 9 9 13 3 16c6 3 10 7 13 13 3-6 7-10 13-13-6-3-10-7-13-13Z" stroke="var(--cu,#b87040)" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const G_SVG=`<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>`;
const A_SVG=`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 12.54c-.03-2.6 2.12-3.84 2.22-3.9-1.21-1.77-3.09-2.02-3.76-2.05-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.89 2.65 3.24 2.6 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.28-1.27 3.13-2.53.99-1.45 1.4-2.85 1.42-2.92-.03-.01-2.72-1.04-2.75-4.13ZM14.53 4.84c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.55-.66.77-1.24 2-1.09 3.18 1.15.09 2.32-.58 3.04-1.45Z"/></svg>`;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function agChrome(hide){
  ['app','tabs','fab-global'].forEach(function(id){var el=document.getElementById(id);if(el)el.style.display=hide?'none':'';});
  var scrim=document.querySelector('.statusbar-scrim');if(scrim)scrim.style.display=hide?'none':'';
}
function showGate(){ gate.classList.add('show'); gate.setAttribute('aria-hidden','false'); agChrome(true); renderGate(); if(window.hideBootScreen)window.hideBootScreen(); }
function hideGate(){ gate.classList.remove('show'); gate.setAttribute('aria-hidden','true'); agChrome(false); }

function renderGate(err){
  const su=mode==='signup';
  gate.innerHTML=`<div class="ag-wrap">
    <div class="ag-brand">${GLYPH}<div class="ag-word">The <em>Stack</em></div><div class="ag-tag">Your routine, remembered.</div></div>
    <h1 class="ag-hd">${su?'Create your account':'Welcome back'}</h1>
    <p class="ag-sub">${su?'Start building your stack. Your data syncs across every device.':'Sign in to pick up where you left off.'}</p>
    <div class="ag-msg ${err?'on':''}" id="ag-msg">${err?esc(err):''}</div>
    <div class="ag-field"><label>Email</label><input id="ag-email" type="email" autocomplete="email" inputmode="email" placeholder="you@example.com"></div>
    <div class="ag-field"><label>Password</label><input id="ag-pw" type="password" autocomplete="${su?'new-password':'current-password'}" placeholder="${su?'At least 6 characters':'••••••••'}"></div>
    <button class="ag-primary" id="ag-submit">${su?'Create account':'Sign in'}</button>
    ${su?'':'<div class="ag-reset"><button id="ag-forgot">Forgot your password?</button></div>'}
    <div class="ag-div">or</div>
    <button class="ag-oauth" id="ag-google">${G_SVG}<span>Continue with Google</span></button>
    <button class="ag-oauth ag-soon" id="ag-apple">${A_SVG}<span>Continue with Apple</span><span class="ag-soonlbl">soon</span></button>
    <div class="ag-foot">${su?'Already have an account?':"Don't have an account?"} <button id="ag-toggle">${su?'Sign in':'Sign up'}</button></div>
    <div class="ag-legal">By continuing you agree to the Terms and Privacy Policy. The Stack offers general routine tracking, not medical advice.</div>
  </div>`;
  document.getElementById('ag-toggle').onclick=()=>{mode=su?'signin':'signup';renderGate();};
  document.getElementById('ag-submit').onclick=doEmail;
  document.getElementById('ag-google').onclick=doGoogle;
  document.getElementById('ag-apple').onclick=()=>msg('Apple sign-in is coming soon. Use Email or Google for now.');
  const fp=document.getElementById('ag-forgot'); if(fp) fp.onclick=doReset;
  document.getElementById('ag-pw').addEventListener('keydown',e=>{if(e.key==='Enter')doEmail();});
}
function msg(t,ok){const m=document.getElementById('ag-msg');if(!m)return;m.textContent=t;m.className='ag-msg '+(ok?'ok':'on');}

/* Unified smart email auth: whichever button they pressed, land them in an
   account. Sign-in with no matching account auto-creates one; sign-up with
   an existing email just signs them in (if the password matches). Note:
   Firebase deliberately hides whether an email exists (invalid-credential
   covers both "no such user" and "wrong password"), so the only way to
   auto-signup is to attempt creation and interpret the failure. */
async function doEmail(){
  const email=document.getElementById('ag-email').value.trim();
  const pw=document.getElementById('ag-pw').value;
  if(!email||!pw){msg('Enter your email and password.');return;}
  const b=document.getElementById('ag-submit');b.disabled=true;b.textContent='…';
  const fail=code=>{ b.disabled=false; b.textContent=mode==='signup'?'Create account':'Sign in'; msg(friendly(code)); };
  if(mode==='signup'){
    try{ await createUserWithEmailAndPassword(auth,email,pw); }
    catch(e){
      if(e.code==='auth/email-already-in-use'){
        // Account exists — try signing them straight in with what they typed.
        try{ await signInWithEmailAndPassword(auth,email,pw); }
        catch(e2){ fail('auth/account-exists-wrong-pw'); }
      } else fail(e.code);
    }
  } else {
    try{ await signInWithEmailAndPassword(auth,email,pw); }
    catch(e){
      const noMatch=(e.code==='auth/user-not-found'||e.code==='auth/invalid-credential'||e.code==='auth/invalid-login-credentials');
      if(!noMatch){ fail(e.code); return; }
      // No matching credentials. If the account genuinely doesn't exist,
      // create it on the spot; if it does exist (creation collides), the
      // password was simply wrong.
      try{ await createUserWithEmailAndPassword(auth,email,pw); }
      catch(e2){
        if(e2.code==='auth/email-already-in-use') fail(e.code);            // account exists → wrong password
        else if(e2.code==='auth/weak-password') fail('auth/signin-or-weak'); // ambiguous: wrong pw, or new user with short pw
        else fail(e2.code);
      }
    }
  }
}
async function doGoogle(){ try{ await signInWithPopup(auth,new GoogleAuthProvider()); }catch(e){ msg(friendly(e.code)); } }
// Sign-out from Settings → Data. Gives immediate visual feedback (disabled
// button + spinner-style label) since flush+signOut+reload can take a
// moment on a slow connection and the button used to just sit there.
function doSignOutTap(btn){
  if(!btn||btn.disabled)return;
  btn.disabled=true;
  btn.style.opacity='.6';
  const t=document.getElementById('signOutTitle'); if(t)t.textContent='Signing out…';
  const s=document.getElementById('signOutSub'); if(s)s.textContent='One moment';
  (window.stackFlushNow?window.stackFlushNow():Promise.resolve())
    .then(function(){ return window.stackSignOut?window.stackSignOut():Promise.resolve(); })
    .finally(function(){ location.reload(); });
}
// This file is loaded as a module (<script type="module">), so its top-level
// declarations are module-scoped, not global — the Settings → Data page's
// inline onclick="doSignOutTap(this)" (rendered by a classic script) can only
// ever resolve a real global, same as stackSignOut/stackGetToken below.
window.doSignOutTap = doSignOutTap;
async function doReset(){
  const email=document.getElementById('ag-email').value.trim();
  if(!email){msg('Enter your email above first, then tap reset.');return;}
  try{ await sendPasswordResetEmail(auth,email); msg('Password reset email sent — check your inbox.',true); }
  catch(e){ msg(friendly(e.code)); }
}
function friendly(code){return({
  'auth/invalid-email':"That email address doesn't look right.",
  'auth/missing-password':'Enter a password.',
  'auth/weak-password':'Password needs at least 6 characters.',
  'auth/email-already-in-use':'That email already has an account — try signing in.',
  'auth/account-exists-wrong-pw':'That email already has an account, but the password didn\'t match. Try again, or tap "Forgot your password?" on the sign-in screen.',
  'auth/signin-or-weak':'No sign-in matched. If you\'re new here, pick a password of at least 6 characters and we\'ll create your account.',
  'auth/invalid-credential':'Email or password is incorrect.',
  'auth/user-not-found':'No account with that email — try signing up.',
  'auth/wrong-password':'Email or password is incorrect.',
  'auth/operation-not-allowed':'Email sign-in isn\'t enabled for this app right now.',
  'auth/popup-closed-by-user':'Sign-in window closed before finishing.',
  'auth/popup-blocked':'Your browser blocked the popup — allow popups and retry.',
  'auth/unauthorized-domain':'This domain isn\'t authorized in Firebase yet.',
  'auth/network-request-failed':'The request couldn\'t reach the sign-in service. Check your connection — and if you use an ad-blocker, Brave Shields or a VPN, allow identitytoolkit.googleapis.com and try again.',
  'auth/too-many-requests':'Too many attempts. Wait a moment and try again.'
}[code]||('Something went wrong: '+(code||'unknown')));}

if(auth){
  onAuthStateChanged(auth,user=>{
    window.__authReady=true;
    if(user){
      // A genuine sign-in transition is when the gate was actually on screen
      // (the user just typed credentials or tapped Google) — as opposed to
      // a cold-start fast-boot from an already-known session, where painting
      // instantly from local cache is correct and desired. Only the former
      // risks a flash of stale/placeholder data, since it can be a different
      // account than whatever was last cached locally.
      const fromGate = gate.classList.contains('show');
      try{ localStorage.setItem('stack_session','1'); }catch(e){}
      window.stackFS.setUid(user.uid);
      hideGate();
      // Order matters: bootApp() ends with hideBootScreen(), so it must run
      // BEFORE showBootScreen() or a gate sign-in flashes stale cached data
      // for the whole hydration window (the boot screen dies instantly).
      if(!booted){ booted=true; if(window.bootApp) window.bootApp(); }
      if(fromGate && window.showBootScreen) window.showBootScreen();
      // uid is now known — start (or continue) the cloud sync. When this
      // sign-in came from the gate, keep the boot screen up until the
      // account's real data has hydrated, then reveal it — no flash. The
      // finally() (not then()) guarantees the screen drops even if
      // hydration rejects, rather than hanging until the 6s failsafe.
      if(window.startCloudSync){
        const p=window.startCloudSync();
        if(fromGate) Promise.resolve(p).catch(function(e){ console.warn('cloud sync after sign-in failed', e); }).finally(function(){ if(window.hideBootScreen) window.hideBootScreen(); });
      }
    }else{
      // No user. Clear the fast-boot marker; if we optimistically booted from a
      // stale marker, this will surface the login gate over the app.
      try{ localStorage.removeItem('stack_session'); }catch(e){}
      window.stackFS.setUid(null);
      showGate();
    }
  });
}else{
  // SDK failed to load — don't trap the user; boot the app on localStorage.
  window.__authReady=true;
  if(window.bootApp) window.bootApp();
}
