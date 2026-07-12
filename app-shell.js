
const CHG_FNS={assignDay,updateProductStep,updateLookName,updateLookDesc,updNext,upd,setNextFromInventory,setJournal,setStepWait,setRoutineName,setRoutineType,setRoutineCat,lkName,lkDesc,obFree,obFreeExtra,chgEditF,chgEditFF,chgEditSteps,chgEditStepsF};
/* v100: stack priority + Loop focus wrappers (render after write) */
function stackPrio(cat,p){setStackPriority(cat,p);render();}
function pickLoopFocus(cat){setLoopFocus(cat);if(UI._view==='focusgate'){UI._view=null;UI._gateCat=null;assistantPick(cat);}else{render();}}

/* v99: delegation dispatch table (moved from app-render.js — must be declared after
   all referenced functions exist across files; this is the last-loaded file). */
const CALL_FNS={openProduct,tickStep,peekStep,openProductDetail,completeAllDate,uncompleteRoutineDate,swapProduct,openToday,openEdit,deleteLook,deactivate,toggleTag,toggleLookTag,toggleStreakScope,toggleStep,toggleRoutineDay,setTheme,setMode,restockProduct,removeProductStep,newProduct,navTab,moveRStep,moveProductStep,lkMove,lkAdd,deleteRoutine,deleteProduct,createAndQueueReplacement,addProductStep,todayExpand,openLook,openAddStep,setTodayLook,openRoutineView,openRoutineEdit,editFromSheet,setRoutinesCat,setInvCat,setPromptSel,setSchedType,openPlannerFor,pickHairLook,openNewRoutine,backToProduct,setGrace,delRStep,lkDel,clearNext,reactivate,setTodaySeg,histNav,obToggle,obPick,obSat,obAdvance,obBack,obSkipSection,obLeave,assistantPick,assistantBack,chgRemove,chgToggleEdit,toggleSupp,editSupp,openSupplements,chatChoose,toggleSuppSlot,openFacet,closeFacet,stackPrio,pickLoopFocus,openPlans};

/* ══ PROMPT PAGE ══ */
function vPromptPage(){
  const prompts=[{key:'full',label:'Full',fn:claudePrompt},{key:'skin',label:'Skin',fn:claudePromptSkin},{key:'hair',label:'Hair',fn:claudePromptHair},{key:'scent',label:'Scent',fn:claudePromptScent}];
  const sel=UI._promptSel||'full';UI._promptSel=sel;
  const current=prompts.find(p=>p.key===sel)||prompts[0];
  return`<button class="back-btn" onclick="setupBack()">${CHEV_SVG}</button>
  <h1 class="page-title">Claude Prompt</h1><p class="page-sub">Copy and paste into any Claude chat</p>
  <div class="seg">${prompts.map(p=>`<button class="${sel===p.key?'on':''}" data-call="setPromptSel" data-args="${p.key}">${p.label}</button>`).join('')}</div>
  <div class="copybox">${esc(current.fn())}</div>
  <div style="padding:0 22px 8px"><button class="btn full" onclick="copyCurrentPrompt()">Copy to clipboard</button></div>`;
}
function copyCurrentPrompt(){
  const fns={full:claudePrompt,skin:claudePromptSkin,hair:claudePromptHair,scent:claudePromptScent};
  navigator.clipboard.writeText((fns[UI._promptSel||'full']||claudePrompt)()).then(()=>alert('Copied!'));
}

/* ══ MODALS ══ */
function renderModal(){
  let ex=document.getElementById('ov');
  if(ex&&ex.classList.contains('closing')){if(!UI.modal)return;ex.remove();ex=null;}
  const wasOpen=!!ex;if(ex)ex.remove();
  if(!UI.modal)return;
  const ov=document.createElement('div');ov.className='overlay'+(wasOpen?'':' enter');ov.id='ov';
  ov.onclick=e=>{if(e.target===ov){closeModal();}};
  const m=UI.modal;let inner='';
  if(m.type==='product')inner=productView(m.id);
  else if(m.type==='product-detail')inner=productDetailSheet(m.id);
  else if(m.type==='edit')inner=productEdit(m.id);
  else if(m.type==='routine-view')inner=routineViewSheet(m.id);
  else if(m.type==='addstep')inner=addStepSheet(m.routineId);
  else if(m.type==='look')inner=lookSheet(m.idx);
  else if(m.type==='lookpick')inner=lookPickSheet();
  else if(m.type==='new-routine')inner=newRoutineSheet();
  else if(m.type==='changes')inner=changesSheet();
  else if(m.type==='supp-edit')inner=suppEditSheet();
  else if(m.type==='paywall')inner=paywallSheet(m.kind);
  else if(m.type==='history')inner=historySheetBody();
  else if(m.type==='scent')inner=scentSheetBody();
  ov.innerHTML=`<div class="sheet"><button class="sheet-close-tap" aria-label="Close" onclick="closeModal()"><div class="sheet-handle"></div></button>${inner}</div>`;
  document.body.appendChild(ov);
  attachModalSwipe(ov.querySelector('.sheet'));
  const sheet=ov.querySelector('.sheet');
  if(sheet){
    let _sy=0,_moved=false;
    sheet.addEventListener('touchstart',e=>{_sy=e.touches[0].clientY;_moved=false;},{passive:true});
    sheet.addEventListener('touchmove',e=>{_moved=true;},{passive:true});
    sheet.addEventListener('touchend',e=>{
      if(_moved&&e.changedTouches[0].clientY-_sy>72){closeModal();}
    },{passive:true});
  }
}

