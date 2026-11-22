/* =========================================================
   1) PASTE YOUR FIREBASE CONFIG HERE (Project settings → Your apps → Web app)
   ========================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyCkIjTkdYJwcsPORxPbWoLJT4Ipxbh306c",
  authDomain: "habit-tracker-291f6.firebaseapp.com",
  projectId: "habit-tracker-291f6",
  storageBucket: "habit-tracker-291f6.firebasestorage.app",
  messagingSenderId: "912320064818",
  appId: "1:912320064818:web:6224498947dd2cb0337b2b"
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection, query, where,
  onSnapshot, arrayUnion, serverTimestamp, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { initP25, renderP25, p25Progress, p25Week, p25Summary, p25View, p25Look } from "./p25.js?v=13";
import { initStudy, renderStudy, stopStudyAmb, renderBubble, openStudy, studyMode } from "./study.js?v=30";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS = ['Health','Fitness','Sleep','Food','Mind','Money','Us','Growth'];
const SUGGEST = [
  ['Sleep by 11 pm','Sleep',3],['Wake up on time','Sleep',2],['Workout','Fitness',3],['Take supplements','Health',2],
  ['Eat a healthy meal','Food',2],['Drink enough water','Health',1],['Walk 20 minutes','Fitness',1],
  ['10 minutes of calm / prayer / journaling','Mind',2],['Save money today','Money',1],['Quality time together','Us',3]
];
const MILESTONES = [[25,'Getting stronger'],[50,'Halfway there'],[75,'Almost ready'],[100,'Ready']];

let me=null, profile=null, couple=null, habits=[], goals=[], fun=[], logs=new Map();
let unsubs=[], tab='dash', editHabit=null, editGoal=null, duaIdx=0;

/* ---------- dates ---------- */
const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayStr = () => fmt(new Date());
/* ---------- sick days: shared, pause streaks and scores without breaking anything ---------- */
const sickKey=d=>String(d).replace(/-/g,'');
const isSick=(uid,d)=>{ const s=couple&&couple.sick, k=s&&s[sickKey(d)]; return !!(k&&k[uid]); };
const yesterdayStr=()=>{ const t=new Date(); t.setDate(t.getDate()-1); return fmt(t); };
async function setSick(d,on){ await updateDoc(doc(db,'couples',profile.coupleId),{[`sick.${sickKey(d)}.${me.uid}`]:!!on}); toast(on?'Sick day on. Rest well 🤍 Your streaks are safe.':'Welcome back! 🤍'); }
document.addEventListener('click',e=>{ const b=e.target.closest&&e.target.closest('[data-sick]'); if(b&&me&&profile) setSick(b.dataset.sick==='y'?yesterdayStr():todayStr(),b.dataset.on==='1'); });
const lastDays = (n, offset=0) => { const out=[]; for(let i=n-1+offset;i>=offset;i--){ const d=new Date(); d.setDate(d.getDate()-i); out.push(fmt(d)); } return out; };

/* ---------- scoring ---------- */
const partnerId = () => couple.members.find(u => u !== me.uid) || null;
const storedNicks = uid => { const a=couple.nicksFor&&couple.nicksFor[uid]; if(Array.isArray(a)) return a; const o=couple.nicks&&couple.nicks[uid]; return o?[o]:[]; };
const nickList = uid => { const a=storedNicks(uid); return a.length?a:[nameOf(uid)]; };
const nickOf = (uid,i=0) => { const l=nickList(uid); return l[((i%l.length)+l.length)%l.length]; };
const nameOf = uid => (couple.names && couple.names[uid]) || 'Partner';
const hOf = uid => habits.filter(h => h.owner === uid || h.owner === 'both');
const logKey = (hid, uid, d) => `${hid}_${uid}_${d}`;

function dayScore(uid, d){
  if(isSick(uid,d)) return null;
  let poss=0, done=0;
  for(const h of hOf(uid)){
    if(h.start > d) continue;
    poss += h.weight;
    if(logs.has(logKey(h.id, uid, d))) done += h.weight;
  }
  return poss ? done/poss : null;
}
function avg(arr){ const v=arr.filter(x=>x!==null); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : null; }
const rangeScore = (uid, ds) => avg(ds.map(d => dayScore(uid,d)));
function catScore(uid, cat, ds){
  const hs = hOf(uid).filter(h => h.cat===cat);
  let poss=0, done=0;
  for(const d of ds){ if(isSick(uid,d)) continue; for(const h of hs){ if(h.start>d) continue; poss+=h.weight; if(logs.has(logKey(h.id,uid,d))) done+=h.weight; } }
  return poss ? done/poss : null;
}
function streak(uid){
  let s=0;
  const days = lastDays(60).reverse();
  for(let i=0;i<days.length;i++){
    if(isSick(uid,days[i])) continue;
    const v = dayScore(uid, days[i]);
    if(v===null){ if(i===0) continue; break; }
    if(v>=0.6) s++; else if(i===0) continue; else break;
  }
  return s;
}
const goalProgress = g => {
  const t = Math.max(1, g.target||1);
  if(g.mode==='each' && couple){
    const v = couple.members.map(u => Math.min(1, ((g.counts||{})[u]||0)/t));
    return v.reduce((a,b)=>a+b,0)/v.length;
  }
  return Math.min(1, (g.current||0)/t);
};
const D30 = () => lastDays(30);
const earliestLog=(uid,test)=>{ let m=null; for(const v of logs.values()){ if(v.uid===uid && test(v.habitId) && (!m||v.date<m)) m=v.date; } return m; };
const earliestFun=(uid,kind)=>{ let m=null; for(const f of fun){ if(f.kind===kind && f.uid===uid && (!m||f.date<m)) m=f.date; } return m; };
function trackScore(uid,starts,dayFn){
  const st=starts.filter(Boolean).sort()[0]; if(!st) return null;
  return avg(D30().filter(d=>d>=st&&!isSick(uid,d)).map(dayFn));
}
const spiritDay=(uid,d)=>Math.min(1, cnt('prayer_',PRAYERS,uid,d)/5*0.7 + (quranDoc(uid,d)?0.3:0) + (has('prayer_','tahajjud',uid,d)?0.1:0));
const foodDay=(uid,d)=>{ const b=0.8*cnt('meal_',MEALS,uid,d)/3+0.2*cnt('tea_',TEA,uid,d)/2, ws=earliestLog(uid,id=>id.startsWith('water_'));
  return ws&&d>=ws ? 0.75*b+0.25*Math.min(1,waterCount(uid,d)/WATER_N) : b; };
const sleepDay=(uid,d)=>{ const x=sleepDoc(uid,d); return x?Math.min(1,x.hours/SLEEP_TARGET):0; };
const COMPS=[['habits','Habits',25],['spirit','Prayers and Quran',25],['food','Meals, tea and water',15],['sleep','Sleep',15]];
function compScore(uid,key){
  if(key==='habits') return rangeScore(uid,D30());
  if(key==='spirit') return trackScore(uid,[earliestLog(uid,id=>id.startsWith('prayer_')),earliestFun(uid,'quran')],d=>spiritDay(uid,d));
  if(key==='food')   return trackScore(uid,[earliestLog(uid,id=>id.startsWith('meal_')||id.startsWith('tea_')||id.startsWith('water_'))],d=>foodDay(uid,d));
  if(key==='sleep')  return trackScore(uid,[earliestFun(uid,'sleep')],d=>sleepDay(uid,d));
  return null;
}
const goalsScore=()=>goals.length ? goals.reduce((a,g)=>a+goalProgress(g),0)/goals.length : null;
function readiness(){
  let sum=0, wsum=0;
  for(const [key,,w] of COMPS){
    const v=avg(couple.members.map(u=>compScore(u,key)));
    if(v!==null){ sum+=v*w; wsum+=w; }
  }
  const g=goalsScore(); if(g!==null){ sum+=g*20; wsum+=20; }
  return wsum? Math.round(sum/wsum*100) : 0;
}
const pct = v => v===null ? '–' : Math.round(v*100)+'%';

/* ---------- auth ---------- */
function show(which){ ['auth','pair','app'].forEach(k => $(k).classList.toggle('hidden', k!==which)); }
document.addEventListener('click',e=>{
  const t=e.target.closest('.tick:not(.ro)');
  if(!t||t.classList.contains('on')||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const kb=document.getElementById('kitbtn'); if(kb){ kb.classList.add('cheer'); setTimeout(()=>kb.classList.remove('cheer'),800); }
  const r=t.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
  ['💗','✨','💖','🌸','💕'].forEach((c,i)=>{ const b=document.createElement('span'); b.className='burst'; b.textContent=c;
    b.style.cssText=`left:${x}px;top:${y}px;--dx:${(i-2)*24+(Math.random()*12-6)}px;--dy:${-40-Math.random()*30}px`;
    document.body.appendChild(b); setTimeout(()=>b.remove(),950); });
},true);
function toast(t){ const el=document.createElement('div'); el.className='toast'; el.textContent=t; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }

$('signin').onclick = async () => {
  $('autherr').textContent='';
  try{ await signInWithEmailAndPassword(auth, $('email').value.trim(), $('pass').value); }
  catch(e){ $('autherr').textContent = 'Could not sign in: ' + e.code.replace('auth/',''); }
};
$('signup').onclick = async () => {
  $('autherr').textContent='';
  const name = $('name').value.trim();
  if(!name){ $('autherr').textContent='Type your first name above to create an account.'; return; }
  try{
    const cred = await createUserWithEmailAndPassword(auth, $('email').value.trim(), $('pass').value);
    await setDoc(doc(db,'users',cred.user.uid), { name, coupleId:null });
  }catch(e){ $('autherr').textContent = 'Could not create account: ' + e.code.replace('auth/',''); }
};
$('editname').onclick = async () => {
  const current = (couple && couple.names && couple.names[me.uid]) || profile.name || '';
  const input = prompt('Type your name as you want it to show:', current);
  if(input === null) return;
  const name = input.trim();
  if(!name) return;
  try{
    await updateDoc(doc(db,'users',me.uid), { name });
    await updateDoc(doc(db,'couples',profile.coupleId), { [`names.${me.uid}`]: name });
    profile.name = name;
    toast('Name updated');
  }catch(e){ toast('Could not update the name. Try again.'); }
};
function renderNicks(){
  const pid=partnerId(); if(!pid) return;
  $('nickh').textContent=`Nicknames for ${nameOf(pid)}`;
  $('nickdesc').textContent='What do you call them? Add as many as you like. Your messages will use them.';
  const list=storedNicks(pid);
  $('nicklist').innerHTML = list.map((n,i)=>`<div class="row" style="justify-content:space-between;margin:6px 0"><span>${esc(n)}</span><button class="btn ghost small" data-nr="${i}">Remove</button></div>`).join('') || '<p class="muted">No nicknames yet.</p>';
  $('nicklist').querySelectorAll('[data-nr]').forEach(b=>b.onclick=async()=>{
    const next=storedNicks(pid).filter((_,i)=>i!==Number(b.dataset.nr));
    await updateDoc(doc(db,'couples',profile.coupleId),{[`nicksFor.${pid}`]:next});
  });
}
$('editnick').onclick = () => {
  if(!partnerId()){ toast('Nicknames unlock once your partner joins'); return; }
  renderNicks(); $('nickmodal').classList.remove('hidden'); $('nickin').focus();
};
$('nickclose').onclick = () => $('nickmodal').classList.add('hidden');
$('nickmodal').onclick = e => { if(e.target===$('nickmodal')) $('nickmodal').classList.add('hidden'); };
const addNick = async () => {
  const pid=partnerId(), n=$('nickin').value.trim(); if(!pid||!n) return;
  const next=[...new Set([...storedNicks(pid), n])];
  await updateDoc(doc(db,'couples',profile.coupleId),{[`nicksFor.${pid}`]:next});
  $('nickin').value='';
};
$('nickadd').onclick = addNick;
$('nickin').onkeydown = e => { if(e.key==='Enter') addNick(); };
const doSignOut = () => signOut(auth);
$('bkup').onclick=doBackup; $('bkrest').onclick=()=>$('bkfile').click(); $('bkfile').onchange=e=>{ const f=e.target.files[0]; e.target.value=''; if(f) doRestore(f); };
$('signout').onclick = doSignOut; $('signout2').onclick = doSignOut;

const randCode = () => { const a='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<8;i++) s+=a[Math.floor(Math.random()*a.length)]; return s; };

$('create').onclick = async () => {
  const code = randCode();
  await setDoc(doc(db,'couples',code), { members:[me.uid], names:{[me.uid]:profile.name}, createdAt:serverTimestamp() });
  await updateDoc(doc(db,'users',me.uid), { coupleId: code });
  profile.coupleId = code; start();
};
$('join').onclick = async () => {
  $('pairerr').textContent='';
  const code = $('code').value.trim().toUpperCase();
  if(!code) return;
  try{
    const snap = await getDoc(doc(db,'couples',code));
    if(!snap.exists()){ $('pairerr').textContent='That code was not found. Check it and try again.'; return; }
    const data = snap.data();
    if(data.members.length>=2 && !data.members.includes(me.uid)){ $('pairerr').textContent='That space already has two people.'; return; }
    await updateDoc(doc(db,'couples',code), { members: arrayUnion(me.uid), [`names.${me.uid}`]: profile.name });
    await updateDoc(doc(db,'users',me.uid), { coupleId: code });
    profile.coupleId = code; start();
  }catch(e){ $('pairerr').textContent='Could not join: ' + e.code; }
};

onAuthStateChanged(auth, async user => {
  unsubs.forEach(u=>u()); unsubs=[]; alertKeys=null; funLoaded=false;
  if(!user){ me=null; show('auth'); return; }
  me = user;
  let snap = await getDoc(doc(db,'users',user.uid));
  if(!snap.exists()){
    await setDoc(doc(db,'users',user.uid), { name:($('name').value.trim()||'Me'), coupleId:null });
    snap = await getDoc(doc(db,'users',user.uid));
  }
  profile = snap.data();
  if(profile.coupleId) start(); else show('pair');
});

/* ---------- live data ---------- */
function start(){
  snapSig='';
  alertKeys=null; funLoaded=false;
  show('app');
  const cid = profile.coupleId;
  const base = doc(db,'couples',cid);
  const cutoff = lastDays(70)[0];
  unsubs.push(onSnapshot(base, s => { couple = s.data(); couple && couple.id===undefined && (couple.id=cid); checkAlerts(); snapRender(); if(!$('nickmodal').classList.contains('hidden')) renderNicks(); if(!$('notifmodal').classList.contains('hidden')) renderNotif(); }));
  unsubs.push(onSnapshot(collection(base,'habits'), s => { habits = s.docs.map(d=>({id:d.id,...d.data()})); snapRender(); }));
  unsubs.push(onSnapshot(collection(base,'fun'), s => { fun = s.docs.map(d=>({id:d.id,...d.data()})); funLoaded=true; try{ planLive(); }catch(e){} checkAlerts(); snapRender(); }));
  unsubs.push(onSnapshot(collection(base,'goals'), s => { goals = s.docs.map(d=>({id:d.id,...d.data()})); snapRender(); }));
  unsubs.push(onSnapshot(query(collection(base,'logs'), where('date','>=',cutoff)), s => {
    logs = new Map(s.docs.map(d=>[d.id, d.data()])); snapRender();
  }));
  $('codeInfo').textContent = 'Partner code: ' + cid;
}
const cref = () => doc(db,'couples',profile.coupleId);

function confetti(){
  const cols=['#e0457b','#1f9d8f','#f2b134','#7a5cff'];
  for(let i=0;i<70;i++){
    const c=document.createElement('i'); c.className='conf';
    c.style.left=Math.random()*100+'vw'; c.style.background=cols[i%cols.length];
    c.style.animationDelay=(Math.random()*0.5)+'s'; c.style.animationDuration=(1.4+Math.random()*1.2)+'s';
    document.body.appendChild(c); setTimeout(()=>c.remove(),3500);
  }
}
function togetherStreak(){
  const pid = partnerId(); if(!pid) return 0;
  const days = lastDays(60).reverse(); let s=0;
  for(let i=0;i<days.length;i++){
    if(isSick(me.uid,days[i])||isSick(pid,days[i])) continue;
    const a=dayScore(me.uid,days[i]), b=dayScore(pid,days[i]);
    const ok = a!==null && b!==null && a>=0.6 && b>=0.6;
    if(ok) s++; else if(i===0) continue; else break;
  }
  return s;
}
async function toggle(hid){
  const d = todayStr(), key = logKey(hid, me.uid, d);
  const ref = doc(db,'couples',profile.coupleId,'logs',key);
  if(logs.has(key)) await deleteDoc(ref);
  else{
    const left = hOf(me.uid).filter(h => h.start<=d && !logs.has(logKey(h.id,me.uid,d)));
    const finishing = left.length===1 && left[0].id===hid;
    await setDoc(ref, { habitId:hid, uid:me.uid, date:d });
    if(finishing){ confetti(); toast('All done for today. Well done! 🎉'); }
  }
}
async function addHabit(name, cat, weight, owner){
  if(!name.trim()) return;
  await addDoc(collection(cref(),'habits'), { name:name.trim(), cat, weight:Number(weight), owner, start:todayStr() });
}
async function removeHabit(id){ if(confirm('Delete this habit? Past progress for it will stop counting.')) await deleteDoc(doc(cref(),'habits',id)); }
async function addGoal(title, cat, target, mode){
  if(!title.trim()) return;
  await addDoc(collection(cref(),'goals'), { title:title.trim(), cat, target:Math.max(1,Number(target)||1), mode:mode||'together', current:0, counts:{}, touched:Date.now() });
}
async function bumpGoal(g, by){
  if(g.mode==='each'){
    const cur = Math.max(0, Math.min(g.target, ((g.counts||{})[me.uid]||0)+by));
    await updateDoc(doc(cref(),'goals',g.id), { [`counts.${me.uid}`]: cur, touched:Date.now() });
    return;
  }
  const cur = Math.max(0, Math.min(g.target, (g.current||0)+by));
  await updateDoc(doc(cref(),'goals',g.id), { current:cur, touched:Date.now() });
}
async function removeGoal(id){ if(confirm('Delete this goal?')) await deleteDoc(doc(cref(),'goals',id)); }


/* ---------- prayers & meals ---------- */
const PRAYERS=[['fajr','Fajr'],['dhuhr','Dhuhr'],['asr','Asr'],['maghrib','Maghrib'],['isha','Isha']];
const NAFL=[['tahajjud','Tahajjud (night prayer)']];
const MEALS=[['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner']];
const TEA=[['morning','Morning tea'],['evening','Evening tea']];
const lk=(pre,id,uid,d)=>logKey(pre+id,uid,d);
const has=(pre,id,uid,d)=>logs.has(lk(pre,id,uid,d));
const cnt=(pre,list,uid,d)=>list.filter(([id])=>has(pre,id,uid,d)).length;
function fullStreak(pre,list,uid){
  const days=lastDays(60).reverse(); let n=0;
  for(let i=0;i<days.length;i++){ if(isSick(uid,days[i])) continue; if(cnt(pre,list,uid,days[i])===list.length) n++; else if(i===0) continue; else break; }
  return n;
}
function listFor(pre,id){ return pre==='meal_'?MEALS:((pre==='tea_'||id==='tahajjud')?null:PRAYERS); }
async function toggleLog(pre,id){
  const d=todayStr(), key=lk(pre,id,me.uid,d), list=listFor(pre,id);
  const ref=doc(db,'couples',profile.coupleId,'logs',key);
  if(logs.has(key)){ await deleteDoc(ref); return; }
  const before = list ? cnt(pre,list,me.uid,d) : -1;
  await setDoc(ref,{habitId:pre+id,uid:me.uid,date:d});
  if(list && before===list.length-1) toast(pre==='meal_' ? 'All three meals done. Well done! 🍽️' : 'Alhamdulillah, all five done today 🤲');
}
function togetherRows(pre,list,pid,okIcon){
  const d=todayStr();
  return list.map(([id,label])=>{
    const a=has(pre,id,me.uid,d), b=pid?has(pre,id,pid,d):false;
    let st='<span class="st muted" title="Not yet">○</span>';
    if(pid){
      if(a&&b) st=`<span class="st" title="You both did it">${okIcon}</span>`;
      else if(a||b) st='<span class="st" title="Only one of you so far">😢</span>';
    }else if(a) st=`<span class="st">${okIcon}</span>`;
    return `<div class="trow"><span>${label}</span>
      <button class="tick ${a?'on':''}" style="--c:var(--me)" data-l="${pre}|${id}" aria-label="${label}: ${a?'done, tap to undo':'tap when done'}">${a?'💗':''}</button>
      <span class="tick ro ${b?'on':''}" style="--c:var(--you)" aria-label="${pid?esc(nameOf(pid)):'Partner'}: ${b?'done':'not yet'}">${b?'💗':''}</span>${st}</div>`;
  }).join('');
}
function theadRow(pid){
  return `<div class="trow thead"><span></span><span>${esc(nameOf(me.uid))}</span><span>${pid?esc(nameOf(pid)):'Partner'}</span><span></span></div>`;
}
function statsCard(uid,color,pre,list,extra){
  const total=list.length*7;
  const week=lastDays(7).reduce((a,x)=>a+cnt(pre,list,uid,x),0);
  const strip=lastDays(7).map(x=>{ const c=cnt(pre,list,uid,x);
    return `<i title="${x}: ${c}/${list.length}" style="${c?`background:${color};opacity:${(0.25+0.75*c/list.length).toFixed(2)};border-color:transparent`:''}"></i>`; }).join('');
  return `<div class="card person"><h3><span class="dot" style="background:${color}"></span>${esc(nameOf(uid))}${uid===me.uid?' <span class="tag">you</span>':''}</h3>
    <div class="stats"><div><span class="big" style="color:${color}">${week}/${total}</span><small>this week</small></div>
    <div><span class="big">${fullStreak(pre,list,uid)}</span><small>days with all ${list.length}</small></div>${extra||''}</div>
    <p class="muted" style="margin:0;font-size:14px">Last 7 days</p>
    <div class="heat" style="grid-template-columns:repeat(7,1fr)">${strip}</div></div>`;
}
function bindTicks(el){ el.querySelectorAll('[data-l]').forEach(b=>b.onclick=()=>{ const [pre,id]=b.dataset.l.split('|'); toggleLog(pre,id); }); }
const waitingCard='<div class="card muted">Your partner’s stats will show here once they join.</div>';

function renderPray(pid){
  const host=$('prlog'); if(!host) return;
  const taha=uid=>`<div><span class="big">${lastDays(7).filter(x=>has('prayer_','tahajjud',uid,x)).length}/7</span><small>tahajjud nights</small></div>`;
  host.innerHTML=`
    <div class="card"><h3>Today’s prayers</h3>
      <p class="muted" style="margin:4px 0 8px">Tap your circle when you have prayed. 🥰 means you both prayed, 😢 means only one of you has.</p>
      ${theadRow(pid)}${togetherRows('prayer_',PRAYERS,pid,'🥰')}
      <p class="muted" style="margin:14px 0 0">Extra</p>
      ${togetherRows('prayer_',NAFL,pid,'🥰')}
    </div>
    <div class="grid2" style="margin-top:14px">${statsCard(me.uid,'var(--me)','prayer_',PRAYERS,taha(me.uid))}
      ${pid?statsCard(pid,'var(--you)','prayer_',PRAYERS,taha(pid)):waitingCard}</div>
    <button class="btn ghost" id="qopen" style="margin-top:14px;width:100%">📖 Open Quran &amp; duas</button>
    <p class="muted" style="margin-top:12px">Prayers and Quran count toward your readiness bar, and they fill your characters’ world with light, or let the darkness in when you miss them.</p>`;
  bindTicks(host);
  $('qopen').onclick=()=>setQ(true);
}
const teaStat=uid=>`<div><span class="big">${lastDays(7).reduce((a,x)=>a+cnt('tea_',TEA,uid,x),0)}/14</span><small>teas this week</small></div>`;
const WATER_N=12, WATER_OK=8;
const waterCount=(uid,d)=>{ let n=0; for(let i=1;i<=WATER_N;i++) if(has('water_',String(i),uid,d)) n++; return n; };
async function setWater(n){
  n=Math.max(0,Math.min(WATER_N,n)); const d=todayStr(), cur=waterCount(me.uid,d);
  if(n===cur) return;
  const ops=[];
  for(let i=1;i<=WATER_N;i++){
    const key=lk('water_',String(i),me.uid,d), ref=doc(db,'couples',profile.coupleId,'logs',key), want=i<=n;
    if(want&&!logs.has(key)) ops.push(setDoc(ref,{habitId:'water_'+i,uid:me.uid,date:d}));
    if(!want&&logs.has(key)) ops.push(deleteDoc(ref));
  }
  await Promise.all(ops);
  if(n>=WATER_N&&cur<WATER_N) toast('All 12 glasses! The kitten is so proud 💧🐱');
}
function waterCardHTML(pid){
  const d=todayStr(), a=waterCount(me.uid,d), b=pid?waterCount(pid,d):0;
  const gl=n=>Array.from({length:WATER_N},(_,i)=>`<span style="font-size:20px;${i<n?'':'opacity:.2;filter:grayscale(1)'}">💧</span>`).join('');
  const face=!pid?'':((a>=WATER_OK&&b>=WATER_OK)?'😊':((a>=WATER_OK||b>=WATER_OK)?'😢':''));
  return `<div class="card"><div class="row" style="justify-content:space-between"><h3>Water today</h3><span class="st">${face}</span></div>
    <p class="muted" style="margin:4px 0 8px">Aim for ${WATER_N} glasses. ${WATER_OK} or more keeps the kitten happy. 😊 means you both got there, 😢 means only one of you did.</p>
    <div style="margin-top:6px"><b style="color:var(--me)">${esc(nameOf(me.uid))}</b> <span class="muted">${a}/${WATER_N}</span><div>${gl(a)}</div>
      <div class="row" style="margin-top:6px"><button class="btn ghost small" data-wat="-1" aria-label="Remove a glass">− glass</button><button class="btn small" data-wat="1">+ glass 💧</button></div></div>
    ${pid?`<div style="margin-top:12px"><b style="color:var(--you)">${esc(nameOf(pid))}</b> <span class="muted">${b}/${WATER_N}</span><div>${gl(b)}</div></div>`:''}</div>`;
}
function renderMeals(pid){
  $('v-meals').innerHTML=`
    ${waterCardHTML(pid)}
    <div class="card" style="margin-top:14px"><h3>Today’s meals</h3>
      <p class="muted" style="margin:4px 0 8px">Tap your circle when you have eaten. 😊 means you both ate, 😢 means only one of you has.</p>
      ${theadRow(pid)}${togetherRows('meal_',MEALS,pid,'😊')}
      <p class="muted" style="margin:14px 0 0">Tea</p>
      ${togetherRows('tea_',TEA,pid,'😊')}
    </div>
    <div class="grid2" style="margin-top:14px">${statsCard(me.uid,'var(--me)','meal_',MEALS,teaStat(me.uid))}
      ${pid?statsCard(pid,'var(--you)','meal_',MEALS,teaStat(pid)):waitingCard}</div>`;
  bindTicks($('v-meals'));
  $('v-meals').querySelectorAll('[data-wat]').forEach(b=>b.onclick=()=>setWater(waterCount(me.uid,todayStr())+Number(b.dataset.wat)));
}

/* ---------- sleep ---------- */
const SLEEP_TARGET=7;
const sleepDoc=(uid,d)=>fun.find(f=>f.id===`sleep_${d}_${uid}`);
function sleepHours(bed,wake){
  const [bh,bm]=bed.split(':').map(Number),[wh,wm]=wake.split(':').map(Number);
  let b=bh*60+bm, w=wh*60+wm; if(w<=b) w+=1440;
  return Math.round((w-b)/6)/10;
}
async function saveSleep(bed,wake){
  if(!bed||!wake){ toast('Pick both times first'); return; }
  const d=todayStr();
  await setDoc(doc(cref(),'fun',`sleep_${d}_${me.uid}`),{kind:'sleep',date:d,uid:me.uid,bed,wake,hours:sleepHours(bed,wake)});
  toast('Saved');
}
async function clearSleep(){ await deleteDoc(doc(cref(),'fun',`sleep_${todayStr()}_${me.uid}`)); }
const bedMin=x=>{ const [h,m]=x.bed.split(':').map(Number); let t=h*60+m; if(t<12*60) t+=1440; return t; };
function sleepAvg(uid,ds){ const v=ds.map(d=>sleepDoc(uid,d)).filter(Boolean); return v.length? v.reduce((a,x)=>a+x.hours,0)/v.length : null; }
function sleepCard(uid,color){
  const wk=lastDays(7), docs=wk.map(d=>sleepDoc(uid,d)).filter(Boolean);
  const a=sleepAvg(uid,wk), b=sleepAvg(uid,lastDays(7,7));
  let steady='–';
  if(docs.length>=3){ const ms=docs.map(bedMin), mean=ms.reduce((x,y)=>x+y,0)/ms.length;
    const dev=ms.reduce((x,y)=>x+Math.abs(y-mean),0)/ms.length; steady = dev<=30?'very steady':(dev<=60?'fairly steady':'varies a lot'); }
  let delta='<span class="delta flat">New</span>';
  if(a!==null&&b!==null){ const d=Math.round((a-b)*10)/10; delta = d>0?`<span class="delta up">▲ ${d}h vs last week</span>`:(d<0?`<span class="delta down">▼ ${-d}h vs last week</span>`:'<span class="delta flat">Same as last week</span>'); }
  const bars=wk.map(d=>{ const x=sleepDoc(uid,d); const h=x?Math.max(4,Math.round(Math.min(10,x.hours)/10*100)):0;
    return `<i title="${d}: ${x?x.hours+'h':'no log'}" style="height:${h}%;background:${color};${x?'':'opacity:.15'}"></i>`; }).join('');
  return `<div class="card person"><h3><span class="dot" style="background:${color}"></span>${esc(nameOf(uid))}${uid===me.uid?' <span class="tag">you</span>':''}</h3>
    <div class="stats"><div><span class="big" style="color:${color}">${a===null?'–':a.toFixed(1)+'h'}</span><small>average this week</small></div>
      <div><span class="big">${docs.length}/7</span><small>nights logged</small></div></div>
    ${delta}
    <p class="muted" style="margin:12px 0 0">Bedtime: <b>${steady}</b></p>
    <div class="sbars" aria-label="Hours slept, last 7 days">${bars}</div></div>`;
}
function renderSleep(pid){
  const d=todayStr(), mine=sleepDoc(me.uid,d), theirs=pid?sleepDoc(pid,d):null;
  const last=[...fun].filter(f=>f.kind==='sleep'&&f.uid===me.uid).sort((x,y)=>y.date.localeCompare(x.date))[0];
  const bed=(mine||last||{}).bed||'23:00', wake=(mine||last||{}).wake||'06:00';
  const ok=x=>x&&x.hours>=SLEEP_TARGET;
  let face='<span class="st muted">○</span>';
  if(pid){ if(ok(mine)&&ok(theirs)) face='<span class="st">😊</span>'; else if(ok(mine)||ok(theirs)) face='<span class="st">😢</span>'; }
  $('v-sleep').innerHTML=`
    <div class="card"><h3>Last night’s sleep</h3>
      <p class="muted" style="margin:4px 0 0">Log it in the morning. ${SLEEP_TARGET} hours or more counts as a full night. 😊 means you both got enough, 😢 means only one of you did.</p>
      <div class="row" style="margin-top:12px">
        <label>Went to bed <input type="time" id="sb" value="${bed}" style="width:140px"></label>
        <label>Woke up <input type="time" id="sw" value="${wake}" style="width:140px"></label>
        <button class="btn" id="ss">Save</button>${mine?'<button class="btn ghost" id="sc">Remove</button>':''}
      </div>
      <div class="trow" style="margin-top:14px;grid-template-columns:1fr 90px 90px 44px"><span class="muted">Today</span>
        <span style="text-align:center;color:var(--me)"><b>${mine?mine.hours+'h':'–'}</b></span>
        <span style="text-align:center;color:var(--you)"><b>${theirs?theirs.hours+'h':'–'}</b></span>${face}</div>
      <div class="trow thead" style="grid-template-columns:1fr 90px 90px 44px;border-top:0"><span></span><span>${esc(nameOf(me.uid))}</span><span>${pid?esc(nameOf(pid)):'Partner'}</span><span></span></div>
    </div>
    <div class="grid2" style="margin-top:14px">${sleepCard(me.uid,'var(--me)')}${pid?sleepCard(pid,'var(--you)'):waitingCard}</div>`;
  $('ss').onclick=()=>saveSleep($('sb').value,$('sw').value);
  if($('sc')) $('sc').onclick=clearSleep;
}

/* ---------- when we meet wishlist ---------- */
const WISHES=['Pray side by side','Eat biryani together','Go for a long walk','Cook a meal together','Take a photo together','Watch the sunset together'];
async function addWish(t){ if(!t.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'wish',title:t.trim(),by:me.uid,done:false,doneOn:null,at:Date.now()});
  notifyPartner(`${pn()} added to When we meet 💞`,'Open Road to Ready to see'); }
async function toggleWish(f){ await updateDoc(doc(cref(),'fun',f.id), f.done?{done:false,doneOn:null}:{done:true,doneOn:todayStr()}); }
async function deleteWish(id){ if(confirm('Delete this one?')) await deleteDoc(doc(cref(),'fun',id)); }
function wishCard(){
  const w=fun.filter(f=>f.kind==='wish');
  const row=f=>`<div class="item ${f.done?'done':''}" style="--c:var(--me);cursor:default">
      <button class="box" style="background:${f.done?'var(--bg)':'transparent'};border-color:${f.done?'var(--me)':'var(--line)'};font-size:16px;cursor:pointer" data-w="${f.id}" aria-label="Mark ${f.done?'not done':'done'}">${f.done?'💗':''}</button>
      <span class="t" style="flex:1">${esc(f.title)}${f.done&&f.doneOn?` <span class="tag">${esc(f.doneOn)}</span>`:''}</span>
      <button class="btn ghost small" data-wx="${f.id}">Delete</button></div>`;
  const starters=w.length===0?`<p class="muted" style="margin:10px 0 0">Tap to add a starter:</p><div class="chips">`+
    WISHES.map((t,i)=>`<button class="chip" data-ws="${i}">${esc(t)}</button>`).join('')+`</div>`:'';
  return `<div class="card" style="margin-top:14px"><h3>When we meet</h3>
    <p class="muted" style="margin:4px 0 0">Things we want to do together once we’re in the same place. Tap the circle on the day you do it.</p>
    <div class="row" style="margin-top:10px"><input id="wi" style="flex:1;min-width:200px" placeholder="Add something"><button class="btn" id="wa">Add</button></div>
    ${starters}
    <div style="margin-top:8px">${w.filter(f=>!f.done).map(row).join('')}</div>
    ${w.some(f=>f.done)?`<p class="muted" style="margin:16px 0 0">Done together: <b>${w.filter(f=>f.done).length}</b></p><div>${w.filter(f=>f.done).map(row).join('')}</div>`:''}</div>`;
}
function bindWishes(){
  const el=$('v-fun'); if(!$('wa')) return;
  $('wa').onclick=()=>addWish($('wi').value);
  $('wi').onkeydown=e=>{ if(e.key==='Enter') $('wa').click(); };
  el.querySelectorAll('[data-ws]').forEach(b=>b.onclick=()=>addWish(WISHES[b.dataset.ws]));
  el.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>toggleWish(fun.find(f=>f.id===b.dataset.w)));
  el.querySelectorAll('[data-wx]').forEach(b=>b.onclick=()=>deleteWish(b.dataset.wx));
}

