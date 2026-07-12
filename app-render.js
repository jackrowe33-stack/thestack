/* ══ RENDER ══ */
/* v102 wide layout: ≥900px renders a rail/sidebar; Home becomes the Day Board
   (morning/evening columns + rail), other tabs are centred panels.
   Below 900px nothing changes. */
const WIDE_MQ=window.matchMedia('(min-width:900px)');
function isWide(){return WIDE_MQ.matches;}
(function(){const onW=()=>{UI._keepScroll=null;UI._scrollRestoring=false;render();};
  try{WIDE_MQ.addEventListener('change',onW);}catch(e){WIDE_MQ.addListener(onW);}})();
function render(){
  // Save current scroll before re-rendering (skipped when we intend to restore an exact position)
  if(!UI._scrollPositions)UI._scrollPositions={};
  const curKey=UI.tab+(UI.setupPage||'');
  if(!UI._scrollRestoring&&UI._keepScroll==null)UI._scrollPositions[curKey]=window.scrollY;
  const app=document.getElementById('app');
  const detail=document.getElementById('detail');
  // First-run onboarding (welcome → tier → priority → modules) is full-screen
  // and independent of UI.tab — it takes over #app and hides the tab bar the
  // same way UI.tab==='setup' does, then bails out before any of the normal
  // tab/sheet/board/facet machinery below.
  const obStage=DB.onboarding&&DB.onboarding.stage;
  if(obStage&&obStage!=='done'){
    if(detail){detail.hidden=true;detail.innerHTML='';}
    document.body.classList.remove('panes-wide','board-wide');
    app.classList.remove('app-sheet','tab-fade');
    app.innerHTML=vOnboardFlow();
    const tabsEl=document.getElementById('tabs');if(tabsEl)tabsEl.style.display='none';
    const sbd=document.getElementById('sheet-backdrop');if(sbd)sbd.remove();
    const fov=document.getElementById('facet-ov');if(fov)fov.style.display='none';
    renderModal();
    window.scrollTo(0,0);
    return;
  }
  const sheetTab=(UI.tab==='today'||UI.tab==='runner'||UI.tab==='scent'||UI.tab==='history'||UI.tab==='supplements');
  /* v102: master–detail panes retired. Wide (≥900px) Home renders the Day Board
     (morning/evening columns + rail); every other tab renders as a single
     centred column. Phone rendering untouched. */
  const board=isWide()&&UI.tab==='home';
  document.body.classList.remove('panes-wide');
  document.body.classList.toggle('board-wide',board);
  if(detail){detail.hidden=true;detail.innerHTML='';}
  if(board)app.innerHTML=vBoard();
  else if(UI.tab==='home')app.innerHTML=vHome();
  else if(UI.tab==='today')app.innerHTML=vToday();
  else if(UI.tab==='runner')app.innerHTML=vRunner();
  else if(UI.tab==='routines')app.innerHTML=vRoutines();
  else if(UI.tab==='setup')app.innerHTML=vSetupRouter();
  else if(UI.tab==='scent')app.innerHTML=vScent();
  else if(UI.tab==='history')app.innerHTML=vHistory();
  else if(UI.tab==='supplements')app.innerHTML=vSupplements();
  else app.innerHTML=vHome();
  app.classList.remove('tab-fade');
  if(UI._tabFade){void app.offsetWidth;app.classList.add('tab-fade');UI._tabFade=false;}
  // Sheet-style tabs render inside .today-sheet which manages its own bottom
  // clearance; the global #app padding/min-height would otherwise add dead
  // scrollable space below a short sheet (e.g. a collapsed routine).
  // (v102: on wide screens sheets render as centred panels — the phone-only
  // backdrop/swipe machinery and app-sheet class are skipped.)
  app.classList.toggle('app-sheet',sheetTab&&!isWide());
  // Body-level raised backdrop behind the sheet (kept OUT of the sheet so its
  // page-up transform can't trap it and flash the ghost through on open).
  let sbd=document.getElementById('sheet-backdrop');
  if(sheetTab&&!isWide()){
    if(!sbd){ sbd=document.createElement('div'); sbd.id='sheet-backdrop'; sbd.className='sheet-backdrop'; document.body.appendChild(sbd); }
  } else if(sbd){ sbd.remove(); }
  renderTabs();renderModal();renderFacet();
  if(sheetTab&&!isWide())attachSheetSwipe();
  // Wake lock follows the checklist views
  if(UI.tab==='today'||UI.tab==='runner')acquireWakeLock();else releaseWakeLock();
  // Scroll handling: exact-restore (mid-checklist re-render) > evening auto-scroll > per-tab restore > top
  const scrollKey=UI.tab+(UI.setupPage||'');
  if(UI._settleScroll){
    UI._settleScroll=false;UI._keepScroll=null;UI._scrollRestoring=false;
    const clamp=()=>{const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);if(window.scrollY>max)window.scrollTo(0,max);};
    requestAnimationFrame(()=>{clamp();requestAnimationFrame(clamp);});
  } else if(UI._keepScroll!=null){
    const y=UI._keepScroll;UI._keepScroll=null;UI._scrollRestoring=false;
    requestAnimationFrame(()=>{
      const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
      window.scrollTo(0,Math.min(y,max));
    });
  } else if(UI._scrollPositions&&UI._scrollPositions[scrollKey]!==undefined&&UI._scrollRestoring){
    requestAnimationFrame(()=>window.scrollTo(0,UI._scrollPositions[scrollKey]));
    UI._scrollRestoring=false;
  } else if(!UI._scrollRestoring){
    window.scrollTo(0,0);
  } else {UI._scrollRestoring=false;}
  updateWaitDisplay();
  if(UI._facetOpen&&UI._view==='chat')requestAnimationFrame(syncChatViewport);
}
function renderTabs(){
  const ts=[['home',HOME_SVG,'Home','navTab'],['facet',FACET_SVG,'Loop','openFacet'],['routines',LIST_SVG,'Routines','navTab']];
  document.getElementById('tabs').style.display=(UI.tab==='setup')?'none':'';
  document.getElementById('tabs').innerHTML=ts.map(([k,ic,l,call])=>{
    const active=(call==='navTab'&&UI.tab===k)||(k==='facet'&&UI._facetOpen);
    const args=(call==='openFacet')?'':k;
    return`<button class="tab ${active?'active':''}" data-call="${call}" data-args="${args}"><span class="ic">${ic}</span><span class="tab-label">${l}</span></button>`;
  }).join('');
}
function saveScroll(){if(!UI._scrollPositions)UI._scrollPositions={};UI._scrollPositions[UI.tab+(UI.setupPage||'')]=window.scrollY;}
function leaveToday(fn){
  if(isWide()){fn&&fn();return;} /* v99: panes mode has no full-screen sheet to animate away */
  const sheet=document.querySelector('.today-sheet');
  if((UI.tab==='today'||UI.tab==='runner'||UI.tab==='scent'||UI.tab==='history')&&sheet&&!UI._exitingToday){
    UI._exitingToday=true;
    removeBgGhost();
    const r=sheet.getBoundingClientRect();
    const ghost=document.createElement('div');
    ghost.style.cssText=`position:fixed;top:${r.top}px;left:${r.left}px;width:${r.width}px;height:${r.height}px;z-index:40;pointer-events:none;overflow:hidden`;
    const clone=sheet.cloneNode(true);
    clone.classList.remove('page-up');
    clone.style.margin='0';
    clone.style.transform='none';
    clone.style.transition='none';
    ghost.appendChild(clone);
    document.body.appendChild(ghost);
    fn();
    requestAnimationFrame(()=>{ghost.classList.add('page-down-ghost');});
    setTimeout(()=>{ghost.remove();UI._exitingToday=false;},440);
  } else {removeBgGhost();fn();}
}
function snapshotBg(){
  const appEl=document.getElementById('app');
  const old=document.getElementById('bg-ghost');if(old)old.remove();
  const g=document.createElement('div');
  g.id='bg-ghost';g.className='bg-ghost';
  const inner=document.createElement('div');
  inner.style.cssText=`max-width:430px;margin:0 auto;transform:translateY(${-window.scrollY}px)`;
  inner.innerHTML=appEl.innerHTML;
  g.appendChild(inner);
  // Insert the ghost BEFORE the raised backdrop (if present) so the backdrop —
  // same z-index — always paints on top of the ghost and no ghost flashes through.
  const sbd=document.getElementById('sheet-backdrop');
  if(sbd)document.body.insertBefore(g,sbd);
  else document.body.appendChild(g);
}
function removeBgGhost(){const g=document.getElementById('bg-ghost');if(g)g.remove();}
function attachSheetSwipe(){
  const sheet=document.querySelector('.today-sheet');
  if(!sheet||sheet._swipeBound)return;
  sheet._swipeBound=true;
  let sx=0,sy=0,armed=false,dragging=false,dead=false,dy=0,lastY=0,lastT=0,vel=0;
  sheet.addEventListener('touchstart',e=>{
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
    lastY=sy;lastT=e.timeStamp;vel=0;dy=0;dragging=false;dead=false;
    // Header = everything above the first content card. Arm dismiss only when the
    // drag STARTS above that first card; from the first card down it's scrollable
    // body and should scroll, never dismiss. Covers every .today-sheet tab
    // (today/runner checklist, scent cards, supplements, history). Still requires
    // the page to be at the very top.
    const firstCard=sheet.querySelector('.checklist,.step,.scent-card,.scent-today,.today-section,.steps,.card,.streak-card');
    let headerBottom;
    if(firstCard){ headerBottom=firstCard.getBoundingClientRect().top; }
    else { headerBottom=sheet.getBoundingClientRect().top+72; }
    armed=window.scrollY<=2 && !UI._exitingToday && sy<=headerBottom;
  },{passive:true});
  sheet.addEventListener('touchmove',e=>{
    if(!armed||dead)return;
    const y=e.touches[0].clientY;
    const dx=e.touches[0].clientX-sx;
    dy=y-sy;
    vel=(y-lastY)/Math.max(1,e.timeStamp-lastT);
    lastY=y;lastT=e.timeStamp;
    if(!dragging){
      if(dy<-6||Math.abs(dx)>Math.abs(dy)+6){dead=true;return;}
      if(dy>6){dragging=true;sheet.style.transition='none';}
      else return;
    }
    e.preventDefault();
    sheet.style.transform=`translateY(${Math.max(0,dy)}px)`;
  },{passive:false});
  sheet.addEventListener('touchend',()=>{
    if(!dragging){armed=false;return;}
    dragging=false;armed=false;
    const shouldDismiss=dy>140||(dy>60&&vel>0.5);
    if(shouldDismiss){
      dismissSheet();
    }else{
      sheet.style.transition='transform .3s cubic-bezier(.32,.72,0,1)';
      sheet.style.transform='translateY(0)';
      setTimeout(()=>{sheet.style.transition='';sheet.style.transform='';},320);
    }
  },{passive:true});
}
function dismissSheet(){
  const ret=UI._sheetReturn;
  if(ret&&(ret.tab==='setup'||ret.tab==='history')){
    saveScroll();
    leaveToday(()=>{UI.tab=ret.tab;UI.setupPage=ret.tab==='setup'?(ret.setupPage||null):null;UI.runnerId=null;UI._scrollRestoring=true;UI._tabFade=true;render();});
  } else {
    navTab(ret&&(ret.tab==='home'||ret.tab==='routines')?ret.tab:'home');
  }
}
function navTab(k){saveScroll();if(k==='today'){openToday();return;}leaveToday(()=>{UI.tab=k;UI.setupPage=null;UI.runnerId=null;UI._view=null;UI._scrollRestoring=true;UI._tabFade=true;render();});}
function openSetup(){saveScroll();const ret=UI.tab;leaveToday(()=>{if(ret!=='setup')UI._setupReturn=ret;UI.tab='setup';UI.setupPage=null;UI._tabFade=true;render();});}
function closeSetup(){navTab(UI._setupReturn==='routines'?'routines':'home');}
const GEAR_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><path d="M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/></svg>';
const HOME_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l-2 0l9 -9l9 9l-2 0"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7"/><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6"/></svg>';
const TODAY_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 12m-2.6 0a2.6 2.6 0 1 0 5.2 0a2.6 2.6 0 1 0 -5.2 0" fill="currentColor" stroke="none"/></svg>';
const LIST_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="M5 6h.01"/><path d="M5 12h.01"/><path d="M5 18h.01"/></svg>';
const FACET_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4c1.5 2.5 3.5 4.5 6 6c-2.5 1.5-4.5 3.5-6 6c-1.5-2.5-3.5-4.5-6-6c2.5-1.5 4.5-3.5 6-6z"/></svg>';
const CHEV_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6l6 6"/></svg>';
function gearBtn(){return`<button class="hdr-gear" aria-label="Setup" onclick="openSetup()">${GEAR_SVG}</button>`;}