function routineViewSheet(id){
  const r=routineById(id);if(!r)return'';
  const days=fmtDays(r.days);
  const catCap=r.cat.charAt(0).toUpperCase()+r.cat.slice(1);
  const typeCap=r.type==='morning'?'Morning':(r.type==='evening'?'Evening':r.type);
  return`<h3>${esc(r.name)}</h3>
  <div class="brand">${catCap} · ${typeCap}</div>
  <div class="rv-days">${esc(days)}</div>
  <div style="margin:0 -22px">${stepsWithInventoryHTML(r.steps)}</div>
  <div style="display:flex;gap:8px;margin-top:4px">
    <button class="btn full" data-call="editFromSheet" data-args="${r.id}">Edit</button>
    <button class="btn ghost full" onclick="closeModal()">Close</button>
  </div>`;
}
/* compact day summary: Every day / Weekdays / Weekends / short list */
function fmtDays(days){
  if(!days||!days.length)return'Not scheduled';
  const set=[...days].sort((a,b)=>a-b);
  const key=set.join(',');
  if(key==='0,1,2,3,4,5,6')return'Every day';
  if(key==='1,2,3,4,5')return'Weekdays';
  if(key==='0,6')return'Weekends';
  return set.map(d=>dayShort(d)).join(' · ');
}
function attachModalSwipe(sheetEl){
  let sx=0,sy=0,armed=false,dragging=false,dead=false,dy=0,lastY=0,lastT=0,vel=0;
  sheetEl.addEventListener('touchstart',e=>{
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
    lastY=sy;lastT=e.timeStamp;vel=0;dy=0;dragging=false;dead=false;
    // Header = everything above the first product card. Arm dismiss only when the
    // drag STARTS above the first card (.step / .steps); from the first card down
    // it's scrollable body and should scroll, never dismiss. Sheets without cards
    // fall back to a top-bar zone (handle + title, ~64px). Requires scrollTop<=2 so
    // a scrolled sheet never dismisses.
    const rect=sheetEl.getBoundingClientRect();
    const firstCard=sheetEl.querySelector('.steps,.step');
    let headerBottom;
    if(firstCard){ headerBottom=firstCard.getBoundingClientRect().top; }
    else { headerBottom=rect.top+64; }
    armed=(sy<=headerBottom) && sheetEl.scrollTop<=2;
  },{passive:true});
  sheetEl.addEventListener('touchmove',e=>{
    if(!armed||dead)return;
    const y=e.touches[0].clientY;
    const dx=e.touches[0].clientX-sx;
    dy=y-sy;
    vel=(y-lastY)/Math.max(1,e.timeStamp-lastT);
    lastY=y;lastT=e.timeStamp;
    if(!dragging){
      if(dy<-6||Math.abs(dx)>Math.abs(dy)+6){dead=true;return;}
      if(dy>6){dragging=true;sheetEl.style.transition='none';}
      else return;
    }
    e.preventDefault();
    sheetEl.style.transform=`translateY(${Math.max(0,dy)}px)`;
  },{passive:false});
  sheetEl.addEventListener('touchend',()=>{
    if(!dragging){armed=false;return;}
    dragging=false;armed=false;
    if(dy>140||(dy>60&&vel>0.5)){
      sheetEl.style.transition='';
      closeModal();
    }else{
      sheetEl.style.transition='transform .3s cubic-bezier(.32,.72,0,1)';
      sheetEl.style.transform='translateY(0)';
      setTimeout(()=>{sheetEl.style.transition='';sheetEl.style.transform='';},320);
    }
  },{passive:true});
}
function closeModal(after){
  // if a product sheet was opened from a routine view, closing returns to that routine
  if(!after&&UI.modal&&UI.modal.type==='product'&&UI._productReturn){
    const ret=UI._productReturn;UI._productReturn=null;
    UI.modal=ret;renderModal();return;
  }
  UI._productReturn=null;
  const ov=document.getElementById('ov');
  UI.modal=null;
  if(!ov||ov.classList.contains('closing')){if(after)after();render();return;}
  ov.classList.add('closing');
  setTimeout(()=>{ov.remove();if(after)after();render();},430);
}

/* ══ FACET — persistent bottom sheet ══ */
function ensureFacetLayer(){
  let ov=document.getElementById('facet-ov');
  if(ov)return ov;
  ov=document.createElement('div');
  ov.className='overlay facet-ov';
  ov.id='facet-ov';
  ov.style.display='none';
  ov.onclick=e=>{if(e.target===ov)closeFacet();};
  const sheet=document.createElement('div');
  sheet.className='sheet facet-sheet';
  sheet.id='facet-sheet';
  ov.appendChild(sheet);
  document.body.appendChild(ov);
  return ov;
}
function facetBodyHtml(){
  if(!isPremium()) return vFacetTeaser();
  if(UI._view==='focusgate') return vFocusGate();
  if(UI._view==='chat'&&UI._assistantCat) return vAssistantChat();
  if(!profileComplete()) return vOnboard();
  return vAssistantHome();
}
/* v100: the Standard-tier boundary — clear, honest, both paths named. */
function vFocusGate(){
  const cat=UI._gateCat||'this stack';
  const focus=loopFocusStack();
  const can=canSwitchFocus();
  return`<div class="top" style="padding-top:6px">
    <h1 style="font-family:'Fraunces',serif;font-size:24px;font-weight:400;color:var(--ink);margin:0;text-transform:capitalize">${cat} · Loop</h1>
  </div>
  <div style="padding:10px 6px 26px">
    <p style="font-size:14px;color:var(--ink-mid);line-height:1.6;margin-bottom:16px">
      Your Loop focus this month is <b style="color:var(--cu);text-transform:capitalize">${focus}</b> — that's the one stack Loop works on with the Standard plan.
    </p>
    ${can
      ?`<p style="font-size:13.5px;color:var(--ink-mid);margin-bottom:16px">You haven't locked a focus this month yet, so you can switch to <span style="text-transform:capitalize">${cat}</span> now — it'll then hold until ${nextFocusSwitchLabel()}.</p>
        <button class="btn-line" data-call="pickLoopFocus" data-args="${cat}" style="width:100%;margin-bottom:10px">Make <span style="text-transform:capitalize">${cat}</span> my focus</button>`
      :`<p style="font-size:13.5px;color:var(--ink-mid);margin-bottom:16px">Your focus switches again on <b style="color:var(--ink)">${nextFocusSwitchLabel()}</b> — or Professional puts Loop on every stack at once, working proactively across them.</p>`}
    <button class="btn-line" data-call="assistantPick" data-args="${focus}" style="width:100%;margin-bottom:10px">Ask about <span style="text-transform:capitalize">${focus}</span> instead</button>
    <button class="btn-line" data-call="openPlans" style="width:100%;border-color:var(--cu);color:var(--cu)">See Professional</button>
  </div>`;
}
/* v101 will replace this with the full upgrade sheet; until then it lands on settings */
function openPlans(){closeFacet();UI.tab='setup';UI.setupPage=null;UI._tabFade=true;render();}
function renderFacet(){
  if(!UI._facetOpen)return;
  ensureFacetLayer();
  const sheet=document.getElementById('facet-sheet');
  const chatMode=(UI._view==='chat'&&UI._assistantCat&&isPremium());
  sheet.classList.toggle('facet-chat',chatMode);
  const handle=`<button class="sheet-close-tap" aria-label="Close" data-call="closeFacet"><div class="sheet-handle"></div></button>`;
  sheet.innerHTML=(chatMode?'':handle)+facetBodyHtml();
  if(chatMode){requestAnimationFrame(()=>{syncChatViewport();scrollChatBottom();});}
}
function openFacet(){
  const ov=ensureFacetLayer();
  const wasOpen=UI._facetOpen;
  UI._facetOpen=true;
  document.body.classList.add('facet-docked');
  renderFacet();
  ov.style.display='';
  ov.classList.remove('closing');
  if(!wasOpen){
    ov.classList.remove('enter');void ov.offsetWidth;ov.classList.add('enter');
    const sheet=document.getElementById('facet-sheet');
    if(sheet&&!sheet._facetSwipeBound){attachFacetSwipe(sheet);sheet._facetSwipeBound=true;}
  }
  renderTabs();
}
function closeFacet(){
  const ov=document.getElementById('facet-ov');
  UI._facetOpen=false;
  document.body.classList.remove('facet-docked');
  stopThinking();
  if(!ov){renderTabs();return;}
  ov.classList.remove('enter');
  ov.classList.add('closing');
  ov.style.transform='';ov.style.transition='';
  setTimeout(()=>{
    if(!UI._facetOpen){ov.style.display='none';ov.classList.remove('closing');}
  },430);
  renderTabs();
}
function attachFacetSwipe(sheetEl){
  let sx=0,sy=0,armed=false,dragging=false,dead=false,dy=0,lastY=0,lastT=0,vel=0;
  sheetEl.addEventListener('touchstart',e=>{
    sx=e.touches[0].clientX;sy=e.touches[0].clientY;
    lastY=sy;lastT=e.timeStamp;vel=0;dy=0;dragging=false;dead=false;
    // In chat mode the sheet itself never scrolls (its scrollTop is always 0),
    // so arming on scrollTop<=2 would hijack every downward drag inside the chat
    // thread. Only arm the dismiss gesture when the touch starts OUTSIDE the
    // scrollable chat area (i.e. on the header / drag handle). Normal sheets keep
    // the original scroll-position arming.
    if(sheetEl.classList.contains('facet-chat')){
      const wrap=sheetEl.querySelector('#chatWrap');
      armed=!(wrap&&wrap.contains(e.target));
    }else{
      armed=sheetEl.scrollTop<=2;
    }
  },{passive:true});
  sheetEl.addEventListener('touchmove',e=>{
    if(!armed||dead)return;
    const y=e.touches[0].clientY;
    const dx=e.touches[0].clientX-sx;
    dy=y-sy;
    vel=(y-lastY)/Math.max(1,e.timeStamp-lastT);
    lastY=y;lastT=e.timeStamp;
    if(!dragging){
      if(dy<-6||Math.abs(dx)>Math.abs(dy)+6){dead=true;return;}
      if(dy>6){dragging=true;sheetEl.style.transition='none';}
      else return;
    }
    e.preventDefault();
    sheetEl.style.transform=`translateY(${Math.max(0,dy)}px)`;
  },{passive:false});
  sheetEl.addEventListener('touchend',()=>{
    if(!dragging){armed=false;return;}
    dragging=false;armed=false;
    if(dy>140||(dy>60&&vel>0.5)){
      sheetEl.style.transition='';sheetEl.style.transform='';
      closeFacet();
    }else{
      sheetEl.style.transition='transform .3s cubic-bezier(.32,.72,0,1)';
      sheetEl.style.transform='translateY(0)';
      setTimeout(()=>{sheetEl.style.transition='';sheetEl.style.transform='';},320);
    }
  },{passive:true});
}