/* ---------- problems and solutions ---------- */
const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const solsOf=pid=>fun.filter(f=>f.kind==='solution'&&f.problemId===pid).sort((a,b)=>a.at-b.at);
const trialDoc=(sid,uid,d)=>fun.find(f=>f.id===`trial_${sid}_${uid}_${d}`);
const RESULT={worked:'💗 It worked',partly:'🙂 Partly worked',failed:'😢 It didn’t work'};
async function addProblem(title,details){
  if(!title.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'problem',title:title.trim(),details:details.trim(),by:me.uid,status:'open',at:Date.now()});
  notifyPartner(`${pn()} added a problem`,'Open the Problems tab to help 🤍');
  toast('Added');
}
async function addSolution(problemId,text){
  if(!text.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'solution',problemId,text:text.trim(),by:me.uid,at:Date.now(),state:'idea'});
  notifyPartner(`${pn()} suggested a solution`,'Open the Problems tab 🤍');
}
async function acceptSolution(s,days){
  await updateDoc(doc(cref(),'fun',s.id),{state:'trying',startedOn:todayStr(),days:Number(days)});
  await updateDoc(doc(cref(),'fun',s.problemId),{status:'trying'});
  notifyPartner(`${pn()} accepted a solution`,'The trial has started 💞');
  toast('Accepted. The trial has started 💞');
}
async function toggleTrial(s){
  const d=todayStr(), ref=doc(cref(),'fun',`trial_${s.id}_${me.uid}_${d}`);
  if(trialDoc(s.id,me.uid,d)) await deleteDoc(ref);
  else await setDoc(ref,{kind:'trial',solutionId:s.id,uid:me.uid,date:d});
}
async function finishTrial(s,result,note){
  await updateDoc(doc(cref(),'fun',s.id),{state:result,outcomeNote:note.trim(),outcomeOn:todayStr()});
  await updateDoc(doc(cref(),'fun',s.problemId),{status:result==='worked'?'solved':'open'});
  notifyPartner(`${pn()} saved a trial result`,'Open the Problems tab 🤍');
  toast('Saved');
}
async function removeSolution(s){
  if(!confirm('Delete this solution?')) return;
  for(const t of fun.filter(f=>f.kind==='trial'&&f.solutionId===s.id)) await deleteDoc(doc(cref(),'fun',t.id));
  await deleteDoc(doc(cref(),'fun',s.id));
  if(s.state==='trying') await updateDoc(doc(cref(),'fun',s.problemId),{status:'open'});
}
async function removeProblem(p){
  if(!confirm('Delete this problem and everything saved under it?')) return;
  for(const s of solsOf(p.id)){
    for(const t of fun.filter(f=>f.kind==='trial'&&f.solutionId===s.id)) await deleteDoc(doc(cref(),'fun',t.id));
    await deleteDoc(doc(cref(),'fun',s.id));
  }
  await deleteDoc(doc(cref(),'fun',p.id));
}
const setStatus=(p,status)=>updateDoc(doc(cref(),'fun',p.id),{status});

function solutionHTML(s,pid){
  const d=todayStr(), col=s.by===me.uid?'var(--me)':'var(--you)';
  const head=`<div class="sol" style="--c:${col}"><b>${esc(s.text)}</b> <small class="muted">· ${esc(nameOf(s.by))}</small>`;
  if(s.state==='idea'){
    return `${head}<div class="row" style="margin-top:8px">
      <select data-days style="width:auto"><option value="7">Try for 7 days</option><option value="14">Try for 14 days</option><option value="30">Try for 30 days</option></select>
      <button class="btn small" data-acc="${s.id}">Accept and try it</button>
      <button class="btn ghost small" data-sx="${s.id}">Delete</button></div></div>`;
  }
  const ct=uid=>fun.filter(f=>f.kind==='trial'&&f.solutionId===s.id&&f.uid===uid).length;
  if(s.state==='trying'){
    const passed=dd(s.startedOn,d)+1, day=Math.min(s.days,passed), over=passed>=s.days;
    const a=!!trialDoc(s.id,me.uid,d), b=pid?!!trialDoc(s.id,pid,d):false;
    let st='<span class="st muted">○</span>';
    if(pid){ if(a&&b) st='<span class="st">🥰</span>'; else if(a||b) st='<span class="st">😢</span>'; } else if(a) st='<span class="st">🥰</span>';
    return `${head} <span class="tag">trying</span>
      <div class="trial"><b>Day ${day} of ${s.days}</b>${over?' <span class="tag">time’s up, write how it went</span>':''}
        ${theadRow(pid)}
        <div class="trow"><span>Did it today</span>
          <button class="tick ${a?'on':''}" style="--c:var(--me)" data-tr="${s.id}" aria-label="${a?'done, tap to undo':'tap when done'}">${a?'💗':''}</button>
          <span class="tick ro ${b?'on':''}" style="--c:var(--you)">${b?'💗':''}</span>${st}</div>
        <p class="muted" style="margin:6px 0 10px;font-size:14px">Days done: ${esc(nameOf(me.uid))} ${ct(me.uid)}${pid?`, ${esc(nameOf(pid))} ${ct(pid)}`:''}</p>
        <div style="display:grid;gap:8px" data-fin-box>
          <select data-res><option value="worked">${RESULT.worked}</option><option value="partly">${RESULT.partly}</option><option value="failed">${RESULT.failed}</option></select>
          <textarea data-note placeholder="How did it go? What did you notice?"></textarea>
          <div class="row"><button class="btn small" data-fin="${s.id}">Save result</button><button class="btn ghost small" data-sx="${s.id}">Delete</button></div>
        </div></div></div>`;
  }
  return `${head} <span class="tag">${RESULT[s.state]||esc(s.state)}</span>
    <p class="muted" style="margin:6px 0 0;font-size:14px">Tried ${s.startedOn} for ${s.days} days · days done: ${esc(nameOf(me.uid))} ${ct(me.uid)}${pid?`, ${esc(nameOf(pid))} ${ct(pid)}`:''}</p>
    ${s.outcomeNote?`<p style="margin:6px 0 0">${esc(s.outcomeNote)}</p>`:''}
    <div style="margin-top:8px"><button class="btn ghost small" data-sx="${s.id}">Delete</button></div></div>`;
}
function problemHTML(p,pid){
  const sols=solsOf(p.id);
  const tagText={open:'Open',trying:'Trying a solution',solved:'Solved 💗'}[p.status]||'Open';
  return `<div class="card"><div class="row" style="justify-content:space-between;align-items:flex-start">
      <div><h3>${esc(p.title)}</h3><small class="muted">raised by ${esc(nameOf(p.by))}</small></div><span class="tag">${tagText}</span></div>
    ${p.details?`<p style="margin:8px 0 0;white-space:pre-wrap">${esc(p.details)}</p>`:''}
    <div style="margin-top:10px">${sols.map(s=>solutionHTML(s,pid)).join('')||'<p class="muted" style="margin:0">No solutions yet. Both of you can add ideas.</p>'}</div>
    <div class="row" style="margin-top:10px"><input class="solin" data-p="${p.id}" style="flex:1;min-width:200px" placeholder="Suggest a solution">
      <button class="btn small" data-addsol="${p.id}">Add</button></div>
    <div class="row" style="margin-top:10px">
      ${p.status==='solved'?`<button class="btn ghost small" data-pstat="${p.id}|open">Reopen</button>`:`<button class="btn ghost small" data-pstat="${p.id}|solved">Mark as solved</button>`}
      <button class="btn ghost small" data-pdel="${p.id}">Delete problem</button></div></div>`;
}
function renderProblems(pid){
  const ps=fun.filter(f=>f.kind==='problem');
  const order={trying:0,open:1,solved:2};
  ps.sort((a,b)=>(order[a.status]??1)-(order[b.status]??1)||b.at-a.at);
  $('v-problems').innerHTML=`
    <div class="card"><h3>Add a problem</h3>
      <p class="muted" style="margin:4px 0 8px">Something bothering you, or something you are both facing. Then you both suggest solutions, accept one, try it for a while, and write down if it worked.</p>
      <div style="display:grid;gap:8px"><input id="pt" placeholder="What is the problem?">
        <textarea id="pd" placeholder="Tell more if you want (optional)"></textarea>
        <div><button class="btn" id="pa">Add problem</button></div></div></div>
    <div style="display:grid;gap:14px;margin-top:14px">${ps.map(p=>problemHTML(p,pid)).join('')||'<div class="card muted">No problems yet. That’s fine too 🤍</div>'}</div>`;
  const el=$('v-problems');
  $('pa').onclick=async()=>{ await addProblem($('pt').value,$('pd').value); };
  el.querySelectorAll('[data-addsol]').forEach(b=>b.onclick=async()=>{
    const inp=el.querySelector(`.solin[data-p="${b.dataset.addsol}"]`); await addSolution(b.dataset.addsol,inp.value); });
  el.querySelectorAll('.solin').forEach(i=>i.onkeydown=e=>{ if(e.key==='Enter') el.querySelector(`[data-addsol="${i.dataset.p}"]`).click(); });
  el.querySelectorAll('[data-acc]').forEach(b=>b.onclick=()=>{
    const s=fun.find(f=>f.id===b.dataset.acc); acceptSolution(s,b.parentElement.querySelector('[data-days]').value); });
  el.querySelectorAll('[data-tr]').forEach(b=>b.onclick=()=>toggleTrial(fun.find(f=>f.id===b.dataset.tr)));
  el.querySelectorAll('[data-fin]').forEach(b=>b.onclick=()=>{
    const box=b.closest('[data-fin-box]'); finishTrial(fun.find(f=>f.id===b.dataset.fin),box.querySelector('[data-res]').value,box.querySelector('[data-note]').value); });
  el.querySelectorAll('[data-sx]').forEach(b=>b.onclick=()=>removeSolution(fun.find(f=>f.id===b.dataset.sx)));
  el.querySelectorAll('[data-pstat]').forEach(b=>b.onclick=()=>{ const [id,st]=b.dataset.pstat.split('|'); setStatus(fun.find(f=>f.id===id),st); });
  el.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>removeProblem(fun.find(f=>f.id===b.dataset.pdel)));
}

/* ---------- love jar ---------- */
const JAR_WHEN=[['any','Anytime'],['miss','Open when you miss me'],['sad','Open when you’re sad'],['happy','Open when you’re happy']];
const whenLabel=k=>(JAR_WHEN.find(x=>x[0]===k)||JAR_WHEN[0])[1];
let justOpened=null;
async function writeNote(text,when,to){
  if(!text.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'jarnote',text:text.trim(),when,by:me.uid,to,at:Date.now(),opened:false});
  notifyPartner(`${pn()} left you a note 🫙`,'Pull it from the love jar');
  toast('Into the jar it goes 🫙');
}
async function pullNote(when){
  const pool=fun.filter(f=>f.kind==='jarnote'&&f.to===me.uid&&!f.opened&&(when==='any'||f.when===when||f.when==='any'));
  if(!pool.length){ toast('No notes waiting for that yet 🥺'); return; }
  const n=pool[Math.floor(Math.random()*pool.length)];
  justOpened=n.id;
  await updateDoc(doc(cref(),'fun',n.id),{opened:true,openedOn:todayStr()});
}
function renderJar(pid){
  if(!pid){ $('v-jar').innerHTML='<div class="card muted">The love jar opens once your partner has joined.</div>'; return; }
  const waiting=fun.filter(f=>f.kind==='jarnote'&&f.to===me.uid&&!f.opened).length;
  const written=fun.filter(f=>f.kind==='jarnote'&&f.by===me.uid).length;
  const opened=fun.filter(f=>f.kind==='jarnote'&&f.to===me.uid&&f.opened).sort((a,b)=>(b.openedOn||'').localeCompare(a.openedOn||'')||b.at-a.at);
  const just=justOpened&&opened.find(f=>f.id===justOpened);
  $('v-jar').innerHTML=`
    <div class="card" style="text-align:center">
      <div style="font-size:64px;line-height:1.1">🫙</div>
      <h3 style="margin-top:6px">${waiting?`${waiting} note${waiting>1?'s':''} waiting for you`:'No new notes right now'}</h3>
      <p class="muted" style="margin:4px 0 12px">You’ve written ${written} for ${esc(nickOf(pid))}</p>
      <div class="row" style="justify-content:center">
        <select id="jw" style="width:auto">${JAR_WHEN.map(([k,l])=>`<option value="${k}">${k==='any'?'Any note':l}</option>`).join('')}</select>
        <button class="btn" id="jp">Pull a note 💌</button>
      </div>
      ${just?`<div class="bubble in" style="--c:var(--you);margin:14px auto 0;text-align:left"><small>${esc(whenLabel(just.when))} · from ${esc(nickOf(just.by))}</small><p>${esc(just.text)}</p></div>`:''}
    </div>
    <div class="card" style="margin-top:14px"><h3>Write a note for ${esc(nickOf(pid))}</h3>
      <p class="muted" style="margin:4px 0 8px">Small, sweet, or silly. ${esc(nickOf(pid))} can only read it when they pull it from the jar.</p>
      <div style="display:grid;gap:8px"><textarea id="jt" placeholder="Write something for later…"></textarea>
        <select id="jl">${JAR_WHEN.map(([k,l])=>`<option value="${k}">${l}</option>`).join('')}</select>
        <div><button class="btn" id="jn">Put it in the jar 🫙</button></div></div></div>
    <div class="card" style="margin-top:14px"><h3>Notes you’ve opened</h3>
      ${opened.map(f=>`<div class="find" style="border-left:4px solid var(--you)"><small class="muted">${esc(whenLabel(f.when))} · from ${esc(nickOf(f.by))}${f.openedOn?` · opened ${esc(f.openedOn)}`:''}</small><br>${esc(f.text)}</div>`).join('')||'<p class="muted">Nothing opened yet.</p>'}
    </div>`;
  $('jp').onclick=()=>pullNote($('jw').value);
  $('jn').onclick=async()=>{ await writeNote($('jt').value,$('jl').value,pid); $('jt').value=''; };
}

/* ---------- dashboard extras: status, dua, prayer and Quran charts ---------- */
const STATUS_PRESETS=[['📖','Reading'],['✏️','Studying'],['🏫','In class'],['👯','Out with friends'],['🍽️','Eating'],['🕌','Praying'],['🚶','Out and about'],['😴','Sleeping']];
const statusOf=uid=>fun.find(f=>f.id===`status_${uid}`);
function ago(t){
  const m=Math.round((Date.now()-t)/60000);
  if(m<1) return 'just now'; if(m<60) return m+' min ago';
  const h=Math.round(m/60); if(h<24) return h+' h ago';
  return Math.round(h/24)+' d ago';
}
async function setNow(emoji,text){
  if(!text.trim()) return;
  { const cur=statusOf(me.uid); if(cur&&cur.src){ toast('You’re in a Workroom or prayer session. End it first.'); return; } }
  await setDoc(doc(cref(),'fun',`status_${me.uid}`),{kind:'status',uid:me.uid,emoji:(emoji||'').trim()||'💭',text:text.trim(),at:Date.now()});
  { const n=pn(), L=[`${n} just updated their status 💗`,`${n} changed their status 🥰`,`New status from ${n} 💞`,`${n} is up to something new 👀`];
    notifyPartner(L[Math.floor(Math.random()*L.length)],'Open Road to Ready to see'); }
  toast('Status updated');
}
async function clearNow(){ { const cur=statusOf(me.uid); if(cur&&cur.src){ toast('End your Workroom or prayer session first.'); return; } } await deleteDoc(doc(cref(),'fun',`status_${me.uid}`)); }
async function saveQuick(emoji,text){
  if(!text.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'quick',uid:me.uid,emoji:(emoji||'').trim()||'💭',text:text.trim()});
  toast('Saved as a quick option');
}
function statusHTML(pid){
  const mine=statusOf(me.uid), theirs=pid?statusOf(pid):null;
  const quick=fun.filter(f=>f.kind==='quick'&&f.uid===me.uid);
  const bub=(u,x,cls,col)=>`<div class="bubble ${cls}" style="--c:${col}"><small>${esc(nickOf(u))} is</small>
    <p>${x?`${esc(x.emoji)} ${esc(x.text)} <small>· ${ago(x.at)}</small>`:'<span class="muted">not sharing right now</span>'}</p></div>`;
  return `<div class="card" style="margin-bottom:14px"><h3>What we’re up to</h3>
    ${pid?bub(pid,theirs,'in','var(--you)'):''}
    ${bub(me.uid,mine,'out','var(--me)')}
    <p class="muted" style="margin:14px 0 0;font-size:14px">Tell ${pid?esc(nickOf(pid)):'your partner'} what you’re doing now:</p>
    <div class="chips">${STATUS_PRESETS.map(([e,t])=>`<button class="chip" data-ne="${e}" data-nt="${esc(t)}">${e} ${esc(t)}</button>`).join('')}
      ${quick.map(q=>`<span class="quick"><button class="chip" data-ne="${esc(q.emoji)}" data-nt="${esc(q.text)}">${esc(q.emoji)} ${esc(q.text)}</button><button class="x" data-qx="${q.id}" aria-label="Remove quick option">×</button></span>`).join('')}</div>
    <div class="row" style="margin-top:10px"><input id="ne" style="width:64px;text-align:center" placeholder="😊" aria-label="Emoji" maxlength="8">
      <input id="nw" style="flex:1;min-width:160px" placeholder="Something else, e.g. making biryani">
      <button class="btn small" id="nset">Set</button><button class="btn ghost small" id="nsave">Save as quick option</button>${mine?'<button class="btn ghost small" id="nclr">Clear</button>':''}</div></div>`;
}
function bindStatus(){
  const el=$('v-dash'); if(!$('nset')) return;
  el.querySelectorAll('[data-ne]').forEach(b=>b.onclick=()=>setNow(b.dataset.ne,b.dataset.nt));
  el.querySelectorAll('[data-qx]').forEach(b=>b.onclick=()=>deleteDoc(doc(cref(),'fun',b.dataset.qx)));
  $('nset').onclick=async()=>{ await setNow($('ne').value,$('nw').value); };
  $('nw').onkeydown=e=>{ if(e.key==='Enter') $('nset').click(); };
  $('nsave').onclick=async()=>{ await saveQuick($('ne').value,$('nw').value); };
  if($('nclr')) $('nclr').onclick=clearNow;
}
function duaBubbleHTML(){
  const duas=fun.filter(f=>f.kind==='dua').sort((a,b)=>a.id.localeCompare(b.id));
  if(!duas.length) return `<div class="bubble in" style="--c:var(--gold);max-width:none;margin:0 0 14px"><small>🤲 Dua</small><p>No duas saved yet. Add one in the Quran &amp; duas tab 🤍</p></div>`;
  const n=Math.floor(Date.now()/864e5), d=duas[(n+duaIdx)%duas.length];
  return `<div class="bubble in" style="--c:var(--gold);max-width:none;margin:0 0 14px"><small>🤲 Dua · ${esc(d.title)} · added by ${esc(nameOf(d.by))}</small>
    <p>${esc(d.text||d.title)}</p>${duas.length>1?'<div style="margin-top:8px"><button class="btn ghost small" id="dnext">Next dua</button></div>':''}</div>`;
}
function bindDua(){ if($('dnext')) $('dnext').onclick=()=>{ duaIdx++; render(); }; }
function spiritChartHTML(pid){
  const ds=lastDays(14), uids=pid?[me.uid,pid]:[me.uid], cols=['var(--me)','var(--you)'];
  const lab=ds.map(d=>`<span>${d.slice(8)}</span>`).join('');
  const maxAyahs=Math.max(10,...ds.flatMap(d=>uids.map(u=>(quranDoc(u,d)||{}).ayahs||0)));
  const pray=ds.map(d=>`<div class="wk">${uids.map((u,i)=>{ const c=cnt('prayer_',PRAYERS,u,d);
    return `<i title="${esc(nameOf(u))}, ${d}: ${c}/5" style="height:${c?c*20:3}%;background:${cols[i]};${c?'':'opacity:.25'}"></i>`; }).join('')}</div>`).join('');
  const qur=ds.map(d=>`<div class="wk">${uids.map((u,i)=>{ const q=quranDoc(u,d);
    const h=q?(q.ayahs?Math.max(12,Math.round(q.ayahs/maxAyahs*100)):35):3;
    return `<i title="${esc(nameOf(u))}, ${d}: ${q?(q.ayahs?q.ayahs+' ayahs':(q.pages?q.pages+' pages':'read')):'not read'}" style="height:${h}%;background:${cols[i]};${q?'':'opacity:.25'}"></i>`; }).join('')}</div>`).join('');
  const sum=u=>`${esc(nameOf(u))}: ${lastDays(7).reduce((a,x)=>a+cnt('prayer_',PRAYERS,u,x),0)}/35 prayers, ${lastDays(7).filter(x=>quranDoc(u,x)).length} days of Quran this week`;
  return `<div class="grid2" style="margin-top:14px">
    <div class="card"><h3>Prayers</h3><p class="muted" style="margin:4px 0 0;font-size:14px">Last 14 days · taller means more of the five</p>
      <div class="weeks">${pray}</div><div class="wl">${lab}</div></div>
    <div class="card"><h3>Quran</h3><p class="muted" style="margin:4px 0 0;font-size:14px">Last 14 days · taller means more ayahs</p>
      <div class="weeks">${qur}</div><div class="wl">${lab}</div></div></div>
    <p class="muted" style="margin:8px 2px 0;font-size:14px">${uids.map(sum).join(' · ')}</p>`;
}

/* ---------- notifications ---------- */
let alertKeys=null, funLoaded=false;
const lastSeenTs=()=>{ try{ return Number(localStorage.getItem('rr_seen_'+me.uid)||0); }catch(e){ return 0; } };
const markSeen=()=>{ try{ localStorage.setItem('rr_seen_'+me.uid,String(Date.now())); }catch(e){} };
function feedItems(){
  const pid=partnerId(); if(!pid||!couple) return [];
  const who=nickOf(pid), out=[];
  for(const f of fun){
    if(!f.at) continue;
    let t=null;
    if(f.kind==='nudge'&&f.to===me.uid) t=[`${who} sent you a nudge 💌`,f.text];
    else if(f.kind==='mood'&&f.uid===pid) t=[`${who} is feeling ${f.w} ${f.e}${Array.isArray(f.more)&&f.more.length?` +${f.more.length}`:''}`,''];
    else if(f.kind==='status'&&f.uid===pid) t=[`${who} is now ${f.emoji}`,f.text];
    else if(f.kind==='problem'&&f.by===pid) t=[`${who} added a problem`,f.title];
    else if(f.kind==='solution'&&f.by===pid) t=[`${who} suggested a solution`,f.text];
    else if(f.kind==='jarnote'&&f.to===me.uid) t=[`${who} left you a note 🫙`,'Pull it from the love jar'];
    else if(f.kind==='dua'&&f.by===pid) t=[`${who} added a dua 🤲`,f.title];
    else if(f.kind==='wish'&&f.by===pid) t=[`${who} added to When we meet`,f.title];
    else if(f.kind==='colour'&&f.uid===pid) t=[`${who} found something ${String(f.colour||'').toLowerCase()} 🎨`,f.note||'Sent a photo 📷'];
    if(t) out.push({key:f.id+'@'+f.at,at:f.at,title:t[0],text:t[1]});
  }
  return out.sort((a,b)=>b.at-a.at).slice(0,30);
}

/* service worker: needed so notifications work on Android Chrome */
let swReg=null;
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').then(r=>swReg=r).catch(()=>{});

function showAlert(it){
  if(document.hidden && 'Notification' in window && Notification.permission==='granted'){
    const o={body:it.text||'',icon:'icon-192.png',badge:'icon-192.png',tag:it.key};
    if(swReg) swReg.showNotification(it.title,o).catch(()=>{});
    else { try{ new Notification(it.title,o); }catch(e){} }
  } else toast(it.title);
}

/* check for new items every 3 minutes, as a backup when the live listener stalls */
async function pollNow(){
  if(!couple||!me||!profile||!profile.coupleId) return;
  try{
    const s=await getDocs(collection(cref(),'fun'));
    fun=s.docs.map(d=>({id:d.id,...d.data()}));
    try{ planLive(); }catch(e){}
    checkAlerts(); snapRender();
  }catch(e){}
}
setInterval(pollNow,3*60*1000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden) pollNow(); });

/* keep-alive: a looping near-silent sound stops Chrome from freezing the app in the background */
let keepEl=null;
function silentWavURL(){
  const n=8000,b=new ArrayBuffer(44+n*2),v=new DataView(b);
  const w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVEfmt ');v.setUint32(16,16,true);
  v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,16000,true);
  v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  for(let i=0;i<n;i++) v.setInt16(44+i*2,(i%2?1:-1),true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}));
}
let keepWanted=false;
try{ keepWanted=localStorage.getItem('rr_keep')==='1'; }catch(e){}
function startKeep(){
  if(keepEl) return Promise.resolve();
  const a=new Audio(silentWavURL()); a.loop=true; a.volume=0.01;
  a.addEventListener('pause',()=>{ if(keepEl===a && keepWanted) a.play().catch(()=>{}); });
  return a.play().then(()=>{ keepEl=a; }).catch(()=>{});
}
function toggleKeepAlive(){
  if(keepEl){
    const a=keepEl; keepEl=null; keepWanted=false;
    try{ localStorage.setItem('rr_keep','0'); }catch(e){}
    a.pause(); toast('Keep-alive off'); renderNotif(); return;
  }
  keepWanted=true;
  try{ localStorage.setItem('rr_keep','1'); }catch(e){}
  startKeep().then(()=>{ toast(keepEl?'Keep-alive on':'Tap again to allow'); renderNotif(); });
}
/* after a reload, switch it back on at the first tap */
document.addEventListener('pointerdown',()=>{
  if(keepWanted && !keepEl) startKeep().then(()=>{ if(keepEl) renderNotif(); });
},{passive:true});
document.addEventListener('visibilitychange',()=>{
  if(keepWanted && keepEl && keepEl.paused) keepEl.play().catch(()=>{});
});

function checkAlerts(){
  if(!me||!couple||!funLoaded) return;
  const items=feedItems();
  if(alertKeys===null){ alertKeys=new Set(items.map(i=>i.key)); return; }
  for(const it of items){ if(!alertKeys.has(it.key)){ alertKeys.add(it.key); showAlert(it); } }
}
function updateBell(){
  if(!couple||!me||!$('bellcount')) return;
  const seen=lastSeenTs(), n=feedItems().filter(i=>i.at>seen).length;
  $('bellcount').textContent=n?` ${n}`:'';
  document.title=(n?`(${n}) `:'')+'Our Road to Ready';
  try{ if(navigator.setAppBadge){ n?navigator.setAppBadge(n):navigator.clearAppBadge(); } }catch(e){}
}
const pn=()=>nickOf(me.uid,Math.floor(Math.random()*1000));
/* ntfy removed: partner now gets updates through the app itself */
function notifyPartner(){}
function renderNotif(){
  const pid=partnerId();
  const items=feedItems().slice(0,15);
  const canAlert='Notification' in window;
  const perm=canAlert?Notification.permission:'unsupported';
  $('notifbody').innerHTML=`
    <h3>Updates</h3>
    ${items.length?items.map(i=>`<div class="find"><b>${esc(i.title)}</b>${i.text?`<br>${esc(i.text)}`:''}<br><small class="muted">${ago(i.at)}</small></div>`).join(''):'<p class="muted">Nothing new yet.</p>'}
    <h3 style="margin-top:20px">Alerts on this device</h3>
    <p class="muted" style="margin:4px 0 8px">Pops up when something new arrives while the app is open or in the background.</p>
    ${perm==='default'?'<button class="btn small" id="nperm">Turn on alerts</button>':
      perm==='granted'?'<p style="margin:0">Alerts are on 💗</p>':
      perm==='denied'?'<p class="muted" style="margin:0">Alerts are blocked in your browser settings for this site.</p>':
      '<p class="muted" style="margin:0">This device doesn’t support alerts in the browser.</p>'}
    <h3 style="margin-top:20px">Keep running in background</h3>
    <p class="muted" style="margin:4px 0 8px">Turn this on and leave the app in the background (don’t swipe it away). It checks for updates every few minutes.</p>
    <button class="btn small" id="nkeep">${keepEl?'Turn keep-alive off':'Turn keep-alive on'}</button>
    ${pid?`<p class="muted" style="margin:12px 0 0;font-size:14px">Each of you needs to do this on your own phone.</p>`:''}`;
  if($('nperm')) $('nperm').onclick=async()=>{ try{ await Notification.requestPermission(); }catch(e){} renderNotif(); };
  if($('nkeep')) $('nkeep').onclick=toggleKeepAlive;
}
$('bell').onclick=()=>{ markSeen(); updateBell(); renderNotif(); $('notifmodal').classList.remove('hidden'); };
$('notifclose').onclick=()=>$('notifmodal').classList.add('hidden');
$('notifmodal').onclick=e=>{ if(e.target===$('notifmodal')) $('notifmodal').classList.add('hidden'); };

/* ---------- nudges ---------- */
let nudgeSeed=Math.floor(Math.random()*100), nudgeCustom=false, nudgeText='';
const MEAL_DUE={breakfast:10,lunch:15,dinner:21}, PRAYER_DUE={fajr:7,dhuhr:14,asr:17,maghrib:19.5,isha:21};
const NUDGE_MEAL=[
  "{nick} you didn’t eat {miss}… pleaseee 🥺 babyyy I’m worried",
  "{nick}!! {miss} is still waiting for you. Eat something for me, okay? 💗",
  "Hey {nick}, my heart can’t relax when I know you haven’t had {miss}. Go eat, then tell me what you had 🥹",
  "{nick}… {miss}. Now. Please. I’ll wait right here, I promise 🫶",
  "Skipping {miss} is not allowed, {nick} 😤💗 Eat first, then we talk.",
  "Baby {nick}, take care of my favourite person. Go eat {miss} 🥺"];
const NUDGE_PRAY=[
  "{nick} you haven’t prayed {miss} yet… pleaseee 🤲 babyyy I’m worried",
  "{nick}, {miss} is waiting for you. Pray, and make a dua for us too 🤍",
  "A little reminder from me, {nick}: {miss} 💗 Allah first, then everything else. Love you.",
  "{nick}… {miss}. Go now, I’ll be right here when you’re back 🥹",
  "My heart feels lighter when we both pray, {nick}. Please pray {miss} 🤲",
  "Don’t make me worry, {nick} 🥺 {miss} is still left."];
const NUDGE_BOTH=[
  "{nick}, you haven’t eaten {meal} and haven’t prayed {pray}… babyyy I’m worried 🥺 please look after yourself",
  "{nick}!! {meal} and {pray} are both still left today. Please do them for me 💗",
  "Hey {nick}, my heart is worried: no {meal} and no {pray} yet. Go, I’ll be waiting 🥹",
  "{nick}… food and prayer, both missing today 🥺 Please, my love. {meal}, then {pray}."];
const nowH=()=>{ const t=new Date(); return t.getHours()+t.getMinutes()/60; };
const joinAnd=a=>a.length<2?a.join(''):a.slice(0,-1).join(', ')+' and '+a[a.length-1];
function missedFor(uid){
  const d=todayStr(), h=nowH();
  return { meals:MEALS.filter(([id])=>h>=MEAL_DUE[id]&&!has('meal_',id,uid,d)).map(([,l])=>l.toLowerCase()),
           prayers:PRAYERS.filter(([id])=>h>=PRAYER_DUE[id]&&!has('prayer_',id,uid,d)).map(([,l])=>l) };
}
function autoNudge(pid){
  const m=missedFor(pid); const vars={nick:nickOf(pid,nudgeSeed)}; let pool;
  if(m.meals.length&&m.prayers.length){ pool=NUDGE_BOTH; vars.meal=joinAnd(m.meals); vars.pray=joinAnd(m.prayers); }
  else if(m.meals.length){ pool=NUDGE_MEAL; vars.miss=joinAnd(m.meals); }
  else if(m.prayers.length){ pool=NUDGE_PRAY; vars.miss=joinAnd(m.prayers); }
  else return null;
  return pool[nudgeSeed%pool.length].replace(/\{(\w+)\}/g,(_,k)=>vars[k]);
}
async function sendNudge(pid,text){
  if(!text.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'nudge',from:me.uid,to:pid,text:text.trim(),at:Date.now(),seen:false});
  notifyPartner(`${pn()} sent you a nudge 💌`,'Open Road to Ready to read it');
  nudgeCustom=false; nudgeText=''; nudgeSeed++;
  toast('Sent 💌');
}
function nudgeHTML(pid){
  if(!pid) return '';
  const inc=fun.filter(f=>f.kind==='nudge'&&f.to===me.uid&&!f.seen).sort((a,b)=>b.at-a.at).slice(0,3);
  const incoming=inc.map(f=>`<div class="bubble in" style="--c:var(--you)"><small>${esc(nickOf(f.from))} says</small><p>${esc(f.text)}</p>
    <div style="margin-top:8px"><button class="btn ghost small" data-seen="${f.id}">Okay, on it 💗</button></div></div>`).join('');
  const sent=fun.filter(f=>f.kind==='nudge'&&f.from===me.uid).sort((a,b)=>b.at-a.at)[0];
  const sentLine=sent?`<p class="muted" style="margin:10px 0 0;font-size:14px">Your last message: “${esc(sent.text.length>60?sent.text.slice(0,60)+'…':sent.text)}” · ${sent.seen?'seen 💗':'not seen yet'}</p>`:'';
  const auto=autoNudge(pid);
  const bubble = nudgeCustom
    ? `<div class="bubble out" style="--c:var(--me)"><textarea id="nt" placeholder="Write something sweet for ${esc(nickOf(pid))}">${esc(nudgeText)}</textarea></div>`
    : `<div class="bubble out" style="--c:var(--me)"><small>You to ${esc(nickOf(pid))}</small><p>${auto?esc(auto):`${esc(nickOf(pid))} is all caught up for now 🥰 You can still send a little message.`}</p></div>`;
  return `${inc.length?`<div class="card" style="margin-bottom:14px"><h3>From ${esc(nickOf(partnerId()))}</h3>${incoming}</div>`:''}
    <div class="card" style="margin-bottom:14px"><h3>A little nudge for ${esc(nickOf(pid))}</h3>
      ${bubble}
      <div class="row" style="margin-top:12px;justify-content:flex-end">
        ${(!nudgeCustom&&auto)?'<button class="btn ghost small" id="nn">Another one</button>':''}
        <button class="btn ghost small" id="nc">${nudgeCustom?(auto?'Use a suggested message':'Cancel'):'Write my own'}</button>
        ${(nudgeCustom||auto)?'<button class="btn small" id="ns">Send 💌</button>':''}
      </div>${sentLine}</div>`;
}
function bindNudges(){
  const pid=partnerId(); if(!pid) return;
  document.querySelectorAll('[data-seen]').forEach(b=>b.onclick=()=>updateDoc(doc(cref(),'fun',b.dataset.seen),{seen:true}));
  if($('nn')) $('nn').onclick=()=>{ nudgeSeed++; render(); };
  if($('nc')) $('nc').onclick=()=>{ nudgeCustom=!nudgeCustom; render(); if(nudgeCustom) setTimeout(()=>$('nt')&&$('nt').focus(),50); };
  if($('nt')) $('nt').oninput=e=>{ nudgeText=e.target.value; };
  if($('ns')) $('ns').onclick=()=>sendNudge(pid, nudgeCustom ? ($('nt')?$('nt').value:nudgeText) : autoNudge(pid)||'');
}

/* ---------- quran & duas ---------- */
const quranDoc=(uid,d)=>fun.find(f=>f.id===`quran_${d}_${uid}`);
const qTag=q=>q.ayahs?` <span class="tag">${q.ayahs} ayahs</span>`:(q.pages?` <span class="tag">${q.pages} pages</span>`:'');
async function saveQuran(what,ayahs){
  const d=todayStr(); if(!what.trim()) return;
  await setDoc(doc(cref(),'fun',`quran_${d}_${me.uid}`),{kind:'quran',date:d,uid:me.uid,what:what.trim(),ayahs:Math.max(0,Math.floor(Number(ayahs)||0))});
  toast('Saved');
}
async function clearQuran(){ await deleteDoc(doc(cref(),'fun',`quran_${todayStr()}_${me.uid}`)); }
function quranStreak(uid){
  const days=lastDays(60).reverse(); let n=0;
  for(let i=0;i<days.length;i++){ if(isSick(uid,days[i])) continue; if(quranDoc(uid,days[i])) n++; else if(i===0) continue; else break; }
  return n;
}
async function addDua(title,text){
  if(!title.trim()&&!text.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'dua',title:(title.trim()||'Dua'),text:text.trim(),by:me.uid,at:Date.now()});
  notifyPartner(`${pn()} added a dua 🤲`,'Open Quran & duas');
}
async function deleteDua(id){ if(confirm('Delete this dua?')) await deleteDoc(doc(cref(),'fun',id)); }

