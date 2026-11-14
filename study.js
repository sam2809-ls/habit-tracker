import { P25C } from "./p25.js?v=13";
const {SK,HC,OC}=P25C; let C=null, sess=[], subCid=null, endOpen=false, endBrk=0, focus=0, pick='', tm=null;
const LONG=['wolf','long','curly'], DEF={s:1,h:1,o:6,hs:'wolf'};
const mins=ms=>Math.max(0,Math.round(ms/60000)), dur=m=>m>=60?`${Math.floor(m/60)}h ${m%60}m`:`${m}m`;
const hm=t=>new Date(t).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
const subs=()=>{try{return JSON.parse(localStorage.getItem('sr_subj_'+C.me().uid)||'[]')}catch(e){return[]}};
const WX=[['clear','☀️','Clear'],['cloudy','⛅','Cloudy'],['rainy','🌧️','Rainy'],['stormy','⛈️','Stormy'],['snowy','❄️','Snowy']];
const wxGet=()=>localStorage.getItem('sr_wx_'+C.me().uid)||'clear';
const stOf=u=>(C.couple().study&&C.couple().study[u])||{st:''};

export function initStudy(c){ C=c; }

function figure(a,mode,x,dir){
  a=a||DEF; const sk=SK[a.s]||SK[1], hr=HC[a.h]||HC[0], ot=OC[a.o]||OC[6], lg=LONG.includes(a.hs);
  if(mode==='front') return `<g transform="translate(${x} 0)"><rect x="-17" y="296" width="34" height="52" rx="12" fill="${ot}"/>${lg?`<ellipse cx="-12" cy="284" rx="7" ry="14" fill="${hr}"/><ellipse cx="12" cy="284" rx="7" ry="14" fill="${hr}"/>`:''}<circle cy="274" r="15" fill="${sk}"/><path d="M-15 273 Q-15 256 0 256 Q15 256 15 273 Q8 264 0 266 Q-8 264 -15 273Z" fill="${hr}"/>${a.hs==='bun'?`<circle cy="253" r="7" fill="${hr}"/>`:''}<circle cx="-5" cy="277" r="1.6" fill="#2b1d17"/><circle cx="5" cy="277" r="1.6" fill="#2b1d17"/><path d="M-14 312 Q-18 326 -10 336 M14 312 Q18 326 10 336" fill="none" stroke="${ot}" stroke-width="8" stroke-linecap="round"/></g>`;
  const head=(cy)=>`${lg?`<ellipse cx="-11" cy="${cy+8}" rx="8" ry="13" fill="${hr}"/>`:''}<circle cx="0" cy="${cy}" r="15" fill="${sk}"/><path d="M-15 ${cy+1} Q-15 ${cy-17} 0 ${cy-17} Q16 ${cy-17} 15 ${cy-3} Q8 ${cy-11} 0 ${cy-9} Q-9 ${cy-9} -15 ${cy+1}Z" fill="${hr}"/>${a.hs==='bun'?`<circle cx="-4" cy="${cy-19}" r="7" fill="${hr}"/>`:''}<circle cx="8" cy="${cy+3}" r="1.6" fill="#2b1d17"/>`;
  if(mode==='sit') return `<g transform="translate(${x} 0) scale(${dir} 1)"><rect x="-17" y="296" width="34" height="52" rx="12" fill="${ot}"/>${head(274)}<path d="M0 314 Q22 326 42 336" fill="none" stroke="${ot}" stroke-width="9" stroke-linecap="round"/><circle cx="44" cy="336" r="4.5" fill="${sk}"/></g>`;
  return `<g transform="translate(${x} 0) scale(${dir} 1)"><rect x="-15" y="252" width="30" height="40" rx="10" fill="${ot}"/>${head(236)}<path d="M12 272 Q24 264 17 254" fill="none" stroke="${ot}" stroke-width="8" stroke-linecap="round"/><rect x="8" y="243" width="11" height="11" rx="2" fill="#fbf7ef" stroke="#b9a98f" stroke-width=".5"/><path d="M12 239 q-3 -5 0 -9 q3 -4 0 -8" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></g>`;
}
const LYS=[['across','Across'],['side','Side by side'],['corner','Corner'],['corners','Far corners'],['same','Same way']];
const LYP={across:[[112,'s',1],[268,'s',-1]],side:[[168,'f',1],[228,'f',1]],corner:[[100,'s',1],[205,'f',1]],corners:[[100,'f',1],[270,'f',1]],same:[[100,'s',1],[172,'s',1]]};
const lyGet=()=>localStorage.getItem('sr_ly_'+C.me().uid)||'across';
const leaf=(x,y,k,r,c)=>`<g transform="translate(${x} ${y}) rotate(${r}) scale(${k})"><path d="M0 0 C-22 -6 -26 -34 0 -48 C26 -34 22 -6 0 0Z" fill="${c}"/><path d="M0 -4 V-40 M-4 -16 L-14 -20 M4 -16 L14 -20 M-4 -28 L-12 -32 M4 -28 L12 -32" stroke="#1d4a31" stroke-width="1.2" fill="none"/></g>`;
function room(me,pt,ma,pa,wx,ly){
  const h=new Date().getHours(), night=h<6||h>=20; let sky=night?'#1c2340':h<9?'#f7d9b5':h<17?'#cfe6f3':'#f6b98a';
  const SKY={cloudy:['#c3ccd4','#2a2f45'],rainy:['#9fb0bf','#1a2033'],stormy:['#6f7b8a','#12151f'],snowy:['#e8eef4','#2a3350']}; if(SKY[wx]) sky=SKY[wx][night?1:0];
  const dark=wx==='rainy'||wx==='stormy', cc=dark?'#7d8a99':night?'#4a5270':'#ffffff', hill=night?'#2c4a45':'#a9cdb4';
  const back=SKY[wx]?`<ellipse cx="80" cy="80" rx="46" ry="16" fill="${cc}" opacity=".9"/><ellipse cx="190" cy="60" rx="54" ry="18" fill="${cc}" opacity=".9"/><ellipse cx="150" cy="120" rx="40" ry="13" fill="${cc}" opacity=".8"/>`:(night?'<circle cx="84" cy="84" r="16" fill="#f5f0d8"/>':'<circle cx="84" cy="84" r="26" fill="#fff4c4"/><ellipse cx="190" cy="70" rx="34" ry="10" fill="#fff" opacity=".85"/>');
  const fx=dark?Array.from({length:30},(_,i)=>`<path d="M${28+(i*37)%228} ${40+(i*53)%230} l-3 11" stroke="#6b8fb3" stroke-width="1.2"/>`).join('')+(wx==='stormy'?'<path d="M200 70 l-14 34 h12 l-8 28 l26 -40 h-13 l10 -22z" fill="#fff3a8"/>':''):wx==='snowy'?Array.from({length:26},(_,i)=>`<circle cx="${28+(i*41)%228}" cy="${36+(i*59)%240}" r="${1.5+i%3*.7}" fill="#fff"/>`).join(''):'';
  const P=LYP[ly]||LYP.across, chair=([x,k,d])=>k==='f'?`<rect x="${x-22}" y="282" width="44" height="66" rx="6" fill="#5b4636"/><rect x="${x-16}" y="354" width="5" height="62" fill="#5b4636"/>`:`<rect x="${d>0?x-42:x+32}" y="282" width="10" height="72" rx="4" fill="#5b4636"/><rect x="${d>0?x-42:x-4}" y="346" width="46" height="8" rx="3" fill="#5b4636"/>`;
  const sit=(st,a,[x,k,d])=>st==='studying'?figure(a,k==='s'?'sit':'front',x,d):'';
  const mono=`<g>${[[346,306,340,226,1.5,-8],[346,306,318,252,1.3,-52],[346,306,372,250,1.3,48],[346,306,330,196,1.2,-24],[346,306,358,204,1.1,22],[346,306,344,168,1,0]].map(([x0,y0,x,y,k,r],i)=>`<path d="M${x0} ${y0} Q${x0} ${(y0+y)/2} ${x} ${y+6}" stroke="#2d6a4f" stroke-width="3" fill="none"/>${leaf(x,y+6,k,r,i%2?'#3f9a62':'#2f7d4f')}`).join('')}<rect x="328" y="306" width="36" height="34" rx="4" fill="#b9694a"/></g>`;
  const shelf=`<rect x="272" y="178" width="104" height="5" fill="#8a5a3b"/><rect x="282" y="168" width="16" height="10" fill="#d9622b"/><rect x="286" y="148" width="8" height="20" rx="4" fill="#4f9a62"/><rect x="279" y="156" width="7" height="4" rx="2" fill="#4f9a62"/><rect x="316" y="168" width="16" height="10" fill="#7a5cff"/><circle cx="324" cy="162" r="7" fill="#5fae72"/><circle cx="317" cy="186" r="4" fill="#5fae72"/><circle cx="330" cy="190" r="4" fill="#5fae72"/><rect x="350" y="168" width="16" height="10" fill="#e9e4d8"/><ellipse cx="358" cy="162" rx="9" ry="6" fill="#6bbf8a"/>`;
  const pic=`<g transform="translate(298 52)"><rect width="68" height="86" fill="#6b4429"/><rect x="4" y="4" width="60" height="78" fill="#f6efe2"/>${[[22,'#1f9d8f','#e8b98f'],[46,'#e0457b','#c68c5f']].map(([x,o,k])=>`<rect x="${x-8}" y="50" width="16" height="28" rx="5" fill="${o}"/><circle cx="${x}" cy="40" r="7" fill="${k}"/><rect x="${x-10}" y="29" width="20" height="3" fill="#24203b"/><rect x="${x-6}" y="32" width="12" height="4" fill="#24203b"/><rect x="${x-7}" y="58" width="14" height="4" rx="1" fill="#fbf7ef" stroke="#b9a98f" stroke-width=".5"/>`).join('')}</g>`;
  return `<svg width="100%" viewBox="0 0 380 340" role="img" aria-label="Study room" style="display:block;border-radius:16px;overflow:hidden"><rect width="380" height="340" fill="#f1e8da"/><rect x="262" y="18" width="118" height="312" fill="#e9dfcf"/><rect width="380" height="18" fill="#e6dccb"/><rect y="330" width="380" height="10" fill="#d6b48a"/><rect x="22" y="26" width="240" height="304" fill="${sky}"/>${back}<ellipse cx="70" cy="262" rx="60" ry="26" fill="${hill}"/><ellipse cx="210" cy="266" rx="64" ry="24" fill="${hill}"/><rect x="22" y="300" width="240" height="30" fill="#c3b9a8"/><rect x="26" y="274" width="24" height="18" rx="3" fill="#b9694a"/><ellipse cx="38" cy="264" rx="14" ry="11" fill="#4f9a62"/>${fx}${me.st==='break'?figure(ma,'stand',104,1):''}${pt.st==='break'?figure(pa,'stand',210,-1):''}<rect x="22" y="286" width="240" height="14" fill="#eaf5fb" opacity=".75"/><rect x="22" y="283" width="240" height="3" fill="#7a7a80"/>${[20,100,180,260].map(x=>`<rect x="${x}" y="26" width="4" height="304" fill="#6f6659"/>`).join('')}<rect x="20" y="24" width="244" height="4" fill="#6f6659"/><rect x="20" y="328" width="244" height="4" fill="#6f6659"/>${pic}${shelf}<path d="M34 332 q-16 -50 -4 -100 q12 50 4 100 M34 332 q10 -40 22 -78 q2 42 -22 78" fill="#3f8f5a"/><rect x="22" y="316" width="24" height="18" rx="3" fill="#b9694a"/>${chair(P[0])}${chair(P[1])}${sit(me.st,ma,P[0])}${sit(pt.st,pa,P[1])}<rect x="60" y="338" width="260" height="12" rx="4" fill="#8a5a3b"/>${ly==='same'?'<rect x="236" y="296" width="52" height="34" rx="3" fill="#2f3342"/><rect x="239" y="299" width="46" height="28" fill="#6e86a8"/><rect x="258" y="330" width="6" height="8" fill="#2f3342"/>':'<rect x="132" y="331" width="40" height="7" rx="1" fill="#fbf7ef"/><rect x="246" y="326" width="26" height="5" rx="1" fill="#d4a373"/>'}<rect x="292" y="328" width="12" height="10" fill="#d9622b"/><rect x="295" y="314" width="6" height="14" rx="3" fill="#4f9a62"/><rect x="72" y="328" width="12" height="10" fill="#e9e4d8"/><ellipse cx="78" cy="322" rx="7" ry="6" fill="#5fae72"/>${night?'<circle cx="190" cy="322" r="34" fill="#ffd98a" opacity=".25"/><rect x="186" y="318" width="8" height="20" fill="#6b4429"/>':''}${mono}${dark?'<rect width="380" height="340" fill="#2d3b4d" opacity=".14"/>':''}</svg>`;
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
  el.innerHTML=`${room(me,pt,C.av(my),p&&C.av(p),wxGet(),lyGet())}<div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap;align-items:center"><span class="muted" style="font-size:13px">My sky</span>${WX.map(([k,e,n])=>`<button class="btn small ${wxGet()===k?'':'ghost'}" data-wx="${k}">${e} ${n}</button>`).join('')}</div><div class="row" style="margin-top:6px;gap:6px;flex-wrap:wrap;align-items:center"><span class="muted" style="font-size:13px">Seats</span>${LYS.map(([k,n])=>`<button class="btn small ${lyGet()===k?'':'ghost'}" data-ly="${k}">${n}</button>`).join('')}</div><div class="row" style="margin-top:6px;gap:8px;align-items:center"><button class="btn small ${amb.on?'':'ghost'}" id="sramb">🔈 Ambience ${amb.on?'on':'off'}</button><input id="srvol" type="range" min="0" max="1" step="0.05" value="${vol}" style="width:110px;padding:0" aria-label="Ambience volume"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;text-align:center;font-size:13px"><span class="card" style="padding:8px">${C.esc(label('You',me))}</span><span class="card" style="padding:8px">${C.esc(label(p?C.nameOf(p):'Partner',pt))}</span></div><div class="card" style="margin-top:12px">${ctl}${join}</div>${summary()}`;
  const q=s=>el.querySelector(s), on=(s,f)=>{const n=q(s); if(n) n.onclick=f;};
  el.querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>{ localStorage.setItem('sr_wx_'+my,b.dataset.wx); renderStudy(); });
  el.querySelectorAll('[data-ly]').forEach(b=>b.onclick=()=>{ localStorage.setItem('sr_ly_'+my,b.dataset.ly); renderStudy(); });
  on('#sramb',()=>{ if(!AC){ AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=vol*.5; master.connect(AC.destination); nb=nbuf(); } AC.resume(); amb.on=!amb.on; if(!amb.on) stopAmb(); renderStudy(); });
  const vl=q('#srvol'); if(vl) vl.oninput=()=>{ vol=+vl.value; localStorage.setItem('sr_vol',vol); if(master) master.gain.value=vol*.5; };
  if(amb.on) startAmb(wxGet());
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

