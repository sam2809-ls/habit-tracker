import { P25C } from "./p25.js?v=13";
const {SK,HC,OC}=P25C; let C=null, sess=[], subCid=null, endOpen=false, endBrk=0, focus=0, pick='', tm=null;
const LONG=['wolf','long','curly'], DEF={s:1,h:1,o:6,hs:'wolf'};
const mins=ms=>Math.max(0,Math.round(ms/60000)), dur=m=>m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`;
const hm=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const subs=()=>{try{return JSON.parse(localStorage.getItem('sr_subj_'+C.me().uid)||'[]')}catch(e){return[]}};
const stOf=u=>(C.couple().study&&C.couple().study[u])||{st:''};

export function initStudy(c){ C=c; }

function figure(a,mode,x,dir){
  a=a||DEF; const sk=SK[a.s]||SK[1], hr=HC[a.h]||HC[0], ot=OC[a.o]||OC[6], lg=LONG.includes(a.hs);
  const head=(cy)=>`${lg?`<ellipse cx="-11" cy="${cy+8}" rx="8" ry="13" fill="${hr}"/>`:''}<circle cx="0" cy="${cy}" r="15" fill="${sk}"/><path d="M-15 ${cy+1} Q-15 ${cy-17} 0 ${cy-17} Q16 ${cy-17} 15 ${cy-3} Q8 ${cy-11} 0 ${cy-9} Q-9 ${cy-9} -15 ${cy+1}Z" fill="${hr}"/>${a.hs==='bun'?`<circle cx="-4" cy="${cy-19}" r="7" fill="${hr}"/>`:''}<circle cx="8" cy="${cy+3}" r="1.6" fill="#2b1d17"/>`;
  if(mode==='sit') return `<g transform="translate(${x} 0) scale(${dir} 1)"><rect x="-17" y="296" width="34" height="52" rx="12" fill="${ot}"/>${head(274)}<path d="M0 314 Q22 326 42 336" fill="none" stroke="${ot}" stroke-width="9" stroke-linecap="round"/><circle cx="44" cy="336" r="4.5" fill="${sk}"/></g>`;
  return `<g transform="translate(${x} 0) scale(${dir} 1)"><rect x="-15" y="252" width="30" height="40" rx="10" fill="${ot}"/>${head(236)}<path d="M12 272 Q24 264 17 254" fill="none" stroke="${ot}" stroke-width="8" stroke-linecap="round"/><rect x="8" y="243" width="11" height="11" rx="2" fill="#fbf7ef" stroke="#b9a98f" stroke-width=".5"/><path d="M12 239 q-3 -5 0 -9 q3 -4 0 -8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g>`;
}
function room(me,pt,ma,pa){
  const h=new Date().getHours(), night=h<6||h>=20, sky=night?'#1c2340':h<9?'#f7d9b5':h<17?'#cfe6f3':'#f6b98a';
  const chair=(x,f)=>`<rect x="${f?x:x+36}" y="282" width="10" height="72" rx="4" fill="#5b4636"/><rect x="${x}" y="346" width="46" height="8" rx="3" fill="#5b4636"/><rect x="${f?x+5:x+36}" y="354" width="5" height="62" fill="#5b4636"/>`;
  return `<svg width="100%" viewBox="0 0 380 340" role="img" aria-label="Study room" style="display:block;border-radius:16px;overflow:hidden"><rect width="380" height="340" fill="#f1e8da"/><rect width="380" height="18" fill="#e6dccb"/><rect y="330" width="380" height="10" fill="#d6b48a"/><rect x="22" y="26" width="336" height="304" fill="${sky}"/>${night?'<circle cx="84" cy="84" r="16" fill="#f5f0d8"/>':'<circle cx="84" cy="84" r="26" fill="#fff4c4"/><ellipse cx="200" cy="70" rx="34" ry="10" fill="#fff" opacity=".85"/>'}<ellipse cx="90" cy="262" rx="70" ry="26" fill="${night?'#2c4a45':'#a9cdb4'}"/><ellipse cx="320" cy="262" rx="60" ry="26" fill="${night?'#2c4a45':'#a9cdb4'}"/><rect x="22" y="300" width="336" height="30" fill="#c3b9a8"/><rect x="36" y="272" width="28" height="20" rx="3" fill="#b9694a"/><ellipse cx="50" cy="262" rx="16" ry="12" fill="#4f9a62"/>${me.st==='break'?figure(ma,'stand',100,1):''}${pt.st==='break'?figure(pa,'stand',320,-1):''}<rect x="22" y="286" width="336" height="14" fill="#eaf5fb" opacity=".75"/><rect x="22" y="283" width="336" height="3" fill="#7a7a80"/>${[20,132,244,356].map(x=>`<rect x="${x}" y="26" width="4" height="304" fill="#6f6659"/>`).join('')}<rect x="20" y="24" width="340" height="4" fill="#6f6659"/>${chair(70,1)}${chair(264,0)}${me.st==='studying'?figure(ma,'sit',112,1):''}${pt.st==='studying'?figure(pa,'sit',268,-1):''}<rect x="60" y="338" width="260" height="12" rx="4" fill="#8a5a3b"/><rect x="132" y="331" width="40" height="7" rx="1" fill="#fbf7ef"/><rect x="246" y="326" width="26" height="5" rx="1" fill="#d4a373"/>${night?'<circle cx="190" cy="322" r="34" fill="#ffd98a" opacity=".25"/><rect x="186" y="318" width="8" height="20" fill="#6b4429"/>':'<circle cx="198" cy="322" r="4" fill="#e0457b"/>'}</svg>`;
}
const label=(n,s)=>s.st==='studying'?`${n} · ${s.sub} · ${dur(mins(Date.now()-s.since))}`:s.st==='break'?`${n} · on break · ${dur(mins(Date.now()-s.bs))}`:`${n} · away`;