function quranCard(uid,color){
  const week=lastDays(7).filter(x=>quranDoc(uid,x)).length;
  const ayahs=lastDays(30).reduce((a,x)=>a+((quranDoc(uid,x)||{}).ayahs||0),0);
  const recent=lastDays(7).reverse().map(x=>{ const q=quranDoc(uid,x);
    return q?`<div class="find" style="border-left:4px solid ${color}"><small class="muted">${x}</small><br>${esc(q.what)}${qTag(q)}</div>`:''; }).join('');
  return `<div class="card person"><h3><span class="dot" style="background:${color}"></span>${esc(nameOf(uid))}${uid===me.uid?' <span class="tag">you</span>':''}</h3>
    <div class="stats"><div><span class="big" style="color:${color}">${week}/7</span><small>days read this week</small></div>
    <div><span class="big">${quranStreak(uid)}</span><small>day streak</small></div>
    <div><span class="big">${ayahs}</span><small>ayahs, 30 days</small></div></div>
    ${recent||'<p class="muted">Nothing logged in the last 7 days.</p>'}</div>`;
}
function renderQuran(pid){
  const d=todayStr(); const mine=quranDoc(me.uid,d), theirs=pid?quranDoc(pid,d):null;
  const bothToday = pid && mine && theirs;
  const duas=fun.filter(f=>f.kind==='dua');
  $('v-quran').innerHTML=`
    <div class="qhead"><h2>📖 Quran &amp; duas</h2><button class="btn ghost small" id="qclose">Close ✕</button></div>
    <div class="card"><h3>Quran today</h3>
      ${quranRead>=1?`<p style="margin:6px 0 0">You read for <b>${quranRead} min</b> ⏱️ What did you read?</p>`:''}<p class="muted" style="margin:4px 0 0">${bothToday?'You both read today 🤍':(mine||theirs?'One of you has read today. 😢':'Write what you read today, like “Surah Al-Kahf, ayah 1 to 10”.')}</p>
      <div class="row" style="margin-top:12px"><input id="qw" style="flex:1;min-width:200px" placeholder="What did you read?" value="${mine?esc(mine.what):''}">
        <input id="qp" type="number" min="0" style="width:110px" placeholder="Ayahs" aria-label="Ayahs read" value="${mine&&mine.ayahs?mine.ayahs:''}">
        <button class="btn" id="qs">Save</button>${mine?'<button class="btn ghost" id="qc">Remove</button>':''}</div>
      ${pid?`<div class="find" style="border-left:4px solid var(--you)"><b>${esc(nameOf(pid))}</b> ${theirs?`read: ${esc(theirs.what)}${qTag(theirs)}`:'<span class="muted">hasn’t logged yet</span>'}</div>`:''}
    </div>
    <div class="grid2" style="margin-top:14px">${quranCard(me.uid,'var(--me)')}${pid?quranCard(pid,'var(--you)'):waitingCard}</div>
    <div class="card" style="margin-top:14px"><h3>Our duas</h3>
      <p class="muted" style="margin:4px 0 0">Save duas you want to make for each other and for your future together.</p>
      <div style="display:grid;gap:8px;margin-top:10px">
        <input id="dt" placeholder="Title, e.g. For our marriage">
        <textarea id="dx" placeholder="Write the dua here"></textarea>
        <div><button class="btn" id="da">Add dua</button></div>
      </div>
      ${duas.map(f=>`<div class="dua"><b>${esc(f.title)}</b>${f.text?`<p>${esc(f.text)}</p>`:''}
        <div class="row" style="justify-content:space-between"><small class="muted">added by ${esc(nameOf(f.by))}</small>
        <button class="btn ghost small" data-dx="${f.id}">Delete</button></div></div>`).join('')||'<p class="muted" style="margin-top:10px">No duas yet. Add your first one above.</p>'}
    </div>`;
  $('qclose').onclick=()=>setQ(false);
  $('qs').onclick=()=>saveQuran($('qw').value,$('qp').value);
  if($('qc')) $('qc').onclick=clearQuran;
  $('da').onclick=async()=>{ await addDua($('dt').value,$('dx').value); };
  $('v-quran').querySelectorAll('[data-dx]').forEach(b=>b.onclick=()=>deleteDua(b.dataset.dx));
}

/* ---------- fun together ---------- */
const COLOURS=[['Red','#d62839'],['Orange','#f77f00'],['Yellow','#f2b134'],['Green','#2a9d4a'],['Blue','#2563eb'],['Purple','#7a5cff'],
  ['Pink','#e0457b'],['White','#f5f5f5'],['Black','#1a1a1a'],['Brown','#8b5a2b'],['Teal','#1f9d8f'],['Gold','#d4a017']];
const IDEAS=['Watch a movie together on a call','Cook the same recipe and compare','Send a voice note story of your day',
  'Play an online game together','Write each other a letter','Make a shared playlist','Quiz each other: 20 questions',
  'Look at the moon at the same time','Virtual walk on a video call'];
function colourForDate(ds){
  const [y,m,dd]=ds.split('-').map(Number);
  return COLOURS[Math.floor(Date.UTC(y,m-1,dd)/86400000)%COLOURS.length];
}
function colourOfDay(){ return colourForDate(todayStr()); }
const colourDoc=(uid,d)=>fun.find(f=>f.kind==='colour'&&f.uid===uid&&f.date===d);
const findsOn=d=>fun.filter(f=>f.kind==='colour'&&f.date===d).sort((x,y)=>(x.at||0)-(y.at||0));
const findsOf=(uid,d)=>findsOn(d).filter(f=>f.uid===uid);
let pendingPhoto=null, findDraft='', histDays=7;
const photoCache={}, photoLoading=new Set();
const randId=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);

function shrinkImage(file,max=800,q=0.6){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file), img=new Image();
    img.onload=()=>{
      const k=Math.min(1,max/Math.max(img.width,img.height));
      const w=Math.round(img.width*k), h=Math.round(img.height*k);
      const c=document.createElement('canvas'); c.width=w; c.height=h;
      c.getContext('2d').drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      let out=c.toDataURL('image/jpeg',q);
      if(out.length>900000) out=c.toDataURL('image/jpeg',0.4);
      res(out);
    };
    img.onerror=()=>{ URL.revokeObjectURL(url); rej(new Error('bad image')); };
    img.src=url;
  });
}
async function loadPhotos(){
  document.querySelectorAll('img[data-ph]').forEach(async img=>{
    const id=img.dataset.ph;
    if(photoCache[id]){ if(!img.getAttribute('src')) img.src=photoCache[id]; return; }
    if(photoLoading.has(id)) return;
    photoLoading.add(id);
    try{
      const snap=await getDoc(doc(cref(),'photos',id));
      if(snap.exists()){ photoCache[id]=snap.data().data;
        document.querySelectorAll('img[data-ph="'+id+'"]').forEach(i=>i.src=photoCache[id]); }
    }catch(e){}
    photoLoading.delete(id);
  });
}
async function addFind(name,note){
  note=(note||'').trim();
  if(!note && !pendingPhoto){ toast('Write what you found or add a photo'); return; }
  const d=todayStr(), pid=partnerId();
  const mineCount=findsOf(me.uid,d).length;
  if(mineCount>=10){ toast('That’s 10 for today. Enough! 😄'); return; }
  const bonus=mineCount===0 && pid && findsOf(pid,d).length>0;
  let photoId=null;
  if(pendingPhoto){
    photoId=randId();
    try{ await setDoc(doc(cref(),'photos',photoId),{data:pendingPhoto,uid:me.uid,at:Date.now()}); photoCache[photoId]=pendingPhoto; }
    catch(e){ toast('Could not save the photo. Check your Firestore rules.'); return; }
  }
  await addDoc(collection(cref(),'fun'),{kind:'colour',date:d,uid:me.uid,colour:name,note,photoId,at:Date.now()});
  pendingPhoto=null; findDraft='';
  if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
  const gain=(mineCount<3?1:0)+(bonus?2:0);
  toast(bonus?'+3 points for the team! You both found one 🎉':(gain?'+1 point 💗':'Added'));
  render();
}
async function deleteFind(id){
  const f=fun.find(x=>x.id===id); if(!f||!confirm('Delete this find?')) return;
  await deleteDoc(doc(cref(),'fun',id));
  if(f.photoId){ try{ await deleteDoc(doc(cref(),'photos',f.photoId)); }catch(e){} }
}
function colourCounts(uid){
  const m=new Map();
  for(const f of fun) if(f.kind==='colour'&&f.uid===uid) m.set(f.date,(m.get(f.date)||0)+1);
  return m;
}
const colourDays=uid=>new Set(colourCounts(uid).keys());
function colourStats(pid){
  const mM=colourCounts(me.uid), tM=pid?colourCounts(pid):new Map();
  const mineS=new Set(mM.keys()), theirS=new Set(tM.keys());
  const all=[...new Set([...mineS,...theirS])];
  let points=0;
  for(const d of all){ points+=Math.min(3,mM.get(d)||0)+Math.min(3,tM.get(d)||0); if(mineS.has(d)&&theirS.has(d)) points+=2; }
  const days=lastDays(365);
  let best=0, run=0;
  for(const d of days){ if(mineS.has(d)&&theirS.has(d)){ run++; if(run>best) best=run; } else run=0; }
  const cur=set=>{ let n=0; const r=[...days].reverse(); for(let i=0;i<r.length;i++){ if(set.has(r[i])) n++; else if(i===0) continue; else break; } return n; };
  const bothSet=new Set([...mineS].filter(d=>theirS.has(d)));
  return {points,best,together:pid?cur(bothSet):0,mine:cur(mineS),theirs:pid?cur(theirS):0};
}
function findHTML(f){
  const col=f.uid===me.uid?'var(--me)':'var(--you)';
  return `<div class="find" style="border-left:4px solid ${col}"><b>${esc(nameOf(f.uid))}</b> found: ${esc(f.note||'a photo')}
    ${f.photoId?`<div><img class="fimg" data-ph="${f.photoId}" ${photoCache[f.photoId]?`src="${photoCache[f.photoId]}"`:''} alt="Photo of what ${esc(nameOf(f.uid))} found"></div>`:''}
    ${f.uid===me.uid?`<div style="margin-top:6px"><button class="btn ghost small" data-fdel="${f.id}">Delete</button></div>`:''}</div>`;
}
function colourTodayHTML(pid,cname,chex){
  const d=todayStr(), mine=findsOf(me.uid,d), theirs=pid?findsOf(pid,d):[];
  const all=[...mine,...theirs].sort((x,y)=>(x.at||0)-(y.at||0));
  return `<div class="card">
    <div class="row" style="gap:16px"><span class="swatch" style="background:${chex}"></span>
      <div><h3>Colour hunt: ${cname}</h3>
      <p class="muted" style="margin:4px 0 0">Find things that are ${cname.toLowerCase()} near you today. Add as many as you like, with a photo if you want.</p></div></div>
    <div class="row" style="margin-top:12px"><input id="cf" style="flex:1;min-width:200px" placeholder="e.g. a ${cname.toLowerCase()} door on my street" value="${esc(findDraft)}">
      <label class="btn ghost" style="cursor:pointer">📷 ${pendingPhoto?'Change photo':'Add photo'}<input id="cp" type="file" accept="image/*" class="hidden"></label>
      <button class="btn" id="cs">Add</button></div>
    ${pendingPhoto?`<div><img class="fimg" src="${pendingPhoto}" alt="Photo to add"><button class="btn ghost small" id="cpx" style="margin-top:6px">Remove photo</button></div>`:''}
    <p class="muted" style="margin:14px 0 0">Today: ${esc(nameOf(me.uid))} ${mine.length}${pid?`, ${esc(nameOf(pid))} ${theirs.length}`:''}</p>
    ${all.map(findHTML).join('')||`<div class="find muted">Nothing found yet today</div>`}
  </div>`;
}
function colourHistoryHTML(pid){
  const today=todayStr();
  const dates=[...new Set(fun.filter(f=>f.kind==='colour'&&f.date!==today).map(f=>f.date))].sort().reverse();
  const label=ds=>{ const [y,m,dd]=ds.split('-').map(Number); return new Date(y,m-1,dd).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}); };
  const days=dates.slice(0,histDays).map(ds=>{ const [cn,hex]=colourForDate(ds);
    return `<div style="margin-top:14px"><div class="row" style="gap:8px"><span class="dot" style="background:${hex}"></span><b>${label(ds)}</b><span class="muted">· ${cn}</span></div>
      ${findsOn(ds).map(findHTML).join('')}</div>`; }).join('');
  return `<div class="card" style="margin-top:14px"><h3>Past colour hunts</h3>
    ${days||'<p class="muted" style="margin:6px 0 0">Earlier days will show up here.</p>'}
    ${dates.length>histDays?'<div style="margin-top:14px"><button class="btn ghost small" id="hmore">Show older days</button></div>':''}</div>`;
}
/* ---------- colour collage ---------- */
let collageColour=null;
function collageColours(){
  const m=new Map();
  for(const f of fun) if(f.kind==='colour'&&f.photoId&&f.colour) m.set(f.colour,(m.get(f.colour)||0)+1);
  return m;
}
function colourCollageHTML(){
  const m=collageColours(), names=COLOURS.map(c=>c[0]).filter(n=>m.has(n));
  if(!names.length) return `<div class="card" style="margin-top:14px"><h3>Colour collage</h3><p class="muted" style="margin:6px 0 0">Add photos to your finds and you can download a collage for each colour.</p></div>`;
  if(!names.includes(collageColour)) collageColour=names.includes(colourOfDay()[0])?colourOfDay()[0]:names[0];
  return `<div class="card" style="margin-top:14px"><h3>Colour collage</h3>
    <p class="muted" style="margin:4px 0 0">Pick a colour and get one picture with all the photos you both found for it.</p>
    <div class="row" style="margin-top:10px"><select id="colsel" style="width:auto;flex:1;min-width:180px" aria-label="Colour">${names.map(n=>`<option value="${n}" ${n===collageColour?'selected':''}>${n} (${m.get(n)} photo${m.get(n)>1?'s':''})</option>`).join('')}</select>
      <button class="btn" id="colgo">Make collage</button></div></div>`;
}
const loadImg=src=>new Promise((res,rej)=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=rej; i.src=src; });
async function photoData(id){
  if(photoCache[id]) return photoCache[id];
  const snap=await getDoc(doc(cref(),'photos',id));
  if(!snap.exists()) throw new Error('missing');
  photoCache[id]=snap.data().data; return photoCache[id];
}
async function makeCollage(name){
  let list=fun.filter(f=>f.kind==='colour'&&f.photoId&&f.colour===name).sort((a,b)=>(a.at||0)-(b.at||0));
  if(!list.length){ toast('No photos for that colour yet'); return; }
  const MAXP=30, trimmed=list.length>MAXP; if(trimmed) list=list.slice(-MAXP);
  toast('Making your collage…');
  const items=[];
  for(const f of list){ try{ items.push({f,img:await loadImg(await photoData(f.photoId))}); }catch(e){} }
  if(!items.length){ toast('Could not load the photos'); return; }
  const hex=(COLOURS.find(c=>c[0]===name)||['','#e0457b'])[1];
  const n=items.length, cols=n===1?1:(n<=4?2:3), cell=440, gap=16, cap=56, head=150;
  const rows=Math.ceil(n/cols), W=cols*cell+(cols+1)*gap, H=head+rows*(cell+cap)+(rows+1)*gap;
  const c=document.createElement('canvas'); c.width=W; c.height=H;
  const g=c.getContext('2d');
  g.fillStyle='#ffffff'; g.fillRect(0,0,W,H);
  g.fillStyle=hex; g.fillRect(0,0,W,head);
  const lum=(parseInt(hex.slice(1,3),16)*299+parseInt(hex.slice(3,5),16)*587+parseInt(hex.slice(5,7),16)*114)/1000;
  g.fillStyle=lum>150?'#24203b':'#ffffff';
  g.textAlign='left'; g.textBaseline='alphabetic';
  g.font='700 54px "Bricolage Grotesque","DM Sans",sans-serif';
  g.fillText('Our '+name.toLowerCase()+' finds',gap+8,76);
  g.font='500 28px "DM Sans",sans-serif';
  const pid=partnerId();
  g.fillText(nameOf(me.uid)+(pid?' & '+nameOf(pid):'')+' · '+n+' photo'+(n>1?'s':''),gap+8,120);
  items.forEach(({f,img},i)=>{
    const col=i%cols, row=Math.floor(i/cols);
    const x=gap+col*(cell+gap), y=head+gap+row*(cell+cap+gap);
    const k=Math.max(cell/img.width,cell/img.height), sw=cell/k, sh=cell/k;
    g.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,cell,cell);
    g.fillStyle=f.uid===me.uid?'#e0457b':'#1f9d8f'; g.fillRect(x,y+cell,cell,6);
    g.fillStyle='#24203b'; g.font='500 24px "DM Sans",sans-serif';
    let t=(nameOf(f.uid)+(f.note?': '+f.note:'')).trim();
    if(g.measureText(t).width>cell-8){ while(t.length>1&&g.measureText(t+'…').width>cell-8) t=t.slice(0,-1); t+='…'; }
    g.fillText(t,x+4,y+cell+38);
  });
  c.toBlob(b=>{ if(!b){ toast('Could not make the collage'); return; } showCollage(b,name,trimmed); },'image/jpeg',0.88);
}
function showCollage(blob,name,trimmed){
  const url=URL.createObjectURL(blob), fname='colour-hunt-'+name.toLowerCase()+'.jpg';
  const file=new File([blob],fname,{type:'image/jpeg'});
  const canShare=!!(navigator.canShare&&navigator.canShare({files:[file]}));
  const m=document.createElement('div'); m.className='modal';
  m.innerHTML=`<div class="card"><h3>Our ${esc(name.toLowerCase())} collage</h3>
    <img src="${url}" alt="Collage of your ${esc(name.toLowerCase())} finds" style="width:100%;border-radius:12px;margin-top:10px">
    ${trimmed?'<p class="muted" style="font-size:14px;margin:8px 0 0">This shows your latest 30 photos.</p>':''}
    <p class="muted" style="font-size:14px;margin:8px 0 0">If the download doesn’t start, press and hold the picture to save it.</p>
    <div class="row" style="justify-content:flex-end;margin-top:12px">
      ${canShare?'<button class="btn ghost small" id="cshare">Share</button>':''}
      <a class="btn small" href="${url}" download="${esc(fname)}" style="text-decoration:none">Download</a>
      <button class="btn ghost small" id="cclose">Close</button></div></div>`;
  document.body.appendChild(m);
  const close=()=>{ m.remove(); URL.revokeObjectURL(url); };
  m.querySelector('#cclose').onclick=close;
  m.onclick=e=>{ if(e.target===m) close(); };
  const sh=m.querySelector('#cshare');
  if(sh) sh.onclick=()=>navigator.share({files:[file],title:'Our '+name.toLowerCase()+' finds'}).catch(()=>{});
}
function bindColour(cname){
  if(!$('cs')) return;
  $('cs').onclick=()=>addFind(cname,$('cf').value);
  $('cf').oninput=e=>{ findDraft=e.target.value; };
  $('cf').onkeydown=e=>{ if(e.key==='Enter') $('cs').click(); };
  $('cp').onchange=async e=>{
    const f=e.target.files&&e.target.files[0]; if(!f) return;
    try{ pendingPhoto=await shrinkImage(f); }catch(err){ toast('Could not read that photo'); return; }
    findDraft=$('cf').value;
    if(document.activeElement&&document.activeElement.blur) document.activeElement.blur();
    render();
  };
  if($('cpx')) $('cpx').onclick=()=>{ pendingPhoto=null; render(); };
  $('v-study').querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>deleteFind(b.dataset.fdel));
  if($('colgo')){ $('colsel').onchange=e=>{ collageColour=e.target.value; }; $('colgo').onclick=()=>makeCollage($('colsel').value); }
  if($('hmore')) $('hmore').onclick=()=>{ histDays+=14; render(); };
}
const COLOUR_LEVELS=[[0,'Just starting'],[10,'Colour spotters'],[30,'Sharp eyes'],[60,'Colour masters'],[100,'Rainbow legends']];
function colourLevel(p){
  let cur=COLOUR_LEVELS[0];
  for(const l of COLOUR_LEVELS) if(p>=l[0]) cur=l;
  return {cur,next:COLOUR_LEVELS.find(l=>l[0]>p)||null};
}
function colourStatsHTML(pid){
  const s=colourStats(pid), {cur,next}=colourLevel(s.points);
  const mineS=colourDays(me.uid), theirS=pid?colourDays(pid):new Set();
  const strip=lastDays(7).map(d=>{ const a=mineS.has(d), b=theirS.has(d);
    const st=(a&&b)?'background:var(--gold);border-color:transparent':((a||b)?'background:var(--line);border-color:transparent':'');
    return `<i title="${d}: ${a&&b?'you both found one':(a||b?'only one of you':'none')}" style="${st}"></i>`; }).join('');
  const prog=next?Math.round((s.points-cur[0])/(next[0]-cur[0])*100):100;
  return `<div class="card" style="margin-top:14px"><h3>Colour points</h3>
    <div class="stats"><div><span class="big" style="color:var(--gold)">${s.points}</span><small>team points</small></div>
      <div><span class="big">${s.together}</span><small>day streak together</small></div>
      <div><span class="big">${s.best}</span><small>best streak</small></div></div>
    <p style="margin:0"><b>${esc(cur[1])}</b>${next?` <span class="muted">· ${next[0]-s.points} points to ${esc(next[1])}</span>`:' <span class="muted">· top level reached 🌈</span>'}</p>
    <div class="gbar" role="progressbar" aria-valuenow="${prog}" aria-valuemin="0" aria-valuemax="100"><i style="width:${prog}%"></i></div>
    ${pid?`<p class="muted" style="margin:12px 0 0;font-size:14px">Streaks: ${esc(nameOf(me.uid))} ${s.mine} days, ${esc(nameOf(pid))} ${s.theirs} days</p>`:''}
    <p class="muted" style="margin:12px 0 0;font-size:14px">Last 7 days · gold means you both found one</p>
    <div class="heat" style="grid-template-columns:repeat(7,1fr)">${strip}</div>
    <p class="muted" style="margin:10px 0 0;font-size:14px">1 point for each find (up to 3 a day each), plus 2 bonus points on days you both find at least one. The streak counts days in a row when you both did.</p></div>`;
}
/* ===== BACKUP: my data as a file (download / share) and restore ===== */
const BK_COLS=['habits','goals','fun','logs','study','photos'];
const bkMine=(d,uid)=>{ const a=[d.by,d.uid,d.from].filter(x=>x!==undefined&&x!==null); return !a.length||a.includes(uid)||d.to===uid; };
const bkAge=()=>{ const t=+localStorage.getItem('rr_bk')||0; return t?Math.floor((Date.now()-t)/864e5):-1; };
function bkLabel(){ const b=$('bkup'); if(!b) return; const n=bkAge(); b.textContent='💾 Back up my data'+(n<0?'':n===0?' · done today':` · ${n}d ago`); }
let bkNudged=false;
function bkNudge(){ if(bkNudged) return; bkNudged=true; bkLabel(); const n=bkAge();
  if(n>=14) toast(`It’s been ${n} days since your last backup. Open ☰ and tap Back up my data.`);
  else if(n<0&&!localStorage.getItem('rr_bk_tip')){ localStorage.setItem('rr_bk_tip','1'); toast('Tip: ☰ → Back up my data saves a copy on your phone 💾'); } }
async function doBackup(){ if(!me||!profile||!profile.coupleId){ toast('Sign in first'); return; } toast('Collecting your data…');
  try{ const out={app:'road-to-ready',v:1,at:new Date().toISOString(),uid:me.uid,cid:profile.coupleId,name:profile.name||'',cols:{},local:{}}; let n=0;
    for(const c of BK_COLS){ const sn=await getDocs(collection(cref(),c)); out.cols[c]=sn.docs.map(x=>({id:x.id,...x.data()})).filter(x=>bkMine(x,me.uid)).map(({id,...r})=>({id,d:r})); n+=out.cols[c].length; }
    for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); if(/^(m_|rr_|sr_)/.test(k)&&k!=='rr_bk'&&k!=='rr_bk_tip'){ const v=localStorage.getItem(k); if(v&&v.length<2e5) out.local[k]=v; } }
    const txt=JSON.stringify(out,(k,v)=>v&&typeof v==='object'&&typeof v.toMillis==='function'?v.toMillis():v), name=`road-to-ready-backup-${todayStr()}.json`, file=new File([txt],name,{type:'application/json'});
    let done=false;
    if(navigator.canShare&&navigator.canShare({files:[file]})){ try{ await navigator.share({files:[file],title:'Road to Ready backup'}); done=true; }catch(e){ if(e&&e.name==='AbortError') return; } }
    if(!done){ const a=document.createElement('a'); a.href=URL.createObjectURL(file); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000); }
    localStorage.setItem('rr_bk',String(Date.now())); bkLabel(); toast(`Backed up ${n} items 💾`);
  }catch(e){ toast('Backup failed. Check your connection and try again.'); } }
function doRestore(file){ const r=new FileReader(); r.onload=async()=>{ let b; try{ b=JSON.parse(r.result); }catch(e){ toast('That file isn’t a valid backup'); return; }
    if(!b||b.app!=='road-to-ready'||!b.cols){ toast('That file isn’t a Road to Ready backup'); return; }
    if(!me||!profile||b.uid!==me.uid||b.cid!==profile.coupleId){ toast('This backup belongs to a different account'); return; }
    const n=BK_COLS.reduce((a,c)=>a+(b.cols[c]||[]).length,0), when=b.at?new Date(b.at).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'earlier';
    if(!confirm(`Restore ${n} items from your ${when} backup?\n\nThose items go back to how they were then. Anything you added after that backup is kept.`)) return;
    toast('Restoring…');
    try{ for(const c of BK_COLS){ const L=b.cols[c]||[]; for(let i=0;i<L.length;i+=20) await Promise.all(L.slice(i,i+20).map(x=>setDoc(doc(cref(),c,x.id),x.d))); }
      Object.entries(b.local||{}).forEach(([k,v])=>{ try{ localStorage.setItem(k,v); }catch(e){} });
      toast('Restored ✓ Reloading…'); setTimeout(()=>location.reload(),1200);
    }catch(e){ toast('Restore stopped partway. Your backup file is safe, so try again.'); } };
  r.readAsText(file); }
/* ===== BACKUP: end ===== */
/* ===== PLANNER: start ===== */
/* Personal day/week checklist + errands. Stored in the 'fun' collection as kind:'task' (date=null means errand). */
let planWk=0, planSig='', planTab='plan', calOff=0, calOpen={college:false,home:false,care:false,grow:false}, calSel='', PD={dt:'',dc:'',dd:'',ct:''};
const pdate=(d,n)=>{ const x=new Date(d+'T12:00'); x.setDate(x.getDate()+n); return fmt(x); };
const pDay=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'});
const pShort=d=>new Date(d+'T12:00').toLocaleDateString(undefined,{day:'numeric',month:'short'});
const myTasks=()=>fun.filter(f=>f.kind==='task'&&f.by===me.uid).sort((a,b)=>(a.at||0)-(b.at||0));
const pRef=id=>doc(cref(),'fun',id);
const myDocs=k=>fun.filter(f=>f.kind===k&&f.by===me.uid);
const byDate=(a,b)=>a.date<b.date?-1:a.date>b.date?1:0;
const dueDiff=d=>Math.round((new Date(d+'T12:00')-new Date(todayStr()+'T12:00'))/864e5);
const dueLabel=d=>{ const n=dueDiff(d); return (n===0?'Due today':n===1?'Due tomorrow':n>1?`Due in ${n} days`:`${-n} day${n<-1?'s':''} overdue`)+' · '+pShort(d); };
const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const planWeek=()=>{ const n=new Date(); n.setDate(n.getDate()-((n.getDay()+6)%7)+planWk*7); return [0,1,2,3,4,5,6].map(i=>pdate(fmt(n),i)); };
const choresOn=(area,ds)=>myDocs('chore').filter(f=>(!area||f.area===area)&&(f.sched||[]).includes(ds)).sort((a,b)=>(a.at||0)-(b.at||0));
const choreDone=(f,ds)=>(f.ld||[]).includes(ds);
const AREA={home:['🏠','Home maintenance'],care:['🧴','Self-care'],grow:['🌱','Self-improvement']};
const chRow=(f,ds)=>{ const d=choreDone(f,ds); return `<div class="ptask${d?' done':''}"><button class="pchk" data-ctog="${f.id}|${ds}" aria-label="${d?'Mark as not done':'Mark as done'}">${d?'☑':'☐'}</button><span class="ptxt">${(AREA[f.area]||AREA.home)[0]} ${esc(f.title)}</span><button class="pdel" data-cun="${f.id}|${ds}" aria-label="Take off this day" title="Take off this day">✕</button></div>`; };
function pickHTML(ds,area){
  const C=myDocs('chore').filter(f=>(!area||f.area===area)&&!(f.sched||[]).includes(ds)).sort((a,b)=>(a.at||0)-(b.at||0)); if(!C.length) return '';
  const g=(a,n)=>{ const X=C.filter(f=>f.area===a); return X.length?`<optgroup label="${n}">${X.map(f=>`<option value="${f.id}">${esc(f.title)}</option>`).join('')}</optgroup>`:''; };
  return `<select class="cpick" data-cpick="${ds}" aria-label="Add a task to this day"><option value="">＋ ${area?AREA[area][1]:'Home / self-care / growth'} task for this day…</option>${area?C.map(f=>`<option value="${f.id}">${esc(f.title)}</option>`).join(''):g('home','🏠 Home')+g('care','🧴 Self-care')+g('grow','🌱 Self-improvement')}</select>`;
}
async function schedChore(id,ds,on){ const f=fun.find(x=>x.id===id); if(!f) return; const keep=pdate(todayStr(),-90), S=new Set(f.sched||[]), L=new Set(f.ld||[]);
  if(on) S.add(ds); else { S.delete(ds); L.delete(ds); }
  await updateDoc(pRef(id),{sched:[...S].filter(d=>d>=keep).sort(),ld:[...L].filter(d=>d>=keep).sort()}); }
const PRE={home:['Do the laundry','Clean the bathroom','Change bedsheets','Take out the bins','Vacuum & mop','Water the plants','Clean the kitchen','Clean the fish tank','Gardening'],
  care:['Face mask','Hair mask','Hair oiling','Exfoliate','Trim nails','Long bath or shower'],
  grow:['🧠 Read 10 pages','🧠 Journal','🧠 Meditate','🧠 Learn something new','🧠 Practise a skill','💪 Walk 20 min','💪 Stretch','💪 Workout','💪 Yoga']};

/* ---- classes (students), weekly study goals, daily minimum ---- */
let PK={s:'',j:'',d:'',m:'',l:'60',r:'1',as:'',ag:'',at:''};
const kin=(k,ph,x='')=>`<input id="k-${k}" data-pin="1" data-kin="${k}" value="${esc(PK[k])}" placeholder="${ph}" aria-label="${ph}" ${x}>`;
const classRow=(f,del)=>`<div class="ptask${f.done?' done':''}"><button class="pchk" data-ktog="${f.id}" aria-label="${f.done?'Mark as not taken':'Mark as taken'}">${f.done?'☑':'☐'}</button><span class="ptxt">🧑‍🏫 <b>${esc(f.time||'')}</b>${f.mins?` <span class="muted">(${f.mins} min)</span>`:''} ${esc(f.student||'')}${f.title?' · '+esc(f.title):''}</span>${del?`<button class="pdel" data-kdel="${f.id}" aria-label="Delete class">✕</button>`:''}</div>`;
const topicRow=([g,t,i])=>`<div class="ptask${t.done?' done':''}"><button class="pchk" data-atog="${g.id}|${i}" aria-label="${t.done?'Mark as not done':'Mark as done'}">${t.done?'☑':'☐'}</button><span class="ptxt">📚 ${esc(g.subject)}: ${esc(t.t)}</span></div>`;
const xOn=ds=>{ const K=myDocs('class').filter(f=>f.date===ds).sort((a,b)=>(a.time||'').localeCompare(b.time||'')), T=[];
  myDocs('acad').forEach(g=>(g.topics||[]).forEach((t,i)=>{ if(t.d===ds) T.push([g,t,i]); }));
  return {n:K.length+T.length, dn:K.filter(f=>f.done).length+T.filter(x=>x[1].done).length, html:K.map(f=>classRow(f)).join('')+T.map(topicRow).join('')}; };
async function addClass(){ const {s,j,d,m,l,r}=PK; if(!d||!m||!(s.trim()||j.trim())){ toast('Add a date, a time and who / what'); return; }
  for(let i=0;i<+r;i++) await addDoc(collection(cref(),'fun'),{kind:'class',by:me.uid,student:s.trim().slice(0,60),title:j.trim().slice(0,60),date:pdate(d,7*i),time:m,mins:+l||60,done:false,at:Date.now()+i});
  PK.s=PK.j=PK.d=PK.m=''; PK.r='1'; }
async function addStudyGoal(){ const subj=PK.as.trim(), tp=PK.at.split('\n').map(x=>x.trim()).filter(Boolean).slice(0,30); if(!subj||!tp.length){ toast('Add a subject and at least one topic'); return; }
  const W=planWeek(), t0=todayStr(); let days=W.slice(0,6).filter(d=>d>=t0); if(!days.length) days=W.slice(0,6);
  const topics=tp.map((t,i)=>({t:t.slice(0,100),d:days[Math.floor(i*days.length/tp.length)],done:false}));
  await addDoc(collection(cref(),'fun'),{kind:'acad',by:me.uid,subject:subj.slice(0,60),goal:PK.ag.trim().slice(0,120),wk:W[0],topics,at:Date.now()}); PK.as=PK.ag=PK.at=''; }
function classHTML(){ const t0=todayStr(), K=myDocs('class').filter(f=>f.date>=pdate(t0,-7)).sort((a,b)=>(a.date+a.time)<(b.date+b.time)?-1:1), by={};
  K.forEach(f=>(by[f.date]=by[f.date]||[]).push(f));
  return `<section class="card" style="margin-bottom:14px"><h2>🧑‍🏫 Schedule a class</h2><div style="display:grid;gap:6px;margin-top:6px">${kin('s','Student or batch name','maxlength="60"')}${kin('j','Subject / topic (optional)','maxlength="60"')}<input id="k-d" type="date" data-pin="1" data-kin="d" value="${esc(PK.d)}" aria-label="Class date"><div class="row" style="gap:6px;flex-wrap:nowrap"><input id="k-m" type="time" data-pin="1" data-kin="m" value="${esc(PK.m)}" aria-label="Start time" style="flex:1;min-width:0"><select data-kin="l" aria-label="Length" style="flex:1">${[30,45,60,90,120].map(n=>`<option value="${n}"${+PK.l===n?' selected':''}>${n} min</option>`).join('')}</select></div><select data-kin="r" aria-label="Repeat">${[[1,'Just once'],[4,'Every week · 4 weeks'],[8,'Every week · 8 weeks'],[12,'Every week · 12 weeks']].map(([n,l])=>`<option value="${n}"${+PK.r===n?' selected':''}>${l}</option>`).join('')}</select><button class="btn small" data-kadd>Add class</button></div></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>Classes</h2>${K.length?Object.keys(by).map(d=>`<h3 class="muted" style="margin:12px 0 2px;font-size:14px">${pDay(d)}${d===t0?' · today':''}</h3>${by[d].map(f=>classRow(f,1)).join('')}`).join(''):'<p class="muted">No classes yet. They also show in your Today list and weekly plan.</p>'}</section>`; }