/* ══ TODAY (first-class tab) ══ */
let _wakeLock=null;
async function acquireWakeLock(){
  try{
    if('wakeLock' in navigator&&!_wakeLock){
      _wakeLock=await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release',()=>{_wakeLock=null;});
    }
  }catch(e){}
}
function releaseWakeLock(){
  if(_wakeLock){_wakeLock.release().catch(()=>{});_wakeLock=null;}
}
// Re-acquire if tab becomes visible again while a checklist view is open
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='visible'&&(UI.tab==='today'||UI.tab==='runner'))acquireWakeLock();
});
function openToday(dateStr,routineId){
  saveScroll();
  if(UI.modal){UI._productReturn=null;UI.modal=null;const _ov=document.getElementById('ov');if(_ov)_ov.remove();}
  if(routineId){
    UI._todayEnter=UI.tab!=='runner';
    if(UI._todayEnter&&!(UI.tab==='today'||UI.tab==='runner'||UI.tab==='scent'))UI._sheetReturn={tab:UI.tab,setupPage:UI.setupPage};
    if(UI._todayEnter)snapshotBg();
    UI.tab='runner';UI.runnerId=routineId;UI.todayDate=dateStr||todayStr();UI.setupPage=null;
    UI.todayScrollTo=null;render();return;
  }
  UI._todayEnter=UI.tab!=='today';
  if(UI._todayEnter&&!(UI.tab==='today'||UI.tab==='runner'||UI.tab==='scent'))UI._sheetReturn={tab:UI.tab,setupPage:UI.setupPage};
  if(UI._todayEnter)snapshotBg();
  UI.tab='today';UI.setupPage=null;UI.runnerId=null;
  UI.todayDate=dateStr||todayStr();
  UI.todayScrollTo=null;
  render();
}
// Scroll-preserving re-render used by checklist interactions (name kept for handler compatibility)
function renderTodayPage(){UI._keepScroll=window.scrollY;render();}
function vToday(){
  const enter=UI._todayEnter;UI._todayEnter=false;
  const justC=UI._justCompleted;UI._justCompleted=null;
  const dateStr=UI.todayDate||todayStr();
  const now=new Date();
  const todayDate=todayStr();
  const isToday=dateStr===todayDate;

  // Parse the selected date to get day-of-week
  const parts=dateStr.split('-');
  const selDate=new Date(parseInt(parts[0]),parseInt(parts[1])-1,parseInt(parts[2]));
  const day=selDate.getDay();

  // Date nav helpers
  function offsetDate(ds,delta){
    const p=ds.split('-');
    const d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    d.setDate(d.getDate()+delta);
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function fmtDate(ds){
    const p=ds.split('-');
    const d=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
    if(ds===todayDate)return'Today';
    const yesterday=offsetDate(todayDate,-1);
    if(ds===yesterday)return'Yesterday';
    return d.toLocaleDateString('en-AU',{weekday:'short',day:'numeric',month:'short'});
  }
  const prevDate=offsetDate(dateStr,-1);
  const nextDate=offsetDate(dateStr,1);
  const canGoForward=nextDate<=todayDate; // don't allow future dates beyond today

  const skinMR=routineForDay(day,'morning','skin',dateStr);
  const hairMR=routineForDay(day,'morning','hair',dateStr);
  const skinER=routineForDay(day,'evening','skin',dateStr);
  const hairER=routineForDay(day,'evening','hair',dateStr);

  const done=scheduledForDay(day,dateStr).filter(r=>isRoutineComplete(r.id,dateStr)).length;
  const total=scheduledForDay(day,dateStr).length;

  function routineSection(r,label,sectionId){
    if(!r)return'';
    const isDone=isRoutineComplete(r.id,dateStr);
    const isExpanded=!isDone||(UI.todayExpanded&&UI.todayExpanded[r.id]);
    if(isDone&&!isExpanded){
      return`<button class="day-section today-section" style="width:calc(100% - 44px);background:none;border:none;cursor:pointer;padding:0;text-align:left" data-call="todayExpand" data-args="${r.id}|1">
        <span class="today-section-label">${label}</span>
        <div class="day-section-line"></div>
        <span class="${justC===r.id?'ack-pop':''}" style="font-size:11px;font-weight:600;color:var(--cu);white-space:nowrap;flex-shrink:0">✓</span>
        <div style="min-width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:18px;flex-shrink:0;margin-right:-10px">⌄</div>
      </button>`;
    }
    return`<div class="day-section today-section" id="${sectionId}">
      <span class="today-section-label">${label}</span>
      <div class="day-section-line"></div>
      ${isDone?`<span style="font-size:11px;font-weight:600;color:var(--cu);white-space:nowrap;flex-shrink:0">✓ Done</span>
      <button style="min-width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:18px;flex-shrink:0;background:none;border:none;cursor:pointer;padding:0;margin-right:-10px" data-call="todayExpand" data-args="${r.id}|0">⌃</button>`:''}
    </div>
    ${checklistHTML(r.id,dateStr)}
    <div class="complete-btns">
      ${!isDone
        ?`<button class="btn full sm" data-call="completeAllDate" data-args="${r.id}|${dateStr}">Mark all done</button>`
        :`<button class="btn ghost full sm" data-call="uncompleteRoutineDate" data-args="${r.id}|${dateStr}">✓ Done — undo</button>`
      }
    </div>`;
  }

  let out=`<div class="today-sheet ${enter?'page-up':''}"><button class="sheet-close-tap" aria-label="Close" onclick="dismissSheet()"><div class="sheet-handle"></div></button>
  <div class="today-sticky">
    <div style="text-align:center;font-size:11px;color:var(--ink-soft);padding:2px 22px 8px">${done}/${total} routines complete</div>
    <div class="date-nav">
      <button class="date-nav-btn" data-call="openToday" data-args="${prevDate}">‹</button>
      <span class="date-nav-label">${fmtDate(dateStr)}</span>
      <button class="date-nav-btn ${canGoForward?'':'disabled'}" ${canGoForward?`data-call="openToday" data-args="${nextDate}"`:''}>›</button>
    </div>
  </div>
  <div id="section-morning">`;

  // Supplements split by morning/evening type
  const suppMR=DB.routines.filter(r=>r.cat==='supplements'&&r.type==='morning'&&r.days.includes(day)&&routineLiveOn(r,dateStr));
  const suppER=DB.routines.filter(r=>r.cat==='supplements'&&r.type==='evening'&&r.days.includes(day)&&routineLiveOn(r,dateStr));

  // Hair look selector helper (spacing + label only — checklist merged into mergedHairSection)
  const _looks=DB.hairLooks||[];
  function lookSelectorHTML(){
    if(!_looks.length)return'';
    const defLook=suggestLook();
    const selLook=UI.todayLook||defLook||_looks[0]?.id;
    return`<div style="margin-top:14px">
      <div class="sec-label" style="margin:0 22px 6px">Look</div>
      <div style="margin:0 22px 12px"><div class="seg" style="margin:0">${_looks.map(l=>`<button class="${selLook===l.id?'on':''}" data-call="setTodayLook" data-args="${l.id}">${esc(l.name.split('—')[0].trim())}</button>`).join('')}</div></div>
    </div>`;
  }
  // Merged hair section: base steps + selected look steps in one continuous checklist
  function mergedHairSection(hairR,label,sectionId){
    if(!hairR)return'';
    const defLook=suggestLook();
    const selLook=UI.todayLook||defLook||_looks[0]?.id;
    const lookR=selLook?routineById(selLook):null;
    const hasLookSteps=lookR&&activeSteps(lookR.steps).length>0;
    const isDone=isRoutineComplete(hairR.id,dateStr);
    const isExpanded=!isDone||(UI.todayExpanded&&UI.todayExpanded[hairR.id]);
    if(isDone&&!isExpanded){
      return`<button class="day-section today-section" style="width:calc(100% - 44px);background:none;border:none;cursor:pointer;padding:0;text-align:left" data-call="todayExpand" data-args="${hairR.id}|1">
        <span class="today-section-label">${label}</span>
        <div class="day-section-line"></div>
        <span class="${justC===hairR.id?'ack-pop':''}" style="font-size:11px;font-weight:600;color:var(--cu);white-space:nowrap;flex-shrink:0">✓</span>
        <div style="min-width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:18px;flex-shrink:0;margin-right:-10px">⌄</div>
      </button>`;
    }
    return`<div class="day-section today-section" id="${sectionId}">
      <span class="today-section-label">${label}</span>
      <div class="day-section-line"></div>
      ${isDone?`<span style="font-size:11px;font-weight:600;color:var(--cu);white-space:nowrap;flex-shrink:0">✓ Done</span>
      <button style="min-width:44px;height:44px;display:flex;align-items:center;justify-content:center;color:var(--ink-soft);font-size:18px;flex-shrink:0;background:none;border:none;cursor:pointer;padding:0;margin-right:-10px" data-call="todayExpand" data-args="${hairR.id}|0">⌃</button>`:''}
    </div>
    ${checklistHTML(hairR.id,dateStr)}
    ${hasLookSteps?checklistHTML(lookR.id,dateStr):''}
    <div class="complete-btns">
      ${!isDone
        ?`<button class="btn full sm" data-call="completeAllDate" data-args="${hairR.id}|${dateStr}">Mark all done</button>`
        :`<button class="btn ghost full sm" data-call="uncompleteRoutineDate" data-args="${hairR.id}|${dateStr}">✓ Done — undo</button>`
      }
    </div>`;
  }

  // Skin|Hair toggle state
  if(!UI.todaySeg)UI.todaySeg={};
  const segM=UI.todaySeg.morning||'skin';
  const segE=UI.todaySeg.evening||'skin';

  // Morning section
  if(skinMR&&hairMR){
    out+=`<div class="seg" style="margin:8px 22px 4px">
      <button class="${segM==='skin'?'on':''}" data-call="setTodaySeg" data-args="morning|skin">Skin</button>
      <button class="${segM==='hair'?'on':''}" data-call="setTodaySeg" data-args="morning|hair">Hair</button>
    </div>`;
    if(segM==='skin'){out+=routineSection(skinMR,`Skin — ${skinMR.name} · Morning`,'');}
    else{out+=lookSelectorHTML();out+=mergedHairSection(hairMR,`Hair — ${hairMR.name} · Morning`,'');}
  } else if(skinMR){
    out+=routineSection(skinMR,`Skin — ${skinMR.name} · Morning`,'');
  } else if(hairMR){
    out+=lookSelectorHTML();out+=mergedHairSection(hairMR,`Hair — ${hairMR.name} · Morning`,'');
  }
  suppMR.forEach(r=>{out+=routineSection(r,`Supplements — ${r.name} · Morning`,'');});
  if(!skinMR&&!hairMR&&!suppMR.length){
    out+=`<div class="empty" style="margin:20px 22px;font-size:13px;color:var(--ink-soft)">Nothing scheduled this morning</div>`;
  }

  out+=`</div><div id="section-evening" style="padding-top:4px">`;

  // Evening section
  if(skinER&&hairER){
    out+=`<div class="seg" style="margin:8px 22px 4px">
      <button class="${segE==='skin'?'on':''}" data-call="setTodaySeg" data-args="evening|skin">Skin</button>
      <button class="${segE==='hair'?'on':''}" data-call="setTodaySeg" data-args="evening|hair">Hair</button>
    </div>`;
    if(segE==='skin'){out+=routineSection(skinER,`Skin — ${skinER.name} · Evening`,'');}
    else{out+=lookSelectorHTML();out+=mergedHairSection(hairER,`Hair — ${hairER.name} · Evening`,'');}
  } else if(skinER){
    out+=routineSection(skinER,`Skin — ${skinER.name} · Evening`,'');
  } else if(hairER){
    out+=lookSelectorHTML();out+=mergedHairSection(hairER,`Hair — ${hairER.name} · Evening`,'');
  }
  suppER.forEach(r=>{out+=routineSection(r,`Supplements — ${r.name} · Evening`,'');});
  if(!skinER&&!hairER&&!suppER.length){
    out+=`<div class="empty" style="margin:20px 22px;font-size:13px;color:var(--ink-soft)">Nothing scheduled this evening</div>`;
  }

  out+=`</div>`;

  out+=`<div class="sec-label" style="margin:22px 22px 8px">Journal</div>
  <div style="margin:0 22px">
    <textarea placeholder="Notes on today — skin, reactions, products…" style="min-height:64px;font-size:13px" data-chg="setJournal" data-args="${dateStr}">${esc((DB.journal||{})[dateStr]||'')}</textarea>
  </div>`;

  // Scent lives on Home screen only

  out+=`<div style="height:40px"></div></div>`;
  return out;
}

/* ══ RUNNER (focused single-routine page, e.g. Refresh & Go) ══ */
function vRunner(){
  const enter=UI._todayEnter;UI._todayEnter=false;
  const r=routineById(UI.runnerId);
  const dateStr=UI.todayDate||todayStr();
  if(!r)return`<button class="back-btn" data-call="navTab" data-args="home">${CHEV_SVG}</button><div class="empty">Routine not found</div>`;
  const isDone=isRoutineComplete(r.id,dateStr);
  return`<div class="today-sheet ${enter?'page-up':''}"><button class="sheet-close-tap" aria-label="Close" onclick="dismissSheet()"><div class="sheet-handle"></div></button>
  <div class="day-section today-section" style="margin-top:14px">
    <span class="today-section-label">${esc(r.name)}</span>
    <div class="day-section-line"></div>
    ${isDone?'<span style="font-size:11px;font-weight:600;color:var(--cu)">✓ Done</span>':''}
  </div>
  ${checklistHTML(r.id,dateStr)}
  <div class="complete-btns">
    ${!isDone
      ?`<button class="btn full sm" data-call="completeAllDate" data-args="${r.id}|${dateStr}">Mark all done</button>`
      :`<button class="btn ghost full sm" data-call="uncompleteRoutineDate" data-args="${r.id}|${dateStr}">✓ Done — undo</button>`
    }
  </div>
  <div style="height:40px"></div></div>`;
}
function checklistHTML(rid,dateStr){
  dateStr=dateStr||todayStr();
  const items=checklistState(rid,dateStr);
  if(!items.length)return'<div class="checklist"><div class="empty">No active steps</div></div>';
  let h=`<div class="checklist" id="clist-${rid}">`;
  items.forEach((s,i)=>{
    const p=DB.products[s.p];if(!p)return;
    const st=s.state||null;
    const isDone=st==='done';const isApplied=st==='applied';const isTicked=isDone||isApplied;
    const checkClass=isDone?'done':isApplied?'applied':'';
    const checkContent=isDone?'✓':isApplied?'·':'';
    const psteps=(p.steps||[]).filter(x=>x.text);
    const peekKey=rid+':'+s.p;
    const peeked=isTicked&&psteps.length&&!!(UI.todayStepPeek&&UI.todayStepPeek[peekKey]);
    let bodyInner;
    if(psteps.length){
      if(isTicked){
        bodyInner=`<div class="cnote done" style="margin-bottom:${peeked?'4px':'0'};font-size:10.5px">${esc(p.role)}</div>`
          +(peeked?`<div class="psteps">${psteps.map((st2,n)=>`<div class="pstep"><span class="pstep-num">${n+1}</span><span class="pstep-text done">${esc(st2.text)}</span></div>`).join('')}</div>`:'');
      }else{
        bodyInner=`<div class="cnote" style="margin-bottom:4px;font-size:10.5px">${esc(p.role)}</div><div class="psteps">${psteps.map((st2,n)=>`<div class="pstep"><span class="pstep-num">${n+1}</span><span class="pstep-text">${esc(st2.text)}</span></div>`).join('')}</div>`;
      }
    }else{
      bodyInner=`<div class="cnote${isTicked?' done':''}">${p.cat==='hair'&&p.notes?esc(p.notes):esc(p.role)}</div>`;
    }
    h+=`<div class="srow"><div class="srow-under"><span style="font-size:15px">✓</span></div><div class="citem-row srow-inner">
      <button class="citem-tick" data-call="tickStep" data-args="${rid}|${s.p}|${dateStr}">
        <div class="ccheck ${checkClass}">${checkContent}</div>
        <div class="cbody">
          <div class="cname ${isTicked?'done':''}">${esc(p.brand)} ${esc(p.name)}</div>
          ${bodyInner}
        </div>
      </button>
      ${isTicked&&psteps.length?`<button class="citem-peek" data-call="peekStep" data-args="${rid}|${s.p}">${peeked?'⌃':'⌄'}</button>`:''}
      <button class="citem-info" data-call="openProductDetail" data-args="${rid}|${s.p}|${dateStr}">ⓘ</button>
    </div></div>`;
    if(isApplied&&s.appliedAt&&s.wait){
      const rem=s.wait*1000-(Date.now()-s.appliedAt);
      h+=`<div class="wleg active"><div class="wleg-line"><i></i></div><span data-wait-chip data-wait="${s.wait}" data-at="${s.appliedAt}">${rem>0?fmtCountdown(rem)+' remaining':'ready ✓'}</span></div>`;
    } else if(s.wait&&i<items.length-1&&!isTicked){
      h+=`<div class="wleg"><div class="wleg-line"><i></i></div><span>wait ${fmtWait(s.wait)}</span></div>`;
    }
  });
  return h+'</div>';
}
function setJournal(ds,v){if(!DB.journal)DB.journal={};const t=(v||'').trim();if(t)DB.journal[ds]=t;else delete DB.journal[ds];save();}
function peekStep(rid,pid){
  if(!UI.todayStepPeek)UI.todayStepPeek={};
  const k=rid+':'+pid;
  UI.todayStepPeek[k]=!UI.todayStepPeek[k];
  renderTodayPage();
}

/* ══ TIMER — wait countdown ══ */
function fmtCountdown(ms){const s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
let _waitInt=null;
function startWaitInterval(){if(_waitInt)return;_waitInt=setInterval(updateWaitDisplay,1000);}
function stopWaitInterval(){if(_waitInt){clearInterval(_waitInt);_waitInt=null;}}
function updateWaitDisplay(){
  const date=UI.todayDate||todayStr();
  let minRem=Infinity,anyActive=false;
  DB.routines.forEach(r=>{
    const c=getComp(r.id,date);if(!c||!c.steps)return;
    c.steps.forEach(step=>{
      if(step.state!=='applied'||!step.appliedAt)return;
      const def=(r.steps||[]).find(x=>x.p===step.p);
      const w=def?(def.wait||0):0;
      if(!w)return;
      const rem=w*1000-(Date.now()-step.appliedAt);
      if(rem>0){anyActive=true;minRem=Math.min(minRem,rem);}
    });
  });
  const gfab=document.getElementById('fab-global');
  if(gfab){if(anyActive){gfab.style.display='flex';const t=gfab.querySelector('.fab-global-t');if(t)t.textContent=fmtCountdown(minRem);}else gfab.style.display='none';}
  document.querySelectorAll('[data-wait-chip]').forEach(el=>{
    const rem=parseInt(el.dataset.wait)*1000-(Date.now()-parseInt(el.dataset.at));
    el.textContent=rem>0?fmtCountdown(rem)+' remaining':'ready ✓';
  });
  if(anyActive)startWaitInterval();else stopWaitInterval();
}
function goToWaitStep(){
  if(UI.tab!=='today'&&UI.tab!=='runner'){openToday();return;}
  const chip=document.querySelector('[data-wait-chip]');
  if(chip)chip.scrollIntoView({behavior:'smooth',block:'center'});
}

/* ══ DELEGATION ══ */
function todayExpand(rid,open){if(!UI.todayExpanded)UI.todayExpanded={};UI.todayExpanded[rid]=!!open;renderTodayPage();}
function setTodaySeg(slot,val){if(!UI.todaySeg)UI.todaySeg={};UI.todaySeg[slot]=val;renderTodayPage();}
function setTodayLook(id){UI.todayLook=id;renderTodayPage();}
function openLook(idx){UI.modal={type:'look',idx:idx};render();}
function openAddStep(rid){UI.modal={type:'addstep',routineId:rid};render();}
function openRoutineView(id){UI.modal={type:'routine-view',id:id};render();}
function openRoutineEdit(id){UI.editRoutineId=id;setupNav('routine-edit');}
function editFromSheet(id){closeModal(()=>{UI.tab='setup';UI.setupPage='routine-edit';UI.editRoutineId=id;});}
function setRoutinesCat(k){UI.routinesCat=k;render();}
function setInvCat(k){UI.invCat=k;render();}
function setPromptSel(k){UI._promptSel=k;render();}
function setSchedType(t){UI._schedType=t;render();}
function openPlannerFor(t){UI._setupReturn='routines';UI._schedType=t;UI.tab='setup';UI.setupPage='planner';UI._tabFade=true;render();}
function pickHairLook(id){UI.hairLook=id;closeModal();}
function openNewRoutine(cat){if(!gateCreate('routines'))return;UI._newR={cat:cat,type:'morning',name:'',copyFrom:''};UI.modal={type:'new-routine'};render();}
function backToProduct(id){UI._afterNewProduct=null;UI.modal={type:'product',id:id};render();}
function delRStep(rid,i){routineById(rid).steps.splice(i,1);save();render();}
function lkDel(lookIdx,i){routineById(DB.hairLooks[lookIdx].id).steps.splice(i,1);save();render();}
function lkName(idx,v){DB.hairLooks[idx].name=v;save();}
function lkDesc(idx,v){DB.hairLooks[idx].desc=v;save();}
function clearNext(id){upd(id,'next',null);render();}
function reactivate(id){upd(id,'active',true);render();}
function setGrace(n){DB.settings.graceDaysPerMonth=n;save();render();}
function setStepWait(rid,i,v){routineById(rid).steps[i].wait=parseInt(v)||0;save();}
function setRoutineName(rid,v){routineById(rid).name=v;save();}
function setRoutineType(rid,v){routineById(rid).type=v;save();render();}
function setRoutineCat(rid,v){routineById(rid).cat=v;save();render();}
function stepSearchQ(rid,v){stepSearch(v,rid);}
function histNav(d){UI._histOff=(UI._histOff||0)+d;if(UI.modal&&UI.modal.type==='history')renderModal();else render();}
/* v99: CALL_FNS moved to app-shell.js — as separate files, hoisting no longer
   spans the whole app, and this table references functions defined in later files. */
/* v99: CHG_FNS moved to app-shell.js (same cross-file hoisting reason as CALL_FNS). */
const INP_FNS={stepSearchQ};
function parseArgs(a){return (a||'').split('|').filter(x=>x!=='').map(t=>/^-?\d{1,4}$/.test(t)?parseInt(t):t);}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-call]');
  if(!el)return;
  const fn=CALL_FNS[el.dataset.call];
  if(fn)fn(...parseArgs(el.dataset.args));
});
document.addEventListener('change',e=>{
  const el=e.target.closest('[data-chg]');
  if(!el)return;
  const fn=CHG_FNS[el.dataset.chg];
  if(fn)fn(...parseArgs(el.dataset.args),el.value);
});
document.addEventListener('input',e=>{
  const el=e.target.closest('[data-inp]');
  if(!el)return;
  const fn=INP_FNS[el.dataset.inp];
  if(fn)fn(...parseArgs(el.dataset.args),el.value);
});

