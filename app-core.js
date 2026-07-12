/* ══ SEED ══ */
function P(cat,name,brand,role,why,opts={}){return Object.assign({cat,name,brand,role,why,link:'',notes:'',steps:[],durationDays:90,restockedAt:Date.now(),flags:[],active:true,tags:[],next:null},opts);}
function R(id,cat,type,name,days,steps,createdAt,deletedAt){return{id,cat,type,name,days,steps,createdAt:createdAt||'2000-01-01',deletedAt:deletedAt||null};}
/* true for any routine backing a hair look (seed or user/AI-created) — checks real membership, not id prefix */
function isLookId(id){return Array.isArray(DB.hairLooks)&&DB.hairLooks.some(l=>l.id===id);}
const BUILD='2026-07-12 · v110';
const SEED={
  v:16,updatedAt:0,plan:'free',journal:{},supplements:[],settings:{theme:'copper',mode:'system',graceDaysPerMonth:1,streakScope:{skin:true,hair:false,scent:false,supplements:false},country:'AU',shopMethod:'both',preferredRetailer:'',preferredBrands:[]},profile:{skin:{concerns:[],budget:'',satisfaction:{},photoNotes:'',free:'',done:false,skipped:false},hair:{concerns:[],budget:'',satisfaction:{},photoNotes:'',free:'',done:false,skipped:false},scent:{current:'',whyLike:'',imageToProject:[],free:'',done:false,skipped:false},looks:{goals:'',free:'',done:false,skipped:false},supplements:{concerns:[],budget:'',free:'',done:false,skipped:false}},onboarding:{stage:'welcome',welcomeSeen:false,seedCleared:false,howtoSeen:false,section:null,step:0},aiMemory:{},completions:{},
  products:{
    water:P('skin','Lukewarm Water','Nature Itself','First cleanse — technically','Free, zero ingredients, available everywhere. Dermatologists hate this one weird trick.',{durationDays:1,flags:['permanent']}),
    soap:P('skin','Bar of Soap','Grandads Bathroom','Second cleanse — aggressive','Squeaky clean is a vibe. The squeaking is your skin barrier crying. Classic.',{durationDays:30}),
    mystery:P('skin','Mystery Serum','Found It At The Back Of The Cupboard','Active — unknown vintage','Smells like 2019. Probably fine.',{durationDays:60,next:{name:'Something That Actually Expired This Decade',brand:'Any Brand',role:'Upgrade',why:'The expiry date said 2021 and its now concerning.'}}),
    sunscreen:P('skin','Sunscreen (Applied Once)','Technically Applied','UV protection — annual application','Put on sunscreen they said. Every day they said. You compromised on "occasionally".',{durationDays:365,flags:['permanent']}),
    moisturiser:P('skin','Definitely Moisturiser','Probably Not Hand Cream','Hydration — fingers crossed','It was in a white pump bottle on the bathroom shelf. Could be anything honestly.',{durationDays:45}),
    oil:P('skin','Cleansing Oil','Big Dropper Energy','First cleanse — fancy','Massage in, emulsify with water, feel like you\'re in a spa advert. Youre not. You\'re in your bathroom.',{durationDays:90}),
    retinol:P('skin','Retinol (The Scary One)','Skin Terror Inc.','Cell turnover — with consequences','Start low and slow they said. Used it three nights in a row. Looked like a lizard. Classic.',{durationDays:90,next:{name:'Retinol 0.5% (Even Scarier)',brand:'Skin Terror Inc.',role:'More consequences',why:'Youve earned it. Or suffered for it. Same thing.'}}),
    spf:P('skin','SPF 50','The One Good Habit','UV armour — non-negotiable','The single product every dermatologist agrees on. You own it. You sometimes use it. Progress.',{durationDays:60,flags:['permanent']}),
    olaplex:P('hair','Bond Smoother','Olaplex','Daily leave-in','Applied to hair. Hair responds. Relationship ongoing.',{}),
    shampoo:P('hair','Shampoo','It Was On Sale','Weekly cleanse — economic','Does it have sulphates? Probably. Is it SLS free? Unknown. It lathers well and costs $4.',{durationDays:90}),
    conditioner:P('hair','Conditioner','Same Brand As Shampoo','Weekly condition — matched set','Came in the 2-for-1. Living its best life.',{durationDays:90}),
    wax:P('hair','Hair Wax','Sticky Situation Co.','Weekday finish — structural integrity','Applied to dry hair with fingers. Redistributed to keyboard. Redistributed to face. Classic cycle.',{durationDays:120}),
    pomade:P('hair','Pomade','Weekend Warrior Products','Weekend finish — helmet mode','High hold. Water soluble technically. Requires industrial degreaser in practice.',{durationDays:120}),
    a13:P('scent','Generic Musk No. 7','Department Store Counter','Skin scent — works fine','Spritzed on the wrist. Sniffed. Purchased. Now part of the rotation forever.',{durationDays:365,tags:['weekday','office','daily']}),
    coffee:P('scent','Oud & Burnt Coffee','Probably Niche','Evening depth — conversation starter','Either smells incredible or like a Melbourne cafe that takes itself too seriously. No in between.',{durationDays:365,tags:['evening','winter']}),
    weekend:P('scent','Something Casual','It Was A Gift','Weekend — diplomatic','A gift from someone who clearly thought "he seems like a fresh scents person". They were not wrong.',{durationDays:365,tags:['weekend','casual']})
  },
  routines:[
    R('skin-am','skin','morning','Morning',[0,1,2,3,4,5,6],[{p:'water',wait:0},{p:'moisturiser',wait:30},{p:'mystery',wait:60},{p:'spf',wait:0}]),
    R('skin-a','skin','evening','Evening A — Recovery',[0,4],[{p:'oil',wait:0},{p:'soap',wait:30},{p:'water',wait:30},{p:'moisturiser',wait:60}]),
    R('skin-b','skin','evening','Evening B — Retinol',[2,3,5,6],[{p:'oil',wait:0},{p:'soap',wait:30},{p:'water',wait:30},{p:'retinol',wait:300},{p:'moisturiser',wait:0}]),
    R('skin-c','skin','evening','Evening C — Exfoliation',[1],[{p:'oil',wait:0},{p:'soap',wait:30},{p:'water',wait:30},{p:'mystery',wait:120},{p:'moisturiser',wait:0}]),
    R('skin-refresh','skin','morning','Refresh & Go',[],[{p:'water',wait:0},{p:'moisturiser',wait:30},{p:'spf',wait:0}]),
    R('hair-morning','hair','morning','Daily base',[1,2,3,4,5,6],[{p:'olaplex',wait:0},{p:'wax',wait:0}]),
    R('hair-sunday','hair','morning','Sunday ritual',[0],[{p:'shampoo',wait:0},{p:'conditioner',wait:0},{p:'olaplex',wait:0},{p:'pomade',wait:0}]),
    R('hair-evening','hair','evening','Evening Hair',[0,1,2,3,4,5,6],[{p:'olaplex',wait:0}]),
    R('hair-look-weekday','hair','morning','Look — Weekday',[],[{p:'wax',wait:0}]),
    R('hair-look-weekend','hair','morning','Look — Weekend',[],[{p:'pomade',wait:0}]),
    R('hair-look-beachy','hair','morning','Look — Beachy',[],[{p:'shampoo',wait:0}])
  ],
  hairLooks:[
    {id:'hair-look-weekday',name:'Weekday — Controlled Chaos',desc:'Presentable from 9-5, questionable at 5:01',tags:['weekday']},
    {id:'hair-look-weekend',name:'Weekend — Helmet',desc:'High hold, no regrets, several regrets',tags:['weekend','casual']},
    {id:'hair-look-beachy',name:'Casual — Just Woke Up',desc:'Definitely not 20 minutes of effort.',tags:['casual']}
  ]
};
/* Fixed ids of the demo/example content the app ships with, so a fresh
   install has something to explore before any real data exists. Derived from
   SEED rather than duplicated so they can never drift out of sync with it. */