function acadHTML(){ return examHTML()+acadMain(); }
function acadMain(){ const W=planWeek(), G=myDocs('acad').filter(g=>g.wk===W[0]).sort((a,b)=>(a.at||0)-(b.at||0));
  const card=g=>{ const T=g.topics||[], dn=T.filter(t=>t.done).length, pc=T.length?Math.round(dn/T.length*100):0;
    return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><h2>📚 ${esc(g.subject)}</h2><button class="pdel" data-adel="${g.id}" aria-label="Delete goal">🗑</button></div>${g.goal?`<div class="muted">${esc(g.goal)}</div>`:''}<div style="height:8px;border-radius:6px;background:var(--line);margin:8px 0"><div style="height:100%;width:${pc}%;border-radius:6px;background:var(--me)"></div></div><small class="muted">${dn}/${T.length} topics · ${pc}%</small>`+
      T.map((t,i)=>`<div class="ptask${t.done?' done':''}"><button class="pchk" data-atog="${g.id}|${i}" aria-label="Toggle topic">${t.done?'☑':'☐'}</button><span class="ptxt">${esc(t.t)}</span><select data-amv="${g.id}|${i}" aria-label="Day" style="width:auto">${W.map((d,k)=>`<option value="${d}"${t.d===d?' selected':''}>${DN[k]}</option>`).join('')}</select></div>`).join('')+`</section>`; };
  return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost small" data-pwk="-1" aria-label="Previous week">‹</button><div style="text-align:center"><b>${pShort(W[0])} – ${pShort(W[6])}</b><div class="muted" style="font-size:13px">${planWk===0?'This week':'Planning ahead'}</div></div><button class="btn small ghost" data-pwk="1" aria-label="Next week">›</button></div>${planWk?`<button class="btn ghost small" data-pwk="0" style="margin-top:8px">Back to this week</button>`:''}</section>`+
  (G.map(card).join('')||'<section class="card" style="margin-bottom:14px"><p class="muted">No study goals this week yet.</p></section>')+
  `<section class="card" style="margin-bottom:14px"><h2>＋ Weekly goal</h2><p class="muted" style="margin:4px 0 6px">One topic per line. They’re spread over the week (Sunday stays free for revision); change any day with the day picker.</p><div style="display:grid;gap:6px">${kin('as','Subject (e.g. Genetics)','maxlength="60"')}${kin('ag','Goal (e.g. Finish chapter 4)','maxlength="120"')}<textarea id="k-at" data-pin="1" data-kin="at" rows="5" placeholder="Topics, one per line" aria-label="Topics">${esc(PK.at)}</textarea><button class="btn small" data-aadd>Add goal</button></div></section>`; }
const hitA=(a,d)=>myDocs('chore').some(f=>f.area===a&&(f.ld||[]).includes(d)), fullD=d=>Object.keys(AREA).every(a=>hitA(a,d));
function dailyHTML(){ const t=todayStr(), A=Object.keys(AREA), M=t.slice(0,8); let st=0, d=fullD(t)?t:pdate(t,-1); while(st<90&&fullD(d)){ st++; d=pdate(d,-1); }
  let days=0, per={home:0,care:0,grow:0}; for(let i=1;i<=+t.slice(8);i++){ const ds=M+String(i).padStart(2,'0'); if(fullD(ds)) days++; A.forEach(a=>{ if(hitA(a,ds)) per[a]++; }); }
  return `<section class="card" style="margin-bottom:14px"><h2>⭐ Daily minimum</h2><p class="muted" style="margin:4px 0 6px">At least one of each today. Do more if you have the mood and energy.</p>`+A.map(a=>{ const X=choresOn(a,t), dn=X.filter(f=>choreDone(f,t)).length, any=myDocs('chore').some(f=>f.area===a);
    return `<div style="margin-top:8px"><b>${AREA[a][0]} ${AREA[a][1]}</b> <span class="${dn?'':'muted'}">${dn?'✓ '+dn+' done':'· pick one'}</span>${X.map(f=>chRow(f,t)).join('')}${any?pickHTML(t,a):`<small class="muted" style="display:block">Add tasks in the ${AREA[a][0]} tab first.</small>`}</div>`; }).join('')+
  `<p class="muted" style="margin:12px 0 0">🔥 ${st} day streak · this month: ${days} full day${days===1?'':'s'} (🏠 ${per.home} · 🧴 ${per.care} · 🌱 ${per.grow})</p></section>`; }

/* ---- money: monthly buy list, savings, investing ---- */
Object.assign(PK,{fn:'',fa:'',fy:'save',fx:'',fm:'',ts:'',ti:''});
let finOff=0;
const finMo=()=>{ const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+finOff); return {k:d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),n:d.toLocaleDateString(undefined,{month:'long',year:'numeric'})}; };
const rs=n=>'₹'+(+n||0).toLocaleString('en-IN'), sumA=L=>L.reduce((a,f)=>a+(+f.amt||0),0);
const fbar=(a,b)=>`<div style="height:8px;border-radius:6px;background:var(--line);margin:6px 0"><div style="height:100%;width:${b?Math.min(100,Math.round(a/b*100)):0}%;border-radius:6px;background:var(--me)"></div></div>`;
async function addBuy(){ const n=PK.fn.trim(); if(!n){ toast('Add what you need to buy'); return; } await addDoc(collection(cref(),'fun'),{kind:'buy',by:me.uid,title:n.slice(0,80),amt:Math.max(0,+PK.fa||0),mo:finMo().k,done:false,at:Date.now()}); PK.fn=PK.fa=''; }
async function addMoney(){ const a=+PK.fx; if(!(a>0)){ toast('Add an amount'); return; } await addDoc(collection(cref(),'fun'),{kind:'mon',by:me.uid,type:PK.fy,title:PK.fm.trim().slice(0,60),amt:a,mo:finMo().k,at:Date.now()}); PK.fx=PK.fm=''; }
async function setTargets(){ const m=finMo().k, d=myDocs('fset').find(f=>f.mo===m), v={save:Math.max(0,+PK.ts||0),invest:Math.max(0,+PK.ti||0)}; if(d) await updateDoc(pRef(d.id),v); else await addDoc(collection(cref(),'fun'),{kind:'fset',by:me.uid,mo:m,...v,at:Date.now()}); toast('Targets saved'); }
function finHTML(){ const M=finMo(), by=(a,b)=>(a.at||0)-(b.at||0), B=myDocs('buy').filter(f=>f.mo===M.k).sort(by), L=myDocs('mon').filter(f=>f.mo===M.k).sort((a,b)=>by(b,a)), S=curBud().inc?{save:Math.round(freeInc(curBud())*curBud().sp/100),invest:Math.round(freeInc(curBud())*curBud().ip/100)}:(myDocs('fset').find(f=>f.mo===M.k)||{});
  const sv=sumA(L.filter(f=>f.type==='save')), iv=sumA(L.filter(f=>f.type==='invest')), pl=sumA(B), sp=sumA(B.filter(f=>f.done)), num='inputmode="decimal"';
  const ts=PK.ts!==''?PK.ts:(S.save||''), ti=PK.ti!==''?PK.ti:(S.invest||'');
  const ent=f=>`<div class="ptask"><span class="ptxt">${f.type==='save'?'🪙':'📈'} ${esc(f.title||(f.type==='save'?'Saved':'Invested'))} · <b>${rs(f.amt)}</b></span><button class="pdel" data-fdel="${f.id}" aria-label="Delete">✕</button></div>`;
  return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost small" data-fmo="-1" aria-label="Previous month">‹</button><b>${M.n}</b><button class="btn ghost small" data-fmo="1" aria-label="Next month">›</button></div>${finOff?`<button class="btn ghost small" data-fmo="0" style="margin-top:8px">Back to this month</button>`:''}`+
  `<div style="margin-top:10px"><b>🪙 Saved</b> ${rs(sv)}${S.save?` of ${rs(S.save)}`:''}${fbar(sv,S.save)}<b>📈 Invested</b> ${rs(iv)}${S.invest?` of ${rs(S.invest)}`:''}${fbar(iv,S.invest)}<b>🛍️ Bought</b> ${rs(sp)} of ${rs(pl)} planned${fbar(sp,pl)}</div></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>🛍️ To buy this month</h2>${B.map(f=>`<div class="ptask${f.done?' done':''}"><button class="pchk" data-ftog="${f.id}" aria-label="${f.done?'Mark as not bought':'Mark as bought'}">${f.done?'☑':'☐'}</button><span class="ptxt">${esc(f.title)}${f.amt?` · ${rs(f.amt)}`:''}</span><button class="pdel" data-fdel="${f.id}" aria-label="Delete">✕</button></div>`).join('')||'<p class="muted">Nothing planned yet.</p>'}<div class="row" style="gap:6px;margin-top:8px;flex-wrap:nowrap">${kin('fn','What to buy','maxlength="80" style="flex:2;min-width:0"')}${kin('fa','₹ cost',num+' style="flex:1;min-width:0"')}<button class="btn small" data-fbuy>Add</button></div></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>🪙 Savings &amp; 📈 investing</h2><div style="display:grid;gap:6px;margin-top:6px"><select data-kin="fy" aria-label="Type"><option value="save"${PK.fy==='save'?' selected':''}>🪙 I saved</option><option value="invest"${PK.fy==='invest'?' selected':''}>📈 I invested</option></select>${kin('fm','Where / what (e.g. Emergency fund, SIP)','maxlength="60"')}${kin('fx','₹ amount',num)}<button class="btn small" data-fmon>Add to ${M.n}</button></div>${L.length?`<div style="margin-top:8px">${L.map(ent).join('')}</div>`:''}</section>`+(curBud().inc?'':`<section class="card" style="margin-bottom:14px"><h2>🎯 ${M.n} targets</h2><div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><input id="k-ts" data-pin="1" data-kin="ts" ${num} value="${esc(ts)}" placeholder="Save ₹" aria-label="Savings target" style="flex:1;min-width:0"><input id="k-ti" data-pin="1" data-kin="ti" ${num} value="${esc(ti)}" placeholder="Invest ₹" aria-label="Investing target" style="flex:1;min-width:0"><button class="btn small" data-fset>Set</button></div></section>`); }

/* ---- money v2: income budget with limits, big-buy savings goals, side quests / projects ---- */
Object.assign(PK,{cn:'',cp:'',sc:'',sa:'',sn:'',gn:'',gt:'',gd:'',qn:'',qy:'project',qb:''});
let finSub='bud'; const QI={research:'🔬',project:'🧪',side:'🧭'}, DEFCATS=[{n:'Hobbies',p:10},{n:'Plants',p:5},{n:'Fish',p:10},{n:'Self-care',p:10},{n:'Fun',p:10}];
function curBud(){ const M=finMo().k, own=myDocs('bud').find(f=>f.mo===M); if(own) return own; const pv=myDocs('bud').filter(f=>f.mo<M).sort((a,b)=>a.mo<b.mo?1:-1)[0];
  return {mo:M,inc:0,ip:pv?pv.ip:20,sp:pv?pv.sp:10,cats:pv?pv.cats:DEFCATS}; }
async function budSave(patch){ const b=curBud(); if(b.id) await updateDoc(pRef(b.id),patch); else await addDoc(collection(cref(),'fun'),{kind:'bud',by:me.uid,mo:b.mo,at:Date.now(),inc:b.inc,ip:b.ip,sp:b.sp,cats:b.cats,...patch}); }
async function addSpend(){ const b=curBud(), a=+PK.sa; if(!(a>0)){ toast('Add an amount'); return; } const cat=PK.sc||(b.cats[0]&&b.cats[0].n)||'Other', M=finMo().k;
  const before=sumA(myDocs('spd').filter(f=>f.mo===M&&f.cat===cat)), c=b.cats.find(x=>x.n===cat), lim=c?Math.round(freeInc(b)*c.p/100):0;
  await addDoc(collection(cref(),'fun'),{kind:'spd',by:me.uid,mo:M,cat,amt:a,note:PK.sn.trim().slice(0,60),at:Date.now()}); PK.sa=PK.sn='';
  if(lim&&before+a>lim) toast('Over your '+cat+' limit by '+rs(before+a-lim)); }
async function addBig(){ const t=+PK.gt; if(!PK.gn.trim()||!(t>0)){ toast('Add a name and a target amount'); return; } await addDoc(collection(cref(),'fun'),{kind:'goal',by:me.uid,title:PK.gn.trim().slice(0,80),target:t,saved:0,due:PK.gd||'',done:false,at:Date.now()}); PK.gn=PK.gt=PK.gd=''; }
async function addQuest(){ if(!PK.qn.trim()){ toast('Give it a name'); return; } await addDoc(collection(cref(),'fun'),{kind:'quest',by:me.uid,title:PK.qn.trim().slice(0,80),type:PK.qy,budget:Math.max(0,+PK.qb||0),spent:0,steps:[],done:false,at:Date.now()}); PK.qn=PK.qb=''; }
function finPage(){ const nav=`<section class="card" style="margin-bottom:14px"><div class="row" style="gap:6px;flex-wrap:wrap">${[['bud','📊 Budget'],['goal','🎯 Big buys'],['quest','🧭 Quests'],['bills','🔁 Bills'],['plan','🛍️ Month']].map(([k,n])=>`<button class="btn small ${finSub===k?'':'ghost'}" data-fsub="${k}">${n}</button>`).join('')}</div></section>`;
  return nav+(finSub==='bud'?budHTML():finSub==='goal'?goalHTML():finSub==='quest'?questHTML():finSub==='bills'?billsHTML():finHTML()); }
function budHTML(){ const M=finMo(), b=curBud(), inc=+b.inc||0, spP=100-b.ip-b.sp, bm=Math.round(billsM()), free=Math.max(0,inc-bm), am=p=>Math.round(free*p/100), D=myDocs('spd').filter(f=>f.mo===M.k).sort((a,b)=>(b.at||0)-(a.at||0)), num='inputmode="decimal"';
  const names=b.cats.map(c=>c.n), tot=sumA(D), cp=b.cats.reduce((a,c)=>a+c.p,0), left=spP-cp, sel=PK.sc||names[0]||'Other';
  const row=(c,i)=>{ const sp=sumA(D.filter(f=>f.cat===c.n)), lim=am(c.p), over=inc&&sp>lim;
    return `<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row" style="gap:6px;flex-wrap:nowrap;align-items:center"><input data-bcat="${i}|n" value="${esc(c.n)}" aria-label="Category name" style="flex:2;min-width:0"><input type="number" ${num} data-bcat="${i}|p" value="${c.p}" aria-label="Percent" style="width:64px">%<button class="pdel" data-bcdel="${i}" aria-label="Delete category">🗑</button></div><small class="${over?'plate':'muted'}">${rs(sp)} spent of ${rs(lim)}${over?' · over by '+rs(sp-lim):inc?' · '+rs(lim-sp)+' left':''}</small>${fbar(sp,lim)}</div>`; };
  const oth=sumA(D.filter(f=>!names.includes(f.cat)));
  return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost small" data-fmo="-1" aria-label="Previous month">‹</button><b>${M.n}</b><button class="btn ghost small" data-fmo="1" aria-label="Next month">›</button></div>${finOff?`<button class="btn ghost small" data-fmo="0" style="margin-top:8px">Back to this month</button>`:''}<h2 style="margin-top:10px">💵 Income &amp; split</h2><div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap;align-items:center"><input type="number" ${num} data-bset="inc" value="${inc||''}" placeholder="Income this month ₹" aria-label="Income" style="flex:2;min-width:0"></div><div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap;align-items:center"><span>📈 Invest</span><input type="number" ${num} data-bset="ip" value="${b.ip}" aria-label="Invest percent" style="width:64px">%<span>🪙 Save</span><input type="number" ${num} data-bset="sp" value="${b.sp}" aria-label="Save percent" style="width:64px">%</div>${inc&&bm?`<p class="muted" style="margin:8px 0 0">🔁 Bills ${rs(bm)}/month come off first, so ${rs(free)} is split below.</p>`:''}<p class="muted" style="margin:8px 0 0">${inc?`📈 ${rs(am(b.ip))} invest · 🪙 ${rs(am(b.sp))} save for big buys · 🛍️ ${rs(am(spP))} to spend (${spP}%)`:'Enter your income to see the amounts.'}${spP<0?' <span class="plate">Your invest + save is over 100%.</span>':''}</p></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>🛍️ Spending limits</h2><p class="muted" style="margin:4px 0">Each % is a share of this month’s income.</p>${b.cats.map(row).join('')}${oth?`<small class="muted" style="display:block;margin-top:8px">Other: ${rs(oth)}</small>`:''}<p class="${left<0?'plate':'muted'}" style="margin:8px 0">${left<0?'Limits add up to '+(-left)+'% more than your spend share.':`${left}% (${rs(am(left))}) of your spend share is not given a limit yet.`}</p><div class="row" style="gap:6px;flex-wrap:nowrap">${kin('cn','New category','maxlength="30" style="flex:2;min-width:0"')}${kin('cp','%',num+' style="flex:1;min-width:0"')}<button class="btn small" data-bcadd>Add</button></div></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>＋ Add spending</h2><div style="display:grid;gap:6px;margin-top:6px"><select data-kin="sc" aria-label="Category">${[...names,'Other'].map(n=>`<option${n===sel?' selected':''}>${esc(n)}</option>`).join('')}</select>${kin('sa','₹ amount',num)}${kin('sn','What for (optional)','maxlength="60"')}<button class="btn small" data-sadd>Add spending</button></div><p class="muted" style="margin:8px 0 0">Spent ${rs(tot)}${inc?' of '+rs(am(spP)):''} this month</p>${D.map(f=>`<div class="ptask"><span class="ptxt">${esc(f.cat)} · <b>${rs(f.amt)}</b>${f.note?` <span class="muted">${esc(f.note)}</span>`:''}</span><button class="pdel" data-fdel="${f.id}" aria-label="Delete">✕</button></div>`).join('')}</section>`; }
function goalHTML(){ const t0=todayStr(), b=curBud(), G=myDocs('goal').sort((a,c)=>(a.at||0)-(c.at||0)), open=G.filter(g=>!g.done), need=g=>{ const r=Math.max(0,g.target-(+g.saved||0)); if(!r||!g.due) return 0; return Math.ceil(r/Math.max(1,Math.ceil(dueDiff(g.due)/30))); };
  const card=g=>{ const sv=+g.saved||0, r=Math.max(0,g.target-sv), n=need(g);
    return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><h2>🎯 ${esc(g.title)}</h2><button class="pdel" data-fdel="${g.id}" aria-label="Delete">🗑</button></div><div><b>${rs(sv)}</b> of ${rs(g.target)}${g.due?` · by ${pShort(g.due)}`:''}</div>${fbar(sv,g.target)}${g.done?'<p class="muted" style="margin:4px 0">✅ Bought</p>':r?`<small class="muted">${rs(r)} to go${n?` · save about <b>${rs(n)}</b> a month`:''}</small>`:'<p style="margin:4px 0">🎉 You have enough. Time to buy it!</p>'}<div class="row" style="gap:6px;margin-top:8px;flex-wrap:nowrap">${g.done?'':`<input id="gf-${g.id}" type="number" inputmode="decimal" placeholder="₹ put aside" aria-label="Amount to add" style="flex:1;min-width:0"><button class="btn small" data-gfund="${g.id}">Add</button>`}${sv>=g.target||g.done?`<button class="btn ghost small" data-gdone="${g.id}">${g.done?'Reopen':'Mark bought'}</button>`:''}</div></section>`; };
  const nm=open.reduce((a,g)=>a+need(g),0), sv=Math.round(freeInc(b)*b.sp/100);
  return `<section class="card" style="margin-bottom:14px"><h2>🎯 Big buys</h2><p class="muted" style="margin:4px 0">For things that cost more than one month’s fun money, like a canister filter. Put a little aside each month until you can buy it.</p>${nm?`<p style="margin:6px 0 0">Needed each month: <b>${rs(nm)}</b>${sv?` · your save budget: <b>${rs(sv)}</b>${nm>sv?' <span class="plate">(short by '+rs(nm-sv)+')</span>':''}`:''}</p>`:''}</section>`+
  (G.map(card).join('')||'')+
  `<section class="card" style="margin-bottom:14px"><h2>＋ New big buy</h2><div style="display:grid;gap:6px;margin-top:6px">${kin('gn','What (e.g. Canister filter)','maxlength="80"')}${kin('gt','Target ₹','inputmode="decimal"')}<input id="k-gd" type="date" data-pin="1" data-kin="gd" value="${esc(PK.gd)}" aria-label="Buy by (optional)"><small class="muted">Buy by (optional) lets the app work out a monthly amount.</small><button class="btn small" data-gadd>Start saving</button></div></section>`; }
function questHTML(){ const Q=myDocs('quest').sort((a,b)=>(a.done?1:0)-(b.done?1:0)||(a.at||0)-(b.at||0));
  const card=q=>{ const S=q.steps||[], dn=S.filter(x=>x.done).length, nx=S.find(x=>!x.done), bu=+q.budget||0, sp=+q.spent||0;
    return `<section class="card" style="margin-bottom:14px${q.done?';opacity:.65':''}"><div class="row" style="justify-content:space-between;align-items:center"><h2>${QI[q.type]||'🧭'} ${esc(q.title)}</h2><button class="pdel" data-fdel="${q.id}" aria-label="Delete">🗑</button></div>${nx?`<div>➡️ <b>Next:</b> ${esc(nx.t)}</div>`:S.length?'<div>✅ All steps done</div>':'<div class="muted">Add your first step below.</div>'}${S.length?fbar(dn,S.length)+`<small class="muted">${dn}/${S.length} steps</small>`:''}${S.map((x,i)=>`<div class="ptask${x.done?' done':''}"><button class="pchk" data-qtog="${q.id}|${i}" aria-label="Toggle step">${x.done?'☑':'☐'}</button><span class="ptxt">${esc(x.t)}</span><button class="pdel" data-qsdel="${q.id}|${i}" aria-label="Delete step">✕</button></div>`).join('')}<div class="row" style="gap:6px;margin-top:8px;flex-wrap:nowrap"><input id="qs-${q.id}" maxlength="100" placeholder="Add a step" aria-label="Add a step" style="flex:1;min-width:0"><button class="btn small" data-qstep="${q.id}">Add</button></div><div style="margin-top:10px"><b>💸 ${rs(sp)}</b>${bu?` of ${rs(bu)}${sp>bu?' · <span class="plate">over by '+rs(sp-bu)+'</span>':''}`:' spent'}${bu?fbar(sp,bu):''}<div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><input id="qp-${q.id}" type="number" inputmode="decimal" placeholder="₹ spent" aria-label="Amount spent" style="flex:1;min-width:0"><button class="btn small" data-qspend="${q.id}">Add</button></div></div><button class="btn ghost small" data-qdone="${q.id}" style="margin-top:10px">${q.done?'Reopen':'Mark complete'}</button></section>`; };
  return (Q.map(card).join('')||`<section class="card" style="margin-bottom:14px"><h2>🧭 Quests &amp; projects</h2><p class="muted">Your research, college projects and side quests. Each one gets steps, a clear next step and a budget.</p></section>`)+
  `<section class="card" style="margin-bottom:14px"><h2>＋ New quest</h2><div style="display:grid;gap:6px;margin-top:6px">${kin('qn','Name (e.g. Herba-Dent research)','maxlength="80"')}<select data-kin="qy" aria-label="Type">${[['project','🧪 College project'],['research','🔬 Research'],['side','🧭 Side quest']].map(([k,n])=>`<option value="${k}"${PK.qy===k?' selected':''}>${n}</option>`).join('')}</select>${kin('qb','Budget ₹ (optional)','inputmode="decimal"')}<button class="btn small" data-qadd>Add quest</button></div></section>`; }

/* ---- bills & subscriptions, exam countdown ---- */
Object.assign(PK,{bn:'',ba:'',bf:'month',bd:'',en:'',ed:''});
const billsM=()=>myDocs('bill').reduce((a,f)=>a+(f.freq==='year'?(+f.amt||0)/12:(+f.amt||0)),0), freeInc=b=>Math.max(0,(+b.inc||0)-Math.round(billsM()));
const inDays=n=>n<0?`${-n} day${n<-1?'s':''} ago`:n===0?'today':n===1?'tomorrow':`in ${n} days`;
async function addBill(){ const a=+PK.ba; if(!PK.bn.trim()||!(a>0)){ toast('Add a name and an amount'); return; } await addDoc(collection(cref(),'fun'),{kind:'bill',by:me.uid,title:PK.bn.trim().slice(0,60),amt:a,freq:PK.bf,date:PK.bd||'',at:Date.now()}); PK.bn=PK.ba=PK.bd=''; }
async function addExam(){ if(!PK.en.trim()||!PK.ed){ toast('Add the exam and its date'); return; } await addDoc(collection(cref(),'fun'),{kind:'exam',by:me.uid,title:PK.en.trim().slice(0,60),date:PK.ed,at:Date.now()}); PK.en=PK.ed=''; }
const exams=()=>myDocs('exam').filter(f=>dueDiff(f.date)>=0).sort(byDate);
function examLine(){ const X=exams().filter(f=>dueDiff(f.date)<=60).slice(0,2); return X.length?`<small class="muted" style="display:block;margin-top:8px">${X.map(f=>`🎓 ${esc(f.title)} · ${dueDiff(f.date)===0?'today':dueDiff(f.date)+' day'+(dueDiff(f.date)>1?'s':'')+' to go'}`).join('<br>')}</small>`:''; }
function examHTML(){ const X=exams();
  return `<section class="card" style="margin-bottom:14px"><h2>🎓 Exam countdown</h2>${X.map(f=>{ const n=dueDiff(f.date); return `<div class="ptask"><span class="ptxt"><b>${esc(f.title)}</b><br><small class="${n<=7?'plate':'muted'}">${n===0?'Today':n+' day'+(n>1?'s':'')+' to go'} · ${pShort(f.date)}</small></span><button class="pdel" data-fdel="${f.id}" aria-label="Delete exam">✕</button></div>`; }).join('')||'<p class="muted">No exams added yet.</p>'}<div style="display:grid;gap:6px;margin-top:8px">${kin('en','Exam (e.g. Genetics, internal 2)','maxlength="60"')}<input id="k-ed" type="date" data-pin="1" data-kin="ed" value="${esc(PK.ed)}" aria-label="Exam date"><button class="btn small" data-eadd>Add exam</button></div></section>`; }
function billsHTML(){ const B=myDocs('bill').sort((a,b)=>(a.date||'9')<(b.date||'9')?-1:1), m=Math.round(billsM());
  return `<section class="card" style="margin-bottom:14px"><h2>🔁 Bills &amp; subscriptions</h2><p style="margin:4px 0"><b>${rs(m)}</b> a month · ${rs(m*12)} a year</p><p class="muted" style="margin:0">These come off your income first, so your budget only splits what’s really free.</p>${B.map(f=>{ const n=f.date?dueDiff(f.date):null; return `<div class="ptask"><span class="ptxt"><b>${esc(f.title)}</b> · ${rs(f.amt)}/${f.freq==='year'?'yr':'mo'}${n===null?'':`<br><small class="${n<=3?'plate':'muted'}">Renews ${inDays(n)} · ${pShort(f.date)}</small>`}</span>${f.date?`<button class="pmv" data-bren="${f.id}" aria-label="Renewed, move to next date" title="Renewed">↻</button>`:''}<button class="pdel" data-fdel="${f.id}" aria-label="Delete">✕</button></div>`; }).join('')}</section>`+
  `<section class="card" style="margin-bottom:14px"><h2>＋ Add one</h2><div style="display:grid;gap:6px;margin-top:6px">${kin('bn','Name (e.g. YouTube Premium)','maxlength="60"')}${kin('ba','₹ amount','inputmode="decimal"')}<select data-kin="bf" aria-label="How often"><option value="month"${PK.bf==='month'?' selected':''}>Every month</option><option value="year"${PK.bf==='year'?' selected':''}>Every year</option></select><input id="k-bd" type="date" data-pin="1" data-kin="bd" value="${esc(PK.bd)}" aria-label="Next renewal date (optional)"><small class="muted">Next renewal date is optional. Tap ↻ after it renews to move it forward.</small><button class="btn small" data-badd>Add</button></div></section>`; }

/* ---- energy check-in (from the paper tracker): one tap 1-5, T = tense, levers, day graph, patterns ---- */
Object.assign(PK,{et:'',eb:''});
let enOff=0;
const LV=[['C','☕ Caffeine'],['PT','🌿 Peppermint'],['CT','🍵 Chamomile'],['CS','🥶 Cold shower'],['WS','🚿 Warm shower'],['W','🚶 5-min walk'],['N','😴 Nap'],['L','☀️ Sunlight'],['S','🤲 Salah / dhikr']], LVN=Object.fromEntries(LV), ENL=['','drained','sluggish','okay','alert','buzzing'];
const enDay=()=>pdate(todayStr(),enOff), hrs=ts=>{ const d=new Date(ts); return d.getHours()+d.getMinutes()/60; }, tm=ts=>new Date(ts).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const enEntries=ds=>myDocs('en').filter(f=>f.date===ds).sort((a,b)=>a.ts-b.ts), enDayDoc=ds=>myDocs('enday').find(f=>f.date===ds)||{};
async function logEn(v,lv){ const tense=!!(v&&PK.et); if(v) PK.et=''; await addDoc(collection(cref(),'fun'),{kind:'en',by:me.uid,date:todayStr(),ts:Date.now(),v:v||0,t:tense,lv:lv?[lv]:[],at:Date.now()}); }
async function saveEnDay(patch){ const ds=enDay(), d=enDayDoc(ds); if(d.id) await updateDoc(pRef(d.id),patch); else await addDoc(collection(cref(),'fun'),{kind:'enday',by:me.uid,date:ds,at:Date.now(),...patch}); }
function enQuick(){ const L=enEntries(todayStr()).filter(f=>f.v).pop();
  return `<div class="row" style="gap:6px;margin-top:10px;align-items:center;flex-wrap:wrap"><span class="muted">⚡ Energy</span>${[1,2,3,4,5].map(n=>`<button class="btn ghost small" data-env="${n}" aria-label="Energy ${n}, ${ENL[n]}">${n}</button>`).join('')}<button class="btn ${PK.et?'':'ghost '}small" data-etog aria-label="Tense or anxious">T</button></div>${L?`<small class="muted">Last: ${L.v} (${ENL[L.v]}) at ${tm(L.ts)}${L.t?' · tense':''}</small>`:''}`; }
function enPatterns(){ const all=myDocs('en').filter(f=>f.date>=pdate(todayStr(),-14)).sort((a,b)=>a.ts-b.ts), R=all.filter(f=>f.v), sl=Array.from({length:12},()=>[]);
  R.forEach(f=>sl[Math.min(11,Math.floor(hrs(f.ts)/2))].push(f.v));
  const rows=sl.map((a,i)=>a.length?`<div class="row" style="gap:8px;flex-wrap:nowrap;align-items:center;margin:4px 0"><span style="width:52px;font-size:13px">${i*2}–${i*2+2}</span><div style="flex:1;height:8px;border-radius:6px;background:var(--line)"><div style="height:100%;width:${Math.round(a.reduce((x,y)=>x+y,0)/a.length/5*100)}%;border-radius:6px;background:var(--me)"></div></div><small class="muted" style="width:62px;text-align:right">${(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1)} · ${a.length}×</small></div>`:'').join('');
  const eff={}; all.filter(f=>(f.lv||[]).length).forEach(f=>{ const b=R.filter(r=>r.ts<f.ts&&r.ts>=f.ts-72e5).pop(), a=R.find(r=>r.ts>=f.ts+18e5&&r.ts<=f.ts+72e5); if(b&&a) f.lv.forEach(c=>(eff[c]=eff[c]||[]).push(a.v-b.v)); });
  const E=Object.entries(eff).filter(([,d])=>d.length>=2).map(([c,d])=>{ const m=d.reduce((x,y)=>x+y,0)/d.length; return `<div style="margin:4px 0">${esc(LVN[c]||c)}: <b>${m>0?'+':''}${m.toFixed(1)}</b> <small class="muted">avg over ${d.length} times</small></div>`; }).join('');
  return `<section class="card" style="margin-bottom:14px"><h2>📈 Your patterns</h2><p class="muted" style="margin:4px 0">Last 14 days, average energy by time of day.</p>${rows||'<p class="muted">Log a few ratings and your pattern shows up here.</p>'}<h3 class="muted" style="margin:12px 0 2px;font-size:14px">What seems to lift or drop you</h3>${E||'<p class="muted" style="margin:4px 0">Rate before a lever, then again 30–90 minutes after. It needs 2 or more tries per lever.</p>'}<p class="muted" style="margin:10px 0 0;font-size:13px">Small samples, so compare and don’t judge. Tired all the time despite enough rest? Mention it to a doctor.</p></section>`; }
function enHTML(){ const t0=todayStr(), ds=enDay(), isT=ds===t0, sl=sleepDoc(me.uid,ds), t12=x=>new Date('2000-01-01T'+x).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}), E=enEntries(ds), R=E.filter(f=>f.v), D=enDayDoc(ds), nb=PK.eb.length, sug=[4,3,2,2,1][nb];
  const X=h=>22+h/24*310, Y=v=>10+(5-v)/4*116, f1=n=>n.toFixed(1), pts=R.map(f=>[X(hrs(f.ts)),Y(f.v),f]);
  const svg=`<svg viewBox="0 0 340 152" style="width:100%;height:auto" role="img" aria-label="Energy through the day">${[1,2,3,4,5].map(v=>`<line x1="22" x2="332" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)"/><text x="16" y="${Y(v)+3}" font-size="9" text-anchor="end" fill="currentColor" opacity=".6">${v}</text>`).join('')}${[0,4,8,12,16,20,24].map(h=>`<text x="${X(h)}" y="150" font-size="9" text-anchor="middle" fill="currentColor" opacity=".6">${h}</text>`).join('')}${pts.length>1?`<polyline points="${pts.map(q=>f1(q[0])+','+f1(q[1])).join(' ')}" fill="none" stroke="var(--me)" stroke-width="2"/>`:''}${pts.map(([x,y,f])=>`<circle cx="${f1(x)}" cy="${f1(y)}" r="4" fill="var(--me)"/>${f.t?`<text x="${f1(x)}" y="${f1(y-7)}" font-size="10" font-weight="700" text-anchor="middle" fill="#e0457b">T</text>`:''}`).join('')}${E.filter(f=>(f.lv||[]).length).map(f=>`<text x="${f1(X(hrs(f.ts)))}" y="140" font-size="9" text-anchor="middle" fill="currentColor">${f.lv[0]}</text>`).join('')}</svg>`;
  return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost small" data-emo="-1" aria-label="Previous day">‹</button><div style="text-align:center"><b>${isT?'Today':pDay(ds)}</b>${isT?'':`<div><button class="btn ghost small" data-emo="0" style="margin-top:4px">Back to today</button></div>`}</div><button class="btn ghost small" data-emo="1" aria-label="Next day"${isT?' disabled':''}>›</button></div></section>`+
  (isT?`<section class="card" style="margin-bottom:14px"><h2>⚡ How’s your energy right now?</h2><div class="dchips" style="grid-template-columns:repeat(5,1fr);margin-top:8px">${[1,2,3,4,5].map(n=>`<button class="dchip" data-env="${n}" aria-label="Energy ${n}, ${ENL[n]}" style="height:48px;font-size:18px">${n}</button>`).join('')}</div><div class="dchips" style="grid-template-columns:repeat(5,1fr);margin-top:4px">${[1,2,3,4,5].map(n=>`<small class="muted" style="text-align:center;font-size:11px">${ENL[n]}</small>`).join('')}</div><button class="btn ${PK.et?'':'ghost '}small" data-etog style="margin-top:10px">T · tense or anxious${PK.et?' ✓':''}</button><p class="muted" style="margin:6px 0 0;font-size:13px">Turn T on first if you feel tense, then tap your number.</p>
  <details style="margin-top:10px"><summary class="muted">Not sure? Quick body check</summary><div style="margin-top:6px">${['eyes heavy or dry','yawning or slumping','brain foggy','hard to start a boring task'].map((x,i)=>`<div class="ptask"><button class="pchk" data-ebody="${i}" aria-label="${x}">${PK.eb.includes(i)?'☑':'☐'}</button><span class="ptxt">${x}</span></div>`).join('')}<p style="margin:6px 0 0">More ticks means a lower number. Suggests about <b>${sug}</b>. Sad but wide awake is still a 4.</p></div></details></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>🧪 Log a lever</h2><p class="muted" style="margin:4px 0 8px">Tap when you do one. It’s stamped with the time.</p><div class="row" style="gap:6px;flex-wrap:wrap">${LV.map(([c,n])=>`<button class="btn ghost small" data-elv="${c}" aria-label="Log ${n}">${n}</button>`).join('')}</div></section>`:'')+
  `<section class="card" style="margin-bottom:14px"><h2>Your day</h2>${svg}<small class="muted">Hours of the day along the bottom. T marks a tense moment, letters mark levers.</small></section>`+
  `<section class="card" style="margin-bottom:14px"><div class="row" style="gap:6px;flex-wrap:nowrap"><div style="flex:1;min-width:0"><small class="muted">Sleep (from your Sleep tab)</small><div>${sl?`${t12(sl.bed)} → ${t12(sl.wake)} · ${sl.hours}h`:'<span class="muted">Not logged yet</span>'}</div></div><label style="flex:1;min-width:0"><small class="muted">Cycle day (optional)</small><input type="number" inputmode="numeric" data-eday="cd" value="${esc(String(D.cd===undefined?'':D.cd))}" aria-label="Cycle day" style="width:100%"></label></div><textarea data-eday="note" rows="2" placeholder="Notes for the day" aria-label="Notes" style="width:100%;margin-top:8px">${esc(D.note||'')}</textarea>${E.map(f=>`<div class="ptask"><span class="ptxt"><b>${tm(f.ts)}</b> ${f.v?`${f.v} · ${ENL[f.v]}${f.t?' · tense':''}`:''}${(f.lv||[]).map(c=>' '+esc(LVN[c]||c)).join('')}</span><button class="pdel" data-fdel="${f.id}" aria-label="Delete">✕</button></div>`).join('')}</section>`+enPatterns(); }
async function addDeadline(){ const t=PD.dt.trim(); if(!t||!PD.dd){ toast('Add a title and a date'); return; }
  const d={kind:'deadline',by:me.uid,title:t.slice(0,120),course:PD.dc.trim().slice(0,60),date:PD.dd,done:false,doneOn:null,at:Date.now()}; PD.dt=PD.dc=PD.dd=''; calSel='';
  await addDoc(collection(cref(),'fun'),d); }
async function addChore(area,title){ title=(title||'').trim(); if(!title) return;
  await addDoc(collection(cref(),'fun'),{kind:'chore',by:me.uid,area,title:title.slice(0,80),sched:[],ld:[],at:Date.now()}); }
const pTaskRow=f=>`<div class="ptask${f.done?' done':''}"><button class="pchk" data-ptog="${f.id}" aria-label="${f.done?'Mark as not done':'Mark as done'}">${f.done?'☑':'☐'}</button><span class="ptxt">${esc(f.text)}</span>${f.date?'':`<button class="pmv" data-ptoday="${f.id}" aria-label="Move to today" title="Move to today">📅</button>`}<button class="pdel" data-pdel="${f.id}" aria-label="Delete">✕</button></div>`;
const pAddRow=(sc,date,ph)=>`<div class="row" style="gap:6px;margin-top:8px"><input id="pin${sc}-${date||'errand'}" data-pin="1" maxlength="200" placeholder="${ph}" aria-label="${ph}" style="flex:1;min-width:0"><button class="btn small" data-padd="${date}">Add</button></div>`;
function planBind(root){
  root.querySelectorAll('[data-ptog]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.ptog); if(f) updateDoc(pRef(f.id),{done:!f.done,doneOn:f.done?null:todayStr()}); });
  root.querySelectorAll('[data-pdel]').forEach(b=>b.onclick=()=>deleteDoc(pRef(b.dataset.pdel)));
  root.querySelectorAll('[data-ptoday]').forEach(b=>b.onclick=()=>updateDoc(pRef(b.dataset.ptoday),{date:todayStr()}));
  root.querySelectorAll('[data-padd]').forEach(b=>{ const inp=b.parentElement.querySelector('input'); const go=()=>{ const v=inp.value.trim(); if(!v) return; inp.value=''; addTask(v,b.dataset.padd||null); }; b.onclick=go; inp.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); go(); } }; });
  root.querySelectorAll('[data-pcarry]').forEach(b=>b.onclick=()=>{ const t=todayStr(); myTasks().filter(f=>f.date&&f.date<t&&!f.done&&f.date>=pdate(t,-14)).forEach(f=>updateDoc(pRef(f.id),{date:t})); });
  root.querySelectorAll('[data-pclear]').forEach(b=>b.onclick=()=>myTasks().filter(f=>!f.date&&f.done).forEach(f=>deleteDoc(pRef(f.id))));
  root.querySelectorAll('[data-pwk]').forEach(b=>b.onclick=()=>{ planWk=b.dataset.pwk==='0'?0:planWk+(+b.dataset.pwk); renderPlan(); });
  root.querySelectorAll('[data-ptab]').forEach(b=>b.onclick=()=>{ planTab=b.dataset.ptab; calSel=''; renderPlan(); $('planmodal').scrollTop=0; });
  root.querySelectorAll('[data-calopen]').forEach(b=>b.onclick=()=>{ const k=b.dataset.calopen; calOpen[k]=!calOpen[k]; renderPlan(); });
  root.querySelectorAll('[data-cal]').forEach(b=>b.onclick=()=>{ calOff=b.dataset.cal==='0'?0:calOff+(+b.dataset.cal); renderPlan(); });
  root.querySelectorAll('[data-cald]').forEach(b=>b.onclick=()=>{ calSel=calSel===b.dataset.cald?'':b.dataset.cald; renderPlan(); });
  root.querySelectorAll('[data-dtog]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.dtog); if(f) updateDoc(pRef(f.id),{done:!f.done,doneOn:f.done?null:todayStr()}); });
  root.querySelectorAll('[data-ddel]').forEach(b=>b.onclick=()=>deleteDoc(pRef(b.dataset.ddel)));
  root.querySelectorAll('[data-ctog]').forEach(b=>b.onclick=()=>{ const [id,ds]=b.dataset.ctog.split('|'), f=fun.find(x=>x.id===id); if(!f) return; const a=new Set(f.ld||[]); a.has(ds)?a.delete(ds):a.add(ds); updateDoc(pRef(id),{ld:[...a].sort().slice(-90)}); });
  root.querySelectorAll('[data-cdel]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.cdel); if(f&&confirm('Delete “'+f.title+'”?')) deleteDoc(pRef(f.id)); });
  root.querySelectorAll('[data-cpre]').forEach(b=>b.onclick=()=>{ const [a,i]=b.dataset.cpre.split(':'); addChore(a,PRE[a][+i]); });
  root.querySelectorAll('[data-csch]').forEach(b=>b.onclick=()=>{ const [id,ds]=b.dataset.csch.split('|'), f=fun.find(x=>x.id===id); if(f) schedChore(id,ds,!(f.sched||[]).includes(ds)); });
  root.querySelectorAll('[data-cun]').forEach(b=>{ const [id,ds]=b.dataset.cun.split('|'); b.onclick=()=>schedChore(id,ds,false); });
  root.querySelectorAll('[data-cpick]').forEach(sel=>sel.onchange=()=>{ if(sel.value) schedChore(sel.value,sel.dataset.cpick,true); });
  root.querySelectorAll('[data-dadd]').forEach(b=>b.onclick=addDeadline);
  root.querySelectorAll('[data-cadd]').forEach(b=>b.onclick=()=>{ if(!PD.ct.trim()){ toast('Add a name first'); return; } const t=PD.ct; PD.ct=''; addChore(b.dataset.cadd,t); });
  root.querySelectorAll('[data-draft]').forEach(i=>{ i.oninput=()=>{ PD[i.dataset.draft]=i.value; }; i.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); const b=root.querySelector(i.dataset.draft[0]==='d'?'[data-dadd]':'[data-cadd]'); if(b) b.click(); } }; });
  root.querySelectorAll('[data-kin]').forEach(i=>i.oninput=i.onchange=()=>{ PK[i.dataset.kin]=i.value; });
  root.querySelectorAll('[data-kadd]').forEach(b=>b.onclick=addClass);
  root.querySelectorAll('[data-aadd]').forEach(b=>b.onclick=addStudyGoal);
  root.querySelectorAll('[data-ktog]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.ktog); if(f) updateDoc(pRef(f.id),{done:!f.done}); });
  root.querySelectorAll('[data-kdel]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this class?')) deleteDoc(pRef(b.dataset.kdel)); });
  root.querySelectorAll('[data-atog]').forEach(b=>b.onclick=()=>{ const [id,i]=b.dataset.atog.split('|'), g=fun.find(x=>x.id===id); if(!g) return; const T=g.topics.map(x=>({...x})); T[+i].done=!T[+i].done; updateDoc(pRef(id),{topics:T}); });
  root.querySelectorAll('[data-amv]').forEach(sel=>sel.onchange=()=>{ const [id,i]=sel.dataset.amv.split('|'), g=fun.find(x=>x.id===id); if(!g) return; const T=g.topics.map(x=>({...x})); T[+i].d=sel.value; updateDoc(pRef(id),{topics:T}); });
  root.querySelectorAll('[data-adel]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this weekly goal?')) deleteDoc(pRef(b.dataset.adel)); });
  root.querySelectorAll('[data-fbuy]').forEach(b=>b.onclick=addBuy);
  root.querySelectorAll('[data-fmon]').forEach(b=>b.onclick=addMoney);
  root.querySelectorAll('[data-fset]').forEach(b=>b.onclick=setTargets);
  root.querySelectorAll('[data-fmo]').forEach(b=>b.onclick=()=>{ finOff=b.dataset.fmo==='0'?0:finOff+(+b.dataset.fmo); renderPlan(); });
  root.querySelectorAll('[data-ftog]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.ftog); if(f) updateDoc(pRef(f.id),{done:!f.done}); });
  root.querySelectorAll('[data-fdel]').forEach(b=>b.onclick=()=>{ if(confirm('Delete this?')) deleteDoc(pRef(b.dataset.fdel)); });
  root.querySelectorAll('[data-fsub]').forEach(b=>b.onclick=()=>{ finSub=b.dataset.fsub; renderPlan(); });
  root.querySelectorAll('[data-bset]').forEach(i=>i.onchange=()=>budSave({[i.dataset.bset]:Math.max(0,+i.value||0)}));
  root.querySelectorAll('[data-bcat]').forEach(i=>i.onchange=()=>{ const [k,f]=i.dataset.bcat.split('|'), C=curBud().cats.map(c=>({...c})); C[+k][f]=f==='p'?Math.max(0,+i.value||0):(i.value.trim().slice(0,30)||C[+k].n); budSave({cats:C}); });
  root.querySelectorAll('[data-bcadd]').forEach(b=>b.onclick=()=>{ const n=PK.cn.trim(); if(!n){ toast('Name the category'); return; } budSave({cats:[...curBud().cats,{n:n.slice(0,30),p:Math.max(0,+PK.cp||0)}]}); PK.cn=PK.cp=''; });
  root.querySelectorAll('[data-bcdel]').forEach(b=>b.onclick=()=>budSave({cats:curBud().cats.filter((_,i)=>i!==+b.dataset.bcdel)}));
  root.querySelectorAll('[data-sadd]').forEach(b=>b.onclick=addSpend);
  root.querySelectorAll('[data-gadd]').forEach(b=>b.onclick=addBig);
  root.querySelectorAll('[data-gfund]').forEach(b=>b.onclick=()=>{ const g=fun.find(x=>x.id===b.dataset.gfund), v=+$('gf-'+b.dataset.gfund).value; if(g&&v>0) updateDoc(pRef(g.id),{saved:(+g.saved||0)+v}); });
  root.querySelectorAll('[data-gdone]').forEach(b=>b.onclick=()=>{ const g=fun.find(x=>x.id===b.dataset.gdone); if(g) updateDoc(pRef(g.id),{done:!g.done}); });
  root.querySelectorAll('[data-qadd]').forEach(b=>b.onclick=addQuest);
  root.querySelectorAll('[data-qdone]').forEach(b=>b.onclick=()=>{ const q=fun.find(x=>x.id===b.dataset.qdone); if(q) updateDoc(pRef(q.id),{done:!q.done}); });
  root.querySelectorAll('[data-qstep]').forEach(b=>b.onclick=()=>{ const q=fun.find(x=>x.id===b.dataset.qstep), v=$('qs-'+b.dataset.qstep).value.trim(); if(q&&v) updateDoc(pRef(q.id),{steps:[...(q.steps||[]),{t:v.slice(0,100),done:false}]}); });
  root.querySelectorAll('[data-qtog]').forEach(b=>b.onclick=()=>{ const [id,i]=b.dataset.qtog.split('|'), q=fun.find(x=>x.id===id); if(!q) return; const S=q.steps.map(x=>({...x})); S[+i].done=!S[+i].done; updateDoc(pRef(id),{steps:S}); });
  root.querySelectorAll('[data-qsdel]').forEach(b=>b.onclick=()=>{ const [id,i]=b.dataset.qsdel.split('|'), q=fun.find(x=>x.id===id); if(q) updateDoc(pRef(id),{steps:q.steps.filter((_,k)=>k!==+i)}); });
  root.querySelectorAll('[data-qspend]').forEach(b=>b.onclick=()=>{ const q=fun.find(x=>x.id===b.dataset.qspend), v=+$('qp-'+b.dataset.qspend).value; if(q&&v>0) updateDoc(pRef(q.id),{spent:(+q.spent||0)+v}); });
  root.querySelectorAll('[data-badd]').forEach(b=>b.onclick=addBill);
  root.querySelectorAll('[data-eadd]').forEach(b=>b.onclick=addExam);
  root.querySelectorAll('[data-bren]').forEach(b=>b.onclick=()=>{ const f=fun.find(x=>x.id===b.dataset.bren); if(!f||!f.date) return; let d=new Date(f.date+'T12:00'), n=0; do{ f.freq==='year'?d.setFullYear(d.getFullYear()+1):d.setMonth(d.getMonth()+1); n++; }while(fmt(d)<todayStr()&&n<36); updateDoc(pRef(f.id),{date:fmt(d)}); });
  root.querySelectorAll('[data-env]').forEach(b=>b.onclick=()=>logEn(+b.dataset.env,''));
  root.querySelectorAll('[data-elv]').forEach(b=>b.onclick=()=>logEn(0,b.dataset.elv));
  root.querySelectorAll('[data-etog]').forEach(b=>b.onclick=()=>{ PK.et=PK.et?'':'1'; renderPlanBox(); if(!$('planmodal').classList.contains('hidden')) renderPlan(); });
  root.querySelectorAll('[data-ebody]').forEach(b=>b.onclick=()=>{ const k=b.dataset.ebody; PK.eb=PK.eb.includes(k)?PK.eb.replace(k,''):PK.eb+k; renderPlan(); });
  root.querySelectorAll('[data-emo]').forEach(b=>b.onclick=()=>{ enOff=b.dataset.emo==='0'?0:Math.min(0,enOff+(+b.dataset.emo)); renderPlan(); });
  root.querySelectorAll('[data-eday]').forEach(i=>i.onchange=()=>saveEnDay({[i.dataset.eday]:i.dataset.eday==='cd'?(i.value===''?'':Math.max(1,Math.min(60,+i.value||1))):i.value.slice(0,300)}));
  root.querySelectorAll('[data-eopen]').forEach(b=>b.onclick=()=>{ enOpen=!enOpen; renderPlan(); });
  root.querySelectorAll('[data-pback]').forEach(b=>b.onclick=()=>closePlan());
}
function planTodayHTML(sc){
  const t=todayStr(), L=myTasks().filter(f=>f.date===t), X=choresOn(null,t), K=xOn(t), n=L.length+X.length+K.n, dn=L.filter(f=>f.done).length+X.filter(f=>choreDone(f,t)).length+K.dn;
  return `<section class="card" style="margin-bottom:14px" aria-label="Today's tasks"><div class="row" style="justify-content:space-between;align-items:center"><h2>📝 Today</h2><span class="muted">${n?`${dn}/${n} done`:'Nothing planned yet'}</span></div>${L.map(pTaskRow).join('')}${X.map(f=>chRow(f,t)).join('')}${K.html}${examLine()}${enQuick()}${pAddRow(sc,t,'Add something for today…')}</section>`;
}
function renderPlanBox(){
  const el=$('planbox'); if(!el||!me) return;
  el.innerHTML=planTodayHTML('d'); planBind(el);
}
/* the small 📝 chip in the header shows how many of today's tasks are left */
function renderPlanChip(){
  const b=$('planbtn'); if(!b||!me) return;
  const t=todayStr(), L=myTasks().filter(f=>f.date===t), X=choresOn(null,t), K=xOn(t), n=L.length+X.length+K.n, left=L.filter(f=>!f.done).length+X.filter(f=>!choreDone(f,t)).length+(K.n-K.dn);
  b.innerHTML=`<span aria-hidden="true">📝</span>${n?`<span class="pbub">${left||'✓'}</span>`:''}`;
  b.setAttribute('aria-label','Planner'+(n?(left?`: ${left} left today`:': all done today'):''));
}
function errandsHTML(){ const E=myTasks().filter(f=>!f.date);
  return `<section class="card" style="margin-bottom:14px"><h2>🛒 Errands</h2><p class="muted" style="margin:4px 0">No date needed. Tap 📅 to move one to today.</p>${E.map(pTaskRow).join('')||'<p class="muted">No errands waiting.</p>'}${pAddRow('p','','Add an errand…')}${E.some(f=>f.done)?'<button class="btn ghost small" data-pclear style="margin-top:8px">Clear done errands</button>':''}</section>`; }