/* ══ SWIPE TO COMPLETE ══ */
let _rowSwipe=null;
document.addEventListener('touchstart',e=>{
  const row=e.target.closest('.srow');
  if(!row){_rowSwipe=null;return;}
  _rowSwipe={row,x:e.touches[0].clientX,y:e.touches[0].clientY,locked:false,dead:false,dx:0};
},{passive:true});
document.addEventListener('touchmove',e=>{
  const rs=_rowSwipe;
  if(!rs||rs.dead)return;
  const dx=e.touches[0].clientX-rs.x,dy=e.touches[0].clientY-rs.y;
  if(!rs.locked){
    if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){rs.dead=true;return;}
    if(dx>14&&Math.abs(dx)>Math.abs(dy)*1.4)rs.locked=true;else return;
  }
  rs.dx=Math.max(0,dx);
  const inner=rs.row.querySelector('.srow-inner');
  if(inner){inner.style.transition='none';inner.style.transform=`translateX(${Math.min(rs.dx,110)}px)`;}
},{passive:true});
document.addEventListener('touchend',()=>{
  const rs=_rowSwipe;_rowSwipe=null;
  if(!rs||!rs.locked)return;
  const inner=rs.row.querySelector('.srow-inner');
  if(!inner)return;
  if(rs.dx>68){
    inner.style.transition='transform .14s ease';
    inner.style.transform='translateX(60px)';
    const t=rs.row.querySelector('[data-call="tickStep"]');
    setTimeout(()=>{if(t)CALL_FNS.tickStep(...parseArgs(t.dataset.args));},130);
  }else{
    inner.style.transition='transform .25s cubic-bezier(.32,.72,0,1)';
    inner.style.transform='translateX(0)';
    setTimeout(()=>{inner.style.transition='';inner.style.transform='';},260);
  }
},{passive:true});