const SEED_PRODUCT_IDS=Object.keys(SEED.products);
const SEED_ROUTINE_IDS=SEED.routines.map(r=>r.id);
const SEED_HAIRLOOK_IDS=SEED.hairLooks.map(l=>l.id);
/* Clears remaining demo content for the given stacks (deactivate products,
   soft-delete routines/looks — never a hard delete). Called once, the moment
   onboarding commits to setting a stack up, so it stops masquerading as the
   user's real data. Gated by onboarding.seedCleared at the call site so this
   can only ever run on a genuinely fresh install, never on an existing
   account replaying setup from Settings. */
function clearSeedDataFor(cats){
  SEED_PRODUCT_IDS.forEach(id=>{
    const p=DB.products[id];
    if(p&&cats.includes(p.cat))p.active=false;
  });
  SEED_ROUTINE_IDS.forEach(id=>{
    const r=DB.routines.find(x=>x.id===id);
    if(r&&cats.includes(r.cat)&&!r.deletedAt)r.deletedAt=todayStr();
  });
  if(cats.includes('hair'))DB.hairLooks=DB.hairLooks.filter(l=>!SEED_HAIRLOOK_IDS.includes(l.id));
}
/* ══ MIGRATION ══ */
function safeUrl(u){u=(u||'').trim();if(!u)return'';if(!/^https?:\/\//i.test(u))u='https://'+u.replace(/^[a-z]+:\/*/i,'');return u;}
function migrate(d){
  if(!d.v||d.v<4){
    d.routines=structuredClone(SEED.routines);
    if(d.skin){['am','a','b','c','refresh'].forEach(k=>{if(d.skin[k])d.routines.find(r=>r.id==='skin-'+k)&&(d.routines.find(r=>r.id==='skin-'+k).name=d.skin[k].name||d.routines.find(r=>r.id==='skin-'+k).name);});}
    delete d.skin;delete d.hair;
    d.hairLooks=structuredClone(SEED.hairLooks);
    d.settings={};
    Object.values(d.products||{}).forEach(p=>{if(!p.cat)p.cat='skin';if(p.active===undefined)p.active=true;if(!p.tags)p.tags=[];});
    d.v=4;
  }
  if(d.v<5){if(!d.completions)d.completions={};d.v=5;}
  if(d.v<6){
    Object.values(d.products||{}).forEach(p=>{if(!p.steps)p.steps=[];});
    if(!d.lookByContext){const wdL=(d.hairLooks||[]).find(l=>l.id==='hair-look-weekday');const weL=(d.hairLooks||[]).find(l=>l.id==='hair-look-weekend');d.lookByContext={weekday:wdL?wdL.id:null,weekend:weL?weL.id:null};}
    if(!d.settings)d.settings={};if(!d.settings.streakScope)d.settings.streakScope={skin:true,hair:false,scent:false,supplements:false};
    d.v=6;
  }
  if(d.v<7){
    if(!d.settings)d.settings={};
    if(!d.settings.theme)d.settings.theme='copper';
    d.v=7;
  }
  if(d.v<8){
    if(!d.settings)d.settings={};
    if(!d.settings.mode)d.settings.mode='system';
    d.v=8;
  }
  if(d.v<9){
    if(!d.journal)d.journal={};
    if(!d.settings)d.settings={};
    if(d.settings.graceDaysPerMonth===undefined)d.settings.graceDaysPerMonth=1;
    d.v=9;
  }
  if(d.v<10){
    if(!d.settings)d.settings={};
    if(d.settings.country===undefined)d.settings.country='AU';
    if(d.settings.shopMethod===undefined)d.settings.shopMethod='both';
    if(d.settings.preferredRetailer===undefined)d.settings.preferredRetailer='';
    if(!Array.isArray(d.settings.preferredBrands))d.settings.preferredBrands=[];
    const blankSec=()=>({concerns:[],budget:'',satisfaction:{},photoNotes:'',free:'',done:false,skipped:false});
    if(!d.profile)d.profile={};
    if(!d.profile.skin)d.profile.skin=blankSec();
    if(!d.profile.hair)d.profile.hair=blankSec();
    if(!d.profile.scent)d.profile.scent={current:'',whyLike:'',imageToProject:[],free:'',done:false,skipped:false};
    // normalise field types (text fields = string, multi fields = array)
    if(Array.isArray(d.profile.scent.current))d.profile.scent.current=d.profile.scent.current.join(', ');
    if(typeof d.profile.scent.whyLike!=='string')d.profile.scent.whyLike=d.profile.scent.whyLike||'';
    if(!Array.isArray(d.profile.scent.imageToProject))d.profile.scent.imageToProject=d.profile.scent.imageToProject?[d.profile.scent.imageToProject]:[];
    if(!d.profile.looks)d.profile.looks={goals:'',free:'',done:false,skipped:false};
    if(!d.onboarding)d.onboarding={section:null,step:0};
    if(!d.aiMemory)d.aiMemory={};
    d.v=10;
  }
  if(d.v<11){
    // repair scent field types for data created on the initial v10 (current was seeded as [])
    if(d.profile&&d.profile.scent){
      const sc=d.profile.scent;
      if(Array.isArray(sc.current))sc.current=sc.current.join(', ');
      if(typeof sc.current!=='string')sc.current=sc.current?String(sc.current):'';
      if(typeof sc.whyLike!=='string')sc.whyLike=sc.whyLike||'';
      if(!Array.isArray(sc.imageToProject))sc.imageToProject=sc.imageToProject?[sc.imageToProject]:[];
    }
    d.v=11;
  }
  if(d.v<12){
    if(!Array.isArray(d.supplements))d.supplements=[];
    d.v=12;
  }
  if(d.v<13){
    // backfill array fields that older products (or some create paths) may be missing
    Object.values(d.products||{}).forEach(p=>{
      if(!Array.isArray(p.flags))p.flags=[];
      if(!Array.isArray(p.tags))p.tags=[];
      if(!Array.isArray(p.steps))p.steps=[];
    });
    d.v=13;
  }
  if(d.v<14){
    // supplements gain named dose slots; default existing ones to a single morning dose
    (d.supplements||[]).forEach(s=>{if(!Array.isArray(s.slots)||!s.slots.length)s.slots=['morning'];});
    d.v=14;
  }
  if(d.v<15){
    // entitlement tier. Worker is authoritative for AI; client uses this for UX gating.
    if(d.plan===undefined)d.plan='free';
    d.v=15;
  }
  if(d.v<16){
    // Routines gain a lifespan so schedule changes never rewrite past history.
    // Existing routines are backfilled with an old sentinel createdAt so every
    // already-recorded day still counts them; deletedAt=null means "still live".
    (d.routines||[]).forEach(r=>{
      if(!r.createdAt)r.createdAt='2000-01-01';
      if(r.deletedAt===undefined)r.deletedAt=null;
    });
    d.v=16;
  }
  if(d.v<17){
    // v100: stack priorities (core/casual/off) replace the streak-inclusion
    // selector as the user-facing control. streakScope remains as a DERIVED
    // MIRROR (core ⇒ counted) so all existing streak math is untouched —
    // setStackPriority() is the single writer that keeps both in sync.
    // Derivation: previously streak-counted stacks were clearly primary → core;
    // everything else was tracked-but-uncounted → casual. Nothing defaults to
    // off — hiding data a user created is never a migration's call to make.
    const ss=(d.settings&&d.settings.streakScope)||{};
    d.stacks={
      skin:(ss.skin!==false)?'core':'casual',
      hair:ss.hair?'core':'casual',
      scent:ss.scent?'core':'casual',
      supplements:ss.supplements?'core':'casual'
    };
    // Loop focus (Standard tier): defaults to the first core stack.
    const firstCore=['skin','supplements','hair','scent'].find(c=>d.stacks[c]==='core')||'skin';
    d.loopFocus={stack:firstCore,setMonth:''}; // empty setMonth ⇒ switchable immediately
    d.v=17;
  }
  if(d.v<18){
    // v104: tier-forked first-run onboarding (welcome → tier → priority →
    // modules) replaces the old isPremium()+profileComplete() gate on Loop.
    // Existing installs have already been using the app under the old flow —
    // land them on stage 'done' (and seedCleared true, since their demo data
    // — if any is even still around — is none of this migration's business)
    // so nothing new is forced on load; only a brand-new SEED install starts
    // at 'welcome'/seedCleared:false. Users can always replay via Settings.
    if(!d.onboarding)d.onboarding={section:null,step:0};
    if(d.onboarding.stage===undefined)d.onboarding.stage='done';
    if(d.onboarding.welcomeSeen===undefined)d.onboarding.welcomeSeen=true;
    if(d.onboarding.seedCleared===undefined)d.onboarding.seedCleared=true;
    // supplements joins skin/hair/scent/looks as a full onboarding profile section.
    if(!d.profile)d.profile={};
    if(!d.profile.supplements)d.profile.supplements={concerns:[],budget:'',free:'',done:false,skipped:false};
    d.v=18;
  }
  if(d.v<19){
    // v106: the closing "how the app works" tour. Anyone already past
    // onboarding has been using the app — don't force the tour on them;
    // it's replayable from Settings → Setup & tours.
    if(!d.onboarding)d.onboarding={section:null,step:0,stage:'done',welcomeSeen:true,seedCleared:true};
    if(d.onboarding.howtoSeen===undefined)d.onboarding.howtoSeen=(d.onboarding.stage==='done');
    d.v=19;
  }
  // Look tags are additive and don't need a version bump — same treatment as pin/syncUrl below.
  // lookByContext is retired in favour of tag-based auto-select (suggestLook); drop it if present.
  (d.hairLooks||[]).forEach(l=>{if(!Array.isArray(l.tags))l.tags=[];});
  if(d.lookByContext!==undefined)delete d.lookByContext;
  // PIN was a leftover from before Firebase Auth; the Worker only checks the
  // ID token now, so the field is dead weight — same additive-cleanup
  // treatment as lookByContext above, no version bump needed.
  if(d.settings && d.settings.pin!==undefined)delete d.settings.pin;
  // Worker URL is now a hardcoded constant (WORKER_URL) shared by every user
  // instead of a per-user setting, since it's the same single Worker for
  // everyone and identity travels via the Firebase ID token, not the URL.
  if(d.settings && d.settings.syncUrl!==undefined)delete d.settings.syncUrl;
  return d;
}

/* ══ STATE ══ */
let DB;
try{const s=localStorage.getItem('stack_v1');DB=s?migrate(JSON.parse(s)):structuredClone(SEED);}catch(e){DB=structuredClone(SEED);}
let UI={tab:'home',setupPage:null,editRoutineId:null,invCat:'skin',routinesCat:'skin',hairLook:null,runnerId:null,todayDate:null,todayExpanded:{},todayLook:null,modal:null,_promptSel:'full',_newR:null,_schedWarning:null,_afterNewProduct:null,_keepScroll:null};
let timerStart=null,timerInt=null;

/* ══ HELPERS ══ */
/* ══ PERSISTENCE (Stage C: Firestore + offline cache) ══ */
let _fsShadow={ journal:{}, completions:{} };  // last-persisted snapshot for dirty-diff
let _fsCoreTimer=null, _fsDirtyTimer=null;
let _fsReady=false;   // true once Firestore has hydrated DB (or determined it's a fresh account)
let _fsSuspend=false; // true while applying a remote snapshot, to avoid echo-saves
let _localCompWrite={}; // ds -> ms timestamp of our most recent local completion write, to reject stale remote echoes

const CORE_KEYS=['v','updatedAt','plan','planUntil','planAfter','supplements','settings','profile','onboarding','aiMemory','products','routines','hairLooks'];

/* ══ ENTITLEMENT / FREE-TIER CAPS (F1+F2) ══
   NOTE: these gates are UX only. The AI feature is enforced server-side at
   the Worker (token-auth + entitlement) — the client gate is cosmetic there.
   The routine/product/supplement caps are client-side by design: bypassing
   them only lets a user add items to their own account, which costs us nothing. */
const FREE_CAPS={ routines:5, products:15, supplements:5 };
function userPlan(){ return (DB && DB.plan) || 'free'; }
/* v100 tier model: 'standard' is new; 'premium' remains a legacy alias for pro. */
function planTier(){ const p=userPlan(); if(p==='pro'||p==='premium'||p==='comp')return 'pro'; if(p==='standard')return 'standard'; return 'free'; }
function isPremium(){ return planTier()!=='free'; }
/* Free tier switching for testing (pre-store-beta — no charging yet). Never
   touches a 'comp' account: that's Jack's own, always full access regardless
   of what's picked here. */
function setPlanTier(tier){
  if(userPlan()==='comp')return;
  if(!['free','standard','pro'].includes(tier))return;
  DB.plan=tier;save();render();
}
/* Scheduled plan change (set from the admin console): planUntil (ms) +
   planAfter. Once the date passes, the plan reverts. The Worker enforces
   the same rule server-side on every AI call, so neither side can drift. */
function enforcePlanExpiry(){
  if(DB&&DB.planUntil&&Date.now()>DB.planUntil){
    DB.plan=DB.planAfter||'free';
    delete DB.planUntil;delete DB.planAfter;
    save();
  }
}

/* ── v100: stack priority (core / casual / off) ──
   Single writer keeps streakScope mirrored (core ⇒ streak-counted) so the
   entire existing streak pipeline runs unchanged. */
const STACK_CATS=['skin','hair','supplements','scent'];
function stackPriority(cat){
  if(DB.stacks&&DB.stacks[cat])return DB.stacks[cat];
  const on=(cat==='skin')?(DB.settings?.streakScope?.skin!==false):!!(DB.settings?.streakScope?.[cat]);
  return on?'core':'casual';
}
function stackOn(cat){return stackPriority(cat)!=='off';}
function coreStacks(){return STACK_CATS.filter(c=>stackPriority(c)==='core');}
function setStackPriority(cat,p){
  if(!DB.stacks)DB.stacks={};
  DB.stacks[cat]=p;
  if(!DB.settings.streakScope)DB.settings.streakScope={};
  DB.settings.streakScope[cat]=(p==='core'); // derived mirror — keeps streak math untouched
  save();
}

/* ── v100: Loop focus (Standard tier — Loop on one stack, calendar-month switching) ── */
function monthKey(d){const t=d||new Date();return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');}
function loopFocusStack(){return (DB.loopFocus&&DB.loopFocus.stack)||coreStacks()[0]||'skin';}
function canSwitchFocus(){return !DB.loopFocus||!DB.loopFocus.setMonth||DB.loopFocus.setMonth!==monthKey();}
function nextFocusSwitchLabel(){
  const t=new Date(),n=new Date(t.getFullYear(),t.getMonth()+1,1);
  return n.toLocaleDateString('en-AU',{day:'numeric',month:'short'});
}
function setLoopFocus(cat){DB.loopFocus={stack:cat,setMonth:monthKey()};save();}
/* Does this plan get Loop on this stack? (Free-tier taster is enforced
   worker-side and surfaced by its own UI — not through this helper.) */
function loopAccess(cat){
  const t=planTier();
  if(t==='pro')return true;
  if(t==='standard')return loopFocusStack()===cat;
  return false;
}
function countRoutines(){ return (DB.routines||[]).length; }
function countProducts(){ return Object.keys(DB.products||{}).length; }
function countSupplements(){ return (DB.supplements||[]).length; }
function atCap(kind){
  if(isPremium()) return false;
  if(kind==='routines') return countRoutines()>=FREE_CAPS.routines;
  if(kind==='products') return countProducts()>=FREE_CAPS.products;
  if(kind==='supplements') return countSupplements()>=FREE_CAPS.supplements;
  return false;
}
/* Returns true if creation is allowed; if blocked, shows the paywall sheet and returns false. */
function gateCreate(kind){
  if(!atCap(kind)) return true;
  openPaywall(kind);
  return false;
}
function openPaywall(kind){ UI.modal={type:'paywall',kind:kind}; render(); }
function paywallSheet(kind){
  const label={routines:'routines',products:'products',supplements:'supplements'}[kind];
  const sub = label
    ? `You've reached the free limit of ${FREE_CAPS[kind]} ${label}. Upgrade to add unlimited ${label} — and unlock Loop, the AI that closes the gap between you and your routine.`
    : `Unlock Loop — the AI that closes the gap between you and your routine — plus unlimited routines, products and supplements.`;
  return `<div class="pw-sheet">
    <div class="pw-glyph">${FACET_SVG}</div>
    <h2 class="pw-title">Unlock The Stack</h2>
    <p class="pw-sub">${sub}</p>
    <div class="pw-feats">
      <div class="pw-feat"><span class="pw-tick">✓</span> Unlimited routines, products &amp; supplements</div>
      <div class="pw-feat"><span class="pw-tick">✓</span> Loop — personalised guidance from your real routine</div>
      <div class="pw-feat"><span class="pw-tick">✓</span> Journal-aware advice &amp; product suggestions</div>
    </div>
    <button class="btn full" onclick="closeModal()">Coming soon</button>
    <button class="pw-later" onclick="closeModal()">Maybe later</button>
  </div>`;
}
function _coreSlice(){ const o={}; CORE_KEYS.forEach(k=>{ if(DB[k]!==undefined)o[k]=DB[k]; }); return o; }

function _snapshotShadow(){
  _fsShadow.journal=Object.assign({},DB.journal||{});
  _fsShadow.completions=Object.assign({},DB.completions||{});
}
function _dirtyJournalDays(){
  const days=new Set(), cur=DB.journal||{}, old=_fsShadow.journal;
  for(const ds in cur){ if(cur[ds]!==old[ds]) days.add(ds); }
  for(const ds in old){ if(!(ds in cur)) days.add(ds); }  // deletions
  return days;
}
function _dirtyCompletionDays(){
  const days=new Set(), cur=DB.completions||{}, old=_fsShadow.completions;
  const fs=window.stackFS;
  for(const k in cur){ if(JSON.stringify(cur[k])!==JSON.stringify(old[k])){ const d=fs.dateOfCompKey(k); if(d)days.add(d); } }
  for(const k in old){ if(!(k in cur)){ const d=fs.dateOfCompKey(k); if(d)days.add(d); } }
  return days;
}
function _entriesForDate(ds){
  const fs=window.stackFS, out={};
  for(const k in (DB.completions||{})){ if(fs.dateOfCompKey(k)===ds) out[k]=DB.completions[k]; }
  return out;
}

function _flushFirestore(){
  if(!_fsReady||_fsSuspend||!window.stackFS) return Promise.resolve();
  const ps=[];
  ps.push(window.stackFS.saveCore(_coreSlice()));
  _dirtyJournalDays().forEach(ds=>{
    const t=(DB.journal||{})[ds];
    ps.push(window.stackFS.saveJournalDay(ds, t===undefined?'':t));
  });
  _dirtyCompletionDays().forEach(ds=>{
    _localCompWrite[ds]=Date.now();
    ps.push(window.stackFS.saveCompletionDay(ds, _entriesForDate(ds)));
  });
  // Mark the shadow clean only AFTER writes land, so a failed write stays dirty
  // and retries instead of being silently dropped.
  return Promise.all(ps).then(()=>{_snapshotShadow();}).catch(e=>{console.warn('flush failed, will retry',e);});
}
// Flush any pending debounced write immediately and wait for it to land.
window.stackFlushNow = function(){ clearTimeout(_fsDirtyTimer); return _flushFirestore(); };

function save(){
  DB.updatedAt=Date.now();
  // belt-and-braces local cache (immediate)
  try{ localStorage.setItem('stack_v1',JSON.stringify(DB)); }catch(e){}
  // debounced cloud persist (~2.5s)
  if(_fsReady){ clearTimeout(_fsDirtyTimer); _fsDirtyTimer=setTimeout(_flushFirestore,2500); }
}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function dayName(i){return['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][i];}
function dayShort(i){return['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i];}
function fmtWait(s){if(!s)return null;return s>=60?(s/60)+' min':s+' sec';}
function weeklyUses(pid){let n=0;DB.routines.forEach(r=>{if(r.deletedAt)return;if((r.steps||[]).some(st=>st.p===pid))n+=(r.days||[]).length;});return n;}
function usesSince(pid,since){let n=0;for(const k in DB.completions){const c=DB.completions[k];if(!c||!c.steps)continue;const ds=k.slice(k.lastIndexOf('_')+1);const t=Date.parse(ds);if(isNaN(t)||t<since-86400000)continue;if(c.steps.some(st=>st.p===pid&&st.done))n++;}return n;}
function daysLeft(p,pid){
  if(!p.durationDays)return null;
  const cal=Math.round(p.durationDays-(Date.now()-p.restockedAt)/86400000);
  if(!pid)return cal;
  const f=weeklyUses(pid)/7;
  if(!f||f>=0.99)return cal;
  const used=usesSince(pid,p.restockedAt);
  const elapsedSched=((Date.now()-p.restockedAt)/86400000)*f;
  const consumed=used>0?used:elapsedSched;
  return Math.round((p.durationDays-consumed)/f);
}
function lowStock(){return Object.entries(DB.products).filter(([id,p])=>{if(!p.active)return false;const d=daysLeft(p,id);return d!==null&&d<=14;});}
function pName(id){const p=DB.products[id];return p?p.name:'?';}
function routineById(id){return DB.routines.find(r=>r.id===id);}
/* A routine's lifespan gates whether it counts on a given date, so schedule
   edits and deletions never rewrite past history. No ds → "as of now". */
function routineLiveOn(r,ds){
  if(!r)return false;
  const d=ds||todayStr();
  if(r.createdAt&&r.createdAt>d)return false;
  if(r.deletedAt&&r.deletedAt<=d)return false;
  return true;
}
function routineDeleted(r){return !!(r&&r.deletedAt);}
/* Routines that are currently live (not soft-deleted) — for listing/editing UI. */
function liveRoutines(){return DB.routines.filter(r=>!r.deletedAt);}
function routineForDay(day,type,cat,ds){return DB.routines.find(r=>r.cat===cat&&r.type===type&&r.days.includes(day)&&routineLiveOn(r,ds))||null;}
function routinesOf(cat,type){return DB.routines.filter(r=>r.cat===cat&&r.type===type);}
function queuedIds(){return new Set(Object.values(DB.products).filter(p=>p.next&&p.next.productId).map(p=>p.next.productId));}
function activeSteps(steps){const q=queuedIds();return(steps||[]).filter(s=>{const p=DB.products[s.p];return p&&p.active&&!q.has(s.p);});}
function scents(){return Object.entries(DB.products).filter(([id,p])=>p.cat==='scent'&&p.active).map(([id,p])=>({id,...p}));}
function todayStr(){const n=new Date();return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');}
function suggestScent(goingOut){
  const day=new Date().getDay(),h=new Date().getHours(),sc=scents();
  const dayTags=(day===0||day===6)?['weekend','casual']:['weekday','office','daily'];
  const tags=goingOut?['occasion','evening',...dayTags]:h>=17?['evening',...dayTags]:dayTags;
  for(const t of tags){const m=sc.find(s=>s.tags.includes(t));if(m)return m;}
  return sc[0]||null;
}
/* Auto-pick today's hair look from its tags, same priority order as suggestScent: evening overrides weekend/weekday. */
const LOOK_TAGS=['weekday','weekend','casual','evening','special occasion','gym','formal'];
function suggestLook(){
  const day=new Date().getDay(),h=new Date().getHours(),ls=DB.hairLooks||[];
  const dayTags=(day===0||day===6)?['weekend','casual']:['weekday'];
  const tags=h>=17?['evening',...dayTags]:dayTags;
  for(const t of tags){const m=ls.find(l=>(l.tags||[]).includes(t));if(m)return m.id;}
  return ls[0]?ls[0].id:null;
}
/* ══ GAMIFICATION ══ */
function haptic(p){try{if(navigator.vibrate)navigator.vibrate(p);}catch(e){}}
function celebrateRoutine(label){
  const el=document.createElement('div');
  el.className='routine-done';
  el.innerHTML=`<div class="rd-ring"><svg viewBox="0 0 34 34"><circle class="rd-track" cx="17" cy="17" r="15"/><circle class="rd-arc" cx="17" cy="17" r="15"/></svg><span class="rd-tick">✓</span></div>
  <span class="rd-label">${esc(label)} done</span>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1800);
}
function celebrateDay(){
  const streak=calcStreak()+1;
  const scrim=document.createElement('div');
  scrim.className='dd-scrim';
  document.body.appendChild(scrim);
  setTimeout(()=>scrim.remove(),2600);
  const el=document.createElement('div');
  el.className='day-done';
  el.innerHTML=`<div class="dd-ring"><svg viewBox="0 0 64 64"><circle class="dd-track" cx="32" cy="32" r="24"/><circle class="dd-arc" cx="32" cy="32" r="24"/></svg><span class="dd-tick">✓</span></div>
  <div class="dd-title">Day complete</div>
  <div class="dd-sub">${streak} day streak</div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2600);
}
function compKey(rid,date){return rid+'_'+(date||todayStr());}
function getComp(rid,date){return DB.completions[compKey(rid,date)]||null;}
function isRoutineComplete(rid,date){const c=getComp(rid,date);return!!(c&&c.completedAt);}
/* ── supplements (lightweight model) ── */
const SUPP_SLOTS=[['morning','Morning'],['midday','Midday'],['evening','Evening']];
function suppSlots(s){const sl=(s&&Array.isArray(s.slots)&&s.slots.length)?s.slots:['morning'];
  // preserve canonical order
  return SUPP_SLOTS.map(([k])=>k).filter(k=>sl.includes(k));}
function suppSlotLabel(k){const f=SUPP_SLOTS.find(x=>x[0]===k);return f?f[1]:k;}
function supplements(){return (DB.supplements||[]).filter(s=>s.active!==false);}
function suppForDay(day){if(!stackOn('supplements'))return [];return supplements().filter(s=>s.everyday||(Array.isArray(s.days)&&s.days.includes(day)));}
/* v100 supplements parity: pill-count restock projection.
   units = count per container, unitsPerDay = daily consumption, restockedAt = ms epoch.
   Returns whole days remaining, or null when the supplement isn't count-tracked. */
function suppDaysLeft(s){
  if(!s||!s.units||!s.unitsPerDay)return null;
  const elapsed=Math.max(0,(Date.now()-(s.restockedAt||Date.now()))/86400000);
  return Math.max(0,Math.round(s.units/s.unitsPerDay-elapsed));
}
function suppKey(id,date,slot){return 'supp_'+id+'_'+(date||todayStr())+(slot&&slot!=='morning'?'_'+slot:'');}
function suppSlotTaken(id,date,slot){return !!DB.completions[suppKey(id,date,slot)];}
function toggleSuppSlot(id,slot,date){const k=suppKey(id,date||todayStr(),slot);if(DB.completions[k])delete DB.completions[k];else DB.completions[k]={completedAt:Date.now()};save();render();}
/* a supplement counts as "taken" for the day only when every one of its slots is done */
function suppTaken(id,date){const s=(DB.supplements||[]).find(x=>x.id===id);if(!s)return false;const slots=suppSlots(s);return slots.every(sl=>suppSlotTaken(id,date,sl));}
/* legacy single-tap toggle: fills or clears all slots at once (used where a whole-supplement toggle is wanted) */
function toggleSupp(id,date){const s=(DB.supplements||[]).find(x=>x.id===id);if(!s)return;const ds=date||todayStr();const slots=suppSlots(s);const allDone=slots.every(sl=>suppSlotTaken(id,ds,sl));slots.forEach(sl=>{const k=suppKey(id,ds,sl);if(allDone)delete DB.completions[k];else DB.completions[k]={completedAt:Date.now()};});save();render();}
/* dose-level totals for progress rings: counts each slot of each scheduled supplement */
function suppDoseTotals(day,ds){let total=0,done=0;suppForDay(day).forEach(s=>{suppSlots(s).forEach(sl=>{total++;if(suppSlotTaken(s.id,ds,sl))done++;});});return{total,done};}
function suppTakenCount(day,ds){const list=suppForDay(day);return list.filter(s=>suppTaken(s.id,ds)).length;}
function suppStreakComplete(day,ds){const list=suppForDay(day).filter(s=>s.countStreak);return list.length>0&&list.every(s=>suppTaken(s.id,ds));}
function suppHasStreakItems(day){return suppForDay(day).some(s=>s.countStreak);}
function scheduledForDay(day,ds){
  const scope=DB.settings?.streakScope||{skin:true};
  const slots=[];
  if(scope.skin!==false){slots.push(['morning','skin'],['evening','skin']);}
  if(scope.hair){slots.push(['morning','hair'],['evening','hair']);}
  return slots.map(([type,cat])=>routineForDay(day,type,cat,ds)).filter(Boolean);
}
function allScheduledForDay(day,ds){
  const slots=[['morning','skin'],['evening','skin'],['morning','hair'],['evening','hair']]
    .filter(([,cat])=>stackOn(cat)); /* v100: off stacks disappear from Today/Home */
  const rs=slots.map(([type,cat])=>routineForDay(day,type,cat,ds)).filter(Boolean);
  if(stackOn('supplements'))DB.routines.filter(r=>r.cat==='supplements'&&r.days.includes(day)&&routineLiveOn(r,ds)).forEach(r=>rs.push(r));
  const tR={morning:0,evening:1};const cR={skin:0,hair:1,supplements:2,scent:3};
  /* v100: core stacks lead the list; casual follow, keeping the familiar order within each band */
  const pR=c=>stackPriority(c)==='core'?0:1;
  rs.sort((a,b)=>(pR(a.cat)-pR(b.cat))||(tR[a.type]??2)-(tR[b.type]??2)||(cR[a.cat]??4)-(cR[b.cat]??4));
  return rs;
}
function suppScopeOn(){return !!(DB.settings?.streakScope&&DB.settings.streakScope.supplements);}
/* a day counts as complete if all scheduled routines are done AND (if supplements are scope-on) all streak-flagged supplements are taken */
function dayFullyComplete(day,ds){
  const rs=scheduledForDay(day,ds);
  const routinesOk=rs.length>0&&rs.every(r=>isRoutineComplete(r.id,ds));
  if(!suppScopeOn())return routinesOk;
  if(!suppHasStreakItems(day))return routinesOk; // no streak supplements that day → routines decide
  const suppOk=suppStreakComplete(day,ds);
  if(!rs.length)return suppOk; // supplements-only day
  return routinesOk&&suppOk;
}
function dayComplete(day,ds){return dayFullyComplete(day,ds);}
function calcStreak(){
  const now=new Date();let streak=0;
  const allow=DB.settings?.graceDaysPerMonth??1;const used={};
  for(let i=1;i<=365;i++){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const rs=scheduledForDay(d.getDay(),ds);
    const hasSupp=suppScopeOn()&&suppHasStreakItems(d.getDay());
    if(!rs.length&&!hasSupp)continue;
    if(dayFullyComplete(d.getDay(),ds)){streak++;continue;}
    const mk=ds.slice(0,7);
    if((used[mk]||0)<allow){used[mk]=(used[mk]||0)+1;continue;}
    break;
  }
  return streak;
}
function todayDoneCount(){return scheduledForDay(new Date().getDay()).filter(r=>isRoutineComplete(r.id,todayStr())).length;}
function todayTotalCount(){return scheduledForDay(new Date().getDay()).length;}
function weekStats(){
  const now=new Date();let done=0,total=0;
  for(let i=0;i<7;i++){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const rs=scheduledForDay(d.getDay(),ds);total+=rs.length;rs.forEach(r=>{if(isRoutineComplete(r.id,ds))done++;});
  }
  return{done,total};
}
function bestStreak(){
  const now=new Date();let best=0,cur=0;
  const allow=DB.settings?.graceDaysPerMonth??1;const used={};
  for(let i=0;i<90;i++){
    const d=new Date(now);d.setDate(d.getDate()-i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const rs=scheduledForDay(d.getDay(),ds);
    if(!rs.length)continue;
    if(rs.every(r=>isRoutineComplete(r.id,ds))){cur++;best=Math.max(best,cur);continue;}
    const mk=ds.slice(0,7);
    if((used[mk]||0)<allow){used[mk]=(used[mk]||0)+1;continue;}
    cur=0;
  }
  return best;
}
function checklistState(rid,date){
  const r=routineById(rid);if(!r)return[];
  const steps=activeSteps(r.steps);
  const c=getComp(rid,date);
  const si={};
  (c&&c.steps||[]).forEach(s=>{si[s.p]={done:s.done,state:s.state||(s.done?'done':null),appliedAt:s.appliedAt||null};});
  return steps.map(s=>({...s,...(si[s.p]||{done:false,state:null,appliedAt:null})}));
}
function tickStep(rid,productId,dateStr){
  const date=dateStr||UI.todayDate||todayStr();
  const r=routineById(rid);if(!r)return;
  const steps=activeSteps(r.steps);
  const c=getComp(rid,date)||{completedAt:null,steps:[]};
  const wasComplete=!!c.completedAt;
  const rStep=steps.find(s=>s.p===productId);
  const hasWait=rStep&&(rStep.wait||0)>0;
  const sm={};
  (c.steps||[]).forEach(s=>{sm[s.p]={state:s.state||(s.done?'done':null),appliedAt:s.appliedAt||null};});
  const cur=(sm[productId]||{}).state||null;
  if(cur===null){
    sm[productId]={state:hasWait?'applied':'done',appliedAt:hasWait?Date.now():null};
    const idx=steps.findIndex(s=>s.p===productId);
    steps.slice(0,idx).forEach(s=>{if((sm[s.p]||{}).state==='applied')sm[s.p]={state:'done',appliedAt:(sm[s.p]||{}).appliedAt||null};});
  } else {
    sm[productId]={state:null,appliedAt:null};
  }
  c.steps=steps.map(s=>{const st=sm[s.p]||{state:null,appliedAt:null};return{p:s.p,done:st.state==='applied'||st.state==='done',state:st.state,appliedAt:st.appliedAt};});
  const allDone=steps.every(s=>{const st=(sm[s.p]||{}).state;return st==='applied'||st==='done';});
  if(allDone&&!wasComplete)c.completedAt=Date.now();
  if(!allDone)c.completedAt=null;
  DB.completions[compKey(rid,date)]=c;
  save();UI.todayScrollTo=null;
  if(allDone&&!wasComplete){
    UI._justCompleted=rid;
    const dp=date.split('-');const ddow=new Date(+dp[0],+dp[1]-1,+dp[2]).getDay();
    const isDayDone=dayComplete(ddow,date);
    haptic(isDayDone?[20,40,20,40,40]:[15,30,15]);
    if(date===todayStr()){if(isDayDone)celebrateDay();else celebrateRoutine(r.name);}
  } else if(cur===null){haptic(10);}
  if(allDone&&!wasComplete){
    const el=document.getElementById('clist-'+rid);
    if(el){
      const h=el.offsetHeight;el.style.overflow='hidden';el.style.maxHeight=h+'px';el.style.transition='max-height 250ms ease-out,opacity 250ms ease-out';
      if(!UI.todayExpanded)UI.todayExpanded={};delete UI.todayExpanded[rid];
      requestAnimationFrame(()=>{el.style.maxHeight='0';el.style.opacity='0';});
      setTimeout(()=>{UI._settleScroll=true;renderTodayPage();},270);return;
    }
  }
  renderTodayPage();
}
function completeAll(rid){completeAllDate(rid,todayStr());}
function uncompleteRoutine(rid){uncompleteRoutineDate(rid,todayStr());}
function completeAllDate(rid,dateStr){
  const r=routineById(rid);if(!r)return;
  DB.completions[compKey(rid,dateStr)]={completedAt:Date.now(),steps:activeSteps(r.steps).map(s=>({p:s.p,done:true,state:'done',appliedAt:null}))};
  UI._justCompleted=rid;
  const dp=dateStr.split('-');const ddow=new Date(+dp[0],+dp[1]-1,+dp[2]).getDay();
  const isDayDone=dayComplete(ddow,dateStr);
  haptic(isDayDone?[20,40,20,40,40]:[15,30,15]);
  if(dateStr===todayStr()){if(isDayDone)celebrateDay();else celebrateRoutine(r.name);}
  UI.todayScrollTo=null;UI._settleScroll=true;save();renderTodayPage();
}
function uncompleteRoutineDate(rid,dateStr){
  delete DB.completions[compKey(rid,dateStr)];
  UI.todayScrollTo=null;save();renderTodayPage();
}

/* ══ SYNC ══ */
let syncTimer=null;
function schedSync(){ /* legacy KV sync retired in Stage C — Firestore handles persistence */ }
document.addEventListener('visibilitychange',()=>{
  // Legacy KV sync retired in Stage C. Firestore's offline cache and live
  // onSnapshot listeners handle background/foreground sync automatically.
  // On hide, flush any pending debounced write immediately so nothing is lost.
  if(document.visibilityState!=='visible'){ if(_fsReady){ window.stackFlushNow(); } }
});