function planWeekHTML(){
  const t0=todayStr(), now=new Date(); now.setDate(now.getDate()-((now.getDay()+6)%7)+planWk*7);
  const days=[0,1,2,3,4,5,6].map(i=>pdate(fmt(now),i)), T=myTasks();
  const wk=T.filter(f=>days.includes(f.date)), wd=wk.filter(f=>f.done).length, E=T.filter(f=>!f.date), late=T.filter(f=>f.date&&f.date<t0&&!f.done&&f.date>=pdate(t0,-14)).length;
  return `<section class="card" style="margin-bottom:14px"><div class="row" style="justify-content:space-between;align-items:center"><button class="btn ghost small" data-pwk="-1" aria-label="Previous week">‹</button><div style="text-align:center"><b>${pShort(days[0])} – ${pShort(days[6])}</b><div class="muted" style="font-size:13px">${planWk===0?'This week · ':''}${wd}/${wk.length} done</div></div><button class="btn ghost small" data-pwk="1" aria-label="Next week">›</button></div>${planWk?`<button class="btn ghost small" data-pwk="0" style="margin-top:8px">Back to this week</button>`:''}${myDocs('chore').length?'':'<p class="muted" style="margin:8px 0 0;font-size:13px">Add your home &amp; self-care tasks in the 🏠 and 🧴 tabs, then pick a day for each one here.</p>'}${late?`<button class="btn ghost small" data-pcarry style="margin-top:8px">↪ Move ${late} unfinished from earlier to today</button>`:''}</section>`+
  days.map(d=>{ const L=T.filter(f=>f.date===d), dn=L.filter(f=>f.done).length; return `<section class="card" style="margin-bottom:14px;${d===t0?'border-color:var(--me)':''}"><div class="row" style="justify-content:space-between"><b>${pDay(d)}${d===t0?' · today':''}</b><span class="muted">${L.length?`${dn}/${L.length}`:''}</span></div>${L.map(pTaskRow).join('')}${xOn(d).html}${pAddRow('p',d,'Add for this day…')}${(()=>{ const X=choresOn(null,d); return (X.length?`<small class="muted" style="display:block;margin-top:10px">Home &amp; self-care</small>${X.map(f=>chRow(f,d)).join('')}`:'')+pickHTML(d,''); })()}</section>`; }).join('');
}
function calHTML(dot,list){
  const b=new Date(); b.setDate(1); b.setMonth(b.getMonth()+calOff);
  const y=b.getFullYear(), m=b.getMonth(), lead=(new Date(y,m,1).getDay()+6)%7, nd=new Date(y,m+1,0).getDate(), t0=todayStr();
  let cells='<i></i>'.repeat(lead);
  for(let d=1;d<=nd;d++){ const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, x=dot(ds);
    cells+=`<button class="cald${ds===t0?' today':''}${ds===calSel?' sel':''}" data-cald="${ds}" aria-label="${ds}${x.n?', '+x.n+' item'+(x.n>1?'s':''):''}">${d}${x.n?`<b class="${x.open?(ds<t0?'late':''):'ok'}"></b>`:''}</button>`; }
  return `<div class="row" style="justify-content:space-between;align-items:center;margin-bottom:8px"><button class="btn ghost small" data-cal="-1" aria-label="Previous month">‹</button><b>${b.toLocaleDateString(undefined,{month:'long',year:'numeric'})}</b><button class="btn ghost small" data-cal="1" aria-label="Next month">›</button></div>`+
  `<div class="calg">${['M','T','W','T','F','S','S'].map(x=>`<span class="calh">${x}</span>`).join('')}${cells}</div>${calOff?'<button class="btn ghost small" data-cal="0" style="margin-top:8px">Back to this month</button>':''}`+
  `<div style="margin-top:10px">${calSel?`<b>${pDay(calSel)}</b>${list(calSel)||'<p class="muted" style="margin:4px 0">Nothing on this day.</p>'}`:'<p class="muted" style="margin:4px 0">Tap a day to see what’s on it.</p>'}</div>`;
}
const calBox=(k,sub)=>`<button class="calbox" data-calopen="${k}" aria-expanded="${!!calOpen[k]}"><span style="float:right">${calOpen[k]?'▾':'▸'}</span>📅 <b>${k==='college'?'Deadlines calendar':k==='home'?'Home calendar':k==='care'?'Self-care calendar':'Growth calendar'}</b><div class="muted" style="font-size:13px;margin-top:2px">${sub}</div></button>`;
function collegeHTML(){
  const t0=todayStr(), D=myDocs('deadline').sort(byDate), op=D.filter(f=>!f.done), nx=op.find(f=>f.date>=t0)||op[0], by={};
  D.forEach(f=>{ (by[f.date]=by[f.date]||[]).push(f); });
  const row=f=>{ const late=!f.done&&f.date<t0; return `<div class="ptask${f.done?' done':''}"><button class="pchk" data-dtog="${f.id}" aria-label="${f.done?'Mark as not done':'Mark as done'}">${f.done?'☑':'☐'}</button><span class="ptxt"><b>${esc(f.title)}</b>${f.course?` <span class="muted">· ${esc(f.course)}</span>`:''}<br><small class="${late?'plate':'muted'}">${esc(dueLabel(f.date))}</small></span><button class="pdel" data-ddel="${f.id}" aria-label="Delete">✕</button></div>`; };
  const sec=(h,L)=>L.length?`<h3 class="muted" style="margin:12px 0 2px;font-size:14px">${h}</h3>${L.map(row).join('')}`:'';
  const over=op.filter(f=>f.date<t0), soon=op.filter(f=>f.date>=t0), dn=D.filter(f=>f.done);
  const dot=ds=>{ const L=by[ds]||[]; return {n:L.length,open:L.filter(f=>!f.done).length}; }, list=ds=>(by[ds]||[]).map(row).join('');
  return calBox('college',nx?'Next: '+esc(nx.title)+' · '+esc(dueLabel(nx.date)):'No deadlines yet')+
  (calOpen.college?`<section class="card" style="margin-bottom:14px">${calHTML(dot,list)}</section>`:'')+
  `<section class="card" style="margin-bottom:14px"><h2>🎓 Add a deadline</h2><div style="display:grid;gap:6px;margin-top:6px"><input id="drdt" data-pin="1" data-draft="dt" value="${esc(PD.dt)}" maxlength="120" placeholder="What’s due? (e.g. Essay draft)"><input id="drdc" data-pin="1" data-draft="dc" value="${esc(PD.dc)}" maxlength="60" placeholder="Course (optional)"><input id="drdd" type="date" data-pin="1" data-draft="dd" value="${esc(PD.dd)}" aria-label="Due date"><button class="btn small" data-dadd>Add deadline</button></div></section>`+
  `<section class="card" style="margin-bottom:14px"><h2>Coming up</h2>${op.length?sec('Overdue',over)+sec('Upcoming',soon):'<p class="muted">No open deadlines. 🎉</p>'}${sec('Done (cleared after a week)',dn)}</section>`;
}
function choreHTML(area){
  const home=area==='home', t0=todayStr(), W=planWeek(), L=myDocs('chore').filter(f=>f.area===area).sort((a,b)=>(a.at||0)-(b.at||0)), have=new Set(L.map(f=>f.title.toLowerCase()));
  const td=choresOn(area,t0), left=td.filter(f=>!choreDone(f,t0)).length;
  const dot=ds=>{ const X=choresOn(area,ds); return {n:X.length,open:X.filter(f=>!choreDone(f,ds)).length}; }, list=ds=>choresOn(area,ds).map(f=>chRow(f,ds)).join('')+pickHTML(ds,area);
  const chips=PRE[area].map((n,i)=>have.has(n.toLowerCase())?'':`<button class="btn ghost small" data-cpre="${area}:${i}" style="margin:0 6px 6px 0">＋ ${esc(n)}</button>`).join('');
  const cr=f=>`<div style="padding:8px 0;border-bottom:1px solid var(--line)"><div class="row" style="justify-content:space-between;align-items:center"><b class="ptxt">${esc(f.title)}${choreDone(f,t0)?' ✓':''}</b><button class="pdel" data-cdel="${f.id}" aria-label="Delete task" title="Delete task">🗑</button></div><div class="dchips sm">${W.map((ds,i)=>`<button class="dchip${(f.sched||[]).includes(ds)?' on':''}" data-csch="${f.id}|${ds}" aria-label="${pDay(ds)}">${DN[i]}</button>`).join('')}</div></div>`;
  return calBox(area,td.length?(left?`Today: ${left} to do`:'Today: all done ✓'):'Nothing planned today')+
  (calOpen[area]?`<section class="card" style="margin-bottom:14px">${calHTML(dot,list)}</section>`:'')+
  `<section class="card" style="margin-bottom:14px"><h2>${AREA[area][0]} ${AREA[area][1]}</h2><div class="row" style="justify-content:space-between;align-items:center;margin:8px 0 4px"><button class="btn ghost small" data-pwk="-1" aria-label="Previous week">‹</button><div style="text-align:center"><b>${pShort(W[0])} – ${pShort(W[6])}</b><div class="muted" style="font-size:13px">${planWk===0?'This week':'Planning ahead'}</div></div><button class="btn ghost small" data-pwk="1" aria-label="Next week">›</button></div>${planWk?`<button class="btn ghost small" data-pwk="0" style="margin-bottom:4px">Back to this week</button>`:''}<p class="muted" style="margin:4px 0 6px">Tap the days you’ll do each one this week. It then shows on those days in your weekly plan.</p>${L.map(cr).join('')||'<p class="muted">Nothing here yet. Add your tasks below.</p>'}</section>`+
  `<section class="card" style="margin-bottom:14px"><h2>Add a task</h2><div class="row" style="gap:6px;margin-top:6px"><input id="drct" data-pin="1" data-draft="ct" value="${esc(PD.ct)}" maxlength="80" placeholder="${home?'e.g. Clean the oven':area==='care'?'e.g. Moisturise hands':'e.g. 🧠 Read an article'}" style="flex:1;min-width:0"><button class="btn small" data-cadd="${area}">Add</button></div>${chips?`<p class="muted" style="margin:10px 0 4px">Quick adds</p>${chips}`:''}</section>`;
}
let enOpen=false;
const PT={plan:['📝','Week plan & energy','#e0457b'],college:['🎓','College','#3b82f6'],home:['🏠','Home maintenance','#f2b134'],care:['🧴','Self-care','#ff7a90'],grow:['🌱','Self-improvement','#22a06b'],class:['🧑‍🏫','Classes','#8b5cf6'],fin:['💰','Money','#14b8a6']};
function tileSub(k){ try{ const t=todayStr();
  if(k==='plan'){ const L=myTasks().filter(f=>f.date===t), X=choresOn(null,t), K=xOn(t), n=L.length+X.length+K.n, left=L.filter(f=>!f.done).length+X.filter(f=>!choreDone(f,t)).length+(K.n-K.dn); return n?(left?`${left} left today`:'All done today ✓'):'Nothing planned yet'; }
  if(k==='college'){ const e=exams()[0]; if(e){ const d=dueDiff(e.date); return `🎓 ${e.title} · ${d===0?'today':d+' day'+(d>1?'s':'')+' to go'}`; } const o=myDocs('deadline').filter(f=>!f.done).sort(byDate)[0]; return o?'Next: '+o.title:'Exams, deadlines, study goals'; }
  if(['home','care','grow'].includes(k)){ const X=choresOn(k,t), l=X.filter(f=>!choreDone(f,t)).length; return X.length?(l?`Today: ${l} to do`:'Today: all done ✓'):'Nothing picked today'; }
  if(k==='class'){ const n=myDocs('class').filter(f=>f.date===t).length; if(n) return `${n} class${n>1?'es':''} today`; const nx=myDocs('class').filter(f=>f.date>t).sort(byDate)[0]; return nx?'Next: '+pShort(nx.date):'No classes yet'; }
  if(k==='fin'){ const sp=sumA(myDocs('spd').filter(f=>f.mo===t.slice(0,7))), bm=Math.round(billsM()); return sp?`${rs(sp)} spent this month`:bm?`${rs(bm)}/month in bills`:'Budget, bills, big buys'; }
 }catch(e){} return ''; }
function planGrid(){ const tile=k=>{ const [ic,nm,c]=PT[k], big=k==='plan'; return `<button class="ptile" data-ptab="${k}" style="--c:${c};${big?'grid-column:1/-1;min-height:92px':''}"><span class="pe" style="font-size:${big?34:28}px">${ic}</span><b>${nm}</b><small class="muted">${esc(tileSub(k))}</small></button>`; };
  return `<p class="muted" style="margin:0 2px 12px">More of your planner ✨</p><div class="ptiles">${['plan','college','home','care','grow','class','fin'].map(tile).join('')}</div>`; }
/* partner's latest energy today (level + time only, nothing else from their check-ins is shown) */
const partnerEn=()=>{ const pid=couple&&me?partnerId():null; return pid?fun.filter(f=>f.kind==='en'&&f.by===pid&&f.date===todayStr()&&f.v).sort((a,b)=>a.ts-b.ts).pop()||null:null; };
function energyBox(){ const L=enEntries(todayStr()).filter(f=>f.v).pop(), PE=partnerEn(), pid=couple&&me?partnerId():null;
  const pline=pid?`<div class="muted" style="font-size:13px;margin-top:2px">💗 ${esc(nameOf(pid))}: ${PE?`${PE.v} (${ENL[PE.v]}) at ${tm(PE.ts)}`:'no check-in yet today'}</div>`:'';
  return `<button class="calbox" data-eopen aria-expanded="${enOpen}"><span style="float:right">${enOpen?'▾':'▸'}</span>⚡ <b>Energy</b><div class="muted" style="font-size:13px;margin-top:2px">${L?`You: ${L.v} (${ENL[L.v]}) at ${tm(L.ts)}`:'Log how you feel, levers and your day graph'}</div>${pline}</button>${enOpen?enHTML():''}`; }
function renderPlan(){
  const el=$('planbody'); if(!el||!me) return;
  const pt=PT[planTab], head=pt?`<button class="btn ghost small" data-ptab="" aria-label="Back to planner">‹</button><b style="flex:1;font-size:17px">${pt[0]} ${pt[1]}</b>`:`<b style="flex:1;font-size:19px">✨ Planner</b>`;
  el.innerHTML=`<section class="card" style="margin-bottom:14px;position:sticky;top:0;z-index:2"><div class="row" style="gap:8px;flex-wrap:nowrap;align-items:center">${head}<button class="btn ghost small" data-pback aria-label="Close planner">✕</button></div></section>`+
    (!pt?planTodayHTML('m')+errandsHTML()+planGrid():planTab==='college'?acadHTML()+collegeHTML():planTab==='class'?classHTML():planTab==='fin'?finPage():['home','care','grow'].includes(planTab)?choreHTML(planTab):energyBox()+dailyHTML()+planWeekHTML());
  planBind(el);
}
/* finished tasks are deleted 7 days after you ticked them (checked once per day, mine only) */
let planCleanDay='';
function planClean(){
  const t=todayStr(); if(planCleanDay===t||!funLoaded) return; planCleanDay=t; const cut=pdate(t,-7);
  [...myTasks(),...myDocs('deadline')].filter(f=>f.done&&(f.doneOn||f.date||t)<=cut).forEach(f=>deleteDoc(pRef(f.id)).catch(()=>{}));
}
function planLive(){
  if(!me) return;
  planClean(); bkNudge();
  const sig=JSON.stringify(fun.filter(f=>f.by===me.uid&&(f.kind==='task'||f.kind==='deadline'||f.kind==='chore'||f.kind==='class'||f.kind==='acad'||f.kind==='buy'||f.kind==='mon'||f.kind==='fset')).map(f=>[f.id,f.text||f.title,f.date,f.done,f.sched,f.ld,f.course,f.time,f.topics,f.student,f.amt,f.type,f.save,f.invest,f.mo]))+JSON.stringify(fun.filter(f=>f.by===me.uid&&['bud','spd','goal','quest','bill','exam','en','enday'].includes(f.kind)))+JSON.stringify((partnerEn()||{}).ts||0)+tab+planWk+planTab+calOff+Object.values(calOpen).join()+calSel; if(sig===planSig) return; planSig=sig;
  const ae=document.activeElement, fid=ae&&ae.dataset&&ae.dataset.pin?ae.id:'', fv=fid?ae.value:'', ss=fid?ae.selectionStart:0;
  renderPlanBox(); renderPlanChip(); if(!$('planmodal').classList.contains('hidden')) renderPlan();
  if(fid){ const n=$(fid); if(n){ n.value=fv; n.focus(); try{ n.setSelectionRange(ss,ss); }catch(e){} } }
}
/* ===== PLANNER: end ===== */

async function addIdea(title){ if(!title.trim()) return;
  await addDoc(collection(cref(),'fun'),{kind:'idea',title:title.trim(),by:me.uid,done:false,doneOn:null}); }
async function toggleIdea(f){ await updateDoc(doc(cref(),'fun',f.id), f.done?{done:false,doneOn:null}:{done:true,doneOn:todayStr()}); }
async function deleteIdea(id){ if(confirm('Delete this idea?')) await deleteDoc(doc(cref(),'fun',id)); }

function renderFun(pid){
  const ideas=fun.filter(f=>f.kind==='idea');
  const todo=ideas.filter(f=>!f.done), done=ideas.filter(f=>f.done);
  const row=f=>`<div class="item ${f.done?'done':''}" style="--c:var(--you);cursor:default">
      <button class="box" style="background:${f.done?'var(--bg)':'transparent'};border-color:${f.done?'var(--you)':'var(--line)'};font-size:16px;cursor:pointer" data-id="${f.id}" aria-label="Mark ${f.done?'not done':'done'}">${f.done?'💗':''}</button>
      <span class="t" style="flex:1">${esc(f.title)}${f.done&&f.doneOn?` <span class="tag">${esc(f.doneOn)}</span>`:''}</span>
      <button class="btn ghost small" data-x="${f.id}">Delete</button></div>`;
  const starters=ideas.length===0?`<p class="muted" style="margin:10px 0 0">Tap to add a starter idea:</p><div class="chips">`+
    IDEAS.map((t,i)=>`<button class="chip" data-s="${i}">${esc(t)}</button>`).join('')+`</div>`:'';
  $('v-fun').innerHTML=`
    <div class="card" style="margin-top:14px"><h3>Things to do together</h3>
      <p class="muted" style="margin:4px 0 0">Tick one off when you’ve done it together.</p>
      <div class="row" style="margin-top:10px"><input id="ii" style="flex:1;min-width:200px" placeholder="Add an idea"><button class="btn" id="ia">Add</button></div>
      ${starters}
      <div style="margin-top:8px">${todo.map(row).join('')}</div>
      ${done.length?`<p class="muted" style="margin:16px 0 0">Done together: <b>${done.length}</b></p><div>${done.map(row).join('')}</div>`:''}
    </div>${wishCard()}`;
  $('ia').onclick=()=>addIdea($('ii').value);
  $('ii').onkeydown=e=>{ if(e.key==='Enter') $('ia').click(); };
  $('v-fun').querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>addIdea(IDEAS[b.dataset.s]));
  $('v-fun').querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>toggleIdea(ideas.find(f=>f.id===b.dataset.id)));
  $('v-fun').querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>deleteIdea(b.dataset.x));
  bindWishes();
}