/* ══ HOME ══ */
function routineEstMins(r){
  return Math.round(activeSteps(r.steps).reduce((s,st)=>s+(st.wait||0),0)/60);
}
function vHome(){
  const now=new Date(),day=now.getDay();
  const streak=calcStreak();
  const pb=Math.max(bestStreak(),streak);
  const done=todayDoneCount(),total=todayTotalCount();
  const todayComplete=total>0&&done===total;
  const low=lowStock();
  const scent=stackOn('scent')?suggestScent():null;
  const dateStr=todayStr();
  // 7 day-circles: Mon–Sun of current week
  const dayLetters=['M','T','W','T','F','S','S'];
  const mondayOffset=day===0?-6:1-day;
  const dayCircles=dayLetters.map((ltr,i)=>{
    const dow=i===6?0:i+1;
    const d=new Date(now);d.setDate(d.getDate()+mondayOffset+i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const isT=ds===dateStr;
    const isFuture=ds>dateStr;
    const complete=!isFuture&&dayComplete(dow,ds);
    const circleCss=complete?`background:var(--cu);`
      :isT?`background:none;border:2px solid var(--cu);box-sizing:border-box;`
      :isFuture?`background:var(--hairline);opacity:0.3;`
      :`background:var(--hairline);`;
    const lblColor=isT||complete?'var(--cu)':'var(--ink-soft)';
    const lblOp=isFuture&&!isT?';opacity:0.4':'';
    return`<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px">
      <div style="width:26px;height:26px;border-radius:50%;${circleCss}"></div>
      <div style="font-size:9px;font-weight:700;letter-spacing:.05em;color:${lblColor}${lblOp}">${ltr}</div>
    </div>`;
  }).join('');
  // Today summary: all routines for display list; scoped routines for remMins
  const todayScheduled=allScheduledForDay(day,dateStr);
  const incompleteScoped=scheduledForDay(day,dateStr).filter(r=>!isRoutineComplete(r.id,dateStr));
  const remMins=incompleteScoped.reduce((s,r)=>s+routineEstMins(r),0);
  // Scent + Refresh & Go
  const scentTag=scent&&scent.tags&&scent.tags.length?scent.tags[0]:'';
  const refreshR=DB.routines.find(r=>r.id==='skin-refresh');
  const lowSorted=low.slice().sort((a,b)=>daysLeft(a[1],a[0])-daysLeft(b[1],b[0]));
  const lowFirst=lowSorted.length?lowSorted[0][1]:null;
  const lowFirstId=lowSorted.length?lowSorted[0][0]:null;
  const cardBorder=todayComplete?'box-shadow:0 0 0 1.5px rgba(var(--cu-rgb),.45)':'';
  // supplements today (lightweight)
  const suppList=suppForDay(day);
  const _sDT=suppDoseTotals(day,dateStr);
  const suppTakenN=_sDT.done;const suppTotalN=_sDT.total;
  const suppNext=suppList.find(s=>!suppTaken(s.id,dateStr));
  const _sR=13,_sSz=34,_sCirc=2*Math.PI*_sR;
  const _sDash=(suppTotalN?(suppTakenN/suppTotalN)*_sCirc:0).toFixed(2);
  const suppDone=suppTotalN>0&&suppTakenN===suppTotalN;
  const suppRing=suppList.length?`<svg width="${_sSz}" height="${_sSz}" style="flex-shrink:0" viewBox="0 0 ${_sSz} ${_sSz}"><circle cx="17" cy="17" r="${_sR}" fill="none" stroke="var(--hairline)" stroke-width="2.5"/><circle cx="17" cy="17" r="${_sR}" fill="none" stroke="var(--cu)" stroke-width="2.5" stroke-dasharray="${_sDash} ${(_sCirc-parseFloat(_sDash)).toFixed(2)}" stroke-linecap="round" transform="rotate(-90 17 17)"/><text x="17" y="17" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" fill="${suppDone?'var(--cu)':'var(--ink-mid)'}">${suppDone?'✓':suppTakenN+'/'+suppTotalN}</text></svg>`:'';
  const _rR=13,_rC=17,_rSz=34,_rCirc=2*Math.PI*_rR;
  const _rDash=(total>0?(done/total)*_rCirc:0).toFixed(2);
  const _rGap=(_rCirc-parseFloat(_rDash)).toFixed(2);
  const ringHtml=total>0?`<svg width="${_rSz}" height="${_rSz}" style="flex-shrink:0" viewBox="0 0 ${_rSz} ${_rSz}"><circle cx="${_rC}" cy="${_rC}" r="${_rR}" fill="none" stroke="var(--hairline)" stroke-width="2.5"/><circle cx="${_rC}" cy="${_rC}" r="${_rR}" fill="none" stroke="var(--cu)" stroke-width="2.5" stroke-dasharray="${_rDash} ${_rGap}" stroke-linecap="round" transform="rotate(-90 ${_rC} ${_rC})"/><text x="${_rC}" y="${_rC}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" font-family="Inter,system-ui,sans-serif" fill="${todayComplete?'var(--cu)':'var(--ink-mid)'}">${todayComplete?'✓':done+'/'+total}</text></svg>`:'';
  return`
  <div class="top">
    <div class="date"><strong>${dayName(day)}</strong>${now.getDate()} ${now.toLocaleString('en-AU',{month:'long'})}</div>
    <div class="hdr-right">
      <div class="wordmark">The <em>Stack</em></div>
      ${gearBtn()}
    </div>
  </div>
  <button class="streak-card" onclick="openHistory()" style="display:block;width:calc(100% - 44px);cursor:pointer;text-align:left;${cardBorder}">
    <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:18px">
      <div style="font-family:'Fraunces',serif;font-size:${todayComplete?'56px':'68px'};font-weight:400;color:var(--cu);line-height:1;flex-shrink:0">${todayComplete?'✓':streak}</div>
      <div style="padding-top:6px">
        <div style="font-size:9px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:5px">${todayComplete?'All done today':'Day streak'}</div>
        <div style="font-size:12px;color:var(--ink-mid)">Personal best: ${pb} day${pb!==1?'s':''}</div>
      </div>
    </div>
    <div style="display:flex;gap:2px">${dayCircles}</div>
  </button>
  <div class="card pad" style="margin:0 22px 10px">
    <div style="display:flex;justify-content:space-between;align-items:center${todayScheduled.length?';margin-bottom:12px':''}">
      <div style="display:flex;align-items:center;gap:11px">
        ${ringHtml}
        <span style="font-size:13px;font-weight:500;color:${todayComplete?'var(--cu)':'var(--ink)'}">${todayComplete?'All done for today ✓':'Today isn\'t done yet'}</span>
      </div>
      <button class="today-open-btn" data-call="openToday" data-args="">
        <span class="today-open-ic">${TODAY_SVG}</span>
        <span>Open Today</span>
      </button>
    </div>
    ${todayScheduled.map(r=>{
      const isDone=isRoutineComplete(r.id,dateStr);
      const mins=routineEstMins(r);
      return`<div style="display:flex;align-items:center;gap:8px;padding:3px 0">
        <span style="font-size:13px;color:${isDone?'var(--ink-soft)':'var(--ink)'};${isDone?'text-decoration:line-through;text-decoration-color:var(--card-edge);':''}flex:1;line-height:1.3">${r.cat[0].toUpperCase()+r.cat.slice(1)} — ${esc(r.name)}</span>
        ${mins?`<span style="font-size:11px;color:var(--ink-soft);flex-shrink:0">~${mins} min</span>`:''}
      </div>`;
    }).join('')}
    ${!todayComplete&&remMins>0?`<div style="margin-top:10px;padding-top:8px;border-top:1px solid var(--hairline);font-size:11px;color:var(--ink-soft)">~${remMins} min remaining</div>`:''}
  </div>
  ${scent?`<button class="row" onclick="openScent()">
    <div class="row-icon" style="width:36px;height:36px;border-radius:50%;background:rgba(45,200,180,.1);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">◈</div>
    <div class="row-body">
      <div style="font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:2px">Today's Scent</div>
      <div class="row-title">${esc(scent.name)}</div>
      <div class="row-sub">${esc(scent.brand)}</div>
    </div>
    ${scentTag?`<span class="chip c-mute" style="flex-shrink:0;margin-left:8px">${esc(scentTag)}</span>`:''}
  </button>`:''}
  ${refreshR?`<button class="row" onclick="openRefresh()">
    <div class="row-icon ri-refresh" style="flex-shrink:0">⚡</div>
    <div class="row-body">
      <div class="row-title">${esc(refreshR.name)}</div>
      <div class="row-sub">Quick skin · ${activeSteps(refreshR.steps).length} steps</div>
    </div>
    <span style="color:var(--ink-soft);font-size:16px">›</span>
  </button>`:''}
  ${suppList.length?`<button class="row" onclick="openSupplements()">
    <div class="row-icon" style="flex-shrink:0"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="3" width="12" height="7" rx="3.5"/><rect x="6" y="14" width="12" height="7" rx="3.5"/></svg></div>
    <div class="row-body">
      <div style="font-size:9px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:2px">Supplements</div>
      <div class="row-title">${suppDone?'All taken today':suppTakenN+' of '+suppTotalN+(suppTotalN!==suppList.length?' doses':'')+' taken today'}</div>
      ${!suppDone&&suppNext?`<div class="row-sub">${esc(suppNext.name)} still to take</div>`:''}
    </div>
    ${suppRing}
  </button>`:''}
  ${low.length?`<button style="margin:0 22px 8px;display:flex;align-items:center;gap:9px;width:calc(100% - 44px);background:none;border:none;padding:6px 4px;cursor:pointer;text-align:left" onclick="openLowStock()">
    <span style="width:6px;height:6px;border-radius:50%;background:rgba(var(--cu-rgb),.55);flex-shrink:0"></span>
    <span style="font-size:12.5px;color:var(--ink-mid);flex:1">${lowFirst?`${esc(lowFirst.name)} ${daysLeft(lowFirst,lowFirstId)<=0?'likely empty':'running low'}${low.length>1?` · ${low.length-1} more`:''}`:''}</span>
    <span style="font-size:13px;color:var(--ink-soft);flex-shrink:0">›</span>
  </button>`:''}
`;
}
/* ══ v102 · DAY BOARD — wide (≥900px) Home. Morning/evening columns + rail.
   Reuses the existing data layer and handlers end-to-end: checklistHTML /
   checklistState render the steps, tickStep / completeAllDate /
   uncompleteRoutineDate / todayExpand / setTodayLook / toggleSupp /
   toggleSuppSlot / setJournal do the work. Expand state shares
   UI.todayExpanded (incomplete = always open, done = collapsed unless
   peeked) so tickStep's completion collapse works here unchanged. */
function vBoard(){
  const now=new Date(),day=now.getDay();
  const dateStr=todayStr();
  const streak=calcStreak();
  const pb=Math.max(bestStreak(),streak);
  const done=todayDoneCount(),total=todayTotalCount();
  const todayComplete=total>0&&done===total;
  const justC=UI._justCompleted;UI._justCompleted=null;
  // week circles — same rules as vHome
  const dayLetters=['M','T','W','T','F','S','S'];
  const mondayOffset=day===0?-6:1-day;
  const week=dayLetters.map((ltr,i)=>{
    const dow=i===6?0:i+1;
    const d=new Date(now);d.setDate(d.getDate()+mondayOffset+i);
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const isT=ds===dateStr;const isFuture=ds>dateStr;
    const complete=!isFuture&&dayComplete(dow,ds);
    return`<div class="bd-wd"><i class="${complete?'done':isT?'today':isFuture?'fut':''}"></i><b class="${isT||complete?'hot':''}">${ltr}</b></div>`;
  }).join('');
  const remaining=total-done;
  const remMins=scheduledForDay(day,dateStr).filter(r=>!isRoutineComplete(r.id,dateStr)).reduce((s,r)=>s+routineEstMins(r),0);
  // progress ring (same geometry as vHome)
  const _r=13,_c=17,_sz=34,_circ=2*Math.PI*_r;
  const ring=(dn,tt)=>{const dash=(tt>0?(dn/tt)*_circ:0).toFixed(2);const full=tt>0&&dn===tt;
    return`<svg width="${_sz}" height="${_sz}" style="flex-shrink:0" viewBox="0 0 ${_sz} ${_sz}"><circle cx="${_c}" cy="${_c}" r="${_r}" fill="none" stroke="var(--hairline)" stroke-width="2.5"/><circle cx="${_c}" cy="${_c}" r="${_r}" fill="none" stroke="var(--cu)" stroke-width="2.5" stroke-dasharray="${dash} ${(_circ-parseFloat(dash)).toFixed(2)}" stroke-linecap="round" transform="rotate(-90 ${_c} ${_c})"/><text x="${_c}" y="${_c}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight="700" font-family="Inter,system-ui,sans-serif" fill="${full?'var(--cu)':'var(--ink-mid)'}">${full?'✓':dn+'/'+tt}</text></svg>`;};
  // routines by slot
  const skinMR=routineForDay(day,'morning','skin',dateStr);
  const hairMR=routineForDay(day,'morning','hair',dateStr);
  const skinER=routineForDay(day,'evening','skin',dateStr);
  const hairER=routineForDay(day,'evening','hair',dateStr);
  const suppMR=DB.routines.filter(r=>r.cat==='supplements'&&r.type==='morning'&&r.days.includes(day)&&routineLiveOn(r,dateStr));
  const suppER=DB.routines.filter(r=>r.cat==='supplements'&&r.type==='evening'&&r.days.includes(day)&&routineLiveOn(r,dateStr));
  const stepsDone=items=>items.filter(s=>s.state==='done'||s.state==='applied').length;
  function card(r,kicker,opts){
    opts=opts||{};
    const isDone=isRoutineComplete(r.id,dateStr);
    const isExpanded=!isDone||(UI.todayExpanded&&UI.todayExpanded[r.id]);
    const items=checklistState(r.id,dateStr);
    const nTot=items.length+(opts.extraTot||0);
    const nDone=stepsDone(items)+(opts.extraDone||0);
    const mins=routineEstMins(r);
    // header: only done cards toggle (matches vToday — incomplete stays open)
    const hd=isDone
      ?`<button class="brc-hd" data-call="todayExpand" data-args="${r.id}|${isExpanded?0:1}">
        <div class="brc-t"><span class="brc-k">${kicker}</span><b>${esc(r.name)}</b>
        <span class="brc-m">${nTot} step${nTot!==1?'s':''} · done</span></div>
        <span class="${justC===r.id?'ack-pop':''}" style="display:flex">${ring(nTot,nTot)}</span>
        <span class="brc-chev">${isExpanded?'⌃':'⌄'}</span>
      </button>`
      :`<div class="brc-hd">
        <div class="brc-t"><span class="brc-k">${kicker}</span><b>${esc(r.name)}</b>
        <span class="brc-m">${nTot} step${nTot!==1?'s':''}${mins?` · ~${mins} min`:''}</span></div>
        ${ring(nDone,nTot)}
      </div>`;
    if(!isExpanded)return`<div class="brc done">${hd}</div>`;
    return`<div class="brc ${isDone?'done':''}">${hd}<div class="brc-body">
      ${opts.pre||''}
      ${checklistHTML(r.id,dateStr)}
      ${opts.post||''}
      <div class="complete-btns">${!isDone
        ?`<button class="btn full sm" data-call="completeAllDate" data-args="${r.id}|${dateStr}">Mark all done</button>`
        :`<button class="btn ghost full sm" data-call="uncompleteRoutineDate" data-args="${r.id}|${dateStr}">✓ Done — undo</button>`}</div>
    </div></div>`;
  }
  // hair card: look selector + base steps + look steps merged (same as vToday)
  function hairCard(r,kicker){
    const looks=DB.hairLooks||[];
    const defLook=suggestLook();
    const selLook=UI.todayLook||defLook||(looks[0]&&looks[0].id);
    const lookR=selLook?routineById(selLook):null;
    const hasLookSteps=lookR&&activeSteps(lookR.steps).length>0;
    const lookItems=hasLookSteps?checklistState(lookR.id,dateStr):[];
    const pre=looks.length?`<div class="seg">${looks.map(l=>`<button class="${selLook===l.id?'on':''}" data-call="setTodayLook" data-args="${l.id}">${esc(l.name.split('—')[0].trim())}</button>`).join('')}</div>`:'';
    const post=hasLookSteps?checklistHTML(lookR.id,dateStr):'';
    return card(r,kicker,{pre,post,extraTot:lookItems.length,extraDone:stepsDone(lookItems)});
  }
  const mCards=[];
  if(skinMR)mCards.push(card(skinMR,'Skin · Morning'));
  if(hairMR)mCards.push(hairCard(hairMR,'Hair · Morning'));
  suppMR.forEach(r=>mCards.push(card(r,'Supplements · Morning')));
  const eCards=[];
  if(skinER)eCards.push(card(skinER,'Skin · Evening'));
  if(hairER)eCards.push(hairCard(hairER,'Hair · Evening'));
  suppER.forEach(r=>eCards.push(card(r,'Supplements · Evening')));
  const colStat=list=>{const t=list.length;if(!t)return'';const d=list.filter(r=>isRoutineComplete(r.id,dateStr)).length;return d===t?'✓ complete':`${d} of ${t} done`;};
  const mList=[skinMR,hairMR].filter(Boolean).concat(suppMR);
  const eList=[skinER,hairER].filter(Boolean).concat(suppER);
  const empty=t=>`<div class="brc bempty">Nothing scheduled this ${t}</div>`;
  // ── right rail: scent · supplements · quick skin · low stock · journal ──
  const scent=stackOn('scent')?suggestScent():null;
  const scentTag=scent&&scent.tags&&scent.tags.length?scent.tags[0]:'';
  const suppList=suppForDay(day);
  const sT=suppDoseTotals(day,dateStr);
  const lowSorted=lowStock().slice().sort((a,b)=>daysLeft(a[1],a[0])-daysLeft(b[1],b[0]));
  const refreshR=DB.routines.find(r=>r.id==='skin-refresh');
  let rail='';
  if(scent)rail+=`<button class="bmini" onclick="openScent()">
    <h3>Today's scent${scentTag?`<span class="sp">${esc(scentTag)}</span>`:''}</h3>
    <div class="bscent-n">${esc(scent.name)}</div>
    <div class="bmini-sub">${esc(scent.brand)}</div></button>`;
  if(suppList.length){
    rail+=`<div class="bmini"><h3 style="cursor:pointer" onclick="openSupplements()">Supplements<span class="sp">${sT.done}/${sT.total}</span></h3>
    ${suppList.map(s=>{
      const slots=suppSlots(s);const multi=slots.length>1;
      const taken=suppTaken(s.id,dateStr);
      const check=multi
        ?`<span class="sup-check ${taken?'on':''}" style="cursor:default">${taken?'✓':''}</span>`
        :`<button class="sup-check ${taken?'on':''}" data-call="toggleSupp" data-args="${s.id}">${taken?'✓':''}</button>`;
      const slotRow=multi
        ?`<div class="sup-slots" style="padding-left:36px;margin:6px 0 0;width:100%">${slots.map(sl=>{const on=suppSlotTaken(s.id,dateStr,sl);
          return`<button class="sup-slot ${on?'on':''}" data-call="toggleSuppSlot" data-args="${s.id}|${sl}"><span class="sup-slot-tick">${on?'✓':''}</span>${suppSlotLabel(sl)}</button>`;}).join('')}</div>`
        :'';
      return`<div class="bsup">${check}<span class="bsup-n ${taken?'done':''}">${esc(s.name)}</span>${s.dose?`<span class="bsup-d">${esc(s.dose)}</span>`:''}${slotRow}</div>`;
    }).join('')}</div>`;
  }
  if(refreshR)rail+=`<button class="bmini" onclick="openRefresh()">
    <h3>Quick skin</h3>
    <div class="bmini-t">⚡ ${esc(refreshR.name)}</div>
    <div class="bmini-sub">${activeSteps(refreshR.steps).length} steps ›</div></button>`;
  if(lowSorted.length)rail+=`<div class="bmini"><h3 style="cursor:pointer" onclick="openLowStock()">Running low<span class="sp">${lowSorted.length}</span></h3>
    ${lowSorted.slice(0,5).map(([id,p])=>{const d=daysLeft(p,id);
      return`<div class="blow"><span class="blow-dot${d<=5?' hot':''}"></span><span class="blow-n">${esc(p.name)}</span><span class="blow-d">${d<=0?'likely empty':'~'+d+' day'+(d!==1?'s':'')}</span></div>`;}).join('')}</div>`;
  rail+=`<div class="bmini"><h3>Journal</h3>
    <textarea placeholder="Notes on today — skin, reactions, products…" data-chg="setJournal" data-args="${dateStr}">${esc((DB.journal||{})[dateStr]||'')}</textarea></div>`;
  return`<div class="bd-hdr">
    <div class="bd-date"><strong>${dayName(day)}</strong><span>${now.getDate()} ${now.toLocaleString('en-AU',{month:'long'})}${todayComplete?' · all done today ✓':remaining>0?` · ${remaining} routine${remaining!==1?'s':''} left${remMins?` · ~${remMins} min`:''}`:''}</span></div>
    <div class="bd-stats">
      <div class="bd-pill bd-week">${week}</div>
      <button class="bd-pill" onclick="openHistory()"><span class="bd-n">${todayComplete?'✓':streak}</span><span class="bd-l">day streak<br>best ${pb}</span></button>
      <div class="bd-pill">${ring(done,total)}<span class="bd-l">today's<br>progress</span></div>
      ${gearBtn()}
    </div>
  </div>
  <div class="board">
    <section><div class="bcol-hd"><h2>Morning</h2><span class="est">${colStat(mList)}</span></div><div class="bcol">${mCards.join('')||empty('morning')}</div></section>
    <section><div class="bcol-hd"><h2>Evening</h2><span class="est">${colStat(eList)}</span></div><div class="bcol">${eCards.join('')||empty('evening')}</div></section>
    <section class="brail"><div class="bcol-hd"><h2>Also today</h2></div>${rail}</section>
  </div>`;
}
function openRefresh(){
  openToday(null,'skin-refresh');
}
function openSupplements(){saveScroll();UI._todayEnter=UI.tab!=='supplements';if(UI._todayEnter&&!(UI.tab==='today'||UI.tab==='runner'||UI.tab==='scent'||UI.tab==='supplements'))UI._sheetReturn={tab:UI.tab,setupPage:UI.setupPage};if(UI._todayEnter)snapshotBg();UI.tab='supplements';UI._suppEdit=null;render();}
function vSupplements(){
  const day=new Date().getDay();const ds=todayStr();
  const enter=UI._todayEnter;UI._todayEnter=false;
  const all=supplements();
  const today=suppForDay(day);
  const todayIds=new Set(today.map(s=>s.id));
  const other=all.filter(s=>!todayIds.has(s.id));
  const takenN=suppTakenCount(day,ds);
  const item=(s,scheduled)=>{
    const slots=suppSlots(s);
    const multi=slots.length>1;
    const taken=suppTaken(s.id,ds);
    const daysTxt=s.everyday?'Every day':(s.days||[]).slice().sort().map(d=>dayShort(d)).join(', ');
    const takenSlots=slots.filter(sl=>suppSlotTaken(s.id,ds,sl)).length;
    const metaExtra=multi?` · ${takenSlots}/${slots.length} doses`:'';
    // single-slot: original left check. multi-slot: no left check, per-slot pills below.
    const leftCheck=scheduled
      ? (multi
          ? `<span class="sup-check ${taken?'on':''}" style="cursor:default">${taken?'✓':''}</span>`
          : `<button class="sup-check ${taken?'on':''}" data-call="toggleSupp" data-args="${s.id}">${taken?'✓':''}</button>`)
      : `<span class="sup-check" style="border-style:dashed;cursor:default"></span>`;
    const slotRow=(scheduled&&multi)
      ? `<div class="sup-slots">${slots.map(sl=>{const on=suppSlotTaken(s.id,ds,sl);
          return`<button class="sup-slot ${on?'on':''}" data-call="toggleSuppSlot" data-args="${s.id}|${sl}"><span class="sup-slot-tick">${on?'✓':''}</span>${suppSlotLabel(sl)}</button>`;}).join('')}</div>`
      : '';
    return`<div class="sup-item${scheduled?'':' sup-dim'}">
      ${leftCheck}
      <button class="sup-body" data-call="editSupp" data-args="${s.id}" style="text-align:left;background:none;border:0;padding:0;cursor:pointer">
        <div class="sup-name ${taken&&scheduled?'done':''}">${esc(s.name)}</div>
        <div class="sup-meta">${s.dose?esc(s.dose)+' · ':''}${daysTxt}${metaExtra}${(()=>{const dl=suppDaysLeft(s);if(dl==null)return'';return dl<=7?` · <span style="color:var(--cu);font-weight:600">${dl===0?'restock now':'~'+dl+'d left'}</span>`:` · ~${dl}d left`;})()}</div>
      </button>
    </div>${slotRow}`;
  };
  return`<div class="today-sheet ${enter?'page-up':''}">
    <button class="sheet-close-tap" aria-label="Close" onclick="dismissSheet()"><div class="sheet-handle"></div></button>
    <h1 class="page-title" style="padding-top:14px">Supplements</h1>
    <p class="page-sub" style="padding-top:0">${dayName(day)} ${new Date().getDate()} ${new Date().toLocaleString('en-AU',{month:'long'})}${(()=>{if(!today.length)return'';const dt=suppDoseTotals(day,ds);return ' · '+dt.done+' of '+dt.total+(dt.total!==today.length?' doses':'')+' taken';})()}</p>
    <div style="padding:0 22px">
      ${today.length?today.map(s=>item(s,true)).join(''):`<div class="empty" style="padding:20px 0">Nothing scheduled today.</div>`}
      ${other.length?`<div class="sec-label" style="margin:20px 0 10px">Not scheduled today</div>${other.map(s=>item(s,false)).join('')}`:''}
      <button class="btn full" style="margin-top:14px" data-call="editSupp" data-args="new">+ Add a supplement</button>
      <div class="assist-hint">You can also use the assistant to add, remove and edit supplements.</div>
      <div class="med-note">This is not medical advice. Check with your doctor before taking supplements.</div>
    </div>
  </div>`;
}
function editSupp(id){
  if(id==='new'){if(!gateCreate('supplements'))return;UI._suppEdit={id:'s'+Date.now(),name:'',dose:'',everyday:true,days:[1,2,3,4,5,6,0],slots:['morning'],countStreak:false,active:true,_new:true};}
  else{const s=(DB.supplements||[]).find(x=>x.id===id);if(!s)return;UI._suppEdit=JSON.parse(JSON.stringify(s));if(!Array.isArray(UI._suppEdit.slots)||!UI._suppEdit.slots.length)UI._suppEdit.slots=['morning'];}
  UI.modal={type:'supp-edit'};render();
}
function suppEditField(field,v){if(!UI._suppEdit)return;UI._suppEdit[field]=v;}
function suppEditCapture(){if(!UI._suppEdit)return;const n=document.getElementById('suppName');const d=document.getElementById('suppDose');if(n)UI._suppEdit.name=n.value;if(d)UI._suppEdit.dose=d.value;}
function suppEditToggleSlot(slot){if(!UI._suppEdit)return;suppEditCapture();const e=UI._suppEdit;const sl=Array.isArray(e.slots)?e.slots:['morning'];const i=sl.indexOf(slot);if(i>=0){if(sl.length>1)sl.splice(i,1);}else sl.push(slot);e.slots=sl;renderModal();}
function suppEditEveryday(on){if(!UI._suppEdit)return;suppEditCapture();UI._suppEdit.everyday=on;if(on)UI._suppEdit.days=[1,2,3,4,5,6,0];renderModal();}
function suppEditToggleDay(d){if(!UI._suppEdit)return;suppEditCapture();const days=UI._suppEdit.days||[];const i=days.indexOf(d);if(i>=0)days.splice(i,1);else days.push(d);UI._suppEdit.days=days;UI._suppEdit.everyday=(days.length===7);renderModal();}
function suppEditStreak(on){if(!UI._suppEdit)return;suppEditCapture();UI._suppEdit.countStreak=on;renderModal();}
function saveSupp(){
  const e=UI._suppEdit;if(!e)return;
  const nameEl=document.getElementById('suppName');const doseEl=document.getElementById('suppDose');
  if(nameEl)e.name=nameEl.value.trim();if(doseEl)e.dose=doseEl.value.trim();
  if(!e.name){alert('Give it a name first.');return;}
  if(!e.everyday&&(!e.days||!e.days.length)){alert('Pick at least one day, or choose Every day.');return;}
  const slots=(Array.isArray(e.slots)&&e.slots.length)?SUPP_SLOTS.map(([k])=>k).filter(k=>e.slots.includes(k)):['morning'];
  /* v100 parity: pill-count restock tracking (all optional, additive) */
  const uEl=document.getElementById('suppUnits');const pEl=document.getElementById('suppPerDay');
  const units=uEl&&uEl.value?Math.max(0,parseInt(uEl.value)||0):0;
  const perDay=pEl&&pEl.value?Math.max(0,parseFloat(pEl.value)||0):0;
  const prev=(DB.supplements||[]).find(x=>x.id===e.id);
  /* entering or changing the container count = a refill → restart the clock */
  const restockedAt=(units&&(!prev||prev.units!==units))?Date.now():((prev&&prev.restockedAt)||Date.now());
  if(!Array.isArray(DB.supplements))DB.supplements=[];
  const idx=DB.supplements.findIndex(x=>x.id===e.id);
  const rec={id:e.id,name:e.name,dose:e.dose||'',everyday:!!e.everyday,days:e.everyday?[0,1,2,3,4,5,6]:e.days.slice(),slots,countStreak:!!e.countStreak,active:true,units:units||0,unitsPerDay:perDay||0,restockedAt};
  if(idx>=0)DB.supplements[idx]=rec;else DB.supplements.push(rec);
  UI._suppEdit=null;save();closeModal(()=>render());
}
function deleteSupp(){
  const e=UI._suppEdit;if(!e)return;
  if(!confirm('Delete '+e.name+'?'))return;
  DB.supplements=(DB.supplements||[]).filter(x=>x.id!==e.id);
  // clear its completion keys
  Object.keys(DB.completions).forEach(k=>{if(k.startsWith('supp_'+e.id+'_'))delete DB.completions[k];});
  UI._suppEdit=null;save();closeModal(()=>render());
}
function suppEditSheet(){
  const e=UI._suppEdit;if(!e)return'';
  const days=[['1','M'],['2','T'],['3','W'],['4','T'],['5','F'],['6','S'],['0','S']];
  return`<h2 class="sheet-h">${e._new?'Add supplement':'Edit supplement'}</h2>
    <div class="field"><label>Name</label><input id="suppName" value="${esc(e.name)}" placeholder="e.g. Vitamin D"></div>
    <div class="field"><label>Dose / note (optional)</label><input id="suppDose" value="${esc(e.dose)}" placeholder="e.g. 1000 IU · morning"></div>
    <div class="field" style="display:flex;gap:10px">
      <div style="flex:1"><label>In the container</label><input id="suppUnits" type="number" inputmode="numeric" value="${e.units||''}" placeholder="e.g. 90"></div>
      <div style="flex:1"><label>Taken per day</label><input id="suppPerDay" type="number" inputmode="numeric" value="${e.unitsPerDay||''}" placeholder="e.g. 2"></div>
    </div>
    <p class="page-sub" style="margin-top:-4px">Optional — with both set, The Stack projects when you'll run out and flags the restock.</p>
    <div class="sec-label" style="margin:8px 0 8px">Schedule</div>
    <div class="seg" style="margin:0 0 14px;width:100%"><button class="${e.everyday?'on':''}" onclick="suppEditEveryday(true)">Every day</button><button class="${e.everyday?'':'on'}" onclick="suppEditEveryday(false)">Specific days</button></div>
    ${!e.everyday?`<div class="daypick">${days.map(([d,l])=>`<button class="dp ${(e.days||[]).includes(+d)?'on':''}" onclick="suppEditToggleDay(${d})">${l}</button>`).join('')}</div>`:''}
    <div class="sec-label" style="margin:14px 0 8px">Times per day</div>
    <div class="seg" style="margin:0 0 6px;width:100%">${SUPP_SLOTS.map(([k,l])=>`<button class="${(e.slots||['morning']).includes(k)?'on':''}" onclick="suppEditToggleSlot('${k}')">${l}</button>`).join('')}</div>
    <p style="font-size:11px;color:var(--ink-soft);margin:0 0 16px">Pick each time you take it. One selected = a single daily dose.</p>
    <div class="sec-label" style="margin:8px 0 8px">Count toward streak?</div>
    <div class="seg" style="margin:0 0 16px;width:100%"><button class="${e.countStreak?'':'on'}" onclick="suppEditStreak(false)">No</button><button class="${e.countStreak?'on':''}" onclick="suppEditStreak(true)">Yes</button></div>
    <button class="btn full" onclick="saveSupp()">Save supplement</button>
    ${e._new?'':'<button class="btn full ghost" style="margin-top:9px" onclick="deleteSupp()">Delete</button>'}
    <div class="assist-hint">You can also use the assistant to add, remove and edit supplements.</div>`;
}
function openScent(){UI.modal={type:'scent'};render();}

/* ══ ROUTINES TAB ══ */
function vRoutines(){
  const cats=[['skin','Skin'],['hair','Hair'],['supplements','Supplements']];
  const sel=(UI.routinesCat&&cats.some(c=>c[0]===UI.routinesCat))?UI.routinesCat:'skin';UI.routinesCat=sel;
  const catRs=DB.routines.filter(r=>r.cat===sel&&!isLookId(r.id)&&!r.deletedAt);
  const morning=catRs.filter(r=>r.type==='morning');
  const evening=catRs.filter(r=>r.type==='evening');
  function summary(r){const n=activeSteps(r.steps).length;return n+' step'+(n!==1?'s':'')+(r.days.length?'':' · Not scheduled');}
  function dowDots(r){const order=[1,2,3,4,5,6,0];return`<div style="display:flex;gap:4px;margin-top:7px;align-items:center">${order.map(d=>`<span style="width:6px;height:6px;border-radius:50%;background:${r.days.includes(d)?'var(--cu)':'var(--hairline)'}"></span>`).join('')}</div>`;}
  function rowList(rs){return rs.map(r=>`<button class="step" data-call="openRoutineView" data-args="${r.id}">
    <div class="step-body"><div class="step-name">${esc(r.name)}</div><div class="step-note">${summary(r)}</div>${dowDots(r)}</div>
    <span class="step-arrow">›</span></button>`).join('');}
  let gapBanner='';
  if(sel==='skin'||sel==='hair'){
    const gaps=[];
    [1,2,3,4,5,6,0].forEach(d=>{
      if(!routineForDay(d,'morning',sel))gaps.push([d,'AM']);
      if(!routineForDay(d,'evening',sel))gaps.push([d,'PM']);
    });
    if(gaps.length){
      const label=gaps.slice(0,3).map(([d,t])=>dayShort(d)+' '+t).join(' · ')+(gaps.length>3?` · +${gaps.length-3} more`:'');
      const firstType=gaps[0][1]==='AM'?'morning':'evening';
      gapBanner=`<button style="margin:0 22px 10px;display:flex;gap:10px;align-items:center;width:calc(100% - 44px);background:rgba(var(--cu-rgb),.07);border:none;border-radius:12px;padding:10px 14px;cursor:pointer;text-align:left" data-call="openPlannerFor" data-args="${firstType}">
        <span style="font-size:14px;flex-shrink:0;color:var(--cu)">◌</span>
        <span style="font-size:12.5px;color:var(--ink-mid);flex:1">No ${sel} routine: <b style="color:var(--cu);font-weight:600">${label}</b></span>
        <span style="font-size:12px;font-weight:600;color:var(--cu);flex-shrink:0">Plan ›</span>
      </button>`;
    }
  }
  let body='';
  if(!catRs.length){body=`<div class="empty" style="padding:48px 22px">No ${sel} routines yet — add one in Settings</div>`;}
  else{
    if(morning.length)body+=`<div class="sec-label">Morning</div><div class="card">${rowList(morning)}</div>`;
    if(evening.length)body+=`<div class="sec-label">Evening</div><div class="card">${rowList(evening)}</div>`;
    const other=catRs.filter(r=>r.type!=='morning'&&r.type!=='evening');
    if(other.length)body+=`<div class="card">${rowList(other)}</div>`;
  }
  return`<div class="top">
    <h1 style="font-family:'Fraunces',serif;font-size:26px;font-weight:400;color:var(--ink);margin:0">Routines</h1>
    <div class="hdr-right">
      <div class="wordmark">The <em>Stack</em></div>
      ${gearBtn()}
    </div>
  </div>
  <div class="seg">${cats.map(([k,l])=>`<button class="${sel===k?'on':''}" data-call="setRoutinesCat" data-args="${k}">${l}</button>`).join('')}</div>
  ${gapBanner}
  ${body}
  <div style="padding:0 22px 8px"><button class="btn full" data-call="openNewRoutine" data-args="${sel}">+ Add ${sel} routine</button></div>
  ${sel==='hair'?`<div class="sec-label">Looks</div><div class="card">${(DB.hairLooks||[]).map((l,i)=>`<button class="step" data-call="openLook" data-args="${i}"><div class="step-body"><div class="step-name">${esc(l.name)}</div><div class="step-note">${(routineById(l.id)?.steps||[]).map(st=>pName(st.p)).join(' · ')||'No steps'}${(l.tags||[]).length?' · '+l.tags.join('/'):''}</div></div><span class="step-arrow">›</span></button>`).join('')||'<div class="empty">No looks yet</div>'}</div>
  <div style="padding:0 22px 8px"><button class="btn full" onclick="newLook()">+ Add look</button></div>`:''}`;
}

/* ══ SCENT SCREEN ══ */
function vScent(){return scentSheetBody();}
function scentSheetBody(){
  const sug=suggestScent();const sc=scents();
  return`<h1 class="page-title" style="padding-top:2px">Scent</h1>
  ${sug?`<p class="page-sub" style="padding:0 0 4px">Today: ${esc(sug.brand)} ${esc(sug.name)}</p>`:''}
  ${sc.map(s=>{
    const isToday=sug&&sug.id===s.id;
    return`<button class="scent-card" data-call="openProduct" data-args="${s.id}" style="${isToday?'box-shadow:0 0 0 1.5px var(--cu)':''}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1;min-width:0">
          <div class="nm">${esc(s.name)}</div>
          <div class="br">${esc(s.brand)}</div>
        </div>
        ${isToday?'<span class="chip c-cu" style="flex-shrink:0">Today</span>':''}
      </div>
      ${s.role?`<div class="ds" style="margin-top:5px">${esc(s.role)}</div>`:''}
      ${s.why?`<div style="font-size:12px;color:var(--ink-mid);margin-top:4px;line-height:1.45">${esc(s.why)}</div>`:''}
      ${s.notes?`<div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;font-style:italic;line-height:1.4">${esc(s.notes)}</div>`:''}
      ${s.tags.length?`<div class="tags" style="margin-top:8px">${s.tags.map(t=>`<span class="chip c-mute">${esc(t)}</span>`).join('')}</div>`:''}
    </button>`;
  }).join('')||'<div class="empty">No active scents</div>'}
  <div style="padding:4px 0 0"><button class="btn full" data-call="newProduct" data-args="scent">+ Add scent</button></div>`;
}
/* ══ STEPS HTML ══ */
function stepsHTML(steps){
  const act=activeSteps(steps);
  if(!act.length)return'<div class="steps"><div class="empty">No active steps</div></div>';
  let h='<div class="steps">';
  act.forEach((s,i)=>{
    const p=DB.products[s.p],dl=daysLeft(p,s.p);
    const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;
    const nName=np?np.brand+' '+np.name:(p.next?p.next.name:'');
    h+=`<button class="step" data-call="openProduct" data-args="${s.p}">
      <span class="step-num">${i+1}</span>
      <div class="step-body">
        <div class="step-name">${esc(p.brand)} ${esc(p.name)}</div>
        <div class="step-note">${esc(p.role)}</div>
        ${nName?`<span class="swap-pill">→ ${esc(nName)} queued</span>`:''}
        ${(p.flags||[]).includes('removeWhenDone')?`<div class="note-flag">Remove when finished</div>`:''}
        ${dl!==null&&dl<=14?`<div class="note-flag" style="color:var(--cu)">~${Math.max(0,dl)} days left</div>`:''}
      </div><span class="step-arrow">›</span></button>`;
    if(s.wait&&i<act.length-1)h+=`<div class="wait"><span>wait ${fmtWait(s.wait)}</span></div>`;
  });
  return h+'</div>';
}

/* ══ STEPS WITH INVENTORY ══ */
function stepsWithInventoryHTML(steps){
  const act=activeSteps(steps);
  if(!act.length)return'<div class="steps"><div class="empty">No active steps</div></div>';
  let h='<div class="steps">';
  act.forEach((s,i)=>{
    const p=DB.products[s.p];if(!p)return;
    const dl=daysLeft(p,s.p);
    const invLabel=dl!==null?(dl<=0?'Likely empty':'~'+dl+'d left'):'';
    const invClass=dl!==null&&dl<=14?'c-cu':'c-mute';
    const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;
    const nName=np?np.brand+' '+np.name:(p.next&&p.next.name?p.next.name:'');
    h+=`<button class="step" data-call="openProduct" data-args="${s.p}">
      <span class="step-num">${i+1}</span>
      <div class="step-body">
        <div class="step-name">${esc(p.brand)} ${esc(p.name)}</div>
        <div class="step-note">${esc(p.role)}</div>
        ${nName?`<span class="swap-pill">→ ${esc(nName)} queued</span>`:''}
      </div>
      ${invLabel?`<span class="chip ${invClass}" style="font-size:10px;flex-shrink:0">${invLabel}</span>`:''}
      <span class="step-arrow">›</span></button>`;
    if(s.wait&&i<act.length-1)h+=`<div class="wait"><span>wait ${fmtWait(s.wait)}</span></div>`;
  });
  return h+'</div>';
}

/* ══ SETUP ══ */
function vSetupRouter(){
  const p=UI.setupPage;
  if(!p)return vSetupMenu();
  if(p==='planner')return vPlannerPage();
  if(p==='evening-schedule')return vSchedulePage('evening');
  if(p==='morning-schedule')return vSchedulePage('morning');
  if(p==='routines')return vRoutinesPage();
  if(p==='routine-edit')return vRoutineEditPage();
  if(p==='looks')return vLooksPage();
  if(p==='inventory')return vInventoryPage();
  if(p==='reco')return vRecoPage();
  if(p==='appearance')return vAppearancePage();
  if(p==='data')return vDataPage();
  if(p==='streak')return vStreakPage();
  if(p==='plan')return vPlanPage();
  if(p==='lowstock')return vLowStockPage();
  if(p==='prompt')return vPromptPage();
  return vSetupMenu();
}
function setupBack(page){saveScroll();UI.setupPage=page||null;UI._scrollRestoring=!!(page);UI._tabFade=true;render();}
function setupNav(page,extra){saveScroll();UI.setupPage=page;if(extra&&extra.invCat)UI.invCat=extra.invCat;UI._tabFade=true;render();}

function vSetupMenu(){
  const low=lowStock().length;
  return`<div class="top">
    <h1 style="font-family:'Fraunces',serif;font-size:26px;font-weight:400;color:var(--ink);margin:0">Setup</h1>
    <button class="done-btn" onclick="closeSetup()">Done</button>
  </div>
  <p class="page-sub">Tap to configure</p>
  <div class="card">
    <button class="menu-item" onclick="setupNav('planner')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">▦</div><div class="menu-body"><div class="menu-title">Week planner</div><div class="menu-sub">Skin & hair routines per day, AM & PM</div></div><span class="menu-arrow">›</span></button>
  </div>
  <div class="card">
    <button class="menu-item" onclick="setupNav('inventory',{invCat:'skin'})"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">✦</div><div class="menu-body"><div class="menu-title">Inventory</div><div class="menu-sub">${Object.values(DB.products).filter(p=>p.active).length} active products${low?' · '+low+' low stock':''}</div></div><span class="menu-arrow">›</span></button>
  </div>
  <div class="card">
    <button class="menu-item" onclick="setupNav('streak')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">◈</div><div class="menu-body"><div class="menu-title">Your stacks</div><div class="menu-sub" style="text-transform:capitalize">${coreStacks().join(', ')||'Nothing core'} · core</div></div><span class="menu-arrow">›</span></button>
    <button class="menu-item" onclick="setupNav('reco')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">◎</div><div class="menu-body"><div class="menu-title">Recommendations</div><div class="menu-sub">${DB.settings.country||'AU'} · ${({online:'Online',instore:'In-store',both:'Online & in-store'})[DB.settings.shopMethod||'both']}</div></div><span class="menu-arrow">›</span></button>
    <button class="menu-item" onclick="setupNav('appearance')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">◐</div><div class="menu-body"><div class="menu-title">Appearance</div><div class="menu-sub">${(DB.settings.theme||'copper').charAt(0).toUpperCase()+(DB.settings.theme||'copper').slice(1)} theme</div></div><span class="menu-arrow">›</span></button>
    <button class="menu-item" onclick="setupNav('data')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">⇲</div><div class="menu-body"><div class="menu-title">Data</div><div class="menu-sub">Sync, backup & reset</div></div><span class="menu-arrow">›</span></button>
  </div>
  <div class="card">
    <button class="menu-item" onclick="setupNav('plan')"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">◆</div><div class="menu-body"><div class="menu-title">Plan</div><div class="menu-sub" style="text-transform:capitalize">${planTier()} tier${userPlan()==='comp'?' · comp':''}</div></div><span class="menu-arrow">›</span></button>
    <button class="menu-item" onclick="replayWelcomeTour()"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">↺</div><div class="menu-body"><div class="menu-title">Replay welcome tour</div><div class="menu-sub">See the intro screens again</div></div><span class="menu-arrow">›</span></button>
    <button class="menu-item" onclick="redoSetupPriorities()"><div class="menu-icon" style="background:rgba(var(--cu-rgb),.1)">⟳</div><div class="menu-body"><div class="menu-title">Redo setup & priorities</div><div class="menu-sub">Re-run stack priorities and per-module setup</div></div><span class="menu-arrow">›</span></button>
  </div>
  <input type="file" id="imp" accept=".json" style="display:none" onchange="importData(this)">
  <div style="text-align:center;padding:18px 22px 8px;font-size:11px;color:var(--ink-soft)">The Stack · build ${BUILD} · data v${DB.v} · ${window.__swCache||'sw pending'}</div>`;
}

function vPlannerPage(){
  const t=UI._schedType||'morning';
  const skinOpts=routinesOf('skin',t),hairOpts=routinesOf('hair',t);
  return`<button class="back-btn" aria-label="Back" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Week planner</h1>
  ${UI._schedWarning?`<div class="warn-banner">⚠️ ${esc(UI._schedWarning)}</div>`:''}
  <div class="seg">${[['morning','Morning'],['evening','Evening']].map(([k,l])=>`<button class="${t===k?'on':''}" data-call="setSchedType" data-args="${k}">${l}</button>`).join('')}</div>
  <div class="card">${[1,2,3,4,5,6,0].map(d=>{
    const skinR=routineForDay(d,t,'skin'),hairR=routineForDay(d,t,'hair');
    return`<div class="sched-row"><span class="sched-day-label">${dayShort(d)}</span>
    <div class="sched-slots">
      <div class="sched-slot"><span class="sched-slot-label">Skin</span>
      <select style="${!skinR?'border-color:var(--cu);background:rgba(var(--cu-rgb),.08);color:var(--cu);font-weight:600':''}" data-chg="assignDay" data-args="${d}|${t}|skin"><option value="">— none —</option>${skinOpts.map(r=>`<option value="${r.id}" ${skinR&&skinR.id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="sched-slot"><span class="sched-slot-label">Hair</span>
      <select style="${!hairR?'border-color:var(--cu);background:rgba(var(--cu-rgb),.08);color:var(--cu);font-weight:600':''}" data-chg="assignDay" data-args="${d}|${t}|hair"><option value="">— none —</option>${hairOpts.map(r=>`<option value="${r.id}" ${hairR&&hairR.id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
    </div></div>`;}).join('')}</div>`;
}
function vSchedulePage(type){
  const skinOpts=routinesOf('skin',type),hairOpts=routinesOf('hair',type);
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">${type==='morning'?'Morning':'Evening'} Schedule</h1>
  <p class="page-sub">Skin and hair routine assigned per day</p>
  ${UI._schedWarning?`<div class="warn-banner">⚠️ ${esc(UI._schedWarning)}</div>`:''}
  <div class="card">${[1,2,3,4,5,6,0].map(d=>{
    const skinR=routineForDay(d,type,'skin'),hairR=routineForDay(d,type,'hair');
    return`<div class="sched-row"><span class="sched-day-label">${dayShort(d)}</span>
    <div class="sched-slots">
      <div class="sched-slot"><span class="sched-slot-label">Skin</span>
      <select data-chg="assignDay" data-args="${d}|${type}|skin"><option value="">— none —</option>${skinOpts.map(r=>`<option value="${r.id}" ${skinR&&skinR.id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
      <div class="sched-slot"><span class="sched-slot-label">Hair</span>
      <select data-chg="assignDay" data-args="${d}|${type}|hair"><option value="">— none —</option>${hairOpts.map(r=>`<option value="${r.id}" ${hairR&&hairR.id===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
    </div></div>`;}).join('')}</div>`;
}
function assignDay(day,type,cat,newId){
  const warnings=[];
  DB.routines.forEach(r=>{if(r.cat===cat&&r.type===type&&r.id!==newId&&!r.deletedAt&&r.days.includes(day)){warnings.push(r.name);r.days=r.days.filter(d=>d!==day);}});
  if(newId){const r=routineById(newId);if(r&&!r.days.includes(day))r.days.push(day);}
  save();
  if(warnings.length){UI._schedWarning=`${dayName(day)} removed from: ${warnings.join(', ')}`;render();setTimeout(()=>{UI._schedWarning=null;render();},4000);}else render();
}

function vRoutinesPage(){
  const cats=[['skin','Skin'],['hair','Hair'],['scent','Scent'],['supplements','Supplements']],types=['morning','evening'];
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Edit Routines</h1>
  ${UI._schedWarning?`<div class="warn-banner">⚠️ ${esc(UI._schedWarning)}</div>`:''}
  ${cats.map(([cat,cl])=>types.map(type=>{const rs=routinesOf(cat,type);if(!rs.length)return'';
    return`<div class="sec-label">${cl} — ${type==='morning'?'Morning':'Evening'}</div>
    <div class="card">${rs.map(r=>`<button class="step" data-call="openRoutineEdit" data-args="${r.id}">
      <div class="step-body"><div class="step-name">${esc(r.name)}</div>
      <div class="step-note">${r.days.length?r.days.map(d=>dayShort(d)).join(' · '):'No days'} · ${activeSteps(r.steps).length} steps</div></div>
      <span class="step-arrow">›</span></button>`).join('')}</div>`;}).join('')).join('')}
  <div style="padding:8px 22px 0"><button class="btn full" onclick="if(gateCreate('routines')){UI.modal={type:'new-routine'};render()}">+ New routine</button></div>`;
}

function vRoutineEditPage(){
  const r=routineById(UI.editRoutineId);
  if(!r)return`<button class="back-btn" data-call="navTab" data-args="routines">${CHEV_SVG}</button><div class="empty">Not found</div>`;
  if(!Array.isArray(r.steps))r.steps=[];
  const lookEntry=(DB.hairLooks||[]).find(l=>l.id===r.id);
  const isLook=!!lookEntry;
  const stepsHTML=r.steps.map((s,i)=>{const p=DB.products[s.p];
    return`<div class="edit-step" style="${p&&!p.active?'opacity:.4':''}">
    <span class="nm">${i+1}. ${esc(pName(s.p))}${p&&!p.active?' (inactive)':''}</span>
    <input type="number" value="${s.wait||0}" style="width:58px;padding:5px 8px;text-align:right" data-chg="setStepWait" data-args="${r.id}|${i}">
    <button class="mini" data-call="moveRStep" data-args="${r.id}|${i}|-1">↑</button>
    <button class="mini" data-call="moveRStep" data-args="${r.id}|${i}|1">↓</button>
    <button class="mini" style="color:var(--danger)" data-call="delRStep" data-args="${r.id}|${i}">✕</button>
    </div>`;}).join('')||'<div class="empty">No steps yet</div>';
  if(isLook){
    return`<button class="back-btn" data-call="navTab" data-args="routines">${CHEV_SVG}</button>
    <h1 class="page-title">Edit Look</h1>
    <div class="sec-label">Look Name</div>
    <div style="padding:0 22px 14px"><input value="${esc(lookEntry.name)}" data-chg="updateLookName" data-args="${r.id}"></div>
    <div class="sec-label">Description</div>
    <div style="padding:0 22px 14px"><input value="${esc(lookEntry.desc||'')}" placeholder="Short description…" data-chg="updateLookDesc" data-args="${r.id}"></div>
    <div class="sec-label">Tags</div>
    <div style="padding:0 22px 14px"><div class="tags">${LOOK_TAGS.map(t=>`<button class="chip ${(lookEntry.tags||[]).includes(t)?'c-cu':'c-mute'}" data-call="toggleLookTag" data-args="${r.id}|${t}">${t}</button>`).join('')}</div>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:6px">Used to auto-pick today's look — evening after 5pm, then weekend/casual on Sat–Sun, else weekday.</p></div>
    <div class="sec-label">Products</div>
    <div class="card">${stepsHTML}</div>
    <div style="padding:0 22px 8px;display:flex;gap:8px">
      <button class="btn" data-call="openAddStep" data-args="${r.id}">+ Add product</button>
      <button class="btn danger" data-call="deleteLook" data-args="${(DB.hairLooks||[]).indexOf(lookEntry)}">Delete look</button>
    </div>
    <p style="font-size:11px;color:var(--ink-soft);padding:0 22px 4px">Changes save automatically as you edit.</p>
    <div style="padding:4px 22px 8px"><button class="btn full" data-call="navTab" data-args="routines">Save &amp; close</button></div>`;
  }
  return`<button class="back-btn" data-call="navTab" data-args="routines">${CHEV_SVG}</button>
  <h1 class="page-title">Edit Routine</h1>
  ${UI._schedWarning?`<div class="warn-banner">⚠️ ${esc(UI._schedWarning)}</div>`:''}
  <div class="sec-label">Name</div>
  <div style="padding:0 22px 14px"><input value="${esc(r.name)}" data-chg="setRoutineName" data-args="${r.id}"></div>
  <div class="card pad" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
    <div style="flex:1;min-width:120px"><label style="font-size:11px;color:var(--ink-soft);display:block;margin-bottom:4px;letter-spacing:.08em;text-transform:uppercase">TIME</label>
    <select data-chg="setRoutineType" data-args="${r.id}"><option value="morning" ${r.type==='morning'?'selected':''}>Morning</option><option value="evening" ${r.type==='evening'?'selected':''}>Evening</option></select></div>
    <div style="flex:1;min-width:120px"><label style="font-size:11px;color:var(--ink-soft);display:block;margin-bottom:4px;letter-spacing:.08em;text-transform:uppercase">CATEGORY</label>
    <select data-chg="setRoutineCat" data-args="${r.id}"><option value="skin" ${r.cat==='skin'?'selected':''}>Skin</option><option value="hair" ${r.cat==='hair'?'selected':''}>Hair</option><option value="scent" ${r.cat==='scent'?'selected':''}>Scent</option><option value="supplements" ${r.cat==='supplements'?'selected':''}>Supplements</option></select></div>
  </div>
  <div class="sec-label">Days</div>
  <div style="padding:0 22px 14px">
    <div class="day-pills">${[0,1,2,3,4,5,6].map(d=>`<button class="day-pill ${r.days.includes(d)?'on':''}" data-call="toggleRoutineDay" data-args="${r.id}|${d}">${'SMTWTFS'[d]}</button>`).join('')}</div>
    <p style="font-size:11px;color:var(--ink-soft);margin-top:8px">Assigning a day already claimed by another ${r.cat} ${r.type} routine removes it from there.</p>
  </div>
  <div class="sec-label">Steps</div>
  <div class="card">${stepsHTML}</div>
  <div style="padding:0 22px 8px;display:flex;gap:8px">
    <button class="btn" data-call="openAddStep" data-args="${r.id}">+ Add step</button>
    <button class="btn danger" data-call="deleteRoutine" data-args="${r.id}">Delete routine</button>
  </div>
  <p style="font-size:11px;color:var(--ink-soft);padding:0 22px 4px">Changes save automatically as you edit.</p>
  <div style="padding:4px 22px 8px;display:flex;gap:8px">
    <button class="btn full" onclick="setupNav('routines')">Save &amp; close</button>
  </div>
  <div class="assist-hint" style="margin:8px 22px">You can also use the assistant to add, remove and edit your products and routines.</div>`;
}
function toggleRoutineDay(id,day){
  const r=routineById(id);if(!r)return;
  if(r.days.includes(day)){r.days=r.days.filter(d=>d!==day);save();render();}
  else{
    const clash=DB.routines.find(rt=>rt.id!==id&&rt.cat===r.cat&&rt.type===r.type&&rt.days.includes(day));
    if(clash){UI._schedWarning=`${dayName(day)} removed from "${clash.name}"`;clash.days=clash.days.filter(d=>d!==day);}
    r.days.push(day);save();render();
    if(clash)setTimeout(()=>{UI._schedWarning=null;render();},4000);
  }
}
function moveRStep(id,i,d){const st=routineById(id).steps;const j=i+d;if(j<0||j>=st.length)return;[st[i],st[j]]=[st[j],st[i]];save();render();}
function deleteRoutine(id){if(!confirm('Delete this routine? Your past history stays intact — it just won\u2019t be scheduled from today on.'))return;const r=routineById(id);if(!r){DB.routines=DB.routines.filter(x=>x.id!==id);save();setupNav('routines');return;}r.deletedAt=todayStr();save();setupNav('routines');}
function updateLookName(rid,val){
  const r=routineById(rid);if(r)r.name=val;
  const l=(DB.hairLooks||[]).find(l=>l.id===rid);
  if(l){l.name=val;}else{if(!DB.hairLooks)DB.hairLooks=[];DB.hairLooks.push({id:rid,name:val,desc:''});}
  save();
}
function updateLookDesc(rid,val){
  const l=(DB.hairLooks||[]).find(l=>l.id===rid);
  if(l){l.desc=val;}else{if(!DB.hairLooks)DB.hairLooks=[];DB.hairLooks.push({id:rid,name:routineById(rid)?.name||rid,desc:val});}
  save();
}
function toggleLookTag(rid,t){
  const l=(DB.hairLooks||[]).find(l=>l.id===rid);if(!l)return;
  if(!Array.isArray(l.tags))l.tags=[];
  const i=l.tags.indexOf(t);
  if(i>=0)l.tags.splice(i,1);else l.tags.push(t);
  save();render();
}

function vLooksPage(){
  const looks=DB.hairLooks||[];
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Hair Looks</h1>
  <div class="card">${looks.map((l,i)=>`<button class="step" data-call="openLook" data-args="${i}">
    <div class="step-body"><div class="step-name">${esc(l.name)}</div>
    <div class="step-note">${(routineById(l.id)?.steps||[]).map(s=>pName(s.p)).join(' · ')||'No steps'}${(l.tags||[]).length?' · '+l.tags.join('/'):''}</div></div>
    <span class="step-arrow">›</span></button>`).join('')||'<div class="empty">No looks</div>'}</div>
  <div style="padding:0 22px 8px"><button class="btn full" onclick="newLook()">+ Add look</button></div>`;
}

function vInventoryPage(){
  const cat=UI.invCat;
  const titles={skin:'Skin Inventory',hair:'Hair Inventory',scent:'Scent Inventory',supplements:'Supplements',inactive:'Inactive Products'};
  const seg=`<div class="seg">${[['skin','Skin'],['hair','Hair'],['scent','Scent'],['supplements','Suppl.'],['inactive','Inactive']].map(([k,l])=>`<button class="${cat===k?'on':''}" data-call="setInvCat" data-args="${k}">${l}</button>`).join('')}</div>`;
  const header=`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">${titles[cat]||'Inventory'}</h1>
  ${seg}`;
  if(cat==='supplements'){
    // supplement tracker data, shown as a product-style list
    const sups=(DB.supplements||[]).filter(s=>s.active!==false);
    const rows=sups.map(s=>{
      const daysTxt=s.everyday?'Every day':(s.days||[]).slice().sort().map(d=>dayShort(d)).join(', ');
      const sl=suppSlots(s);const doseTxt=sl.length>1?' · '+sl.map(suppSlotLabel).join('/'):'';
      return`<button class="step" data-call="editSupp" data-args="${s.id}"><div class="step-body">
      <div class="step-name">${esc(s.name)}</div>
      <div class="step-note">${s.dose?esc(s.dose)+' · ':''}${daysTxt}${doseTxt}</div></div>
      <span class="step-arrow">›</span></button>`;
    }).join('')||'<div class="empty">No supplements yet</div>';
    return`${header}
    <div class="card">${rows}</div>
    <div style="padding:0 22px 8px"><button class="btn full" data-call="editSupp" data-args="new">+ Add a supplement</button></div>
    <div class="assist-hint" style="margin:8px 22px">You can also use the assistant to add, remove and edit supplements.</div>`;
  }
  const items=Object.entries(DB.products).filter(([id,p])=>cat==='inactive'?!p.active:(p.cat===cat&&p.active));
  return`${header}
  <div class="card">${items.map(([id,p])=>{const dl=daysLeft(p,id);
    return`<button class="step" data-call="openProduct" data-args="${id}"><div class="step-body">
    <div class="step-name">${esc(p.brand)} ${esc(p.name)}</div>
    <div class="step-note">${p.active?(dl!==null?(dl<=0?'Likely empty':'~'+dl+' days left'):'No estimate'):p.cat+' · inactive'}</div></div>
    ${p.active&&dl!==null&&dl<=14?'<span class="chip c-cu">Low</span>':''}<span class="step-arrow">›</span></button>`;}).join('')||'<div class="empty">Nothing here</div>'}</div>
  <div style="padding:0 22px 8px"><button class="btn full" data-call="newProduct" data-args="${cat==='inactive'?'skin':cat}">+ Add product</button></div>
  <div class="assist-hint" style="margin:8px 22px">You can also use the assistant to add, remove and edit your products and routines.</div>`;
}

function vDataPage(){
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Data</h1><p class="page-sub">Sync, backup and reset</p>
  <div class="card">
    <button class="menu-item" onclick="exportData()"><div class="menu-body"><div class="menu-title">Export backup</div><div class="menu-sub">Download a JSON copy of all your data</div></div></button>
    <button class="menu-item" onclick="document.getElementById('impData').click()"><div class="menu-body"><div class="menu-title">Import backup</div><div class="menu-sub">Restore from a JSON backup file</div></div></button>
    <button class="menu-item" id="signOutBtn" onclick="doSignOutTap(this)"><div class="menu-body"><div class="menu-title" id="signOutTitle">Sign out</div><div class="menu-sub" id="signOutSub">Return to the sign-in screen</div></div></button>
    <button class="menu-item" onclick="if(confirm('Reset everything to defaults? This cannot be undone.')){localStorage.removeItem('stack_v1');location.reload();}"><div class="menu-body"><div class="menu-title" style="color:var(--danger)">Reset all data</div><div class="menu-sub">Erase everything and start fresh</div></div></button>
  </div>
  <input type="file" id="impData" accept=".json" style="display:none" onchange="importData(this)">`;
}
function vAppearancePage(){
  const themes=[['copper','Copper','#b87040'],['sage','Sage','#8fae94'],['heather','Heather','#a493c9'],['blush','Blush','#dda3b6'],['steel','Steel','#5b83c4'],['amber','Amber','#d9b24a']];
  const cur=DB.settings.theme||'copper';
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Appearance</h1>
  <p class="page-sub">Accent and surface tone — follows light and dark mode</p>
  <div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 22px 8px">
    ${themes.map(([k,l,c])=>{
      const on=cur===k;
      return`<button data-call="setTheme" data-args="${k}" style="flex:1 1 calc(50% - 4px);display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px 8px;border-radius:14px;background:var(--card);border:1.5px solid ${on?'var(--cu)':'var(--card-edge)'};cursor:pointer">
        <span style="width:26px;height:26px;border-radius:50%;background:${c}"></span>
        <span style="font-size:13px;font-weight:500;color:${on?'var(--ink)':'var(--ink-mid)'}">${l}</span>
        ${on?`<span style="font-size:10px;font-weight:600;color:var(--cu)">✓ Active</span>`:`<span style="font-size:10px;color:transparent">·</span>`}
      </button>`;
    }).join('')}
  </div>
  <div class="sec-label">Mode</div>
  <div class="seg">${[['system','System'],['light','Light'],['dark','Dark']].map(([k,l])=>`<button class="${(DB.settings.mode||'system')===k?'on':''}" data-call="setMode" data-args="${k}">${l}</button>`).join('')}</div>
  <p class="page-sub">System follows your device's light and dark setting.</p>`;
}
function vStreakPage(){
  /* v100: the streak-inclusion selector is now the stack priority page.
     Core = leads Today + counts toward streak + Loop's attention.
     Casual = tracked, no streak pressure. Off = hidden everywhere. */
  const seg=(cat)=>{
    const p=stackPriority(cat);
    return['core','casual','off'].map(k=>
      `<button class="chip ${p===k?(k==='core'?'c-cu':'c-mid'):'c-mute'}" data-call="stackPrio" data-args="${cat}|${k}" style="text-transform:capitalize;margin-left:4px">${k}</button>`
    ).join('');
  };
  const std=planTier()==='standard';
  const focus=loopFocusStack();
  const focusCard=std?`
  <div class="sec-label">Loop focus</div>
  <div class="card pad">
    <p class="page-sub" style="margin:0 0 10px">On Standard, Loop works on one stack at a time.</p>
    ${canSwitchFocus()
      ?STACK_CATS.filter(c=>stackOn(c)).map(c=>`<button class="chip ${focus===c?'c-cu':'c-mute'}" data-call="pickLoopFocus" data-args="${c}" style="text-transform:capitalize;margin:0 6px 6px 0">${c}</button>`).join('')+
       `<p class="page-sub" style="margin:8px 0 0">Picking a focus locks it for this calendar month.</p>`
      :`<div class="kv"><span class="k" style="text-transform:capitalize">${focus}</span><span style="font-size:12px;color:var(--ink-soft)">switches again ${nextFocusSwitchLabel()}</span></div>`}
  </div>`:'';
  return`<button class="back-btn" aria-label="Back" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Your stacks</h1>
  <p class="page-sub">Core stacks lead Today and count toward your streak. Casual stacks are tracked without pressure. Off stacks disappear until you want them back.</p>
  <div class="card pad">
    ${STACK_CATS.map(cat=>`<div class="kv"><span class="k" style="text-transform:capitalize">${cat}</span><span>${seg(cat)}</span></div>`).join('')}
  </div>
  ${focusCard}
  <div class="sec-label">Rest days</div>
  <div class="seg">${[0,1,2].map(n=>`<button class="${(DB.settings.graceDaysPerMonth??1)===n?'on':''}" data-call="setGrace" data-args="${n}">${n}</button>`).join('')}</div>
  <p class="page-sub">Missed days forgiven per month before the streak resets.</p>`;
}
function vPlanPage(){
  const cur=userPlan();
  return`<button class="back-btn" aria-label="Back" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Plan</h1>
  <p class="page-sub">${cur==='comp'?'Your account is comped — every feature stays unlocked no matter what’s selected below.':'Every tier is fully unlocked for now, no charge yet — in-app purchase billing arrives at store beta. Switch freely, anytime.'}</p>
  <div class="tier-grid" style="padding:0 22px 24px">
    ${TIER_INFO.map(t=>`<div class="tier-card ${planTier()===t.k?'sel':''}" data-call="setPlanTier" data-args="${t.k}">
      <div class="tier-name">${t.name}</div>
      <div class="tier-price">${t.price}<span>${t.per}</span></div>
      <div class="tier-annual">${t.sub}</div>
      <div class="tier-blurb">${esc(t.blurb)}</div>
      <div class="tier-cta">${planTier()===t.k?'Current plan':'Switch to '+t.name}</div>
    </div>`).join('')}
  </div>`;
}
function openLowStock(){saveScroll();const ret=UI.tab;leaveToday(()=>{if(ret!=='setup')UI._setupReturn=ret;UI.tab='setup';UI.setupPage='lowstock';UI._tabFade=true;render();});}
function restockProduct(id){DB.products[id].restockedAt=Date.now();save();render();}
function vLowStockPage(){
  const items=lowStock().sort((a,b)=>daysLeft(a[1],a[0])-daysLeft(b[1],b[0]));
  return`<button class="back-btn" aria-label="Back" onclick="closeSetup()">${CHEV_SVG}</button>
  <h1 class="page-title">Running Low</h1>
  <p class="page-sub">Sorted by urgency, across every category</p>
  ${items.length?`<div class="card">${items.map(([id,p])=>{
    const dl=daysLeft(p,id);
    const danger=dl!==null&&dl<=5;
    const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;
    const nName=np?np.brand+' '+np.name:(p.next&&p.next.name?p.next.name:'');
    const nLink=np&&np.link?np.link:(p.next&&p.next.link?p.next.link:'');
    return`<div class="pad" style="border-bottom:1px solid var(--hairline)">
      <button style="display:flex;align-items:flex-start;gap:10px;width:100%;background:none;border:none;padding:0;cursor:pointer;text-align:left" data-call="openProduct" data-args="${id}">
        <div style="flex:1;min-width:0">
          <div style="font-size:14px;font-weight:500;color:var(--ink)">${esc(p.brand)} ${esc(p.name)}</div>
          <div style="font-size:11.5px;color:var(--ink-mid);margin-top:1px;text-transform:capitalize">${p.cat}</div>
          ${nName?`<span class="swap-pill">→ ${esc(nName)} queued</span>`:''}
        </div>
        <span class="chip ${danger?'c-danger':'c-cu'}" style="flex-shrink:0">${dl!==null&&dl<=0?'Likely empty':'~'+dl+'d left'}</span>
      </button>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${p.link?`<a class="btn sm" href="${esc(p.link)}" target="_blank" rel="noopener" style="text-decoration:none">Reorder</a>`:''}
        ${nName&&nLink?`<a class="btn sm" href="${esc(nLink)}" target="_blank" rel="noopener" style="text-decoration:none">Order replacement</a>`:''}
        ${nName?`<button class="btn warn sm" data-call="swapProduct" data-args="${id}">Swap now</button>`:''}
        <button class="btn ghost sm" data-call="restockProduct" data-args="${id}">Restocked</button>
      </div>
    </div>`;}).join('')}</div>`
  :'<div class="empty">Nothing running low</div>'}`;
}
function openHistory(){UI.modal={type:'history'};render();}
function vHistory(){return historySheetBody();}
function historySheetBody(){
  const off=UI._histOff||0;
  const now=new Date();const base=new Date(now.getFullYear(),now.getMonth()+off,1);
  const y=base.getFullYear(),m=base.getMonth();
  const startDow=(new Date(y,m,1).getDay()+6)%7;
  const dim=new Date(y,m+1,0).getDate();
  const todayDs=todayStr();
  let cells='';
  for(let i=0;i<startDow;i++)cells+='<span></span>';
  for(let d=1;d<=dim;d++){
    const ds=y+'-'+String(m+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const future=ds>todayDs;
    const rs=scheduledForDay(new Date(y,m,d).getDay(),ds);
    const done=rs.filter(r=>isRoutineComplete(r.id,ds)).length;
    const ratio=rs.length?done/rs.length:0;
    const bg=future?'var(--hairline)':ratio>=1?'var(--cu)':ratio>0?`rgba(var(--cu-rgb),${(0.18+ratio*0.55).toFixed(2)})`:'var(--hairline)';
    const hasNote=(DB.journal||{})[ds];
    cells+=`<button data-call="openToday" data-args="${ds}" style="aspect-ratio:1;border-radius:8px;background:${bg};${future?'opacity:.25;pointer-events:none;':''}border:none;cursor:pointer;position:relative">${hasNote?'<span style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--bg)"></span>':''}</button>`;
  }
  const monthName=base.toLocaleDateString('en-AU',{month:'long',year:'numeric'});
  const canFwd=off<0;
  return`<h1 class="page-title" style="padding-top:2px">History</h1>
  <div class="date-nav" style="margin-top:6px">
    <button class="date-nav-btn" data-call="histNav" data-args="-1">‹</button>
    <span class="date-nav-label">${monthName}</span>
    <button class="date-nav-btn ${canFwd?'':'disabled'}" ${canFwd?'data-call="histNav" data-args="1"':''}>›</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;padding:4px 0 6px">
    ${['M','T','W','T','F','S','S'].map(l=>`<span style="text-align:center;font-size:9px;font-weight:700;color:var(--ink-soft)">${l}</span>`).join('')}
    ${cells}
  </div>
  <p class="page-sub" style="padding-left:0;padding-right:0">Solid accent = day complete · brightness scales with % done · dot = journal entry. Tap a day to open it.</p>`;
}
function vRecoPage(){
  const s=DB.settings;
  const countries=['AU','US','GB','CA','NZ','FR','DE','JP','SG','Other'];
  const methods=[['online','Online'],['instore','In-store'],['both','Both']];
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Recommendations</h1><p class="page-sub">How the assistant tailors product suggestions</p>
  <div class="card pad">
    <div class="field"><label>Country</label>
      <select onchange="DB.settings.country=this.value;save();render()">
        ${countries.map(c=>`<option value="${c}" ${(s.country||'AU')===c?'selected':''}>${c}</option>`).join('')}
      </select>
    </div>
    <div class="field"><label>Shopping preference</label>
      <div class="seg" style="margin:0;width:100%">
        ${methods.map(([k,l])=>`<button class="${(s.shopMethod||'both')===k?'on':''}" onclick="DB.settings.shopMethod='${k}';save();render()">${l}</button>`).join('')}
      </div>
    </div>
    <div class="field"><label>Preferred retailer (optional)</label><input value="${esc(s.preferredRetailer||'')}" placeholder="e.g. MECCA, Sephora" onchange="DB.settings.preferredRetailer=this.value.trim();save()"></div>
    <div class="field"><label>Preferred brands (optional, comma-separated)</label><input value="${esc((s.preferredBrands||[]).join(', '))}" placeholder="e.g. Rationale, SkinCeuticals" onchange="DB.settings.preferredBrands=this.value.split(',').map(x=>x.trim()).filter(Boolean);save()"></div>
  </div>
  <p class="page-sub">Country and shopping preference are sent with every assistant request so recommendations are things you can actually buy.</p>`;
}