function openProduct(id){
  // if opening from an open routine-view sheet, remember it so closing returns there
  UI._productReturn=(UI.modal&&(UI.modal.type==='routine-view'||UI.modal.type==='scent'))?{type:UI.modal.type,id:UI.modal.id}:null;
  UI.modal={type:'product',id};if(document.getElementById('ov'))renderModal();else render();
}
function openEdit(id){UI.modal={type:'edit',id};if(document.getElementById('ov'))renderModal();else render();}
function closeEdit(){if(UI._afterNewProduct){const rid=UI._afterNewProduct.returnToEdit;UI._afterNewProduct=null;UI.modal={type:'edit',id:rid};render();}else closeModal();}
function productDetailSheet(id){
  const p=DB.products[id];if(!p)return'';
  const dl=daysLeft(p);
  const psteps=(p.steps||[]).filter(s=>s.text);
  const showStock=dl!==null||p.durationDays;
  return`
  <h3>${esc(p.name)}</h3><div class="brand">${esc(p.brand)} · <span class="chip c-mute">${p.cat}</span></div>
  ${(p.why||p.role)?`<div class="desc-block"><b>${p.cat==='scent'?'About':'Why this step'}</b>${esc(p.why||p.role)}</div>`:''}
  ${psteps.length?`<div class="sec-label" style="margin-left:0;margin-top:8px">How to apply</div>
  <div class="desc-block">${psteps.map((s,i)=>`<div style="display:flex;gap:10px;margin-bottom:${i<psteps.length-1?'10px':'0'}"><span style="color:var(--cu);font-size:11px;font-weight:700;min-width:16px;padding-top:1px">${i+1}</span><span style="font-size:13px;color:var(--ink);line-height:1.5">${esc(s.text)}</span></div>`).join('')}</div>`:''}
  ${p.notes?`<div class="field"><label>Notes</label><div class="ro-notes">${esc(p.notes)}</div></div>`:''}
  ${p.link?`<div style="margin-bottom:14px"><a class="btn ghost sm" href="${esc(p.link)}" target="_blank" style="text-decoration:none">Open reorder link →</a></div>`:''}
  ${showStock?`<div class="card pad" style="margin:0 0 14px">
    ${dl!==null?`<div class="kv"><span class="k">Stock estimate</span><span class="v">${dl<=0?'Likely empty':'~'+Math.max(0,dl)+' days left'}</span></div>`:''}
    ${p.durationDays?`<div class="kv"><span class="k">Lasts about</span><span class="v">${p.durationDays} days</span></div>`:''}
  </div>`:''}
  <div style="display:flex;gap:8px">
    <button class="btn full" data-call="openEdit" data-args="${id}">Edit</button>
    <button class="btn ghost full" onclick="closeModal()">Done</button>
  </div>`;
}
function openProductDetail(rid,productId,dateStr){UI.modal={type:'product-detail',id:productId,rid,dateStr};renderModal();}