async function save(patch){ const {db,doc,updateDoc}=C; await updateDoc(doc(db,'couples',C.cid()),{[`study.${C.me().uid}`]:patch}); }
async function finish(note,m){
  const s=stOf(C.me().uid), end=s.since+m*60000+endBrk*60000, id=`${C.me().uid}_${s.since}`;
  await C.setDoc(C.doc(C.db,'couples',C.cid(),'study',id),{uid:C.me().uid,sub:s.sub,start:s.since,end,brk:endBrk,focus,note});
  endOpen=false; focus=0; await save({st:''});
}
function overlap(a,b){ return Math.max(0,Math.min(a.end,b.end)-Math.max(a.start,b.start)); }

function summary(){
  const my=C.me().uid, p=C.pid(), t0=new Date().setHours(0,0,0,0), wk=Date.now()-6*864e5;
  const mine=sess.filter(s=>s.uid===my&&s.start>=wk), today=mine.filter(s=>s.start>=t0);
  const net=s=>mins(s.end-s.start-s.brk*60000), by={}; mine.forEach(s=>by[s.sub]=(by[s.sub]||0)+net(s));
  const mx=Math.max(1,...Object.values(by)), tog=mins(sess.filter(s=>s.uid===my&&s.start>=t0).reduce((a,s)=>a+sess.filter(q=>q.uid===p&&q.start>=t0).reduce((b,q)=>b+overlap(s,q),0),0));
  const parts=[['Morning',5,12],['Afternoon',12,17],['Evening',17,21],['Night',21,29]].map(([n,a,b])=>{const l=mine.filter(s=>{const h=new Date(s.start).getHours()||0,hh=h<5?h+24:h;return hh>=a&&hh<b&&s.focus});return[n,l.length?l.reduce((x,s)=>x+s.focus,0)/l.length:0,l.length]}).filter(x=>x[2]);
  const best=parts.sort((a,b)=>b[1]-a[1])[0];
  return `<div class="card" style="margin-top:12px"><b>This week</b>${Object.keys(by).length?Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div style="margin-top:8px;font-size:14px">${C.esc(k)} <span class="muted">· ${dur(v)}</span><div style="height:7px;border-radius:4px;background:var(--line);margin-top:3px"><i style="display:block;height:100%;width:${Math.round(v/mx*100)}%;border-radius:4px;background:#1f9d8f"></i></div></div>`).join(''):'<p class="muted">No sessions yet.</p>'}${tog?`<p style="margin:12px 0 0">Together today: <b>${dur(tog)}</b></p>`:''}${best&&best[1]?`<p class="muted" style="margin:8px 0 0">You focus best in the ${best[0].toLowerCase()} (${best[1].toFixed(1)}/5).</p>`:''}</div><div class="card" style="margin-top:12px"><b>Today</b>${today.length?today.sort((a,b)=>b.start-a.start).map(s=>`<div style="margin-top:10px;font-size:14px"><b>${C.esc(s.sub)}</b> · ${hm(s.start)}–${hm(s.end)} · ${dur(net(s))}${s.focus?` · focus ${s.focus}/5`:''}${s.note?`<div class="muted">${C.esc(s.note)}</div>`:''}</div>`).join(''):'<p class="muted">Nothing yet today.</p>'}</div>`;
}

export function renderStudy(){
  const el=C.$('v-study'); if(!el||!C.couple()) return;
  const my=C.me().uid, p=C.pid(), cid=C.cid();
  if(cid&&subCid!==cid){ subCid=cid; C.onSnapshot(C.collection(C.db,'couples',cid,'study'),s=>{ sess=s.docs.map(d=>d.data()); if(C.tab()==='study') C.render(); }); }
  if(!tm) tm=setInterval(()=>{ if(C.tab()==='study'&&!endOpen) C.render(); },30000);
  const me=stOf(my), pt=p?stOf(p):{st:''}, S=subs();
  const chip=(s,on)=>`<button class="btn small ${on?'':'ghost'}" data-sub="${C.esc(s)}" style="margin:0 6px 6px 0">${C.esc(s)}</button>`;
  let ctl;
  if(endOpen){ const el0=mins(Date.now()-me.since)-endBrk;
    ctl=`<b>How did it go?</b><div style="margin:8px 0">${[1,2,3,4,5].map(n=>`<button class="btn small ${focus===n?'':'ghost'}" data-f="${n}" style="margin-right:6px">${n}</button>`).join('')}<span class="muted" style="font-size:13px"> focus</span></div><textarea id="srnote" rows="2" placeholder="A few words…" style="width:100%"></textarea><div class="row" style="margin-top:8px;align-items:center;gap:8px"><span class="muted" style="font-size:13px">Minutes studied</span><input id="srmin" type="number" min="1" value="${Math.max(1,el0)}" style="width:90px"><button class="btn small" id="srsave">Save</button><button class="btn ghost small" id="srcancel">Back</button></div>`;
  } else if(me.st==='studying') ctl=`<b>${C.esc(me.sub)}</b> <span class="muted">since ${hm(me.since)}</span><div class="row" style="margin-top:10px;gap:8px"><button class="btn small" id="srbreak">☕ Break</button><button class="btn ghost small" id="srend">End session</button></div>`;
  else if(me.st==='break') ctl=`<b>On a break</b><div class="row" style="margin-top:10px;gap:8px"><button class="btn small" id="srback">I’m back</button><button class="btn ghost small" id="srend">End session</button></div>`;
  else ctl=`<b>What are you studying?</b><div style="margin-top:8px">${S.map(s=>chip(s,s===pick)).join('')}</div><div class="row" style="gap:8px;margin:2px 0 10px"><input id="srnew" placeholder="Add a subject" style="flex:1"><button class="btn ghost small" id="sradd">Add</button></div><button class="btn" id="srstart" ${pick?'':'disabled style="opacity:.5"'}>Start studying</button>`;
  const join=p&&pt.st==='break'&&me.st==='studying'?`<button class="btn ghost small" id="srjoin" style="margin-top:8px">${C.esc(C.nameOf(p))} is on a break, take one too?</button>`:'';
  el.innerHTML=`${room(me,pt,C.av(my),p&&C.av(p))}<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;text-align:center;font-size:13px"><span class="card" style="padding:8px">${C.esc(label('You',me))}</span><span class="card" style="padding:8px">${C.esc(label(p?C.nameOf(p):'Partner',pt))}</span></div><div class="card" style="margin-top:12px">${ctl}${join}</div>${summary()}`;
  const q=s=>el.querySelector(s), on=(s,f)=>{const n=q(s); if(n) n.onclick=f;};
  el.querySelectorAll('[data-sub]').forEach(b=>b.onclick=()=>{ pick=b.dataset.sub; renderStudy(); });
  el.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ focus=+b.dataset.f; const n=q('#srnote').value; renderStudy(); q('#srnote').value=n; });
  on('#sradd',()=>{ const v=q('#srnew').value.trim(); if(!v) return; const L=[...new Set([...S,v])]; localStorage.setItem('sr_subj_'+my,JSON.stringify(L)); pick=v; renderStudy(); });
  on('#srstart',()=>save({st:'studying',sub:pick,since:Date.now(),brk:0}));
  on('#srbreak',()=>save({...me,st:'break',bs:Date.now()}));
  on('#srjoin',()=>save({...me,st:'break',bs:Date.now()}));
  on('#srback',()=>save({...me,st:'studying',brk:(me.brk||0)+mins(Date.now()-me.bs)}));
  on('#srend',()=>{ endBrk=(me.brk||0)+(me.st==='break'?mins(Date.now()-me.bs):0); endOpen=true; C.render(); });
  on('#srcancel',()=>{ endOpen=false; renderStudy(); });
  on('#srsave',()=>finish(q('#srnote').value.trim(),Math.max(1,+q('#srmin').value||1)));
}