/* ---------- our kitten ---------- */
const CARE=[
  ['water','Drink water','💧',h=>/water|hydrat/i.test(h.name)],
  ['workout','Workout','💪',h=>/workout|exercise|gym|fitness|run|jog|walk|yoga/i.test(h.name)||h.cat==='Fitness'],
  ['study','Study','📚',h=>/study|read|learn|homework|revis|assignment/i.test(h.name)||h.cat==='Growth']
];
const CARE_ALL=[...CARE.slice(0,1).map(c=>[c[0],c[1],c[2]]),['meals','Eat 2+ meals','🍽️'],...CARE.slice(1).map(c=>[c[0],c[1],c[2]]),['sleep','Sleep well','😴']];
const CARE_DEFAULTS={workout:['Workout','Fitness',3],study:['Study','Growth',2]};
const PET_STAGES=[[0,'Newborn kitten'],[20,'Little kitten'],[60,'Playful kitten'],[120,'Young cat'],[220,'Grown cat'],[350,'Royal fluffball']];
const careHabits=(uid,key)=>{ const c=CARE.find(x=>x[0]===key); return c?hOf(uid).filter(c[3]):[]; };
function careDone(uid,key,d){
  if(key==='water'&&waterCount(uid,d)>=WATER_OK) return true;
  if(key==='meals') return cnt('meal_',MEALS,uid,d)>=2;
  if(key==='sleep'){
    const x=sleepDoc(uid,d);
    if(x&&x.hours>=SLEEP_TARGET) return true;
    return hOf(uid).some(h=>/sleep|bedtime|wake/i.test(h.name)&&h.start<=d&&logs.has(logKey(h.id,uid,d)));
  }
  return careHabits(uid,key).some(h=>h.start<=d&&logs.has(logKey(h.id,uid,d)));
}
function petLive(d){
  const mem=couple.members; let pts=0;
  for(const [k] of CARE_ALL){
    const n=mem.filter(u=>careDone(u,k,d)).length;
    pts+= mem.length===1 ? n*2 : n;
  }
  return pts;
}
const petBank=()=>{ const m=new Map(); for(const f of fun) if(f.kind==='petday') m.set(f.date,f.points); return m; };
const petPointsOn=(d,bank)=>bank.has(d)?bank.get(d):petLive(d);
function petXP(){
  const bank=petBank(), today=todayStr(), set=new Set([...bank.keys(),...lastDays(70)]);
  let xp=0;
  for(const d of set) xp+= d===today ? petLive(d) : petPointsOn(d,bank);
  return xp;
}
function petStage(xp){
  let i=0; PET_STAGES.forEach((s,idx)=>{ if(xp>=s[0]) i=idx; });
  return {i,cur:PET_STAGES[i],next:PET_STAGES[i+1]||null};
}
function petMood(xp){
  const bank=petBank(), days=lastDays(3), today=petLive(days[2]);
  const avg=(petPointsOn(days[0],bank)+petPointsOn(days[1],bank))/2;
  if(xp===0&&today===0) return 'ok';
  const score=Math.max(avg,today);
  return score>=5?'happy':(score>=2?'ok':'sleepy');
}
const petName=()=>{ const f=fun.find(x=>x.id==='pet_name'); return (f&&f.name)||'Kitty'; };
async function savePetName(n){
  n=(n||'').trim().slice(0,20); if(!n) return;
  await setDoc(doc(cref(),'fun','pet_name'),{kind:'petname',name:n});
  toast('Named 🐱');
}
const banking=new Set();
function bankPetDays(){
  if(!funLoaded||!couple||!profile) return;
  const bank=petBank(), today=todayStr();
  for(const d of lastDays(70)){
    if(d===today||bank.has(d)||banking.has(d)) continue;
    const pts=petLive(d); if(pts<=0) continue;
    banking.add(d);
    setDoc(doc(cref(),'fun','petday_'+d),{kind:'petday',date:d,points:pts}).catch(()=>banking.delete(d));
  }
}
async function toggleCare(key){
  const d=todayStr();
  if(key==='sleep'){ tab='sleep'; $('kitmodal').classList.add('hidden'); render(); return; }
  if(key==='water'||key==='meals'){ tab='meals'; $('kitmodal').classList.add('hidden'); render(); return; }
  const hs=careHabits(me.uid,key).filter(h=>h.start<=d);
  if(!hs.length){ toast('Add a habit for this first'); return; }
  const done=hs.filter(h=>logs.has(logKey(h.id,me.uid,d)));
  if(done.length){
    for(const h of done) await deleteDoc(doc(db,'couples',profile.coupleId,'logs',logKey(h.id,me.uid,d)));
  }else{
    await setDoc(doc(db,'couples',profile.coupleId,'logs',logKey(hs[0].id,me.uid,d)),{habitId:hs[0].id,uid:me.uid,date:d});
    toast('The kitten says thank you 🐱💗');
  }
}
/* ---------- kitten health: shared, slow and gradual ---------- */
let pokeMsg=null;
const HDAYS=14, DECAY=0.82;
const lerp=(a,b,t)=>a+(b-a)*t, clamp01=x=>Math.max(0,Math.min(1,x));
const mixHex=(a,b,t)=>{ const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const x=p(a),y=p(b);
  return '#'+x.map((n,i)=>Math.round(lerp(n,y[i],t)).toString(16).padStart(2,'0')).join(''); };
function trackStarts(uid){
  const first=(...a)=>a.filter(Boolean).sort()[0]||null;
  return { food:earliestLog(uid,id=>id.startsWith('meal_')||id.startsWith('tea_')||id.startsWith('water_')),
    sleep:earliestFun(uid,'sleep'),
    spirit:first(earliestLog(uid,id=>id.startsWith('prayer_')),earliestFun(uid,'quran')) };
}
function dimDay(dim,uid,d,S){
  if(isSick(uid,d)) return null;
  if(dim==='habits') return dayScore(uid,d);
  const s=S[uid][dim]; if(dim==='spirit'){ if(d>=S.start||(s&&d>=s)) return spiritDay(uid,d); return null; } if(!s||d<s) return null;
  return dim==='food'?foodDay(uid,d):(dim==='sleep'?sleepDay(uid,d):spiritDay(uid,d));
}
/* recent days count most (each older day counts 18% less), so one bad day dents a little and a long streak of bad days sinks it */
function dimHealth(dim,S,prior){
  const days=lastDays(HDAYS+1).reverse(), vals=days.map(d=>avg(couple.members.map(u=>dimDay(dim,u,d,S))));
  if(prior!==undefined) for(let i=1;i<vals.length;i++) if(vals[i]===null) vals[i]=prior;
  let ws=0, wt=0;
  for(let i=1;i<vals.length;i++) if(vals[i]!==null){ const w=Math.pow(DECAY,i); ws+=vals[i]*w; wt+=w; }
  const base=wt?ws/wt:null;
  if(vals[0]!==null){ const exp=clamp01((nowH()-6)/16); ws+=Math.min(1,vals[0]+(1-exp)*(base===null?0.7:base)); wt+=1; }
  return wt?ws/wt:null;
}
/* goals: health drops the longer no open goal has been moved */
function goalHealth(){
  const t=goals.filter(g=>g.touched); if(!t.length) return null;
  const open=t.filter(g=>goalProgress(g)<1); if(!open.length) return 1;
  const lt=Math.max(...open.map(g=>g.touched)), sk=new Set(); for(const dk in (couple&&couple.sick)||{}){ const m=(couple.sick[dk]||{}); if(Object.values(m).some(Boolean)&&dk>=sickKey(fmt(new Date(lt)))) sk.add(dk); }
  const days=Math.max(0,(Date.now()-lt)/864e5-sk.size);
  return days<=2?1:Math.max(0.1,1-(days-2)/14*0.9);
}
const kittenStart=()=>{ const f=fun.find(x=>x.id==='kitten_start'); return (f&&f.date)||todayStr(); };
let startSaving=false;
function ensureKittenStart(){
  if(!funLoaded||!couple||!profile||startSaving||fun.some(x=>x.id==='kitten_start')) return;
  startSaving=true;
  setDoc(doc(cref(),'fun','kitten_start'),{kind:'kittenstart',date:todayStr()}).catch(()=>{ startSaving=false; });
}
const HW={habits:30,food:20,sleep:15,spirit:20,goals:15};
const HLAB={habits:'Habits',food:'Meals',sleep:'Sleep',spirit:'Spirit',goals:'Goals'};
function kittyHealth(){
  const S={}; for(const u of couple.members) S[u]=trackStarts(u); S.start=kittenStart();
  const c={}; for(const k of ['habits','food','sleep','spirit']) c[k]=dimHealth(k,S,k==='spirit'?0.8:undefined);
  c.goals=goalHealth();
  let s=0, w=0; for(const k in HW) if(c[k]!==null){ s+=c[k]*HW[k]; w+=HW[k]; }
  const fresh=!w, v=fresh?0.75:s/w;
  const dark=c.spirit===null?0:clamp01((0.8-c.spirit)/0.7);
  return {c,v,fresh,dark,light:c.spirit!==null&&c.spirit>=0.85&&v>=0.8};
}
const hLabel=v=>v>=0.85?'Glowing':(v>=0.65?'Healthy':(v>=0.45?'Tired':(v>=0.25?'Weak':'Fading')));
const hColor=v=>`hsl(${Math.round(v*120)} 62% 46%)`;

const IMP='<path d="M-9 9 Q-11 -8 0 -11 Q11 -8 9 9 Q5 13 3 9 Q0 13 -3 9 Q-5 13 -9 9Z" fill="#0e0716"/><path d="M-8 -7 L-12 -18 L-3 -10Z M8 -7 L12 -18 L3 -10Z" fill="#0e0716"/><circle cx="-3.6" cy="-2" r="2" fill="#ff3b30"/><circle cx="3.6" cy="-2" r="2" fill="#ff3b30"/><path d="M-4 3.5 q4 3.5 8 0" stroke="#ff3b30" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
const IMPS=[[24,72,1.5,.1],[176,64,1.5,.3],[22,142,1.7,.5],[178,140,1.7,.7],[100,16,1.4,.9]];
const WISPS=['M24 188 q-18 -34 2 -58 q14 -18 -2 -40','M176 188 q18 -34 -2 -58 q-14 -18 2 -40','M52 190 q-12 -26 6 -44','M150 190 q12 -26 -6 -44','M10 150 q16 -14 8 -34','M190 150 q-16 -14 -8 -34'];

function kittenSVG(stage,H,name,size){
  const v=H.v, dk=H.dark, w=clamp01((0.8-v)/0.8), sc=[0.5,0.62,0.74,0.86,0.95,1][stage]||1, u='k'+size;
  /* f must be declared before fur uses it */
  const f=clamp01((v-0.65)/0.3);
  const ink='#24203b', fur=mixHex(mixHex('#f58a1f','#ff9d3a',f),'#9a8b80',w*0.85), belly=mixHex('#ffe3c2','#cfc4b8',w*0.8), pink='#f7a8b8';
  const bx=lerp(52,36,w)+f*6, by=lerp(34,23,w)+f*3, cy=4-by, sad=w*5, bo=Math.min(1,w*1.3).toFixed(2);
  const happy=v>=0.78&&dk<0.3, ery=lerp(6,2.6,w).toFixed(1), m=lerp(8,-6,w), hi=(1-w*1.4).toFixed(2);
  const tail=`M46 -16 C${lerp(82,70,w)} ${lerp(-18,-8,w)} ${lerp(86,82,w)} ${lerp(-62,-2,w)} ${lerp(58,80,w)} ${lerp(-72,10,w)}`;
  const fluff=f>0.12?[[-bx+3,cy+9],[bx-3,cy+9],[-bx+8,cy-11],[bx-8,cy-11],[-bx*0.45,3],[bx*0.45,3]].map(([x,y])=>`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(4+5*f).toFixed(1)}" fill="${fur}"/>`).join('')+`<path d="M-9 ${cy+16} l4.5 9 l4.5 -9 l4.5 9 l4.5 -9Z" fill="${belly}"/><ellipse cx="-12" cy="${cy-9}" rx="15" ry="5" fill="#fff" opacity="${(0.28*f).toFixed(2)}"/>`:'';
  const cheeks=f>0.12?`<path d="M-38 -76 l-9 -2 l6 6 l-9 3 l10 3Z M38 -76 l9 -2 l-6 6 l9 3 l-10 3Z" fill="${fur}" opacity="${f.toFixed(2)}"/>`:'';
  const eyes=happy
    ? `<path d="M-23 -83 q8 -11 16 0 M7 -83 q8 -11 16 0" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="-15" cy="-84" rx="6" ry="${ery}" fill="${ink}"/><ellipse cx="15" cy="-84" rx="6" ry="${ery}" fill="${ink}"/>
       ${w<0.7?`<circle cx="-13" cy="-86" r="2" fill="#fff" opacity="${hi}"/><circle cx="17" cy="-86" r="2" fill="#fff" opacity="${hi}"/>`:''}
       <path d="M-24 ${(-90+sad*0.5).toFixed(1)} L-8 ${(-96-sad*0.6).toFixed(1)} M24 ${(-90+sad*0.5).toFixed(1)} L8 ${(-96-sad*0.6).toFixed(1)}" stroke="${ink}" stroke-width="2.5" stroke-linecap="round" opacity="${bo}"/>`;
  const face=`<ellipse cx="-15" cy="-77" rx="8" ry="3" fill="#3a2d4a" opacity="${(w*0.35).toFixed(2)}"/><ellipse cx="15" cy="-77" rx="8" ry="3" fill="#3a2d4a" opacity="${(w*0.35).toFixed(2)}"/>
    ${w>0.5?`<path d="M-15 -77 q-3 6 0 9 q3 -3 0 -9" fill="#7ec8ff" opacity="${clamp01((w-0.5)*2).toFixed(2)}"/>`:''}`;
  const ribs=w>0.45?`<path d="M-30 ${cy-4} q8 5 16 0 M-28 ${cy+4} q8 5 16 0 M14 ${cy-4} q8 5 16 0 M12 ${cy+4} q8 5 16 0" stroke="#7a5a44" stroke-width="2" fill="none" stroke-linecap="round" opacity="${clamp01((w-0.45)*1.8).toFixed(2)}"/>`:'';
  const nW=Math.ceil(dk*6), wisps=WISPS.slice(0,nW).map((p,i)=>`<path class="wisp" d="${p}" stroke="#3b1d5e" stroke-width="8" fill="none" stroke-linecap="round" stroke-opacity="${Math.min(0.55,dk*0.9).toFixed(2)}" style="animation-delay:${i*0.7}s"/>`).join('');
  const imps=IMPS.map(([x,y,s,t],i)=>{ const o=clamp01((dk-t+0.1)/0.25); return o>0.02?`<g transform="translate(${x} ${y}) scale(${s})" opacity="${o.toFixed(2)}"><g class="imp-in" style="animation-delay:${i*0.5}s">${IMP}</g></g>`:''; }).join('');
  const extra=happy?`<text x="150" y="48" font-size="22">💗</text><text x="34" y="62" font-size="16">✨</text>`:(w>0.3?`<text x="140" y="50" font-size="20" fill="#6f6a8a">z</text>`:'');
  return `<svg class="kit" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${esc(name)} the kitten, ${hLabel(v)}">
    <defs><radialGradient id="${u}a"><stop offset="35%" stop-color="#1a0b2e" stop-opacity="${(dk*0.75).toFixed(2)}"/><stop offset="100%" stop-color="#1a0b2e" stop-opacity="0"/></radialGradient>
      <radialGradient id="${u}g"><stop offset="30%" stop-color="#ffd76a" stop-opacity=".55"/><stop offset="100%" stop-color="#ffd76a" stop-opacity="0"/></radialGradient></defs>
    ${dk>0.02?`<circle cx="100" cy="100" r="99" fill="url(#${u}a)"/>`:''}${H.light?`<circle cx="100" cy="105" r="95" fill="url(#${u}g)"/>`:''}${wisps}
    <ellipse cx="100" cy="188" rx="${(60*sc).toFixed(1)}" ry="7" fill="rgba(0,0,0,.12)"/>
    <g transform="translate(100 185) scale(${sc})">
      <path d="${tail}" stroke="${fur}" stroke-width="${(13+5*f).toFixed(1)}" fill="none" stroke-linecap="round"/>
      <ellipse cx="0" cy="${cy}" rx="${bx.toFixed(1)}" ry="${by.toFixed(1)}" fill="${fur}"/>
      <ellipse cx="0" cy="${(cy+6).toFixed(1)}" rx="${(bx*0.58).toFixed(1)}" ry="${(by*0.58).toFixed(1)}" fill="${belly}"/>
      ${ribs}${fluff}
      <ellipse cx="-24" cy="-3" rx="15" ry="9" fill="${fur}"/><ellipse cx="24" cy="-3" rx="15" ry="9" fill="${fur}"/>
      <g transform="translate(0 ${(w*9).toFixed(1)}) rotate(${(-w*5).toFixed(1)} 0 -60)">
        <path d="M-34 -104 L-30 -142 L-8 -116 Z M34 -104 L30 -142 L8 -116 Z" fill="${fur}"/>
        <path d="M-30 -108 L-28 -132 L-15 -115 Z M30 -108 L28 -132 L15 -115 Z" fill="${pink}"/>
        <circle cx="0" cy="-82" r="${lerp(38,35,w).toFixed(1)}" fill="${fur}"/>${cheeks}
        <path d="M-8 -118 v10 M0 -120 v12 M8 -118 v10" stroke="#c96a12" stroke-width="3" stroke-linecap="round" opacity="${(1-w*0.6).toFixed(2)}"/>
        ${stage>=2?`<path d="M-26 -50 q26 14 52 0" stroke="#e0457b" stroke-width="7" fill="none" stroke-linecap="round"/>`:''}
        ${stage>=4?`<circle cx="0" cy="-42" r="5.5" fill="#f2b134" stroke="#c98d10" stroke-width="1.5"/>`:''}
        ${eyes}${face}
        <ellipse cx="-27" cy="-72" rx="7" ry="4" fill="${pink}" opacity="${(0.6*(1-w)).toFixed(2)}"/><ellipse cx="27" cy="-72" rx="7" ry="4" fill="${pink}" opacity="${(0.6*(1-w)).toFixed(2)}"/>
        <path d="M-4 -75 h8 l-4 5 Z" fill="#e8708a"/>
        <path d="M0 -68 q-6 ${m.toFixed(1)} -13 ${(m*0.4).toFixed(1)} M0 -68 q6 ${m.toFixed(1)} 13 ${(m*0.4).toFixed(1)}" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M-42 -76 l-18 -4 M-42 -70 l-18 2 M42 -76 l18 -4 M42 -70 l18 2" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".55"/>
        ${stage>=5&&w<0.5?`<text x="0" y="-146" text-anchor="middle" font-size="30">👑</text>`:''}
      </g>
    </g>${imps}${extra}</svg>`;
}

/* ---------- what the kitten says ---------- */
const SAY={
  spirit:['Mew… it feels so peaceful when you pray together 🤲 Maybe soon?','It’s getting dark around me… I can hear whispers 🥺 Please pray and read Quran, both of you.','I’m so scared… the shadows are all around me 😿 Please, I need the light. Pray, please.'],
  food:['My tummy is rumbling 🍽️ Did you both eat today?','I’m getting thin… please eat your meals, for me too 🥺','I can barely stand… I’m so hungry 😿 Please eat and look after each other.'],
  sleep:['Yaaawn… 😴 Sleep on time tonight?','I’m so tired… my eyes won’t stay open 🥺 Please rest well.','I can’t keep my eyes open any more… 😿 Please sleep, both of you.'],
  habits:['Our little habits help me grow 🌱 Shall we do some today?','I’m feeling weak… our habits have slipped 🥺 Even one small one helps.','I feel so faint… we stopped everything 😿 Please start with just one thing today.'],
  goals:['Our goals miss us 🎯 Tap one forward today?','I’m drooping… our goals haven’t moved in days 🥺','I’m fading… our goals were forgotten 😿 Move one forward, please.']
};
const HAPPY=['Purrrr 💗 I feel strong and warm!','Mew! 🐾 You two take such good care of me.','*rubs against you* 💞 Thank you!','Prrrr… everything feels light today ✨'];
const POKE=[['Prrr… 💗','*purrs and bumps your hand* 🐾','Mew mew! 😸'],['Mew… 🐾','*a weak little purr*','Mrrp… thank you 🥺'],['…mew… 😿','*barely lifts her head*','…still here… please help me 🥺']];
const hTier=v=>v>=0.55?0:(v>=0.3?1:2);
function kittySays(H){
  if(H.fresh) return 'Mew! 🐾 I’m brand new. Take care of each other and I’ll grow up strong!';
  let worst=null, wd=0.2;
  for(const k in H.c){ if(H.c[k]===null) continue; const d=(1-H.c[k])*(k==='spirit'?1.2:1); if(d>wd){ wd=d; worst=k; } }
  return worst?SAY[worst][hTier(H.c[worst])]:HAPPY[Number(todayStr().replace(/-/g,''))%HAPPY.length];
}

function careRows(pid){
  const d=todayStr();
  return CARE_ALL.map(([k,label,ic])=>{
    const a=careDone(me.uid,k,d), b=pid?careDone(pid,k,d):false;
    let st='<span class="st muted" title="Not yet">○</span>';
    if(pid){ if(a&&b) st='<span class="st" title="You both did it">🥰</span>'; else if(a||b) st='<span class="st" title="Only one of you so far">😢</span>'; }
    else if(a) st='<span class="st">🥰</span>';
    return `<div class="trow"><span>${ic} ${label}</span>
      <button class="tick ${a?'on':''}" style="--c:var(--me)" data-care="${k}" aria-label="${label}: ${a?'done, tap to undo':'tap when done'}">${a?'💗':''}</button>
      <span class="tick ro ${b?'on':''}" style="--c:var(--you)" aria-label="${pid?esc(nameOf(pid)):'Partner'}: ${b?'done':'not yet'}">${b?'💗':''}</span>${st}</div>`;
  }).join('');
}
function renderKitten(pid){
  bankPetDays();
  const H=kittyHealth(), xp=petXP(), st=petStage(xp), name=petName(), d=todayStr(), today=petLive(d);
  const hp=Math.round(H.v*100), prog=st.next?Math.round((xp-st.cur[0])/(st.next[0]-st.cur[0])*100):100;
  const marks=[[25,'Weak'],[50,'Tired'],[75,'Healthy']].map(([p,l])=>`<div class="mile ${hp>=p?'hit':''}" style="left:${p}%"><span>${l}</span></div>`).join('');
  const rows=Object.keys(HLAB).map(k=>{ const v=H.c[k];
    return `<div class="bar" style="grid-template-columns:70px 1fr 44px"><span>${HLAB[k]}</span><span class="b"><i style="width:${v===null?0:Math.round(v*100)}%;background:${v===null?'var(--line)':hColor(v)}"></i></span><small class="muted">${pct(v)}</small></div>`; }).join('');
  const chips=Object.keys(CARE_DEFAULTS).map(k=>{
    const lacking=couple.members.filter(u=>!careHabits(u,k).length);
    if(!lacking.length) return '';
    return `<button class="chip" data-addcare="${k}">+ ${esc(CARE_DEFAULTS[k][0])} habit for ${lacking.map(u=>esc(nameOf(u))).join(' &amp; ')}</button>`;
  }).join('');
  $('v-kitten').innerHTML=`
    <div class="card" style="text-align:center">
      ${kittenSVG(st.i,H,name,230)}
      <h2 style="margin-top:6px;font-size:28px">${esc(name)}</h2>
      <p style="margin:2px 0 0"><span class="tag">${hLabel(H.v)}</span> <span class="tag">${st.cur[1]}</span></p>
      <div class="bubble in" style="--c:var(--gold);margin:14px auto 0;text-align:left"><small>${esc(name)} says · tap me to pet me</small><p>${esc(pokeMsg||(jujuMood()||{}).t||kittySays(H))}</p></div>
      <div style="text-align:left;margin-top:16px"><b>Health</b> <span class="muted">${hp}%</span></div>
      <div class="track" style="margin:10px 0 30px" role="progressbar" aria-label="Kitten health" aria-valuenow="${hp}" aria-valuemin="0" aria-valuemax="100">
        <div class="fill" style="width:${hp}%;background:${hColor(H.v)}"></div>${marks}
        <div class="heart" style="left:${Math.max(4,Math.min(96,hp))}%;font-size:24px">🐾</div>
      </div>
    </div>
    <div class="card" style="margin-top:14px"><h3>What keeps ${esc(name)} healthy</h3>
      <p class="muted" style="margin:4px 0 8px;font-size:14px">Both of you count together, and the last few days count most. One missed day makes ${esc(name)} a little weaker. Many missed days in a row make ${esc(name)} much weaker. It always heals again, a little more with each good day.</p>
      <div class="bars">${rows}</div>
      <p class="muted" style="margin:10px 0 0;font-size:14px">Spirit is your prayers and Quran, and days you don’t log them count as missed. When they fade, shadows slowly gather around ${esc(name)}. Goals count when you tap +1 or −1 on one that is still open.</p>
    </div>
    <div class="card" style="margin-top:14px"><h3>Growing up</h3>
      <div class="gbar" role="progressbar" aria-valuenow="${prog}" aria-valuemin="0" aria-valuemax="100"><i style="width:${prog}%"></i></div>
      <p class="muted" style="margin:6px 0 0;font-size:14px">${xp} growth points · ${st.next?`${st.next[0]-xp} points until ${esc(st.next[1])}`:'Fully grown. Look at that fluff 👑'}</p>
    </div>
    <div class="card" style="margin-top:14px"><h3>Today’s care</h3>
      <p class="muted" style="margin:4px 0 8px">Care makes ${esc(name)} grow. 1 point each, 2 when you both do one, up to 10 a day. Today: <b>${today}/10</b></p>
      ${theadRow(pid)}${careRows(pid)}
      <p class="muted" style="margin:12px 0 0;font-size:14px">Water and meals come from your Meals tab (8 or more glasses, and 2 or more meals, count) and sleep from your Sleep tab (7 hours or more). Workout and study use your habits.</p>
      ${chips?`<p class="muted" style="margin:14px 0 0">Add the habits ${esc(name)} is waiting for:</p><div class="chips">${chips}</div>`:''}
    </div>
    <div class="card" style="margin-top:14px"><h3>Rename</h3>
      <div class="row" style="margin-top:8px"><input id="pn" style="flex:1;min-width:160px" maxlength="20" placeholder="Kitten’s name" value="${esc(name)}"><button class="btn small" id="pns">Save</button></div></div>`;
  const el=$('v-kitten');
  { const jm=jujuMood(); el.className=jm?'jr-'+jm.k:''; }
  el.querySelector('.kit').onclick=()=>{ const a=POKE[hTier(H.v)]; pokeMsg=a[Math.floor(Math.random()*a.length)]; renderKitten(pid); const k=$('v-kitten').querySelector('.kit'); if(k) k.classList.add('cheer'); };
  el.querySelectorAll('[data-care]').forEach(b=>b.onclick=()=>toggleCare(b.dataset.care));
  el.querySelectorAll('[data-addcare]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.addcare, def=CARE_DEFAULTS[k], mem=couple.members;
    const lacking=mem.filter(u=>!careHabits(u,k).length);
    const owner= lacking.length===mem.length ? (mem.length>1?'both':me.uid) : lacking[0];
    addHabit(def[0],def[1],def[2],owner); toast('Habit added');
  });
  $('pns').onclick=()=>savePetName($('pn').value);
  $('pn').onkeydown=e=>{ if(e.key==='Enter') $('pns').click(); };
}