function productView(id){
  const p=DB.products[id];if(!p)return`<h3>Product unavailable</h3><div class="empty" style="padding:20px 0">This product is no longer in your stack. It may have been removed or replaced.</div><div style="padding:0 0 8px"><button class="btn ghost full" onclick="closeModal()">Close</button></div>`;const dl=daysLeft(p,id);
  const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;
  const nName=np?np.brand+' '+np.name:(p.next?p.next.name||'':'');
  const nWhy=p.next?.why||(np?np.why:'');const nLink=p.next?.link||(np?np.link:'');
  return`
  <h3>${esc(p.name)}</h3><div class="brand">${esc(p.brand)} · <span class="chip c-mute" style="text-transform:capitalize">${p.cat}</span>${!p.active?' <span class="chip c-danger">Inactive</span>':''}</div>
  <div class="desc-block"><b>${p.cat==='scent'?'About':'Why this step'}</b>${esc(p.why||p.role)}</div>
  ${p.cat==='scent'&&(p.tags||[]).length?`<div class="field"><label>When to wear</label><div class="tags">${p.tags.map(t=>`<span class="chip c-cu">${esc(t)}</span>`).join('')}</div></div>`:''}
  ${p.next&&nName?`<div class="desc-block" style="border-color:rgba(var(--cu-rgb),.3)"><b style="color:var(--cu)">Next up · ${esc(nName)}</b>${esc(nWhy)}
  <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" data-call="swapProduct" data-args="${id}">I've run out — swap now</button>${nLink?`<a class="btn ghost sm" href="${esc(nLink)}" target="_blank" style="text-decoration:none">Order →</a>`:''}</div></div>`:''}
  ${(p.flags||[]).includes('removeWhenDone')?`<div class="desc-block" style="border-color:rgba(201,123,110,.3)"><b style="color:var(--danger)">Phasing out</b>Use until finished.<div style="margin-top:10px"><button class="btn danger sm" data-call="deactivate" data-args="${id}">Finished — deactivate now</button></div></div>`:''}
  <div class="card pad" style="margin:0 0 14px">
    <div class="kv"><span class="k">Stock estimate</span><span class="v">${dl!==null?(dl<=0?'Likely empty':'~'+Math.max(0,dl)+' days left'):'—'}</span></div>
    <div class="kv"><span class="k">Lasts about</span><span class="v">${p.durationDays||'—'} days</span></div>
    <div class="kv"><span class="k">Restocked</span><button class="btn ghost sm" data-call="restockProduct" data-args="${id}">Log restock today</button></div>
  </div>
  ${p.notes?`<div class="field"><label>Notes</label><div class="ro-notes">${esc(p.notes)}</div></div>`:''}
  ${p.link?`<div style="margin-bottom:14px"><a class="btn ghost sm" href="${esc(p.link)}" target="_blank" style="text-decoration:none">Open reorder link →</a></div>`:''}
  <div style="display:flex;gap:8px"><button class="btn full" data-call="openEdit" data-args="${id}">Edit</button><button class="btn ghost full" onclick="closeModal()">Done</button></div>`;
}

function productEdit(id){
  const p=DB.products[id];if(!p)return'';
  const allTags=['weekday','weekend','daily','office','casual','evening','occasion','winter','summer','home','signature'];
  const candidates=Object.entries(DB.products).filter(([oid,op])=>oid!==id&&op.cat===p.cat&&op.active);
  return`
  <h3>Edit — ${esc(p.name)||'New product'}</h3><div class="brand">${esc(p.brand)}</div>
  <div class="field"><label>Name</label><input value="${esc(p.name)}" data-chg="upd" data-args="${id}|name"></div>
  <div class="field"><label>Brand</label><input value="${esc(p.brand)}" data-chg="upd" data-args="${id}|brand"></div>
  <div class="field"><label>Category</label><select data-chg="upd" data-args="${id}|cat">${['skin','hair','scent','supplements'].map(c=>`<option value="${c}" ${p.cat===c?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="field"><label>Role (short)</label><input value="${esc(p.role)}" data-chg="upd" data-args="${id}|role"></div>
  <div class="field"><label>Why it matters</label><textarea data-chg="upd" data-args="${id}|why">${esc(p.why)}</textarea></div>
  <div class="field"><label>Notes</label><textarea data-chg="upd" data-args="${id}|notes">${esc(p.notes)}</textarea></div>
  <div class="sec-label" style="margin-left:0">Application steps</div>
  <div class="card" style="margin:0 0 8px">${(p.steps&&p.steps.length)?p.steps.map((s,i)=>`<div class="edit-step">
    <input value="${esc(s.text)}" placeholder="Step ${i+1}" data-chg="updateProductStep" data-args="${id}|${i}">
    <button class="mini" data-call="moveProductStep" data-args="${id}|${i}|-1">↑</button>
    <button class="mini" data-call="moveProductStep" data-args="${id}|${i}|1">↓</button>
    <button class="mini" style="color:var(--danger)" data-call="removeProductStep" data-args="${id}|${i}">✕</button>
  </div>`).join(''):'<div class="empty" style="padding:12px 16px;font-size:13px">No steps — add one to guide application</div>'}</div>
  <div style="padding:0 0 14px"><button class="btn ghost sm" data-call="addProductStep" data-args="${id}">+ Add step</button></div>
  <div class="field"><label>Reorder link</label><input value="${esc(p.link)}" placeholder="https://…" data-chg="upd" data-args="${id}|link"></div>
  <div class="field"><label>Lasts about (days)</label><input type="number" value="${p.durationDays||''}" data-chg="upd" data-args="${id}|durationDays"></div>
  ${p.cat==='scent'?`<div class="field"><label>Tags</label><div class="tags">${allTags.map(t=>`<button class="chip ${p.tags.includes(t)?'c-cu':'c-mute'}" data-call="toggleTag" data-args="${id}|${t}">${t}</button>`).join('')}</div></div>`:''}
  <div class="sec-label" style="margin-left:0">Replacement</div>
  ${p.next?(()=>{const np=p.next.productId?DB.products[p.next.productId]:null;const nName=np?np.brand+' '+np.name:(p.next.name||'Unnamed');
    return`<div class="desc-block" style="border-color:rgba(var(--cu-rgb),.3);margin-bottom:10px"><b style="color:var(--cu)">${esc(nName)}</b>${np?`<div style="font-size:12px;color:var(--ink-soft);margin-top:2px">In inventory · hidden until swapped</div>`:''}</div>
    <div class="field"><label>Why the swap</label><textarea data-chg="updNext" data-args="${id}|why">${esc(p.next.why||'')}</textarea></div>
    <div class="field"><label>Order link</label><input value="${esc(p.next.link||'')}" placeholder="https://…" data-chg="updNext" data-args="${id}|link"></div>
    <div style="display:flex;gap:8px;margin-bottom:14px">${np?`<button class="btn ghost sm" data-call="openProduct" data-args="${p.next.productId}">View →</button>`:''}<button class="btn warn sm" data-call="clearNext" data-args="${id}">Remove replacement</button></div>`;
  })():`<div class="field"><label>Queue from inventory</label><select data-chg="setNextFromInventory" data-args="${id}"><option value="">— select —</option>${candidates.map(([oid,op])=>`<option value="${oid}">${esc(op.brand)} ${esc(op.name)}</option>`).join('')}</select></div>
  <div style="margin-bottom:14px"><button class="btn ghost sm" data-call="createAndQueueReplacement" data-args="${id}">+ Create new product as replacement</button></div>`}
  <div class="sec-label" style="margin-left:0">Status</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
    ${p.active?`<button class="btn warn sm" data-call="deactivate" data-args="${id}">Deactivate</button>`:`<button class="btn sm" data-call="reactivate" data-args="${id}">Reactivate</button>`}
    <button class="btn danger sm" data-call="deleteProduct" data-args="${id}">Delete permanently</button>
  </div>
  <div style="display:flex;gap:8px">
    <button class="btn full" data-call="backToProduct" data-args="${id}">Save & view</button>
    <button class="btn ghost full" onclick="closeEdit()">Close</button>
  </div>
  <div class="assist-hint">You can also use the assistant to add, remove and edit your products and routines.</div>`;
}
function upd(id,k,v){if(k==='link')v=safeUrl(v);if(k==='durationDays')v=parseInt(v)||0;DB.products[id][k]=v;save();}
function toggleStreakScope(cat){if(!DB.settings.streakScope)DB.settings.streakScope={skin:true,hair:false,scent:false,supplements:false};DB.settings.streakScope[cat]=!DB.settings.streakScope[cat];save();render();}
function updNext(id,k,v){if(k==='link')v=safeUrl(v);if(!DB.products[id].next)DB.products[id].next={};DB.products[id].next[k]=v;save();}
function toggleTag(id,t){const p=DB.products[id];const i=p.tags.indexOf(t);if(i>=0)p.tags.splice(i,1);else p.tags.push(t);save();render();}
function addProductStep(id){
  if(!DB.products[id].steps)DB.products[id].steps=[];
  DB.products[id].steps.push({text:''});
  save();
  const sh=document.querySelector('#ov .sheet');const prevScroll=sh?sh.scrollTop:0;
  renderModal();
  requestAnimationFrame(()=>{
    const sh2=document.querySelector('#ov .sheet');if(sh2)sh2.scrollTop=prevScroll;
    const ins=document.querySelectorAll('#ov .edit-step input');if(ins.length)ins[ins.length-1].focus();
  });
}
function removeProductStep(id,i){DB.products[id].steps.splice(i,1);save();renderModal();}
function moveProductStep(id,i,d){const st=DB.products[id].steps;const j=i+d;if(j<0||j>=st.length)return;[st[i],st[j]]=[st[j],st[i]];save();renderModal();}
function updateProductStep(id,i,v){if(DB.products[id].steps)DB.products[id].steps[i].text=v;save();}
function deactivate(id){DB.products[id].active=false;save();closeModal();}
function deleteProduct(id){if(!confirm('Delete permanently?'))return;DB.routines.forEach(r=>{r.steps=r.steps.filter(s=>s.p!==id);});delete DB.products[id];save();closeModal();}
function swapProduct(id){
  const p=DB.products[id];if(!p.next)return;
  const np=p.next.productId?DB.products[p.next.productId]:null;
  const nName=np?np.brand+' '+np.name:(p.next.name||'the new product');
  if(!confirm('Swap to '+nName+'?\n\n· Deactivate current\n· Replace in all routines\n· Clear notes'))return;
  if(np){DB.routines.forEach(r=>{r.steps.forEach(s=>{if(s.p===id)s.p=p.next.productId;});});p.active=false;p.next=null;np.active=true;}
  else{Object.assign(p,{name:p.next.name||p.name,brand:p.next.brand||p.brand,role:p.next.role||p.role,why:p.next.why||p.why,link:p.next.link||'',notes:'',restockedAt:Date.now(),next:null});}
  save();closeModal();
}
function setNextFromInventory(id,nextId){if(!nextId){DB.products[id].next=null;save();render();return;}DB.products[id].next={productId:nextId,why:'',link:''};save();render();}
function createAndQueueReplacement(id){const p=DB.products[id];const newId='p'+Date.now();DB.products[newId]=P(p.cat,'','','','');DB.products[id].next={productId:newId,why:'',link:''};save();UI._afterNewProduct={returnToEdit:id};openEdit(newId);}
function newProduct(cat){if(!gateCreate('products'))return;const id='p'+Date.now();DB.products[id]=P(cat||'skin','','','','');save();openEdit(id);}

function toggleStep(routineId,productId){
  const r=routineById(routineId);if(!r)return;
  const i=r.steps.findIndex(s=>s.p===productId);
  if(i>=0)r.steps.splice(i,1);else r.steps.push({p:productId,wait:0});
  save();UI.modal={type:'addstep',routineId};render();
}
function stepSearchResults(routineId){
  const r=routineById(routineId);
  const cat=r?r.cat:null;
  const q=(UI._stepSearch||'').toLowerCase();
  const steps=r?r.steps:[];
  let products=Object.entries(DB.products).filter(([id,p])=>{
    if(!p.active)return false;
    if(cat&&p.cat!==cat)return false;
    if(q&&!p.name.toLowerCase().includes(q)&&!p.brand.toLowerCase().includes(q))return false;
    return true;
  });
  let fallback=false;
  if(!products.length&&cat){
    fallback=true;
    products=Object.entries(DB.products).filter(([id,p])=>{
      if(!p.active)return false;
      if(q&&!p.name.toLowerCase().includes(q)&&!p.brand.toLowerCase().includes(q))return false;
      return true;
    });
  }
  return`<div class="brand" style="margin-bottom:10px">${fallback?`No ${cat} products — showing all`:cat?`${cat} products`:'Pick a product'}</div>
  <div class="card" style="margin:0 0 12px;max-height:300px;overflow-y:auto">
    ${products.map(([id,p])=>{
      const isAdded=steps.some(st=>st.p===id);
      return`<button class="step" data-call="toggleStep" data-args="${routineId}|${id}" style="display:flex;align-items:center${isAdded?';opacity:.8':''}">
      <div class="step-body" style="flex:1"><div class="step-name">${esc(p.brand)} ${esc(p.name)}</div><div class="step-note">${p.cat}</div></div>
      ${isAdded?`<span style="font-size:11px;font-weight:700;color:var(--cu);flex-shrink:0;margin-left:8px;padding:2px 6px;background:rgba(var(--cu-rgb),.1);border-radius:4px">✓ Added</span>`:''}
      </button>`;
    }).join('')||'<div class="empty">No products found</div>'}
  </div>`;
}
function stepSearch(v,routineId){
  UI._stepSearch=v;
  const el=document.getElementById('step-results');
  if(el)el.innerHTML=stepSearchResults(routineId);
}
function addStepSheet(routineId){
  return`<h3>Add step</h3>
  <input placeholder="Search…" value="${esc(UI._stepSearch||'')}" data-inp="stepSearchQ" data-args="${routineId}" style="margin-bottom:10px">
  <div id="step-results">${stepSearchResults(routineId)}</div>
  <button class="btn ghost full" onclick="UI._stepSearch=null;closeModal()">Done</button>`;
}
function newRoutineSheet(){
  const m=UI._newR||{cat:'skin',type:'evening',name:'',copyFrom:''};UI._newR=m;
  const copyOpts=DB.routines.filter(r=>r.cat===m.cat&&r.type===m.type);
  return`<h3>New Routine</h3>
  <div class="field"><label>Name</label><input value="${esc(m.name)}" placeholder="e.g. Evening A — Recovery" oninput="UI._newR.name=this.value"></div>
  <div class="field"><label>Category</label><select onchange="UI._newR.cat=this.value;UI._newR.copyFrom='';UI.modal={type:'new-routine'};render()"><option value="skin" ${m.cat==='skin'?'selected':''}>Skin</option><option value="hair" ${m.cat==='hair'?'selected':''}>Hair</option><option value="scent" ${m.cat==='scent'?'selected':''}>Scent</option><option value="supplements" ${m.cat==='supplements'?'selected':''}>Supplements</option></select></div>
  <div class="field"><label>Type</label><select onchange="UI._newR.type=this.value;UI._newR.copyFrom='';UI.modal={type:'new-routine'};render()"><option value="morning" ${m.type==='morning'?'selected':''}>Morning</option><option value="evening" ${m.type==='evening'?'selected':''}>Evening</option></select></div>
  <div class="field"><label>Copy steps from (optional)</label><select onchange="UI._newR.copyFrom=this.value"><option value="">— start empty —</option>${copyOpts.map(r=>`<option value="${r.id}" ${m.copyFrom===r.id?'selected':''}>${esc(r.name)}</option>`).join('')}</select></div>
  <div style="display:flex;gap:8px;margin-top:4px"><button class="btn full" onclick="createRoutine()">Create</button><button class="btn ghost full" onclick="closeModal(()=>{UI._newR=null;})">Cancel</button></div>`;
}
function createRoutine(){
  const m=UI._newR||{};const name=(m.name||'').trim();if(!name){alert('Enter a name.');return;}
  const id='r'+Date.now();const src=m.copyFrom?routineById(m.copyFrom):null;
  const steps=src?JSON.parse(JSON.stringify(src.steps)):[];
  DB.routines.push(R(id,m.cat||'skin',m.type||'evening',name,[],steps,todayStr()));
  save();closeModal(()=>{UI._newR=null;UI.tab='setup';UI.setupPage='routine-edit';UI.editRoutineId=id;});
}
function lookSheet(idx){
  const l=(DB.hairLooks||[])[idx];if(!l)return'';const r=routineById(l.id)||{steps:[]};
  return`<h3>Edit look</h3>
  <div class="field"><label>Name</label><input value="${esc(l.name)}" data-chg="lkName" data-args="${idx}"></div>
  <div class="field"><label>Description</label><input value="${esc(l.desc)}" data-chg="lkDesc" data-args="${idx}"></div>
  <div class="sec-label" style="margin-left:0">Steps</div>
  <div class="card" style="margin:0 0 12px">${r.steps.map((s,i)=>`<div class="edit-step"><span class="nm">${i+1}. ${esc(pName(s.p))}</span>
  <button class="mini" data-call="lkMove" data-args="${idx}|${i}|-1">↑</button><button class="mini" data-call="lkMove" data-args="${idx}|${i}|1">↓</button>
  <button class="mini" style="color:var(--danger)" data-call="lkDel" data-args="${idx}|${i}">✕</button></div>`).join('')||'<div class="empty">No steps</div>'}</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button class="btn sm" data-call="lkAdd" data-args="${idx}">+ Add product</button>
    <button class="btn danger sm" data-call="deleteLook" data-args="${idx}">Delete look</button>
    <button class="btn ghost sm" onclick="closeModal()">Done</button></div>`;
}
function lkMove(idx,i,d){const r=routineById((DB.hairLooks||[])[idx]?.id);if(!r)return;const st=r.steps;const j=i+d;if(j<0||j>=st.length)return;[st[i],st[j]]=[st[j],st[i]];save();render();}
function lkAdd(idx){const l=(DB.hairLooks||[])[idx];if(!l)return;let r=routineById(l.id);if(!r){r=R(l.id,'hair','morning',l.name,[],[]);DB.routines.push(r);save();}UI.modal={type:'addstep',routineId:l.id};render();}
function deleteLook(idx){if(!confirm('Delete this look?'))return;const l=DB.hairLooks[idx];DB.routines=DB.routines.filter(r=>r.id!==l.id);DB.hairLooks.splice(idx,1);save();closeModal();}
function newLook(){if(!gateCreate('routines'))return;const id='look-'+Date.now();DB.hairLooks.push({id,name:'New look',desc:'',tags:[]});DB.routines.push(R(id,'hair','morning','New look',[],[]));save();UI.modal={type:'look',idx:DB.hairLooks.length-1};render();}
function lookPickSheet(){return`<h3>Pick a look</h3>${(DB.hairLooks||[]).map(l=>`<button class="step" style="border-bottom:1px solid var(--hairline)" data-call="pickHairLook" data-args="${l.id}"><div class="step-body"><div class="step-name">${esc(l.name)}</div><div class="step-note">${esc(l.desc)}</div></div></button>`).join('')}`;}

/* ══ PROMPTS ══ */
function claudePrompt(){
  const lines=['MY PERSONAL CARE CONTEXT — '+new Date().toLocaleDateString('en-AU'),'','SKIN PROFILE: Dry/sensitive, antihistamines, anti-ageing, no chemical smells. Melbourne AU.',''];
  DB.routines.filter(r=>r.cat==='skin'&&!r.deletedAt).forEach(r=>{lines.push('SKIN — '+r.name+' ('+(r.days.length?r.days.map(d=>dayShort(d)).join('/'):'unassigned')+'):');activeSteps(r.steps).forEach((s,i)=>{const p=DB.products[s.p];let l=(i+1)+'. '+p.brand+' '+p.name;const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;if(np)l+=' [next: '+np.brand+' '+np.name+']';else if(p.next&&p.next.name)l+=' [next: '+p.next.name+']';if((p.flags||[]).includes('removeWhenDone'))l+=' [phasing out]';lines.push(l);});lines.push('');});
  DB.routines.filter(r=>r.cat==='hair'&&!isLookId(r.id)&&!r.deletedAt).forEach(r=>{lines.push('HAIR — '+r.name+' ('+r.type+', '+(r.days.length?r.days.map(d=>dayShort(d)).join('/'):'unassigned')+'):');activeSteps(r.steps).forEach((s,i)=>{const p=DB.products[s.p];lines.push((i+1)+'. '+p.brand+' '+p.name);});lines.push('');});
  (DB.hairLooks||[]).forEach(l=>{const r=routineById(l.id);lines.push('HAIR LOOK — '+l.name+(l.tags&&l.tags.length?' ['+l.tags.join('/')+']':'')+': '+(r?activeSteps(r.steps).map(s=>{const p=DB.products[s.p];return p.brand+' '+p.name;}).join(' → '):''));});
  lines.push('');lines.push('SCENTS: '+scents().map(s=>s.brand+' '+s.name+' ('+s.tags.join('/')+')').join('; '));
  const suppProds=Object.values(DB.products).filter(p=>p.cat==='supplements'&&p.active);if(suppProds.length){lines.push('');lines.push('SUPPLEMENTS: '+suppProds.map(p=>p.brand+' '+p.name).join(', '));}
  const inactive=Object.values(DB.products).filter(p=>!p.active);if(inactive.length){lines.push('');lines.push('RETIRED: '+inactive.map(p=>p.brand+' '+p.name).join(', '));}
  const low=lowStock();if(low.length){lines.push('');lines.push('LOW STOCK: '+low.map(([id,p])=>p.name+' (~'+Math.max(0,daysLeft(p))+'d)').join(', '));}
  return lines.join('\n');
}
function claudePromptSkin(){
  const lines=['MY SKIN ROUTINE & PRODUCTS — '+new Date().toLocaleDateString('en-AU'),'','PROFILE: Dry/sensitive, antihistamines, anti-ageing, no chemical smells. Melbourne AU.','','── PRODUCTS ──'];
  Object.values(DB.products).filter(p=>p.cat==='skin'&&p.active).forEach(p=>{lines.push('');lines.push(p.brand+' '+p.name);lines.push('Role: '+p.role);if(p.why)lines.push('Why: '+p.why);if(p.notes)lines.push('Notes: '+p.notes);const np=p.next&&p.next.productId?DB.products[p.next.productId]:null;if(np)lines.push('Replacing with: '+np.brand+' '+np.name+(p.next.why?' — '+p.next.why:''));else if(p.next&&p.next.name)lines.push('Replacing with: '+p.next.name+(p.next.why?' — '+p.next.why:''));if((p.flags||[]).includes('removeWhenDone'))lines.push('Status: Phasing out');const dl=daysLeft(p);if(dl!==null&&dl<=30)lines.push('Stock: ~'+Math.max(0,dl)+' days left');});
  lines.push('','── ROUTINES ──');
  DB.routines.filter(r=>r.cat==='skin'&&!r.deletedAt).forEach(r=>{lines.push('');lines.push(r.name+' ('+(r.days.length?r.days.map(d=>dayShort(d)).join('/'):'no days')+'):');activeSteps(r.steps).forEach((s,i)=>{const p=DB.products[s.p];lines.push('  '+(i+1)+'. '+p.brand+' '+p.name+(s.wait?' [wait '+fmtWait(s.wait)+']':''));});});
  const inactive=Object.values(DB.products).filter(p=>p.cat==='skin'&&!p.active);if(inactive.length){lines.push('','RETIRED: '+inactive.map(p=>p.brand+' '+p.name).join(', '));}
  return lines.join('\n');
}
function claudePromptHair(){
  const lines=['MY HAIR ROUTINE & PRODUCTS — '+new Date().toLocaleDateString('en-AU'),'','── PRODUCTS ──'];
  Object.values(DB.products).filter(p=>p.cat==='hair'&&p.active).forEach(p=>{lines.push('');lines.push(p.brand+' '+p.name);lines.push('Role: '+p.role);if(p.why)lines.push('Why: '+p.why);if(p.notes)lines.push('Notes: '+p.notes);});
  lines.push('','── ROUTINES ──');
  DB.routines.filter(r=>r.cat==='hair'&&!isLookId(r.id)&&!r.deletedAt).forEach(r=>{lines.push('');lines.push(r.name+' ('+r.type+', '+(r.days.length?r.days.map(d=>dayShort(d)).join('/'):'no days')+'):');activeSteps(r.steps).forEach((s,i)=>{const p=DB.products[s.p];lines.push('  '+(i+1)+'. '+p.brand+' '+p.name+(s.wait?' [wait '+fmtWait(s.wait)+']':''));});});
  lines.push('','── LOOKS ──');
  (DB.hairLooks||[]).forEach(l=>{const r=routineById(l.id);lines.push(l.name+(l.tags&&l.tags.length?' ['+l.tags.join('/')+']':'')+': '+(r?activeSteps(r.steps).map(s=>{const p=DB.products[s.p];return p.brand+' '+p.name;}).join(' → '):'no steps'));});
  return lines.join('\n');
}
function claudePromptScent(){
  const lines=['MY SCENT WARDROBE — '+new Date().toLocaleDateString('en-AU'),'','PROFILE: Woods, musks, earth and resin. Quiet intensity over projection.',''];
  scents().forEach(s=>{lines.push(s.brand+' '+s.name);lines.push('Character: '+s.role);if(s.why)lines.push('Why: '+s.why);if(s.tags.length)lines.push('When: '+s.tags.join(', '));if(s.notes)lines.push('Notes: '+s.notes);lines.push('');});
  const inactive=Object.values(DB.products).filter(p=>p.cat==='scent'&&!p.active);if(inactive.length)lines.push('RETIRED: '+inactive.map(p=>p.brand+' '+p.name).join(', '));
  return lines.join('\n');
}

/* ══ BACKUP ══ */
function exportData(){const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='thestack-backup.json';a.click();}
function importData(inp){const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{DB=migrate(JSON.parse(r.result));save();render();alert('Imported.');}catch(e){alert('Invalid file.');}};r.readAsText(f);}

/* ══ THEME ══ */
function applyTheme(){
  const t=DB.settings?.theme||'copper';
  if(t==='copper')document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme',t);
  const m=DB.settings?.mode||'system';
  if(m==='system')document.documentElement.removeAttribute('data-mode');
  else document.documentElement.setAttribute('data-mode',m);
  updateThemeColor();
}
function setMode(m){DB.settings.mode=m;save();applyTheme();render();}
function updateThemeColor(){
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const m=document.querySelector('meta[name="theme-color"]');
  if(m&&bg)m.setAttribute('content',bg);
}
function setTheme(t){DB.settings.theme=t;save();applyTheme();render();}
try{matchMedia('(prefers-color-scheme: light)').addEventListener('change',updateThemeColor);}catch(e){}

/* ══ JOURNAL → PROMPT ══ */
function journalBlock(){
  const jd=Object.entries(DB.journal||{}).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,14);
  return jd.length?'\n\nRECENT SKIN JOURNAL (newest first — use this to advise on reactions, tolerance and progress):\n'+jd.map(([d,t])=>d+': '+t).join('\n'):'';
}
const _cpFull=claudePrompt,_cpSkin=claudePromptSkin;
claudePrompt=function(){return _cpFull()+journalBlock();};
claudePromptSkin=function(){return _cpSkin()+journalBlock();};