let AC=null, master=null, nb=null, vol=+(localStorage.getItem('sr_vol')||.4), amb={on:false,key:'',nodes:[],timers:[]};
const nbuf=()=>{const b=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b};
function noise(type,f,q,g,out){const s=AC.createBufferSource();s.buffer=nb;s.loop=true;const fl=AC.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q;const gn=AC.createGain();gn.gain.value=g;s.connect(fl);fl.connect(gn);gn.connect(out||master);s.start();amb.nodes.push(s);return gn}
function osc(f,out,g){const o=AC.createOscillator();o.frequency.value=f;const gn=AC.createGain();gn.gain.value=g;o.connect(gn);gn.connect(out);o.start();amb.nodes.push(o);return gn}
function loop(fn,a,b){const t=()=>{ if(!amb.on) return; fn(); amb.timers.push(setTimeout(t,a+Math.random()*b)); }; amb.timers.push(setTimeout(t,800+Math.random()*a));}
function wind(g){const gn=noise('lowpass',380,.7,g); osc(.1,gn.gain,g*.6)}
function cricket(f,r){const g=AC.createGain(); g.gain.value=.005; g.connect(master); const o=AC.createOscillator(); o.frequency.value=f; o.connect(g); o.start(); amb.nodes.push(o); osc(r,g.gain,.005)}
function stopAmb(){ amb.timers.forEach(clearTimeout); amb.nodes.forEach(n=>{try{n.stop()}catch(e){}}); amb.nodes=[]; amb.timers=[]; amb.key=''; if(AC) AC.suspend&&0; }
export function stopStudyAmb(){ if(amb.on){ amb.on=false; stopAmb(); } }
function startAmb(wx){
  const h=new Date().getHours(), night=h<6||h>=20, key=wx+night; if(amb.key===key||!AC) return; stopAmb(); amb.key=key;
  if(wx==='rainy'||wx==='stormy'){ const k=wx==='stormy'?1.6:1; noise('bandpass',1700,.5,.45*k); noise('highpass',5200,.3,.1*k);
    if(wx==='stormy') loop(()=>{ const t=AC.currentTime, s=AC.createBufferSource(); s.buffer=nb; const f=AC.createBiquadFilter(); f.type='lowpass'; f.frequency.value=110; const g=AC.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.9,t+.4); g.gain.exponentialRampToValueAtTime(.001,t+3.5); s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+4); },7000,14000); }
  else if(wx==='snowy') wind(.3);
  else { wind(wx==='cloudy'?.3:.12); if(night) { cricket(4300,17); cricket(4650,21); }
    else if(wx==='clear') loop(()=>{ const n=2+Math.floor(Math.random()*4), f0=2300+Math.random()*1400; for(let i=0;i<n;i++){ const t=AC.currentTime+i*.14, o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(f0,t); o.frequency.linearRampToValueAtTime(f0+500+Math.random()*500,t+.1); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(.05,t+.03); g.gain.linearRampToValueAtTime(0,t+.11); o.connect(g); g.connect(master); o.start(t); o.stop(t+.13); } },2500,5000); }
}