/* ===== FEELINGS: start ===== */
/* ---------- feelings (moods) ---------- */
const ZONES={
  y:{n:'Energised',d:'high energy · pleasant',c:'#f2b134',bg:'rgba(242,177,52,.2)'},
  g:{n:'Calm',d:'low energy · pleasant',c:'#3aa57a',bg:'rgba(58,165,122,.17)'},
  r:{n:'Tense',d:'high energy · unpleasant',c:'#e0586b',bg:'rgba(224,88,107,.17)'},
  b:{n:'Low',d:'low energy · unpleasant',c:'#5a7fd8',bg:'rgba(90,127,216,.17)'}
};
/* Word|emoji|other words people might type|what it means */
const VOC_RAW={
  y:`Happy|😊|glad pleased joyful|Feeling good and light, like things are right;Excited|🤩|thrilled pumped happy|Buzzing with anticipation for something good;Joyful|😄|delighted happy|Deep, bright happiness that spills out;Cheerful|😁|bubbly happy|Upbeat and sunny, easy to smile;Thrilled|🥳|elated|Very happy about something that just happened or is about to;Overjoyed|🥰|ecstatic happy|Happiness so big it is hard to hold in;Energised|⚡|energetic charged|Full of get-up-and-go;Playful|😜|silly fun|In a light, fun, teasing mood;Silly|🤪|goofy|Goofy and laughing at nothing much;Giddy|🤭||Lightheaded with excitement, can't stop smiling;Inspired|✨|creative|Sparked with ideas and the urge to create or do;Motivated|💪|driven|Ready to work toward something that matters;Determined|🔥|focused resolute|Set on getting it done, whatever it takes;Confident|😎|sure bold|Trusting yourself and what you can do;Proud|🥹|accomplished|Glad about something you or someone you love achieved;Triumphant|🏆|victorious|The joy of winning or finally getting through it;Amazed|😲|wow astonished|Struck with wonder at something unexpected;Surprised|😮||Caught off guard, for good or bad;Curious|🧐|intrigued|Wanting to find out more;Optimistic|🌞|positive|Expecting good things ahead;Hopeful|🌈||Believing things can still turn out well;Eager|🙌|keen|Can't wait to get started;Enthusiastic|🎉||Fully into it, with lots of energy;Lively|💃||Awake, active and full of spark;Adventurous|🧭||Up for something new and a little daring;Radiant|🌟|glowing|Glowing from the inside;Flirty|😘|romantic|Feeling playful and romantic;Cheeky|😏|naughty|Mischievous in a harmless, teasing way;Fired up|🚀||Pumped and charged to act;Free|🕊️|liberated|Unburdened, with room to breathe and choose;Lucky|🍀||Feeling that things worked out in your favour;Alive|🌸||Fully present and aware of being here;Hyped|🎶||Wound up with excitement and energy;Productive|✅||Getting things done and feeling good about it;Passionate|🔥|intense ardent|Deeply and warmly invested in something or someone;Fervent|🔥|zealous sincere|Burning with strong, sincere feeling;Elated|🎈|overjoyed|Lifted high with joy;Euphoric|🤩|blissful|Intensely, almost dizzily happy;Exhilarated|🎢|thrilled|Rushing with excitement after something bold or fast;Jubilant|🎊|rejoicing|Celebrating loudly in your heart;Ecstatic|🥳|overjoyed|Overflowing with joy;Gleeful|😆|merry|Delighted in a bubbly, almost mischievous way;Delighted|😃|pleased|Pleasantly and openly happy about something;Amused|😄|entertained|Finding something funny or delightful;Stoked|🤙|pumped|Really looking forward to it;Zesty|🍋|spirited|Fresh, spirited and full of zip;Spirited|🐎|lively|Full of life and a bit of fight;Feisty|🐯|sassy|Lively, with a bit of attitude;Sassy|💅|cheeky|Confident and a little cheeky with it;Mischievous|😈|naughty|Up to something playful, on purpose;Bold|🦁|brave|Willing to take a risk or speak up;Courageous|🛡️|brave|Acting with heart even though you are afraid;Fearless|🦅|brave|Not holding back, even when it is scary;Daring|🎯|risky|Ready to try something risky;Gutsy|🥊|brave|Taking a brave step;Empowered|✊|strong|Feeling you have the strength and the say to act;Unstoppable|🚀|invincible|Sure nothing can slow you down right now;Ambitious|📈|driven goal|Reaching for something bigger;Competitive|🏁|rivalry|Wanting to win or do better than before;Accomplished|🏅|achieved done|Proud after getting something meaningful done;Awe|🌌|wonder|Small and amazed in front of something vast and beautiful;Wonderstruck|🌠|awed|Full of wonder at something beautiful or vast;Dazzled|✨|stunned|Taken by something bright and impressive;Smitten|😍|infatuated crush|Quietly swept away by someone you adore;Infatuated|🥰|crush|Head over heels, a little carried away;Romantic|🌹|love|Warm and dreamy about love;Alert|👀|attentive|Sharp, focused and aware;Focused|🎯|locked in|Mind fully on one thing;Intrigued|🔍|curious|Pulled in and wanting to know more;Fascinated|🧠|captivated|Absorbed by something interesting;Invigorated|🌬️|refreshed|Refreshed and full of new energy;Renewed|🌱|reset|Feeling a fresh start inside;Celebratory|🎉|party|In the mood to celebrate;Smug|😏|pleased|Quietly pleased with yourself;Expectant|👀|anticipating|Waiting with hopeful anticipation;Vibrant|🌈|colourful|Full of colour and life;Spontaneous|🎈|impulsive|Up for doing something on the spur of the moment`,
  g:`Calm|😌|relaxed peaceful|Quiet inside, nothing pulling at you;Peaceful|🕊️|tranquil|At ease, with no worry in the way;Content|🙂|satisfied happy|Okay with how things are right now;Grateful|🙏|thankful|Thankful for what you have or what someone did;Thankful|🤲|appreciative|Appreciating a kindness or a blessing;Blessed|✨||Feeling that good things were given to you;Relaxed|😊|easy calm|Body and mind have let go of tension;Cozy|🧸|snug comfy|Warm, snug and comfortable;Safe|🛡️|secure|Protected, with nothing to fear;Secure|🏠||Steady, sure that things are stable;Loved|🥰|adored cherished|Feeling cared for by someone;Tender|💗|soft gentle|Soft-hearted and gentle toward someone;Serene|🌿||Deeply still and peaceful;Relieved|😮‍💨|phew|The weight lifted after a worry ended;Satisfied|😋||Having had enough, in a good way;Fulfilled|🌻||Feeling your life or effort has meaning;Mellow|🍃||Smooth, soft and unhurried;Chill|😎|laid-back|Easygoing, nothing is bothering you;Comfortable|🛋️||At ease in your body and surroundings;Balanced|⚖️||Everything feels in fair proportion;Centered|🧘|grounded|Grounded and in touch with yourself;Humble|🌱||Quietly grateful, with nothing to prove;Touched|🥹|moved|Moved by someone's kindness or a sweet moment;Appreciated|💐|valued|Feeling seen and valued for what you do;Nostalgic|🍂|sentimental|A warm ache for a time that has passed;Warm|☕||A friendly, glowing feeling inside;Rested|🛌|refreshed|Refreshed after proper sleep or a break;Sleepy|😴|drowsy tired|Drowsy and ready for sleep;Spiritually connected|🕌|iman|Close to Allah and at peace in your faith;Humbled|🌙||Aware of how small you are and how great Allah is;Cuddly|🫂||Wanting closeness and warmth with someone;Settled|🪴||Things have fallen into place;Patient|⏳||Able to wait without getting upset;Trusting|🤝||Feeling you can rely on someone;Understood|💞||Feeling that someone truly gets you;Tranquil|🌊|still|Still and smooth, like calm water;Quiet|🤫|hushed|Soft and still inside, without needing noise;Gentle|🪶|soft|Soft, kind and unhurried;Soothed|🫶|comforted|Eased after something was hurting;Comforted|🧣|consoled|Reassured when you needed it;Reassured|🤗|calmed|Worry eased by someone or something;Affectionate|🥰|fond|Warmly fond of someone and wanting to show it;Fond|💕|attached|A quiet, steady liking for someone;Adored|💖|cherished|Deeply treasured by someone;Cherished|🌷|treasured|Held dear and cared for;Cared for|🫂|looked after|Feeling looked after;Supported|🤝|backed|Knowing someone has your back;Accepted|🧡|welcome|Feeling you are okay just as you are;Belonging|🏡|included|Feeling you are part of something;Included|👥|part of|Welcome and counted in;Connected|🔗|close|Close and in tune with others;Close|💞|bonded|Near to someone in heart;Intimate|🕯️|close|Warm, private closeness;Devoted|💍|committed|Giving your steady love and loyalty;Faithful|🕋|loyal|Steady in your faith or in your loyalty;Prayerful|🤲|dua|In a quiet, praying state of heart;Reverent|🕌|respectful|Deep respect and awe toward Allah or something sacred;Wholesome|🧺|good|Simple, good and nourishing;Pure|🤍|clean|Clear-hearted and uncomplicated;Light|🕊️|weightless|Free of heaviness;Lighthearted|🎈|carefree|Unburdened and easy;Carefree|🌼|unbothered|No worries pulling at you;Unbothered|😌|calm|Not letting things get to you;At ease|🛋️|relaxed|No tension in body or mind;Refreshed|🚿|renewed|Revived after rest or a break;Recharged|🔋|rested|Energy back after rest;Restored|🌿|healed|Brought back to yourself;Healing|🩹|recovering|Slowly mending after something hard;Recovering|🌤️|getting better|Getting better step by step;Pleased|🙂|glad|Quietly glad about how things went;Glad|😊|happy|Plain, simple happiness;Grounded|🌳|steady|Steady, with your feet on the earth;Steady|⚓|stable|Even and reliable inside;Stable|🧱|balanced|Not tossed around by things;Clear|💧|clear-headed|Clear-minded, with nothing muddy;Present|🕰️|mindful|Fully here in the moment;Mindful|🧘‍♀️|aware|Paying gentle attention to now;Meditative|🪷|contemplative|Calm and inwardly focused;Contemplative|💭|thoughtful|Thinking something over slowly;Thoughtful|🤔|considerate|Careful and caring in your thoughts;Pensive|💭|thinking|Quietly deep in thought;Reflective|🪞|reflecting|Looking back and thinking things over;Sentimental|🥹|tender|Tender and moved by memories or meaningful things;Zen|☯️|centred|Calm, centred and unbothered;Nurtured|🌱|looked after|Feeling looked after and cared for;Welcomed|🚪|greeted|Warmly received;Respected|🏅|valued|Treated as someone who matters;Seen|👁️|noticed|Noticed and understood for who you are;Heard|👂|listened to|Listened to and taken seriously;Valued|💎|worth|Knowing you are worth something to others;Enough|✅|sufficient|Feeling you are enough as you are`,
  r:`Angry|😠|mad furious|A hot feeling that something is unfair or wrong;Furious|🤬|enraged angry|Intense anger that is hard to hold in;Frustrated|😤|angry|Blocked from something and getting nowhere;Irritated|😒|angry|Small things are getting under your skin;Annoyed|🙄|angry|Mildly bothered by something or someone;Anxious|😰|worried nervous uneasy|Uneasy about what might happen;Nervous|😬|anxious|Jittery before something that matters;Worried|😟|anxious|Your mind keeps returning to what could go wrong;Stressed|😖|anxious|Too much to handle and not enough time or energy;Overwhelmed|🤯|swamped|So much at once that you can't sort it out;Panicked|😱|anxious|Sudden fear, racing heart, hard to think;Scared|😨|afraid frightened|Afraid of something real or imagined;Tense|😣||Tight in body and mind, on edge;Restless|🌀|fidgety anxious|Can't settle, need to move or do something;Jittery|🫨||Shaky and wired, often from nerves or caffeine;Agitated|😾||Stirred up and unable to calm down;Embarrassed|😳||Awkward after feeling exposed or silly;Insecure|🫣|self-conscious|Doubting yourself or your place;Jealous|😒|envious|Afraid of losing something to someone else;Resentful|😡|bitter|Holding on to anger about something unfair;Betrayed|🗡️||Hurt because trust was broken;Disgusted|🤢||Strong dislike or revulsion;Shocked|😧||Stunned by something sudden;Defensive|🛡️||Guarding yourself against blame or criticism;Impatient|⏳||Wanting it to happen now;Pressured|🏋️||Feeling pushed to deliver or decide;Rushed|🏃||Hurrying with no time to breathe;Hangry|🍽️|hungry|Cranky because you are hungry;Cranky|😫|grumpy|Short-tempered and easily bothered;Dreading|😰||Fearing something that is coming up;Confused|😵‍💫|lost|Can't make sense of things or what to do;Triggered|⚡||Something touched an old sore spot;Offended|😤||Hurt by something said or done;Fed up|🙄||Had enough and can't take any more of it;Enraged|😡|furious|Overwhelmed by anger;Livid|🤬|furious|So angry your face feels hot;Outraged|😤|indignant|Angry at something that feels deeply unjust;Indignant|😠|offended|Angry at being treated unfairly;Irate|😡|angry|Very angry and showing it;Infuriated|🤬|angry|Made very angry by something;Exasperated|😩|fed up|Worn out by something repeating again and again;Bitter|🍋|resentful|Sour inside from old hurt;Spiteful|😾|vengeful|Wanting to hurt back;Vengeful|😈|revenge|Wanting to get even;Hostile|🥊|aggressive|Ready to fight or lash out;Aggressive|💢|hostile|Pushing hard, close to lashing out;Grumpy|😒|cranky|In a sour, snappy mood;Moody|🌩️|irritable|Feelings shifting quickly and heavily;Irritable|😖|touchy|Easily set off;Touchy|🌵|sensitive|Sensitive and easily upset;Edgy|🪒|on edge|On edge, ready to snap;On edge|⚡|edgy|Wound tight, waiting for something;Uneasy|😕|uncomfortable|A quiet sense that something isn't right;Apprehensive|😟|nervous|Wary about what's coming;Fearful|😨|afraid|Full of fear;Terrified|😱|scared|Gripped by strong fear;Alarmed|🚨|startled|Suddenly aware of danger;Startled|😲|jumpy|Jolted by something sudden;Paranoid|🕵️|suspicious|Sure something bad is going on;Suspicious|🤨|doubtful|Doubting someone or something;Distrustful|🙅|wary|Not able to trust right now;Threatened|🛑|unsafe|Feeling in danger or under attack;Trapped|🪤|cornered|Feeling you have no way out;Cornered|🐾|trapped|Backed into a corner with no good options;Desperate|🆘|frantic|Urgently needing a way out;Frantic|🏃|panicky|Rushing around, unable to settle;Flustered|😳|rattled|Thrown off and a bit of a mess;Rattled|🫨|shaken|Shaken up and thrown off balance;Shaken|😵|shocked|Upset after something frightening;Self-conscious|🫣|shy|Painfully aware of being watched;Awkward|😅|uncomfortable|Out of place and unsure what to do;Humiliated|🙈|shamed|Made to feel small in front of others;Mortified|😖|embarrassed|So embarrassed you wish you could vanish;Envious|💚|jealous|Wanting what someone else has;Possessive|🔒|clingy|Holding on tight out of fear of losing;Torn|💔|conflicted|Pulled between two things;Conflicted|⚖️|torn|Part of you wants one thing, part wants another;Ambivalent|🤷|unsure|Pulled in two directions, unsure how you feel;Overstimulated|🤯|overloaded|Too much noise, light or input at once, and your mind needs a break;Overloaded|📚|swamped|Too much to carry at once;Burdened|🎒|weighed down|Carrying more than feels fair;Wired|☕|buzzing|Buzzing and alert, hard to switch off;Hypervigilant|👁️|alert|Always watching for danger;Craving|🍫|urge|A strong pull toward something;Fixated|🔁|stuck on|Mind stuck circling one thing;Overthinking|🌀|ruminating|Mind going round and round;Impulsive|⚡|rash|Wanting to act now without thinking;Reckless|🎲|careless|Not caring about the risks;Stubborn|🪨|obstinate|Refusing to budge;Disrespected|😤|insulted|Feeling treated as if you don't matter;Provoked|🧨|baited|Pushed to react;Unsettled|🌪️|disturbed|Things feel off-balance;Disturbed|😧|upset|Bothered by something you saw or heard;Appalled|😨|horrified|Shocked and upset at something wrong;Horrified|😱|appalled|Strong shock and fear at something awful`,
  b:`Sad|😢|down blue unhappy upset|A heavy, low feeling, often after loss or disappointment;Tired|😩|exhausted|Low on energy and needing rest;Exhausted|😫|tired|Completely worn out, in body or mind;Drained|🪫|tired|Emptied out from giving or coping too much;Lonely|🥺|alone sad|Wanting connection and not feeling it;Down|😞|sad low|Low in mood, a bit flat;Disappointed|😞|sad let-down|Let down because things didn't go as hoped;Heartbroken|💔|sad|Deep pain from losing someone or something loved;Hurt|💔|sad|Pain from something someone said or did;Homesick|🏠||Missing home and what feels familiar;Bored|😑||Nothing is holding your interest;Numb|😶||Feeling nothing, as if emotions are switched off;Empty|🕳️||A hollow feeling, like something is missing inside;Gloomy|☁️|sad|A dark, heavy mood, like a grey day inside;Melancholy|🌧️|sad|A quiet, thoughtful sadness;Discouraged|😔||Losing confidence that effort will pay off;Guilty|😔||Feeling you did something wrong;Ashamed|🙈||Feeling there is something wrong with you, not just with what you did;Regretful|😔|sorry|Wishing you had done something differently;Grieving|🖤|mourning|Mourning a loss;Missing you|🥺|miss|Longing for someone who isn't near;Unmotivated|🥱||No push to start or keep going;Burnt out|🪫|burnout tired|Worn down by too much for too long;Stuck|🧱||Not moving forward and unsure how to;Weary|😪|tired|Deeply tired of carrying on;Fragile|🥀||Easily hurt right now, handle with care;Apathetic|😐||Not caring much either way;Wistful|🌫️||A soft sadness mixed with longing;Hopeless|🕯️||Feeling nothing will get better. It is worth sharing this with someone you trust;Worthless|🥀||Feeling you don't matter, which is not true. Please tell someone you trust;Left out|🚪|excluded|Feeling excluded from the group;Ignored|🔇||Feeling unseen or unheard;Sick|🤒|ill unwell|Unwell in body, which can weigh on your mood;Sore|🤕|achy pain|Aching or in pain;Longing|💭|yearning|A deep wish for something or someone;Distant|🌫️||Feeling far away from people or from yourself;Overlooked|🫥||Passed over when you deserved notice;Sluggish|🐌|lazy|Slow, heavy and low on drive;Foggy|🌁||Hard to think clearly;Low|🌑||Mood is down, with little energy;Bittersweet|🍂|nostalgic|Happy and sad at the same time;Vulnerable|🐚|exposed|Open and exposed, aware you could be hurt;Yearning|🌙|longing|A strong, aching wish for something or someone;Dejected|😞|downhearted|Low after hope was lost;Downhearted|💙|sad|Spirit sinking;Despondent|🌫️|hopeless|Spirits very low, with little hope;Despairing|🕳️|hopeless|Feeling hope has run out. It is worth telling someone you trust;Depressed|🌑|low|A deep, lasting low mood. If it stays, please talk to someone you trust or a doctor;Sorrowful|😢|sad|Deep sadness, often after loss;Mournful|🖤|grief|Sad in a quiet, heavy way;Bereaved|🕊️|loss|Grieving someone who has died;Heavy-hearted|💧|sad|A weight on your heart;Teary|😭|crying|Close to crying;Tearful|🥲|teary|Eyes wet, feelings close to the surface;Wounded|🩹|hurt|Deeply hurt by something said or done;Rejected|🚪|refused|Pushed away or turned down;Abandoned|🏚️|left|Left behind when you needed someone;Neglected|🥀|forgotten|Not given the care or attention you needed;Unwanted|💔|unloved|Feeling you aren't wanted;Unloved|🥀|unwanted|Feeling you aren't loved;Isolated|🧊|cut off|Cut off from other people;Alone|🌑|solitary|On your own, and feeling it;Excluded|🚫|left out|Kept out of something;Invisible|🫥|unseen|Feeling no one sees you;Small|🐜|insignificant|Feeling little or unimportant;Inadequate|📉|not enough|Feeling you aren't enough;Inferior|⬇️|less than|Feeling less than others;Incompetent|🙁|useless|Feeling you can't do it;Useless|🗑️|pointless|Feeling you aren't helping or aren't useful;Defeated|🏳️|beaten|Worn down after trying and losing;Beaten down|😞|crushed|Worn down by one blow after another;Crushed|🫠|devastated|Flattened by bad news;Devastated|🌪️|shattered|Hit very hard by a loss;Shattered|💥|broken|Feeling broken into pieces;Broken|🧩|shattered|Feeling in pieces;Lost|🧭|directionless|Not sure where you are going;Directionless|🧭|aimless|No sense of which way to go;Aimless|🍃|drifting|Drifting without a goal;Indifferent|😐|unbothered|Neither here nor there;Detached|🪟|disconnected|Feeling separated from what's happening;Disconnected|🔌|cut off|Out of touch with people or yourself;Dull|🌫️|flat|Flat, with no spark;Flat|➖|blank|No highs, no lows, just flat;Blank|⬜|empty|Mind and feelings gone quiet;Zoned out|😶‍🌫️|spaced out|Mind drifting away;Spaced out|🛸|dazed|Not really here;Dazed|💫|dizzy|Stunned and not quite clear;Groggy|🥴|sleepy|Heavy and slow, as if just woken;Lethargic|🐢|sluggish|Heavy, slow and low on energy;Listless|🥱|lifeless|No energy or interest;Lazy|🛋️|idle|Not wanting to do anything;Procrastinating|⏰|delaying|Putting off what needs doing;Overworked|💼|overloaded|Too much work for too long;Run-down|🪫|worn out|Worn down in body and spirit;Depleted|🫗|emptied|Used up, with nothing left to give;Spent|🥵|used up|All used up;Faint|😵|dizzy|Weak and light-headed;Nauseous|🤢|queasy|Sick to the stomach;Ill|🤧|sick|Unwell;Achy|🤕|sore|Dull pain all over;Headachy|🤕|headache|A head that hurts;Crampy|😣|cramps|Aching low in the belly;Hungry|🍽️|starving|Needing food;Thirsty|🥤|dry|Needing water;Cold|🥶|freezing|Chilly and uncomfortable;Hot|🥵|overheated|Too warm and uncomfortable;Sleep-deprived|🌙|insomnia|Not enough sleep;Lovesick|💘|pining|Aching for someone;Pining|🌙|longing|Longing for someone far away;Heartsick|💔|lovesick|Sick at heart;Remorseful|😔|sorry|Deeply sorry for what you did;Sorry|🙏|apologetic|Wishing you could take it back;Pessimistic|🌧️|negative|Expecting things to go wrong;Cynical|🙄|doubtful|Doubting that people mean well;Disillusioned|🥀|let down|Let down after finding things are not as you believed;Discontent|😒|unsatisfied|Not satisfied with how things are;Dissatisfied|📋|unhappy|Not getting what you hoped for;Unfulfilled|🕳️|empty|Feeling something meaningful is missing;Shy|🫣|timid|Hesitant around other people;Timid|🐭|shy|Nervous and hesitant`
};
const VOC=[]; for(const z of Object.keys(VOC_RAW)) for(const row of VOC_RAW[z].split(';')){ const [w,e,s,t]=row.split('|'); VOC.push({w,e,z,s:s||'',t:t||''}); }
const FL_TAGS=['🕌 Prayer','😴 Sleep','📚 Study','👨‍👩‍👧 Family','💞 Us','🏃 Body','🍽️ Food','💼 Work','👯 Friends','🌫️ Nothing specific'];
const FL_EMOJI=['😊','😄','🥰','😌','🥹','😎','🤔','😮‍💨','😢','😔','😞','😰','😠','😤','😴','🤒','🥱','💗','✨','🌧️','🌈','🔥','🫠','😶‍🌫️'];
const FL_TTL=24*3600*1000, FL_MAX=3;
/* meanings for words people often add themselves, used until someone writes their own */
const FL_FALLBACK={impassioned:'Filled with strong, intense feeling or deep conviction about something',passionate:'Deeply and warmly invested in something or someone',bittersweet:'Happy and sad at the same time',ambivalent:'Pulled in two directions, unsure how you feel',overstimulated:'Too much noise, light or input at once, and your mind needs a break',sentimental:'Tender and moved by memories or meaningful things',vulnerable:'Open and exposed, aware you could be hurt',conflicted:'Part of you wants one thing, part wants another',pensive:'Quietly deep in thought',reflective:'Looking back and thinking things over',yearning:'A strong, aching wish for something or someone',wired:'Buzzing and alert, hard to switch off',zen:'Calm, centred and unbothered',nurtured:'Feeling looked after and cared for',fervent:'Burning with strong, sincere feeling'};
const nz=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N}\s-]/gu,'').replace(/\s+/g,' ').trim();
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const lev=(a,b)=>{ const m=a.length,n=b.length; if(Math.abs(m-n)>2) return 9; let p=Array.from({length:n+1},(_,j)=>j); for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c; } return p[n]; };
const firstEmoji=v=>{ v=(v||'').trim(); if(!v) return ''; try{ return [...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(v)][0].segment; }catch(e){ return Array.from(v)[0]||''; } };
const moodsOf=uid=>fun.filter(f=>f.kind==='mood'&&f.uid===uid).sort((a,b)=>b.at-a.at);
const curMood=uid=>{ const m=moodsOf(uid)[0]; return m&&Date.now()-m.at<FL_TTL?m:null; };
const customFeels=()=>fun.filter(f=>f.kind==='feeling').map(f=>({w:f.w,e:f.e,z:f.z,s:'',t:f.t||FL_FALLBACK[nz(f.w)]||'',c:1}));
function allFeels(){ const seen=new Set(VOC.map(f=>nz(f.w))), out=[...VOC]; for(const c of customFeels()){ const k=nz(c.w); if(!seen.has(k)){ seen.add(k); out.push(c); } } return out; }
const feelOf=w=>allFeels().find(f=>nz(f.w)===nz(w));
const feelText=w=>(feelOf(w)||{}).t||'';
function feelUse(){ const m=new Map(); for(const x of moodsOf(me.uid)){ for(const f of [x,...(x.more||[])]){ const k=nz(f.w); m.set(k,(m.get(k)||0)+1); } } return m; }
function matchFeels(q0){
  const q=nz(q0); if(!q) return [];
  const use=feelUse(), out=[];
  for(const f of allFeels()){
    const w=nz(f.w), parts=w.split(/[\s-]+/), syn=nz(f.s).split(' ').filter(Boolean);
    let sc=0;
    if(w===q) sc=100;
    else if(w.startsWith(q)) sc=80;
    else if(parts.some(p=>p.startsWith(q))) sc=70;
    else if(syn.some(p=>p===q||p.startsWith(q))) sc=55;
    else if(q.length>=3&&w.includes(q)) sc=45;
    if(sc) out.push([sc+(use.get(w)||0)*.5,f]);
  }
  if(!out.length&&q.length>=4){ /* nothing direct: forgive a typo */
    const th=q.length>=6?2:1;
    for(const f of allFeels()){ const w=nz(f.w), parts=w.split(/[\s-]+/), syn=nz(f.s).split(' ').filter(Boolean);
      if(lev(w,q)<=th||parts.some(p=>lev(p,q)<=th)||lev(w.slice(0,q.length),q)<=th||syn.some(p=>lev(p,q)<=th)) out.push([30,f]); }
  }
  return out.sort((a,b)=>b[0]-a[0]||a[1].w.localeCompare(b[1].w)).slice(0,14).map(x=>x[1]);
}
const flRd=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
const flWr=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
const flZ=z=>ZONES[z]||ZONES.g;
const flVars=z=>`--zc:${flZ(z).c};--zb:${flZ(z).bg}`;
const flMore=m=>Array.isArray(m.more)?m.more:[];

/* the little box in the header: my feeling as the icon, the partner's feeling as a bubble */
function renderMoodChip(){
  const b=$('moodbtn'); if(!b||!couple||!me) return;
  const pid=partnerId(), mine=curMood(me.uid), th=pid?curMood(pid):null, show=th||(!pid?mine:null);
  const unread=th&&th.at>Number(flRd('rr_mood_seen_'+me.uid)||0), extra=show?flMore(show).length:0;
  b.innerHTML=`${show?`<span class="flbub" style="${flVars(show.z)}">${show.e} ${esc(show.w)}${extra?` +${extra}`:''}</span>`:''}<span aria-hidden="true">${mine?mine.e:'💭'}</span>${unread?'<i class="fldot"></i>':''}`;
  b.setAttribute('aria-label',`Feelings${show?`: ${show.w}${extra?` and ${extra} more`:''}`:''}${unread?', new':''}`);
}

let MS={v:'home',q:'',z:'y',sel:[],main:0,info:null,editM:null,mtext:'',tags:[],why:'',nf:null};
const flReset=()=>{ MS={v:'home',q:'',z:'y',sel:[],main:0,info:null,editM:null,mtext:'',tags:[],why:'',nf:null}; };
const flChip=f=>`<button class="flchip" style="${flVars(f.z)}" data-m="pick" data-k="${esc(nz(f.w))}" aria-pressed="${MS.sel.some(x=>nz(x.w)===nz(f.w))}">${f.e} ${esc(f.w)}</button>`;
const flAbout=f=>{
  const ed=MS.editM&&nz(MS.editM)===nz(f.w);
  return `<div class="flinfo" style="${flVars(f.z)}"><span class="flbig" style="font-size:30px">${f.e}</span><div style="flex:1;min-width:0"><b>${esc(f.w)}</b> <small class="muted">· ${flZ(f.z).n}</small>${ed
    ?`<input id="flmean" type="text" maxlength="90" placeholder="What does it mean to you?" value="${esc(MS.mtext)}" style="margin:6px 0"><div class="row" style="gap:6px"><button class="btn small" data-m="msave">Save</button><button class="btn ghost small" data-m="mcancel">Cancel</button></div>`
    :`<div>${f.t?esc(f.t):'<span class="muted">No description yet.</span>'}</div>${f.c?`<button class="flx" style="padding:2px 0;font-size:13px;color:var(--me);font-weight:700" data-m="medit">✏️ ${f.t?'Edit':'Add'} the meaning</button>`:''}`}</div></div>`;
};
function flStrip(uid){
  const ms=moodsOf(uid);
  return `<div class="flstrip" aria-label="Last 7 days">${lastDays(7).map(d=>{ const m=ms.find(x=>x.date===d); return m?`<i title="${esc(d)}: ${esc(m.w)}" style="background:${flZ(m.z).bg}">${m.e}</i>`:`<i title="${esc(d)}">·</i>`; }).join('')}</div>`;
}
function flCard(uid,title){
  const m=moodsOf(uid)[0];
  if(!m) return `<div class="flcard"><b>${title}</b><span class="muted">No feeling shared yet</span></div>`;
  const old=Date.now()-m.at>=FL_TTL, more=flMore(m), mean=feelText(m.w);
  return `<div class="flcard" style="${flVars(m.z)}"><div class="row" style="justify-content:space-between;flex-wrap:nowrap"><b>${title}</b><small class="muted">${old?'last felt ':''}${ago(m.at)}</small></div>
    <div class="row" style="flex-wrap:nowrap;gap:12px"><span class="flbig">${m.e}</span><div><div style="font-family:var(--head);font-size:22px;font-weight:600">${esc(m.w)}</div><small class="muted">${flZ(m.z).n} · ${flZ(m.z).d}</small></div></div>
    ${mean?`<div class="muted" style="font-size:14px">${esc(mean)}</div>`:''}
    ${more.length?`<div class="flalso"><small class="muted">Also feeling</small>${more.map(f=>`<div>${f.e} <b>${esc(f.w)}</b>${feelText(f.w)?` <span class="muted">· ${esc(feelText(f.w))}</span>`:''}</div>`).join('')}</div>`:''}
    ${(m.tags||[]).length?`<div class="row" style="gap:6px">${m.tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div>`:''}
    ${m.why?`<div class="flwhy">${esc(m.why)}</div>`:''}
    ${flStrip(uid)}</div>`;
}
function renderMood(){
  const el=$('moodbody'); if(!el||!couple||!me) return;
  const pid=partnerId();
  if(MS.v==='home'){
    const all=fun.filter(f=>f.kind==='mood').sort((a,b)=>b.at-a.at).slice(0,12);
    el.innerHTML=`<div class="fl"><div class="row" style="justify-content:space-between"><h2>Feelings 💭</h2><button class="btn ghost small" data-m="close">Close</button></div>
      ${pid?flCard(pid,esc(nameOf(pid))):''}${flCard(me.uid,pid?'Me':'How I feel')}
      <button class="btn" data-m="new">How are you feeling? 💗</button>
      ${all.length?`<div><h3 style="font-size:16px;margin-bottom:4px">Recent</h3>${all.map(m=>`<div class="flrow"><span class="em">${m.e}</span><div style="flex:1;min-width:0"><b>${m.uid===me.uid?'Me':esc(nameOf(m.uid))}</b> felt <b style="color:${flZ(m.z).c}">${esc(m.w)}</b>${flMore(m).map(f=>` <span class="muted">+</span> <b style="color:${flZ(f.z).c}">${esc(f.w)}</b>`).join('')} <small class="muted">· ${ago(m.at)}</small>${(m.tags||[]).length?`<div><small class="muted">${m.tags.map(esc).join(' · ')}</small></div>`:''}${m.why?`<div class="flwhy" style="margin-top:4px">${esc(m.why)}</div>`:''}</div>${m.uid===me.uid?`<button class="x flx" data-m="del" data-id="${esc(m.id)}" aria-label="Delete this entry">×</button>`:''}</div>`).join('')}</div>`:''}</div>`;
  }else if(MS.v==='pick'){
    el.innerHTML=`<div class="fl"><div class="row" style="justify-content:space-between"><button class="btn ghost small" data-m="home">← Back</button><h2 style="font-size:20px">How are you feeling?</h2></div>
      <input id="flq" type="text" placeholder="Type a feeling…" autocomplete="off" maxlength="28" value="${esc(MS.q)}"><div id="flres"></div></div>`;
    renderPickRes();
  }else if(MS.v==='newf'){
    const n=MS.nf;
    el.innerHTML=`<div class="fl"><div class="row" style="justify-content:space-between"><button class="btn ghost small" data-m="pick-back">← Back</button><h2 style="font-size:20px">New feeling ➕</h2></div>
      <p class="muted" style="margin:0">Name it, give it an emoji and say where it sits. Then it’s saved for both of you. 💗</p>
      <input id="nfw" type="text" maxlength="28" placeholder="Feeling name" value="${esc(n.w)}">
      <input id="nfm" type="text" maxlength="90" placeholder="What does it mean to you? (optional)" value="${esc(n.t||'')}">
      <div><small class="muted">Emoji</small><div class="flgrid">${FL_EMOJI.map(e=>`<button class="flchip" data-m="nfe" data-e="${e}" aria-pressed="${n.e===e}" style="--zc:var(--me);--zb:transparent">${e}</button>`).join('')}</div>
      <div class="row" style="margin-top:8px"><input id="nfet" type="text" placeholder="…or type your own" style="max-width:190px" value="${FL_EMOJI.includes(n.e)?'':esc(n.e)}"><span id="nfprev" class="flbig" style="font-size:30px">${n.e||''}</span></div></div>
      <div><small class="muted">Where does it sit?</small><div class="flzones">${Object.keys(ZONES).map(z=>`<button class="flzone" data-m="nfz" data-z="${z}" aria-pressed="${n.z===z}" style="${flVars(z)}"><b>${ZONES[z].n}</b><small>${ZONES[z].d}</small></button>`).join('')}</div></div>
      <button class="btn" data-m="nfsave" ${n.w.trim()&&n.e&&n.z?'':'disabled style="opacity:.45"'}>Save feeling</button></div>`;
  }else if(MS.v==='why'){
    const main=MS.sel[MS.main]||MS.sel[0];
    el.innerHTML=`<div class="fl"><div class="row" style="justify-content:space-between"><button class="btn ghost small" data-m="chg">← Change</button><h2 style="font-size:20px">Why? <small class="muted">(optional)</small></h2></div>
      ${[main,...MS.sel.filter(f=>f!==main)].map(f=>`<div class="flcard" style="${flVars(f.z)}"><div class="row" style="flex-wrap:nowrap;gap:12px"><span class="flbig">${f.e}</span><div><div style="font-family:var(--head);font-size:20px;font-weight:600">${esc(f.w)}${MS.sel.length>1&&f===main?' <small class="muted">· main</small>':''}</div><small class="muted">${f.t?esc(f.t):`${flZ(f.z).n} · ${flZ(f.z).d}`}</small></div></div></div>`).join('')}
      <div class="flgrid">${FL_TAGS.map(t=>`<button class="flchip" data-m="tag" data-t="${esc(t)}" aria-pressed="${MS.tags.includes(t)}" style="--zc:var(--me);--zb:transparent">${esc(t)}</button>`).join('')}</div>
      <textarea id="flwhy" maxlength="600" placeholder="Want to say more? Only if you like…">${esc(MS.why)}</textarea>
      <button class="btn" data-m="save">Share how I feel 💗</button></div>`;
  }
}
function renderPickRes(){
  const el=$('flres'); if(!el) return;
  const q=MS.q.trim(); let h='';
  /* what you've picked so far (up to 3, tap the star to choose the main one) */
  if(MS.sel.length){
    h+=`<div class="fltray"><small class="muted">${MS.sel.length>1?'Your feelings (★ = main)':'Your feeling'}</small><div class="flgrid">${MS.sel.map((f,i)=>`<span class="fltag" style="${flVars(f.z)}">${MS.sel.length>1?`<button data-m="main" data-i="${i}" aria-label="Make ${esc(f.w)} the main feeling" aria-pressed="${i===MS.main}">${i===MS.main?'★':'☆'}</button>`:''}${f.e} ${esc(f.w)}<button data-m="rm" data-i="${i}" aria-label="Remove ${esc(f.w)}">×</button></span>`).join('')}</div><button class="btn" data-m="next" style="margin-top:8px;width:100%">Next →</button></div>`;
  }
  const info=MS.info&&feelOf(MS.info);
  h+=info?flAbout(info):`<p class="muted" style="margin:0;font-size:14px">Tap a feeling to see what it means ✨ You can pick up to ${FL_MAX}.</p>`;
  if(q){
    const ms=matchFeels(q), exact=ms.some(f=>nz(f.w)===nz(q));
    h+=ms.length?`<div class="flgrid">${ms.map(flChip).join('')}</div>`:`<p class="muted" style="margin:4px 0">No feeling with that name yet.</p>`;
    if(!exact&&nz(q).length>=2) h+=`<button class="flchip" data-m="addnew" style="margin-top:6px;border-style:dashed;--zc:var(--me);--zb:transparent">➕ Add “${esc(q)}” as a new feeling</button>`;
  }else{
    const use=feelUse(), all=allFeels(), rec=[...use.entries()].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>all.find(f=>nz(f.w)===k)).filter(Boolean);
    const cu=customFeels();
    if(rec.length) h+=`<small class="muted">Your usual feelings</small><div class="flgrid" style="margin:4px 0 12px">${rec.map(flChip).join('')}</div>`;
    if(cu.length) h+=`<small class="muted">✨ Our own feelings</small><div class="flgrid" style="margin:4px 0 12px">${cu.map(flChip).join('')}</div>`;
    h+=`<small class="muted">Or browse by how it feels</small><div class="flzones" style="margin:4px 0 10px">${Object.keys(ZONES).map(z=>`<button class="flzone" data-m="zone" data-z="${z}" aria-pressed="${MS.z===z}" style="${flVars(z)}"><b>${ZONES[z].n}</b><small>${ZONES[z].d}</small></button>`).join('')}</div>
      <div class="flgrid">${(()=>{ const zl=all.filter(f=>f.z===MS.z), lim=MS.showAll?zl.length:30; return zl.slice(0,lim).map(flChip).join('')+(zl.length>lim?`<button class="flchip" data-m="more" style="border-style:dashed;--zc:var(--me);--zb:transparent">Show all ${zl.length} ▾</button>`:''); })()}</div>`;
  }
  el.innerHTML=h;
}
/* add or remove a feeling from the picked list (max 3) */
function flToggle(f){
  const i=MS.sel.findIndex(x=>nz(x.w)===nz(f.w));
  MS.info=f.w; MS.editM=null;
  if(i>=0){ MS.sel.splice(i,1); if(MS.main>=MS.sel.length) MS.main=0; else if(i<MS.main) MS.main--; }
  else if(MS.sel.length>=FL_MAX){ toast(`Up to ${FL_MAX} feelings. Remove one first.`); }
  else MS.sel.push(f);
}
const flClearQ=()=>{ MS.q=''; const q=$('flq'); if(q) q.value=''; };
async function saveFeeling(){
  const n=MS.nf, w=(n.w||'').trim().slice(0,28); if(!w||!n.e||!n.z) return;
  const ex=allFeels().find(x=>nz(x.w)===nz(w)); let f=ex;
  if(!ex){
    const t=((n.t||'').trim()||FL_FALLBACK[nz(w)]||'').slice(0,90);
    try{ await setDoc(doc(cref(),'fun','feel_'+(nz(w).replace(/\s+/g,'-')||'x')),{kind:'feeling',w,e:n.e,z:n.z,t,by:me.uid,at:Date.now()}); }
    catch(e){ toast('Could not save that feeling. Try again.'); return; }
    f={w,e:n.e,z:n.z,s:'',t,c:1};
  }
  flToggle(f); if(!MS.sel.some(x=>nz(x.w)===nz(f.w))&&MS.sel.length<FL_MAX) MS.sel.push(f);
  MS.v='pick'; flClearQ(); renderMood();
}
async function saveMeaning(){
  const f=feelOf(MS.editM), t=(MS.mtext||'').trim().slice(0,90); if(!f||!f.c) return;
  const d=fun.find(x=>x.kind==='feeling'&&nz(x.w)===nz(f.w)); if(!d) return;
  const {id,...rest}=d;
  try{ await setDoc(doc(cref(),'fun',id),{...rest,t}); }catch(e){ toast('Could not save. Try again.'); return; }
  MS.sel.forEach(x=>{ if(nz(x.w)===nz(f.w)) x.t=t; });
  MS.editM=null; renderPickRes(); toast('Meaning saved 💗');
}
async function saveMood(){
  if(!MS.sel.length) return;
  const main=MS.sel[MS.main]||MS.sel[0], rest=MS.sel.filter(f=>f!==main).map(f=>({w:f.w,e:f.e,z:f.z}));
  const at=Date.now();
  try{ await setDoc(doc(cref(),'fun',`mood_${at}_${me.uid}`),{kind:'mood',uid:me.uid,at,date:todayStr(),w:main.w,e:main.e,z:main.z,more:rest,tags:MS.tags,why:MS.why.trim().slice(0,600)}); }
  catch(e){ toast('Could not save. Try again.'); return; }
  toast(`Shared: ${[main,...rest].map(f=>f.e).join(' ')} ${main.w}${rest.length?` +${rest.length}`:''}`);
  flReset(); renderMood(); renderMoodChip();
}
async function deleteMood(id){
  if(!id||!id.startsWith('mood_')||!id.endsWith('_'+me.uid)) return;
  if(confirm('Delete this entry?')) await deleteDoc(doc(cref(),'fun',id));
}
const closeMood=()=>{ $('moodmodal').classList.add('hidden'); flReset(); };
$('moodbtn').onclick=()=>{ flReset(); flWr('rr_mood_seen_'+me.uid,String(Date.now())); renderMood(); $('moodmodal').classList.remove('hidden'); renderMoodChip(); };
$('moodmodal').onclick=e=>{ if(e.target===$('moodmodal')) closeMood(); };
const openPlan=()=>{ planTab=''; renderPlan(); $('planmodal').classList.remove('hidden'); document.body.style.overflow='hidden'; $('planmodal').scrollTop=0; };
const closePlan=()=>{ $('planmodal').classList.add('hidden'); document.body.style.overflow=''; };
$('planbtn').onclick=openPlan;
$('moodbody').onclick=e=>{
  const t=e.target.closest('[data-m]'); if(!t) return;
  const a=t.dataset.m;
  if(a==='close') closeMood();
  else if(a==='home'){ flReset(); renderMood(); }
  else if(a==='new'){ flReset(); MS.v='pick'; renderMood(); setTimeout(()=>{ const q=$('flq'); if(q) q.focus(); },60); }
  else if(a==='zone'){ MS.z=t.dataset.z; MS.showAll=false; renderPickRes(); }
  else if(a==='more'){ MS.showAll=true; renderPickRes(); }
  else if(a==='pick'){ const f=allFeels().find(x=>nz(x.w)===t.dataset.k); if(f){ flToggle(f); if(MS.q){ flClearQ(); } renderPickRes(); } }
  else if(a==='rm'){ const i=+t.dataset.i; MS.sel.splice(i,1); if(MS.main>=MS.sel.length) MS.main=0; else if(i<MS.main) MS.main--; renderPickRes(); }
  else if(a==='main'){ MS.main=+t.dataset.i; renderPickRes(); }
  else if(a==='next'){ if(MS.sel.length){ MS.v='why'; renderMood(); } }
  else if(a==='addnew'){ MS.nf={w:cap(MS.q.trim()),e:'',z:'',t:''}; MS.v='newf'; renderMood(); }
  else if(a==='medit'){ const f=feelOf(MS.info); if(f){ MS.editM=f.w; MS.mtext=f.t||''; renderPickRes(); const i=$('flmean'); if(i) i.focus(); } }
  else if(a==='mcancel'){ MS.editM=null; renderPickRes(); }
  else if(a==='msave') saveMeaning();
  else if(a==='pick-back'){ MS.v='pick'; renderMood(); }
  else if(a==='nfe'){ MS.nf.e=t.dataset.e; renderMood(); }
  else if(a==='nfz'){ MS.nf.z=t.dataset.z; renderMood(); }
  else if(a==='nfsave') saveFeeling();
  else if(a==='tag'){ const v=t.dataset.t; MS.tags=MS.tags.includes(v)?MS.tags.filter(x=>x!==v):[...MS.tags,v]; renderMood(); }
  else if(a==='save') saveMood();
  else if(a==='chg'){ MS.v='pick'; renderMood(); }
  else if(a==='del') deleteMood(t.dataset.id);
};
$('moodbody').addEventListener('input',e=>{
  const id=e.target.id, okBtn=()=>{ const b=$('moodbody').querySelector('[data-m="nfsave"]'); if(b){ const ok=MS.nf.w.trim()&&MS.nf.e&&MS.nf.z; b.disabled=!ok; b.style.opacity=ok?'':'.45'; } };
  if(id==='flq'){ MS.q=e.target.value; renderPickRes(); }
  else if(id==='flwhy') MS.why=e.target.value;
  else if(id==='nfw'){ MS.nf.w=e.target.value; okBtn(); }
  else if(id==='nfm') MS.nf.t=e.target.value;
  else if(id==='flmean') MS.mtext=e.target.value;
  else if(id==='nfet'){ MS.nf.e=firstEmoji(e.target.value); $('nfprev').textContent=MS.nf.e; okBtn(); }
});
$('moodbody').addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='flq'){ e.preventDefault(); const q=MS.q.trim();
    if(!q){ if(MS.sel.length){ MS.v='why'; renderMood(); } return; }
    const ms=matchFeels(q);
    if(ms.length){ flToggle(ms[0]); flClearQ(); renderPickRes(); }
    else{ MS.nf={w:cap(q),e:'',z:'',t:''}; MS.v='newf'; renderMood(); } }
});
/* ===== FEELINGS: end ===== */