/* ══ BOOT ══ */
async function bootApp(){
  if(booted_local)return;          // idempotent: only paint once
  booted_local=true;
  if('serviceWorker' in navigator){try{navigator.serviceWorker.register('sw.js');}catch(e){}}
  /* v99: surface the live SW cache version in the Settings footer (deploy check) */
  if(window.caches&&caches.keys){caches.keys().then(ks=>{
    const k=ks.filter(x=>x.indexOf('stack-shell-')===0).sort().pop();
    window.__swCache=k?('sw '+k.replace('stack-shell-','')):'sw none';
  }).catch(()=>{});}
  // Paint immediately from local cache so there's no blank wait; Firestore hydrates
  // later, once auth confirms a uid (see startCloudSync).
  applyTheme();
  render();
  hideBootScreen();
}
window.bootApp=bootApp;
let booted_local=false;

// Kicked off by the auth handler once a real uid is known. Safe to call once.
async function startCloudSync(){
  if(_cloudStarted)return;
  _cloudStarted=true;
  await hydrateFromFirestore();
}
window.startCloudSync=startCloudSync;
let _cloudStarted=false;

async function hydrateFromFirestore(){
  const fs=window.stackFS;
  if(!fs){ _fsReady=true; _snapshotShadow(); return; }
  try{
    const remote=await fs.loadAll();
    if(remote && remote.core){
      // Existing cloud account: rebuild flat DB from split docs, then migrate.
      const rebuilt=Object.assign({},remote.core);
      rebuilt.journal=remote.journal||{};
      rebuilt.completions=remote.completions||{};
      DB=migrate(rebuilt);
      try{ localStorage.setItem('stack_v1',JSON.stringify(DB)); }catch(e){}
    }else{
      // Fresh cloud account (no core doc yet). Keep whatever DB we booted with
      // (SEED for a brand-new user). Stage D migration will handle existing
      // localStorage users; for now, seed the cloud from current DB.
      _fsReady=true; _snapshotShadow();
      _flushFirestore();  // write initial SEED/local state up to the cloud
      render();
      startLiveSync();
      return;
    }
  }catch(e){ console.warn('hydrate failed, staying on local cache',e); }
  _fsReady=true;
  _snapshotShadow();
  render();
  startLiveSync();
}

let _liveSyncUnsub=null;
function startLiveSync(){
  const fs=window.stackFS;
  if(!fs||_liveSyncUnsub) return;
  _liveSyncUnsub=fs.subscribe((kind,data)=>{
    // Don't clobber an in-progress edit (mirrors old autoPull guard).
    if(UI.modal||UI.tab==='today'||UI.tab==='runner') return;
    _fsSuspend=true;
    try{
      if(kind==='core'){
        const merged=Object.assign({},data);
        merged.journal=DB.journal; merged.completions=DB.completions;
        DB=migrate(merged);
      }else if(kind==='journal'){
        DB.journal=data||{};
      }else if(kind==='completions'){
        // Merge, not replace: preserve local ticks/un-ticks not yet flushed.
        const remote=(data&&data.entries)||{};
        const meta=(data&&data.meta)||{};
        const merged=Object.assign({},remote);
        const shadow=_fsShadow.completions||{};
        const local=DB.completions||{};
        const fs2=window.stackFS;
        // Guard: if a remote day's doc is OLDER than our most recent local write
        // for that same day, the snapshot is a stale echo — keep local entries
        // for that day so a just-made tick can't be reverted 1–2s later.
        const staleDays=new Set();
        for(const ds in _localCompWrite){
          const remoteTs=meta[ds]||0;
          if(remoteTs < _localCompWrite[ds]) staleDays.add(ds);
        }
        if(staleDays.size){
          // drop remote keys for stale days, then re-add our local ones below
          for(const k in merged){ const d=fs2.dateOfCompKey(k); if(d&&staleDays.has(d)) delete merged[k]; }
          for(const k in local){ const d=fs2.dateOfCompKey(k); if(d&&staleDays.has(d)) merged[k]=local[k]; }
        }
        // Preserve any local key that diverges from the last-persisted shadow.
        for(const k in local){ if(JSON.stringify(local[k])!==JSON.stringify(shadow[k])){ merged[k]=local[k]; } }
        // Honour local deletions that have been persisted (in shadow, gone from local).
        for(const k in shadow){ if(!(k in local) && (k in merged)){ const d=fs2.dateOfCompKey(k); if(!(d&&staleDays.has(d))) delete merged[k]; } }
        DB.completions=merged;
      }
      try{ localStorage.setItem('stack_v1',JSON.stringify(DB)); }catch(e){}
      _snapshotShadow();
      render();
    }finally{ _fsSuspend=false; }
  });
}

/* Boot is triggered by the auth gate (see auth module in <head>).
   Fast path: if a previous session left a marker in localStorage, we very
   likely have a valid session, so paint the app from local cache right now
   instead of waiting for the (slow) Firebase auth handshake. The auth module
   still runs in the background: if the session is genuinely valid it starts
   cloud sync silently; if the marker was stale it surfaces the login gate.
   Fallback: if the auth module never loads (offline SDK fetch fail),
   boot on local cache so the app is never permanently blank. */
window.__authReady=false;
try{
  if(localStorage.getItem('stack_session')==='1'){ bootApp(); }
}catch(e){}
setTimeout(function(){if(!window.__authReady){ _fsReady=true; _snapshotShadow(); bootApp(); }},4000);

/* ══ v101: desktop keyboard — Esc closes the top-most layer ══ */
window.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  if(UI.modal)closeModal();
  else if(UI._facetOpen)closeFacet();
});