function sickCardHTML(pid){
  const d=todayStr(), y=yesterdayStr(), mine=isSick(me.uid,d), their=pid&&isSick(pid,d), my_y=isSick(me.uid,y);
  const yb=my_y?'':'<button class="btn ghost small" data-sick="y" data-on="1">I was sick yesterday too</button>';
  const ptl=their?`<p style="margin:8px 0 0;font-size:14px">${esc(nameOf(pid))} is on a sick day 🤒 Be extra gentle today 💗</p>`:'';
  if(!mine&&!their) return '';
  if(!mine) return `<section class="card" aria-label="Sick day" style="margin-top:14px">${ptl}</section>`;
  if(mine) return `<section class="card" aria-label="Sick day" style="margin-top:14px;border-left:4px solid #9cc3e6"><b>🤒 Sick day is on</b><p class="muted" style="margin:6px 0 10px;font-size:14px">Your streaks, scores and kitten health are paused for today. Nothing is expected of you. Drink water, rest, and tick off only what feels easy.</p><div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" data-sick="t" data-on="0">I’m feeling better</button>${yb}</div>${ptl}</section>`;
  return `<section class="card" aria-label="Sick day" style="margin-top:14px"><div class="row" style="gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span><b>🤒 Not feeling well?</b><span class="muted" style="font-size:13px;display:block">A sick day pauses streaks and scores so nothing breaks.</span></span><span class="row" style="gap:8px;flex-wrap:wrap"><button class="btn small" data-sick="t" data-on="1">Start a sick day</button>${yb}</span></div>${ptl}</section>`;
}
function updateSickMenu(){
  const el=$('sickmenu'); if(!el||!me||!couple) return;
  const mine=isSick(me.uid,todayStr()), my_y=isSick(me.uid,yesterdayStr());
  const html=(mine?'<button data-sick="t" data-on="0">🤒 Sick day is on · I’m feeling better</button>':'<button data-sick="t" data-on="1">🤒 Start a sick day</button>')
    +(my_y?'':'<button data-sick="y" data-on="1">🤒 I was sick yesterday too</button>');
  if(el.dataset.h!==html){ el.dataset.h=html; el.innerHTML=html; }
}
/* ---------- Juju reacts to how you're doing ---------- */
function jujuMood(){
  if(!couple||!me) return null;
  const d=todayStr(), pid=partnerId(), a=dayScore(me.uid,d), b=pid?dayScore(pid,d):null, hr=new Date().getHours();
  const full=v=>v!==null&&v>=0.999;
  if(isSick(me.uid,d)) return {k:'sleepy',e:'🤒',t:'Rest up… I’ll curl up next to you. Nothing is expected today 🐾💗'};
  if(pid&&isSick(pid,d)) return {k:'sleepy',e:'🥺',t:`${nameOf(pid)} isn’t feeling well. Let’s be extra sweet today 💗`};
  if(full(a)&&(!pid||b===null||full(b))) return {k:'party',e:'🎉',t:pid?'We did it! Everything is done today. I’m SO proud of you both! 🥳':'Everything done today! I’m so proud of you! 🥳'};
  if(pid&&full(a)&&b!==null) return {k:'wait',e:'👀',t:`You’re all done! Now I’m waiting for ${nameOf(pid)}… 🐾`};
  if(pid&&full(b)&&a!==null) return {k:'nudge',e:'🥺',t:`${nameOf(pid)} finished everything. Your turn! I believe in you 💗`};
  if(hr>=22||hr<5) return {k:'sleepy',e:'💤',t:'Zzz… it’s late. Sleep well so we’re strong tomorrow 🌙'};
  return null;
}

/* ---------- confetti and streak celebrations ---------- */
const MILES=[3,7,14,21,30,50,75,100,150,200,365];
const CEL={3:['3 days in a row!','A cute little start 🌱'],7:['A whole week! 🔥','Seven days of showing up. Juju is so proud.'],14:['Two weeks strong! 💪','Look at you two go!'],21:['21 days: a habit is born ✨','They say this is when it starts to stick.'],30:['A whole month! 🏆','Thirty days of becoming who you want to be.'],50:['50 days! 👑','Royalty behavior, honestly.'],75:['75 days! 🌟','Nothing can stop you now.'],100:['100 DAYS!! 🎊','A hundred days. Unbelievable. Proud of you!'],150:['150 days! 💎','You’re unstoppable.'],200:['200 days! 🚀','Legend status unlocked.'],365:['A FULL YEAR! 🌍','Every single day. You did it.']};
function emojiRain(list,n=36){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for(let i=0;i<n;i++){
    const c=document.createElement('span'); c.className='erain'; c.textContent=list[i%list.length];
    c.style.cssText=`left:${Math.random()*100}vw;--r:${Math.round(Math.random()*720-360)}deg;--t:${(2.4+Math.random()*1.8).toFixed(2)}s;animation-delay:${(Math.random()*.9).toFixed(2)}s;font-size:${16+Math.floor(Math.random()*14)}px`;
    document.body.appendChild(c); setTimeout(()=>c.remove(),5400);
  }
}
function celebrate(n,together){
  const c=CEL[n]||[`${n} days in a row!`,'You keep showing up 💗'];
  emojiRain(['🎉','✨','💗','🌸','⭐','🎊'],46);
  const el=document.createElement('div'); el.className='celeb'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','Streak milestone');
  el.innerHTML=`<div class="celebcard"><div class="celebn">${n}</div><div class="celebd">${together?'days in a row, together 💞':'days in a row'}</div><h2>${c[0]}</h2><p>${together?'Both of you, every day. Juju is so proud of you two.':c[1]}</p><div class="celebj" aria-hidden="true">🐱💗</div><button class="btn">Yay! 💗</button></div>`;
  el.onclick=e=>{ if(e.target===el||e.target.closest('button')) el.remove(); };
  document.body.appendChild(el);
}
function checkCelebrations(){
  if(!couple||!me||!logs.size) return;
  const rd=k=>{ try{ return localStorage.getItem(k); }catch{ return null; } }, wr=(k,v)=>{ try{ localStorage.setItem(k,v); }catch{} };
  /* a milestone is celebrated once, the day the streak reaches it */
  const chk=(key,s,tog)=>{
    const seen=rd(key), top=Math.max(0,...MILES.filter(m=>m<=s));
    if(seen===null){ wr(key,String(top)); if(MILES.includes(s)){ celebrate(s,tog); return true; } return false; }
    if(MILES.includes(s)&&Number(seen)!==s){ wr(key,String(s)); celebrate(s,tog); return true; }
    if(s<Number(seen)) wr(key,String(top));
    return false;
  };
  const shown=chk('rtr_streak_'+me.uid,streak(me.uid),false);
  if(!shown&&partnerId()) chk('rtr_tstreak_'+me.uid,togetherStreak(),true);
}

/* ---------- header kitten box and hamburger menu ---------- */
function renderKitBox(){
  const b=$('kitbtn'); if(!b||!couple) return;
  ensureKittenStart();
  bankPetDays();
  const H=kittyHealth(), st=petStage(petXP()), name=petName(), hp=Math.round(H.v*100);
  const jm=jujuMood(), keep=b.classList.contains('cheer')?' cheer':'';
  b.className='btn ghost small kitbox'+(jm?' jr-'+jm.k:'')+keep;
  b.innerHTML=`${jm?`<span class="jbub" aria-hidden="true">${jm.e}</span>`:''}${kittenSVG(st.i,H,name,44)}<span class="kl"><b>${esc(name)}</b><small>${hLabel(H.v)} · ${hp}%</small><span class="mb"><i style="width:${hp}%;background:${hColor(H.v)}"></i></span></span>`;
  b.setAttribute('aria-label',`Visit ${name}, ${hLabel(H.v)}`);
}
$('kitbtn').onclick=()=>{ pokeMsg=null; renderKitten(partnerId()); $('kitmodal').classList.remove('hidden'); };
$('kitclose').onclick=()=>$('kitmodal').classList.add('hidden');
$('kitmodal').onclick=e=>{ if(e.target===$('kitmodal')) $('kitmodal').classList.add('hidden'); };

const menuEl=$('menu'), menuBtn=$('menubtn');
const closeMenu=()=>{ menuEl.classList.add('hidden'); menuBtn.setAttribute('aria-expanded','false'); };
menuBtn.onclick=e=>{ e.stopPropagation(); const open=menuEl.classList.toggle('hidden')===false; menuBtn.setAttribute('aria-expanded',String(open)); };
menuEl.onclick=e=>{ if(e.target.closest('button')) closeMenu(); };
document.addEventListener('click',e=>{ if(!menuEl.contains(e.target)) closeMenu(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });

/* ---------- tabs ---------- */
let prevTab='dash';
const railEl=$('rail'), railBg=$('railbg'), railBtn=$('railbtn');
let qopen=false;
const setRail=o=>{ railEl.classList.toggle('open',o); railBg.classList.toggle('hidden',!o); railBtn.setAttribute('aria-expanded',String(o)); if(o){ const f=railEl.querySelector('.rl'); f&&f.focus(); } };
let quranRead=null;
const prayRoom=()=>tab==='study'&&studyMode()==='pray';
const applyQ=()=>{ const on=prayRoom()&&qopen; $('v-quran').classList.toggle('open',on); $('qbg').classList.toggle('hidden',!on); $('qedge').classList.toggle('hidden',!prayRoom()||on); };
const setQ=o=>{ qopen=o; if(!o) quranRead=null; applyQ(); if(o) setTimeout(()=>{ const c=$(quranRead!=null?'qw':'qclose'); c&&c.focus(); },380); };
const goTab=t=>{ if(t==='pray'){ openStudy('pray'); return; } if(t==='p25' && tab!=='p25') prevTab=tab; tab=t; qopen=false; setRail(false); window.scrollTo({top:0}); render(); };
document.querySelectorAll('.tab').forEach(b => b.onclick = () => goTab(b.dataset.tab));
$('duo').onclick=e=>{ const c=e.target.closest('.dcard'); if(!c) return; if(c.dataset.setup){ goTab('p25'); return; } if(c.dataset.u){ avU=c.dataset.u; renderAv(); $('avmodal').classList.remove('hidden'); } };
$('avmodal').onclick=e=>{ if(e.target===$('avmodal')) $('avmodal').classList.add('hidden'); };
$('p25back').onclick=()=>goTab(prevTab||'dash');
railBtn.onclick=()=>setRail(!railEl.classList.contains('open'));
railBg.onclick=()=>setRail(false);
$('qedge').onclick=()=>setQ(true);
$('qbg').onclick=()=>setQ(false);
document.addEventListener('keydown',e=>{ if(e.key==='Escape'){ $('avmodal').classList.add('hidden'); if(!$('moodmodal').classList.contains('hidden')) closeMood(); if(!$('planmodal').classList.contains('hidden')) closePlan(); setRail(false); if(qopen) setQ(false); } });
const RAIL_INFO={goals:['🎯','Goals'],problems:['🧩','Problems'],fun:['🎈','Fun'],jar:['💌','Love jar']};
const avSm={}; let avU=null;
function renderAv(){
  const sm=avSm[avU]; if(!sm){ $('avmodal').classList.add('hidden'); return; }
  const u=avU, mine=me&&u===me.uid, nm=esc(nameOf(u));
  const v=p25View(sm,260,{pr:{t:prayN(u,todayStr()),y:prayN(u,lastDays(2)[0])},rd:couple?readiness():0});
  const look=p25Look(sm).map(([k,t,c])=>`<div><span>${k}</span><b>${esc(t||'')}</b>${c?`<i style="background:${c}"></i>`:''}</div>`).join('');
  $('avbody').innerHTML=`${v.svg}<h2>${nm}</h2><span class="dchip" style="display:inline-block">Lv ${sm.lv} · ${esc(sm.title)}</span>${sm.x!=null?`<span class="dxp" style="width:70%;height:8px"><i style="width:${Math.max(4,sm.xb||0)}%"></i></span>`:''}<small class="muted">${v.mood}</small><small class="muted">${v.sk?`🔥 ${v.sk} day streak`:'No streak yet'}${sm.x!=null?` · ${sm.x} XP`:''}</small><div class="avlook">${look}</div>`;
  $('avact').innerHTML=(mine?'<button class="btn small" id="avgo">Open my space</button>':'')+'<button class="btn ghost small" id="avclose">Close</button>';
  $('avclose').onclick=()=>$('avmodal').classList.add('hidden');
  if(mine) $('avgo').onclick=()=>{ $('avmodal').classList.add('hidden'); goTab('p25'); };
}
function updateBadge(){
  const d=$('duo'); if(!d||!couple||!me) return;
  const pid=partnerId(), p=p25Progress();
  const card=(sm,u,mine)=>{
    const nm=esc(nameOf(u));
    if(!sm) return mine
      ? `<button class="dcard me" data-setup="1" aria-label="Set up my avatar"><span class="dl"><b>${nm}</b><small>Tap to set up your avatar</small></span></button>`
      : `<div class="dcard"><span class="dl"><b>${nm}</b><small>hasn’t shared an avatar yet</small></span></div>`;
    avSm[u]=sm;
    const v=p25View(sm,44,{pr:{t:prayN(u,todayStr()),y:prayN(u,lastDays(2)[0])},rd:couple?readiness():0,mini:true});
    const xpbar=sm.x!=null?`<span class="dxp"><i style="width:${Math.max(4,sm.xb||0)}%"></i></span>`:'';
    const inner=`${v.svg}<span class="dl"><b>${nm}</b><small>Lv ${sm.lv} · ${esc(sm.title)}${v.sk?` · 🔥${v.sk}`:''}</small>${xpbar}</span>`;
    return `<button class="dcard${mine?' me':''}" data-u="${esc(u)}" aria-label="Open ${nm}’s avatar">${inner}</button>`;
  };
  const mine=p25Summary(true), th=pid&&fun.find(f=>f.kind==='char'&&f.uid===pid);
  d.innerHTML=card(mine,me.uid,true)+(pid?card(th||null,pid,false):`<div class="dcard"><span class="dl"><b>Partner</b><small>will show here once they join</small></span></div>`);
  if(!$('avmodal').classList.contains('hidden')) renderAv();
}
function updateNav(){
  document.querySelectorAll('.tab').forEach(b => (b.dataset.tab===tab||(b.dataset.tab==='pray'&&prayRoom())) ? b.setAttribute('aria-current','page') : b.removeAttribute('aria-current'));
  const ri=RAIL_INFO[tab]; railBtn.classList.toggle('on',!!ri); $('railico').textContent=ri?ri[0]:'›';
  document.body.classList.toggle('in25',tab==='p25');
  $('duo').classList.toggle('hidden',tab!=='dash');
}

/* ---------- render ---------- */
/* Snapshot-driven renders are coalesced and skipped when the data didn't actually change
   (heartbeat timestamps are ignored), and skipped entirely while the tab is hidden. */
let snapT=0, snapSig='';
function snapSigOf(){
  try{
    let c=couple;
    if(c&&c.np){ c={...c,np:Object.fromEntries(Object.entries(c.np).map(([k,v])=>{ const {ts,...r}=v||{}; return [k,r]; }))}; }
    return JSON.stringify([c,habits,fun,goals,[...logs]]);
  }catch(e){ return String(Math.random()); }
}
function snapRender(){
  if(snapT) return;
  snapT=setTimeout(()=>{ snapT=0; if(document.hidden) return; const sg=snapSigOf(); if(sg===snapSig) return; snapSig=sg; render(); },300);
}
let pendingRender=false;
document.addEventListener('focusout',()=>{ if(pendingRender){ pendingRender=false; setTimeout(render,400); } });
function render(){
  if(!couple || !me) return;
  const ae=document.activeElement;
  if(ae && (ae.tagName==='TEXTAREA'||ae.tagName==='INPUT') && $('app').contains(ae)){ pendingRender=true; return; }
  updateNav(); updateSickMenu();
  ['p25','dash','habits','goals','problems','pray','meals','sleep','fun','jar','study'].forEach(k => $('v-'+k).classList.toggle('hidden', k!==tab));
  const pid = partnerId();
  updateBell();
  { const hr=new Date().getHours(); $('today').textContent = (hr<5?'🌙':hr<12?'☀️':hr<18?'🌤️':'🌙')+' '+new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
  $('title').textContent = pid ? `${nameOf(me.uid)} & ${nameOf(pid)}` : 'Our road to ready';
  renderP25();
  if(tab==='p25'){ const w=p25Week(); $('title').textContent='Who I’m becoming'; $('today').textContent=`Week ${w.n} of ${w.total} · ${w.left} left`; }
  if(tab==='dash'){ renderDash(pid); renderPlanBox(); }
  if(!$('planmodal').classList.contains('hidden')) renderPlan();
  if(tab==='habits') renderHabits(pid);
  if(tab==='goals') renderGoals();
  if(tab==='problems') renderProblems(pid);
  if(tab==='meals') renderMeals(pid);
  if(tab==='sleep') renderSleep(pid);
  if(tab==='fun') renderFun(pid);
  if(tab==='jar') renderJar(pid);
  if(tab==='study') renderStudy(); else stopStudyAmb();
  if(prayRoom()){ renderPray(pid); const q=$('v-quran'),st=q.scrollTop; renderQuran(pid); q.scrollTop=st; }
  applyQ();
  renderKitBox();
  renderMoodChip(); renderPlanChip();
  try{ renderBubble(); }catch(e){ console.warn(e); }
  if(!$('moodmodal').classList.contains('hidden')&&MS.v==='home') renderMood();
  updateBadge();
  try{ checkCelebrations(); }catch(e){ console.warn(e); }
  if(!$('kitmodal').classList.contains('hidden')) renderKitten(pid);
}

function deltaBadge(uid){
  const a = rangeScore(uid, lastDays(7)), b = rangeScore(uid, lastDays(7,7));
  if(a===null || b===null) return '<span class="delta flat">New</span>';
  const d = Math.round((a-b)*100);
  if(d>0) return `<span class="delta up">▲ ${d} pts vs last week</span>`;
  if(d<0) return `<span class="delta down">▼ ${-d} pts vs last week</span>`;
  return '<span class="delta flat">Same as last week</span>';
}
function heat(uid, color){
  return `<div class="heat" aria-label="Last 14 days">` + lastDays(14).map(d => {
    const v = dayScore(uid,d);
    const style = isSick(uid,d) ? 'background:#9cc3e6;opacity:.55;border-color:transparent' : v===null ? '' : `background:${color};opacity:${(0.2+0.8*v).toFixed(2)};border-color:transparent`;
    return `<i title="${d}: ${isSick(uid,d)?'sick day 🤒':pct(v)}" style="${style}"></i>`;
  }).join('') + `</div>`;
}
function personPanel(uid, color, soft){
  const s30 = rangeScore(uid, lastDays(30));
  return `<div class="card person">
    <h3><span class="dot" style="background:${color}"></span>${esc(nameOf(uid))}${uid===me.uid?' <span class="tag">you</span>':''}</h3>
    <div class="stats">
      <div><span class="big" style="color:${color}">${pct(s30)}</span><small>last 30 days</small></div>
      <div><span class="big">${streak(uid)}</span><small>day streak</small></div>
    </div>
    ${deltaBadge(uid)}
    <p class="muted" style="margin:14px 0 0;font-size:14px">Last 14 days</p>
    ${heat(uid,color)}
  </div>`;
}

const prayN=(uid,d)=>{ const st=earliestLog(uid,id=>id.startsWith('prayer_')); return st&&d>=st ? cnt('prayer_',PRAYERS,uid,d) : -1; };
function renderDash(pid){
  const r = readiness();
  const marks = MILESTONES.map(([p,l]) => `<div class="mile ${r>=p?'hit':''}" style="left:${p===100?99.5:p}%"><span style="${p===100?'transform:translateX(-90%)':''}">${l}</span></div>`).join('');
  const uids = pid ? [me.uid, pid] : [me.uid];
  const cats = CATS.filter(c => uids.some(u => catScore(u,c,lastDays(30))!==null));
  const catRows = cats.map(c => `<div class="bar"><span>${c}</span>` + [me.uid,pid].map((u,i) => {
    if(!u) return '<span class="b"></span>';
    const v = catScore(u,c,lastDays(30)); const col = i===0?'var(--me)':'var(--you)';
    return `<span class="b" title="${esc(nameOf(u))}: ${pct(v)}"><i style="width:${v===null?0:Math.round(v*100)}%;background:${col}"></i></span>`;
  }).join('') + `</div>`).join('');

  // weekly chart: 8 weeks
  let weeks='', labels='';
  for(let w=7; w>=0; w--){
    const ds = lastDays(7, w*7);
    const bars = uids.map((u,i) => { const v=rangeScore(u,ds); const h=v===null?0:Math.max(3,Math.round(v*100));
      return `<i title="${esc(nameOf(u))}: ${pct(v)}" style="height:${h}%;background:${i===0?'var(--me)':'var(--you)'}"></i>`; }).join('');
    weeks += `<div class="wk">${bars}</div>`;
    labels += `<span>${w===0?'now':'-'+w+'w'}</span>`;
  }

  const waiting = pid ? '' : `<div class="card" style="margin-bottom:14px">Share your code <b>${esc(profile.coupleId)}</b> with your partner so they can join.</div>`;

  $('v-dash').innerHTML = `
    ${waiting}
    ${nudgeHTML(pid)}
    ${statusHTML(pid)}
    ${sickCardHTML(pid)}
    <div id="planbox"></div>
    <section class="card road" aria-label="Getting ready for marriage progress">
      <div class="row" style="justify-content:space-between;align-items:flex-end">
        <h2>Getting ready for marriage</h2>
        <div class="pct">${r}%</div>
      </div>
      <p class="muted" style="margin:6px 0 0">Built from your habits, prayers and Quran, meals and tea, sleep, and your shared goals. Every steady day adds a little.</p>
      <div class="track" role="progressbar" aria-valuenow="${r}" aria-valuemin="0" aria-valuemax="100">
        <div class="fill" style="width:${r}%"></div>
        ${marks}
        <div class="heart" style="left:${Math.max(2,Math.min(98,r))}%">💞</div>
      </div>
    </section>
    ${pid ? `<div class="card together"><span class="big">${togetherStreak()}</span>
      <div><b>days in a row doing it together</b><div class="muted" style="font-size:14px">${
        (dayScore(me.uid,todayStr())===1 && dayScore(pid,todayStr())===1) ? 'You both finished everything today 💞' : 'Counts days when you both finish at least 60% of your habits'}</div></div></div>` : ''}
    <div style="margin-top:14px">${duaBubbleHTML()}</div>
    <div class="grid2" style="margin-top:0">
      ${personPanel(me.uid,'var(--me)')}
      ${pid ? personPanel(pid,'var(--you)') : '<div class="card muted">Your partner’s dashboard will show up here once they join.</div>'}
    </div>
    <div class="card" style="margin-top:14px"><h3>What counts toward ready</h3>
      <p class="muted" style="margin:4px 0 8px;font-size:14px">Last 30 days · ${esc(nameOf(me.uid))} on top, ${pid?esc(nameOf(pid)):'partner'} below</p>
      <div class="bars">${[...COMPS.map(([k,l,w])=>[k,l,w]),['goals','Shared goals',20]].map(([k,l,w])=>{
        const bar=(u,col)=>{ if(!u) return '<span class="b"></span>';
          const v = k==='goals' ? goalsScore() : compScore(u,k);
          return `<span class="b" title="${esc(nameOf(u))}: ${pct(v)}"><i style="width:${v===null?0:Math.round(v*100)}%;background:${col}"></i></span>`; };
        return `<div class="bar" style="grid-template-columns:130px 1fr 1fr"><span>${l} <small class="muted">${w}%</small></span>${bar(me.uid,'var(--me)')}${k==='goals'?'<span class="b"></span>':bar(pid,'var(--you)')}</div>`;
      }).join('')}</div>
    </div>
    ${spiritChartHTML(pid)}
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Growth by area</h3><p class="muted" style="margin:4px 0 8px;font-size:14px">Last 30 days · ${esc(nameOf(me.uid))} on top, ${pid?esc(nameOf(pid)):'partner'} below</p>
        <div class="bars">${catRows || '<p class="muted">Add habits to see your areas.</p>'}</div></div>
      <div class="card"><h3>Weekly progress</h3><p class="muted" style="margin:4px 0 0;font-size:14px">Last 8 weeks · taller bars mean more habits done</p>
        <div class="weeks">${weeks}</div><div class="wl">${labels}</div></div>
    </div>`;
  bindNudges(); bindStatus(); bindDua();
}

function itemHTML(h, uid, readonly, color){
  const done = logs.has(logKey(h.id, uid, todayStr()));
  const tag = h.owner==='both' ? 'both' : h.cat;
  return `<button class="item ${done?'done':''} ${readonly?'ro':''}" style="--c:${color}" ${readonly?'disabled':`data-t="${h.id}"`}>
    <span class="box">${done?'💗':''}</span><span class="t" style="flex:1">${esc(h.name)}</span><span class="tag">${esc(tag)}</span></button>`;
}

function renderHabits(pid){
  const mine = hOf(me.uid), theirs = pid ? hOf(pid) : [];
  const starter = habits.length===0 ? `<p class="muted" style="margin:10px 0 0">Tap to add a starter habit:</p><div class="chips">` +
    SUGGEST.map((s,i)=>`<button class="chip" data-s="${i}">${esc(s[0])}</button>`).join('') + `</div>` : '';
  $('v-habits').innerHTML = `
    <div class="card">
      <h3>Add a habit</h3>
      <div class="form">
        <input id="hn" placeholder="e.g. Workout">
        <select id="hc">${CATS.map(c=>`<option>${c}</option>`).join('')}</select>
        <select id="hw"><option value="1">Nice to have</option><option value="2" selected>Important</option><option value="3">Core</option></select>
        <select id="ho"><option value="${me.uid}">Just me</option>${pid?'<option value="both">Both of us</option>':''}</select>
        <button class="btn" id="ha">Add</button>
      </div>
      ${starter}
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Today · ${esc(nameOf(me.uid))}</h3>
        ${mine.map(h=>itemHTML(h,me.uid,false,'var(--me)')).join('') || '<p class="muted">No habits yet.</p>'}</div>
      <div class="card"><h3>Today · ${pid?esc(nameOf(pid)):'Partner'}</h3>
        ${theirs.map(h=>itemHTML(h,pid,true,'var(--you)')).join('') || '<p class="muted">Nothing to show yet.</p>'}</div>
    </div>
    <div class="card" style="margin-top:14px"><h3>Manage habits</h3>
      ${habits.map(h=> editHabit===h.id ? `<div class="form" style="grid-template-columns:2fr 1.2fr 1.2fr auto auto" data-hform="${h.id}">
          <input data-hn value="${esc(h.name)}" aria-label="Habit name">
          <select data-hc>${CATS.map(c=>`<option ${c===h.cat?'selected':''}>${c}</option>`).join('')}</select>
          <select data-hw><option value="1" ${h.weight==1?'selected':''}>Nice to have</option><option value="2" ${h.weight==2?'selected':''}>Important</option><option value="3" ${h.weight==3?'selected':''}>Core</option></select>
          <button class="btn small" data-hsave="${h.id}">Save</button><button class="btn ghost small" data-hcancel>Cancel</button></div>`
        : `<div class="row" style="justify-content:space-between;margin-top:8px"><span>${esc(h.name)} <span class="tag">${h.owner==='both'?'both':esc(nameOf(h.owner))}</span> <span class="tag">${esc(h.cat)}</span></span>
          <span class="row"><button class="btn ghost small" data-hedit="${h.id}">Edit</button><button class="btn ghost small" data-del="${h.id}">Delete</button></span></div>`).join('') || '<p class="muted">Nothing here yet.</p>'}
    </div>`;
  $('ha').onclick = async () => { await addHabit($('hn').value,$('hc').value,$('hw').value,$('ho').value); };
  $('hn').onkeydown = e => { if(e.key==='Enter') $('ha').click(); };
  $('v-habits').querySelectorAll('[data-t]').forEach(b => b.onclick = () => toggle(b.dataset.t));
  $('v-habits').querySelectorAll('[data-del]').forEach(b => b.onclick = () => removeHabit(b.dataset.del));
  $('v-habits').querySelectorAll('[data-hedit]').forEach(b => b.onclick = () => { editHabit=b.dataset.hedit; render(); });
  $('v-habits').querySelectorAll('[data-hcancel]').forEach(b => b.onclick = () => { editHabit=null; render(); });
  $('v-habits').querySelectorAll('[data-hsave]').forEach(b => b.onclick = async () => {
    const f=b.closest('[data-hform]'); const name=f.querySelector('[data-hn]').value.trim(); if(!name) return;
    await updateDoc(doc(cref(),'habits',b.dataset.hsave),{name,cat:f.querySelector('[data-hc]').value,weight:Number(f.querySelector('[data-hw]').value)});
    editHabit=null; render(); toast('Habit updated');
  });
  $('v-habits').querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const s=SUGGEST[b.dataset.s]; addHabit(s[0],s[1],s[2],me.uid); });
}

function renderGoals(){
  const pid=partnerId();
  const goalCard=g=>{
    if(editGoal===g.id) return `<div class="card"><h3>Edit goal</h3><div class="form" style="grid-template-columns:2fr 1.2fr 1fr auto auto" data-gform="${g.id}">
      <input data-gn value="${esc(g.title)}" aria-label="Goal title">
      <select data-gc>${CATS.map(c=>`<option ${c===g.cat?'selected':''}>${c}</option>`).join('')}</select>
      <input data-gt type="number" min="1" value="${g.target}" aria-label="Target number">
      <button class="btn small" data-gsave="${g.id}">Save</button><button class="btn ghost small" data-gcancel>Cancel</button></div></div>`;
    const p=Math.round(goalProgress(g)*100), t=g.target;
    const btns=`<button class="btn ghost small" data-g="${g.id}" data-by="-1" aria-label="Minus one">−1</button>
      <button class="btn small" data-g="${g.id}" data-by="1" aria-label="Plus one">+1</button>`;
    let body;
    if(g.mode==='each'){
      const mine=(g.counts||{})[me.uid]||0, theirs=pid?((g.counts||{})[pid]||0):0;
      const line=(name,n,col,mineRow)=>`<div class="row" style="justify-content:space-between;margin-top:8px"><span><span class="dot" style="background:${col}"></span> ${esc(name)}: <b>${n} / ${t}</b></span>${mineRow?`<span class="row">${btns}</span>`:''}</div>
        <div class="gbar"><i style="width:${Math.round(Math.min(1,n/t)*100)}%;background:${col}"></i></div>`;
      body=line(nameOf(me.uid),mine,'var(--me)',true)+(pid?line(nameOf(pid),theirs,'var(--you)',false):'')+
        `<p class="muted" style="margin:10px 0 0;font-size:14px">Each of you taps your own. Together: <b>${p}%</b></p>`;
    }else{
      body=`<div class="row" style="justify-content:space-between;margin-top:8px"><b>${g.current||0} / ${t}</b><span class="row">${btns}</span></div>
        <div class="gbar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i style="width:${p}%"></i></div>`;
    }
    return `<div class="card"><div class="row" style="justify-content:space-between">
        <div><b>${esc(g.title)}</b> <span class="tag">${esc(g.cat)}</span> <span class="tag">${g.mode==='each'?'each of us':'together'}</span></div>
        <span class="row"><button class="btn ghost small" data-gedit="${g.id}">Edit</button><button class="btn ghost small" data-gd="${g.id}">Delete</button></span></div>${body}</div>`;
  };
  $('v-goals').innerHTML = `
    <div class="card"><h3>Add a goal</h3>
      <p class="muted" style="margin:4px 0 0">Give it a number so you can see it fill up. <b>Together</b> means one tap counts for both of you (like “12 future talks”). <b>Each of us</b> means you both tap your own (like “pray on 30 days”).</p>
      <div class="form" style="grid-template-columns:2fr 1.2fr 1.2fr 1fr auto">
        <input id="gt" placeholder="e.g. Pray all five on 30 days">
        <select id="gc">${CATS.map(c=>`<option ${c==='Us'?'selected':''}>${c}</option>`).join('')}</select>
        <select id="gm" aria-label="Who taps"><option value="together">Together</option><option value="each">Each of us</option></select>
        <input id="gn" type="number" min="1" value="10" aria-label="Target number">
        <button class="btn" id="ga">Add</button>
      </div>
    </div>
    <div style="margin-top:14px;display:grid;gap:12px">
      ${goals.map(goalCard).join('') || '<div class="card muted">No goals yet. Add your first one above.</div>'}
    </div>`;
  $('ga').onclick = () => addGoal($('gt').value,$('gc').value,$('gn').value,$('gm').value);
  $('v-goals').querySelectorAll('[data-g]').forEach(b => b.onclick = () => bumpGoal(goals.find(g=>g.id===b.dataset.g), Number(b.dataset.by)));
  $('v-goals').querySelectorAll('[data-gd]').forEach(b => b.onclick = () => removeGoal(b.dataset.gd));
  $('v-goals').querySelectorAll('[data-gedit]').forEach(b => b.onclick = () => { editGoal=b.dataset.gedit; render(); });
  $('v-goals').querySelectorAll('[data-gcancel]').forEach(b => b.onclick = () => { editGoal=null; render(); });
  $('v-goals').querySelectorAll('[data-gsave]').forEach(b => b.onclick = async () => {
    const f=b.closest('[data-gform]'); const title=f.querySelector('[data-gn]').value.trim(); if(!title) return;
    await updateDoc(doc(cref(),'goals',b.dataset.gsave),{title,cat:f.querySelector('[data-gc]').value,target:Math.max(1,Number(f.querySelector('[data-gt]').value)||1)});
    editGoal=null; render(); toast('Goal updated');
  });
}

initP25({db,doc,getDoc,updateDoc,me:()=>me,habits:()=>hOf(me.uid),logs:()=>logs,goals:()=>goals,logKey,lastDays,todayStr,fmt,esc,toggle,bumpGoal,badge:updateBadge,prayers:d=>prayN(me.uid,d),ready:()=>couple?readiness():0,shareChar:sm=>{ if(!profile||!profile.coupleId||!me) return; const r=doc(cref(),'fun',`char_${me.uid}`); return sm ? setDoc(r,{kind:'char',uid:me.uid,...sm,at:Date.now()}) : deleteDoc(r); }});
initStudy({huntHTML:p=>{ const [cname,chex]=colourOfDay(); return colourTodayHTML(p,cname,chex)+colourStatsHTML(p)+colourHistoryHTML(p)+colourCollageHTML(); }, huntBind:()=>{ bindColour(colourOfDay()[0]); loadPhotos(); }, isSick:()=>isSick(me.uid,todayStr()),setSick:on=>setSick(todayStr(),on),openQuran:m=>{ quranRead=m; setQ(true); render(); },db,doc,setDoc,updateDoc,deleteDoc,collection,onSnapshot,status:u=>statusOf(u),todayStr,logged:id=>has('prayer_',id,me.uid,todayStr()),toast,me:()=>me,couple:()=>couple,cid:()=>profile&&profile.coupleId,pid:partnerId,nameOf,av:u=>avSm[u]&&avSm[u].av,esc,$,render,goTab,tab:()=>tab});
setInterval(()=>{ if(couple&&me) render(); },60000);
  { const orig=renderKitBox;
  renderKitBox=function(){
    try{ orig(); }
    catch(e){ const b=$('kitbtn'); if(b) b.textContent='🐱 '+(e&&e.message); console.error(e); }
  };
}
show('auth');
