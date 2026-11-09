/* "25" — private personal space inside Our Road to Ready. Stored only in users/{uid}.p25, never in couples/*,
   so it never touches readiness, the kitten, or your partner's view. */
const TITLES=['Seedling','Apprentice','Explorer','Builder','Scholar','Strategist','Architect','Legend'];
const SK=['#f6d5b8','#e8b98f','#c68c5f','#9a6240','#6b4129'],HC=['#2b1d17','#5a3a22','#a0622d','#d8a24a','#8a8a8a','#c0396b'],OC=['#e0457b','#1f9d8f','#7a5cff','#f2b134','#3b82f6','#24203b'];
const HS=['short','long','bun','curly','scarf','cap'],AC=['none','glasses','flower','headphones'];
const STARTERS=['Quran','Arabic','Strength / workout','Learn something','No doom-scrolling'];
let ctx,P=null,loaded=false,saveT,uidK='';
const $=id=>document.getElementById(id);
const clamp=x=>Math.max(0,Math.min(1,x));
const mk=()=>({step:0,name:'',av:{s:1,h:1,hs:'long',o:0,ac:'none'},tasks:[],days:{},goals:[],wk:{},wins:[],sub:'today',start:ctx.todayStr(),feel:''});
const uid=()=>ctx.me().uid;
const rid=()=>Math.random().toString(36).slice(2,8);
function mon(){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return ctx.fmt(d)}
function save(){try{localStorage.setItem(uidK,JSON.stringify(P))}catch(e){}clearTimeout(saveT);saveT=setTimeout(()=>ctx.updateDoc(ctx.doc(ctx.db,'users',uid()),{p25:JSON.stringify(P)}).catch(()=>{}),1200)}
async function load(){uidK='p25_'+uid();try{P=JSON.parse(localStorage.getItem(uidK))}catch(e){}
 try{const s=await ctx.getDoc(ctx.doc(ctx.db,'users',uid()));const r=s.data()&&s.data().p25;if(r){const q=JSON.parse(r);if(!P||(q.step>=99&&!(P.step>=99))||JSON.stringify(q).length>=JSON.stringify(P).length)P=q}}catch(e){}
 P=P||mk();loaded=true;draw()}
const hab=id=>ctx.habits().find(h=>h.id===id);
const gl=id=>ctx.goals().find(g=>g.id===id);
function isDone(t,d){return !!(P.days[d]&&P.days[d][t.id])}
function sync(){const L=ctx.logs(),u=uid();for(const t of P.tasks){if(!t.link||t.link.k!=='h'||!hab(t.link.id))continue;
 for(const d of ctx.lastDays(14)){if(d<t.link.since)continue;const day=P.days[d]=P.days[d]||{};if(L.has(ctx.logKey(t.link.id,u,d)))day[t.id]=1;else delete day[t.id]}}}
function goalPct(g){if(g.link&&g.link.k==='g'){const s=gl(g.link.id);if(s)return Math.min(1,(s.current||0)/Math.max(1,s.target||1))}return g.ck?1:0}
function xp(){let x=0;for(const d in P.days)x+=Object.keys(P.days[d]).length*10;for(const k in P.wk){if(P.wk[k].md)x+=100;if(P.wk[k].wd)x+=75}
 return x+P.wins.length*25+P.goals.filter(g=>goalPct(g)>=1).length*150}
const anyTick=d=>P.days[d]&&Object.keys(P.days[d]).length>0;
function miss(){const t=ctx.todayStr();if(anyTick(t))return 0;let n=0;for(const d of ctx.lastDays(12,1).reverse()){if(d<P.start)break;if(anyTick(d))break;n++}return n}
function streak(){let n=0;const ds=ctx.lastDays(60).reverse();for(let i=0;i<ds.length;i++){if(anyTick(ds[i]))n++;else if(i===0)continue;else break}return n}
const mix=(a,b,t)=>{const p=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};

function avatar(a,w,stage,size=180){
 const G='#8c8c96',skin=mix(SK[a.s],G,w*.5),hair=mix(HC[a.h],G,w*.4),out=mix(OC[a.o],G,w*.7),out2=mix(out,'#000000',.18),ink='#2a2238',sl=w*9,sc=(.78+stage*.035).toFixed(3),hy=70+sl;
 let back='',front='',acc='';
 if(a.hs==='long')back=`<rect x="47" y="${hy-18}" width="66" height="74" rx="28" fill="${hair}"/>`;
 if(a.hs==='scarf')back=`<path d="M44 ${hy+4} Q44 ${hy-42} 80 ${hy-42} Q116 ${hy-42} 116 ${hy+4} L118 ${hy+50} Q80 ${hy+64} 42 ${hy+50}Z" fill="${out2}"/>`;
 if(a.hs==='short')front=`<path d="M50 ${hy-6} Q52 ${hy-38} 80 ${hy-38} Q108 ${hy-38} 110 ${hy-6} Q96 ${hy-24} 80 ${hy-22} Q64 ${hy-24} 50 ${hy-6}Z" fill="${hair}"/>`;
 if(a.hs==='long')front=`<path d="M49 ${hy} Q50 ${hy-40} 80 ${hy-40} Q110 ${hy-40} 111 ${hy} Q98 ${hy-26} 80 ${hy-26} Q62 ${hy-26} 49 ${hy}Z" fill="${hair}"/>`;
 if(a.hs==='bun')front=`<circle cx="80" cy="${hy-42}" r="12" fill="${hair}"/><path d="M50 ${hy-6} Q52 ${hy-38} 80 ${hy-38} Q108 ${hy-38} 110 ${hy-6} Q96 ${hy-24} 80 ${hy-22} Q64 ${hy-24} 50 ${hy-6}Z" fill="${hair}"/>`;
 if(a.hs==='curly')front=[[52,-12],[62,-30],[80,-37],[98,-30],[108,-12],[50,2],[110,2]].map(([x,y])=>`<circle cx="${x}" cy="${hy+y}" r="12" fill="${hair}"/>`).join('');
 if(a.hs==='scarf')front=`<path d="M48 ${hy-4} Q50 ${hy-40} 80 ${hy-40} Q110 ${hy-40} 112 ${hy-4} Q100 ${hy-22} 80 ${hy-22} Q60 ${hy-22} 48 ${hy-4}Z" fill="${out}"/>`;
 if(a.hs==='cap')front=`<path d="M50 ${hy-8} Q52 ${hy-40} 80 ${hy-40} Q108 ${hy-40} 110 ${hy-8}Z" fill="${out2}"/><rect x="48" y="${hy-10}" width="64" height="6" rx="3" fill="${out2}"/><rect x="84" y="${hy-12}" width="34" height="6" rx="3" fill="${out2}"/>`;
 if(a.ac==='glasses')acc=`<g fill="none" stroke="${ink}" stroke-width="2"><circle cx="68" cy="${hy+2}" r="9"/><circle cx="92" cy="${hy+2}" r="9"/><path d="M77 ${hy+2}h6"/></g>`;
 if(a.ac==='flower')acc=`<g transform="translate(106 ${hy-22})"><circle r="3" fill="#ffd76a"/>${[0,72,144,216,288].map(r=>`<circle cx="${(Math.cos(r*Math.PI/180)*6).toFixed(1)}" cy="${(Math.sin(r*Math.PI/180)*6).toFixed(1)}" r="3.4" fill="#ff8fb1"/>`).join('')}</g>`;
 if(a.ac==='headphones')acc=`<path d="M48 ${hy} Q48 ${hy-44} 80 ${hy-44} Q112 ${hy-44} 112 ${hy}" fill="none" stroke="${ink}" stroke-width="5"/><rect x="43" y="${hy-4}" width="9" height="18" rx="4" fill="${ink}"/><rect x="108" y="${hy-4}" width="9" height="18" rx="4" fill="${ink}"/>`;
 const happy=w<.3,eyes=happy?`<circle cx="69" cy="${hy+2}" r="3.2" fill="${ink}"/><circle cx="91" cy="${hy+2}" r="3.2" fill="${ink}"/>`:`<path d="M64 ${hy+3} q5 ${3-w*3} 10 0M86 ${hy+3} q5 ${3-w*3} 10 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
 const brows=`<path d="M63 ${hy-9+w*2} L75 ${hy-9-w*3}M85 ${hy-9-w*3} L97 ${hy-9+w*2}" stroke="${ink}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
 const mouth=`<path d="M71 ${hy+18} Q80 ${hy+18+(9-w*22).toFixed(1)} 89 ${hy+18}" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
 const circles=w>.25?`<ellipse cx="69" cy="${hy+9}" rx="7" ry="2.5" fill="#5b3b7a" opacity="${(w*.45).toFixed(2)}"/><ellipse cx="91" cy="${hy+9}" rx="7" ry="2.5" fill="#5b3b7a" opacity="${(w*.45).toFixed(2)}"/>`:'';
 const tear=w>.55?`<ellipse class="p25tear" cx="64" cy="${hy+12}" rx="2.4" ry="3.6" fill="#6ec6ff"/>`:'';
 const cheeks=happy?`<circle cx="62" cy="${hy+13}" r="5" fill="#ff8fb1" opacity=".35"/><circle cx="98" cy="${hy+13}" r="5" fill="#ff8fb1" opacity=".35"/>`:'';
 const book=stage>=2?`<rect x="92" y="128" width="26" height="19" rx="3" fill="#7a5cff"/><rect x="95" y="131" width="20" height="3" fill="#fff" opacity=".7"/>`:'';
 const grad=stage>=4&&a.hs!=='cap'?`<path d="M54 ${hy-34} L80 ${hy-46} L106 ${hy-34} L80 ${hy-22}Z" fill="#24203b"/><path d="M106 ${hy-34} v14" stroke="#f2b134" stroke-width="2"/>`:'';
 const crown=stage>=7?`<path d="M62 ${hy-48} l6 -14 l12 10 l12 -10 l6 14Z" fill="#f2b134"/>`:'';
 const sparkle=stage>=5&&w<.3?`<text x="30" y="40" font-size="16">✨</text><text x="124" y="52" font-size="14">✨</text>`:'';
 const cloud=w>.4?`<g opacity="${clamp(w*1.2).toFixed(2)}"><ellipse cx="80" cy="14" rx="34" ry="11" fill="#6b6b7a"/><ellipse cx="62" cy="20" rx="18" ry="9" fill="#6b6b7a"/><ellipse cx="100" cy="20" rx="18" ry="9" fill="#6b6b7a"/>${[66,80,94].map((x,i)=>`<path class="p25rain" style="animation-delay:${i*.35}s" d="M${x} 32 v8" stroke="#6ec6ff" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`:'';
 const n=Math.min(8,stage+1),gar=Array.from({length:n},(_,i)=>`<text x="${12+i*17}" y="${176-(i%2)*4}" font-size="${12+(i<stage?2:0)}">${w>.5?'🥀':(i<2?'🌱':i<5?'🌿':i<7?'🌷':'🌳')}</text>`).join('');
 return `<svg viewBox="0 0 160 190" width="${size}" height="${size*1.19}" role="img" aria-label="Your character">${cloud}<g transform="translate(80 170) scale(${sc}) translate(-80 -170)">
 <ellipse cx="80" cy="168" rx="38" ry="5" fill="#000" opacity=".12"/>${back}
 <rect x="52" y="${108+sl}" width="56" height="${62-sl}" rx="22" fill="${out}"/><rect x="70" y="${100+sl}" width="20" height="14" rx="6" fill="${skin}"/>${book}
 <circle cx="80" cy="${hy}" r="30" fill="${skin}"/>${circles}${eyes}${brows}${cheeks}${mouth}${tear}${front}${grad}${acc}${crown}</g>${sparkle}${gar}</svg>`}

const CSS=`#v-p25 .pc{background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
#v-p25 .sub{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}#v-p25 .sub button{border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:6px 14px;font-weight:700}
#v-p25 .sub button[aria-pressed=true]{background:var(--ink);color:var(--bg)}
#v-p25 .tk{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}#v-p25 .tk:first-child{border-top:0}
#v-p25 .cb{width:36px;height:36px;border-radius:10px;border:1.5px solid var(--line);background:transparent;font-size:18px;color:#fff}#v-p25 .cb[aria-pressed=true]{background:var(--you);border-color:var(--you)}
#v-p25 input[type=text],#v-p25 textarea,#v-p25 select{width:100%}#v-p25 textarea{font:inherit;color:var(--ink);background:var(--card);border:1.5px solid var(--line);border-radius:10px;padding:10px}
#v-p25 .sw{width:30px;height:30px;border-radius:50%;border:2px solid var(--line);padding:0}#v-p25 .sw[aria-pressed=true]{outline:3px solid var(--gold)}
#v-p25 .ch{border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:5px 12px}#v-p25 .ch[aria-pressed=true]{background:var(--me);border-color:var(--me);color:#fff}
#v-p25 .pb{height:8px;border-radius:9px;background:var(--bg);overflow:hidden;margin:6px 0}#v-p25 .pb i{display:block;height:100%;background:linear-gradient(90deg,var(--me),var(--you))}
.p25tear{animation:p25t 2.2s infinite}@keyframes p25t{0%{transform:translateY(0);opacity:1}100%{transform:translateY(16px);opacity:0}}.p25rain{animation:p25r .9s infinite}@keyframes p25r{0%{transform:translateY(0);opacity:1}100%{transform:translateY(10px);opacity:0}}
@media(prefers-reduced-motion:reduce){.p25tear,.p25rain{animation:none}}`;

const sw=(k,arr,v,f)=>arr.map((c,i)=>`<button class="sw" data-a="av" data-k="${k}" data-v="${i}" aria-pressed="${v===i}" style="background:${c}" aria-label="${k} ${i+1}"></button>`).join('');
const chips=(k,arr,v)=>arr.map(c=>`<button class="ch" data-a="av" data-k="${k}" data-v="${c}" aria-pressed="${v===c}">${c}</button>`).join('');
function maker(){const a=P.av;return `<div style="display:grid;gap:10px;margin-top:10px"><div><small class="muted">Skin</small><div class="row">${sw('s',SK,a.s)}</div></div><div><small class="muted">Hair / headwear</small><div class="row">${chips('hs',HS,a.hs)}</div></div><div><small class="muted">Hair colour</small><div class="row">${sw('h',HC,a.h)}</div></div><div><small class="muted">Outfit</small><div class="row">${sw('o',OC,a.o)}</div></div><div><small class="muted">Extra</small><div class="row">${chips('ac',AC,a.ac)}</div></div></div>`}
function stats(){const x=xp(),lv=Math.floor(x/300)+1,st=Math.min(7,lv-1),m=miss();return{x,lv,st,m,w:clamp(m/10),title:TITLES[st],pr:(x%300)/300}}
function mood(s){if(s.m===0)return s.w===0&&streak()>=3?'Thriving 🌟':'Doing well 🙂';return s.m<=2?'A bit low…':s.m<=5?'Worn down 😔':'Miserable. Please tick something 🥺'}
const taskRow=t=>{const d=ctx.todayStr(),l=t.link&&t.link.k==='h'&&hab(t.link.id);return `<div class="tk"><button class="cb" data-a="tick" data-id="${t.id}" aria-pressed="${isDone(t,d)}" aria-label="${ctx.esc(t.t)}">${isDone(t,d)?'✓':''}</button><div style="flex:1"><b>${ctx.esc(t.t)}</b>${l?`<div class="muted" style="font-size:12px">🔗 shared with “${ctx.esc(l.name)}”: one tick counts for both</div>`:''}</div></div>`};
const linkSel=(t)=>{const o=ctx.habits().map(h=>`<option value="${h.id}" ${t.link&&t.link.id===h.id?'selected':''}>${ctx.esc(h.name)}</option>`).join('');return `<select data-a="tlink" data-id="${t.id}" aria-label="Link ${ctx.esc(t.t)}"><option value="">Personal only</option>${o}</select>`};
const goalSel=g=>{const o=ctx.goals().map(s=>`<option value="${s.id}" ${g.link&&g.link.id===s.id?'selected':''}>${ctx.esc(s.title)}</option>`).join('');return `<select data-a="glink" data-id="${g.id}" aria-label="Link goal"><option value="">Personal only</option>${o}</select>`};

function onboarding(){const s=P.step,nx=`<button class="btn" data-a="next">${s===4?'Start my 25 ✨':'Next'}</button>`,bk=s>0?`<button class="btn ghost" data-a="back">Back</button>`:'';let b='';
 if(s===0)b=`<h2>Welcome to 25 🌱</h2><p>This is <b>your own private space</b> inside our app. Your partner can’t see it, and it never changes our readiness bar or our kitten.</p><p class="muted">It’s for who you’re becoming by 25: your goals, tasks, wild cards and wins.</p>`;
 if(s===1)b=`<h2>What’s inside</h2><p><b>Today</b>: your daily ticks and your character.<br><b>Week</b>: one main quest, side quests and a wild card (something you’ve never done).<br><b>Goals</b>: who you’re becoming. Add a number or date, tick only when it’s truly you.<br><b>Wins</b>: your wall of proof.</p>`;
 if(s===2)b=`<h2>Shared things, ticked once</h2><p>If a habit or goal here is already one of our shared ones (like Workout), you can <b>link</b> it. Then one tick counts in both places, so you never tick twice. Linking is optional and you can change it anytime in <i>Today → Edit</i>.</p>`;
 if(s===3)b=`<h2>Make your character</h2><p class="muted">It grows as you do. If you stop showing up, it slowly gets sadder. 🥺</p><input type="text" data-f="name" placeholder="Character name" value="${ctx.esc(P.name)}" maxlength="20"><div style="text-align:center;margin:8px 0">${avatar(P.av,0,0,150)}</div>${maker()}`;
 if(s===4)b=`<h2>Pick your daily ticks</h2><p class="muted">Tap what you want. You can add your own later.</p><div class="row" style="margin:8px 0">${STARTERS.map(x=>`<button class="ch" data-a="starter" data-v="${ctx.esc(x)}" aria-pressed="${P.tasks.some(t=>t.t===x)}">${x}</button>`).join('')}</div>`;
 return `<div class="pc">${b}<div class="row" style="justify-content:flex-end;margin-top:14px">${bk}${nx}</div></div>`}

function today(){const s=stats(),d=ctx.todayStr(),n=P.tasks.filter(t=>isDone(t,d)).length,ed=P.editT;
 let h=`<div class="pc" style="text-align:center">${avatar(P.av,s.w,s.st)}<h2>${ctx.esc(P.name||'You')}</h2><div class="muted">${mood(s)}</div><div class="row" style="justify-content:center;gap:18px;margin-top:6px"><span><b>Lv ${s.lv}</b> ${s.title}</span><span>🔥 ${streak()}</span><span>${s.x} XP</span></div><div class="pb"><i style="width:${s.pr*100}%"></i></div>
 ${s.m>0?`<small class="muted">${s.m} day${s.m>1?'s':''} without a tick. ${ctx.esc(P.name||'They')} is fading.</small>`:`<small class="muted">${n}/${P.tasks.length} ticked today</small>`}</div>
 <div class="pc"><div class="row" style="justify-content:space-between"><h3>Today</h3><button class="btn ghost small" data-a="edit">${ed?'Done':'Edit'}</button></div>`;
 h+=P.tasks.map(t=>ed?`<div class="tk"><div style="flex:1;display:grid;gap:6px"><input type="text" data-f="tt" data-id="${t.id}" value="${ctx.esc(t.t)}">${linkSel(t)}</div><button class="btn ghost small" data-a="deltask" data-id="${t.id}" aria-label="Delete">✕</button></div>`:taskRow(t)).join('')||'<p class="muted">No ticks yet. Tap Edit to add some.</p>';
 if(ed)h+=`<div class="row" style="margin-top:8px"><input type="text" id="p25nt" placeholder="New daily tick" style="flex:1"><button class="btn small" data-a="addtask">Add</button></div><div style="margin-top:12px"><button class="btn ghost small" data-a="redo">Re-do intro & character</button></div>`;
 return h+'</div>'+(ed?`<div class="pc"><h3>Character</h3><input type="text" data-f="name" value="${ctx.esc(P.name)}" maxlength="20">${maker()}</div>`:'')}

function week(){const k=mon(),w=P.wk[k]=P.wk[k]||{};const f=(l,key,ta)=>`<small class="muted">${l}</small>${ta?`<textarea data-f="wk" data-k="${key}" rows="2">${ctx.esc(w[key])}</textarea>`:`<input type="text" data-f="wk" data-k="${key}" value="${ctx.esc(w[key])}">`}`;
 return `<div class="pc" style="border-color:var(--gold);border-width:2px">${f('MAIN QUEST (one thing, done or not done by Sunday)','main',1)}<div style="margin-top:8px">${f('It makes me more…','more')}</div><button class="btn ghost" style="margin-top:10px;width:100%" data-a="flag" data-k="md" aria-pressed="${!!w.md}">${w.md?'Main quest DONE ✓':'Main quest done? +100 XP'}</button></div>
 <div class="pc">${f('Side quest 1','s1')}<div style="margin-top:8px">${f('Side quest 2','s2')}</div><div style="margin-top:8px">${f('Side quest 3','s3')}</div></div>
 <div class="pc">${f('Wild card: something I’ve NEVER done','wild')}<button class="btn ghost" style="margin-top:10px;width:100%" data-a="flag" data-k="wd">${w.wd?'Wild card DONE ✓':'Wild card done? +75 XP'}</button></div>
 <div class="pc">${f('This week I became more…','became')}<div style="margin-top:8px">${f('Next week I dare to…','dare')}</div></div>`}

function goalsV(){let h=`<p class="muted">Add a number or date to each goal. Tick only when it’s truly part of who you are.</p>`;
 h+=P.goals.map(g=>{const s=g.link&&gl(g.link.id),p=goalPct(g);return `<div class="pc"><div class="row" style="flex-wrap:nowrap"><input type="text" data-f="gt" data-id="${g.id}" value="${ctx.esc(g.t)}" placeholder="Goal" style="flex:1"><button class="btn ghost small" data-a="delgoal" data-id="${g.id}" aria-label="Delete">✕</button></div>
 <input type="text" data-f="gs" data-id="${g.id}" value="${ctx.esc(g.sp)}" placeholder="specifically: a number or a date" style="margin-top:6px">
 ${s?`<div class="pb"><i style="width:${p*100}%"></i></div><div class="row"><small class="muted">🔗 ${ctx.esc(s.title)}: ${s.current||0}/${s.target}</small><button class="btn ghost small" data-a="gbump" data-id="${g.id}" data-by="-1">−</button><button class="btn ghost small" data-a="gbump" data-id="${g.id}" data-by="1">+</button></div>`:`<label class="row" style="margin-top:8px"><input type="checkbox" data-a="gck" data-id="${g.id}" ${g.ck?'checked':''} style="width:22px;height:22px"> This is truly me now (+150 XP)</label>`}
 <div style="margin-top:8px">${goalSel(g)}</div></div>`}).join('')||'';
 return h+`<div class="pc"><div class="row"><input type="text" id="p25ng" placeholder="New goal, e.g. I read the Quran fluently" style="flex:1"><button class="btn" data-a="addgoal">Add</button></div></div><div class="pc"><small class="muted">When I look back at 25, I want to feel…</small><textarea data-f="feel" rows="3">${ctx.esc(P.feel)}</textarea></div>`}

function winsV(){return `<div class="pc"><div class="row"><input type="text" id="p25nw" placeholder="What I achieved" style="flex:1"><button class="btn" data-a="addwin">Add (+25 XP)</button></div></div><div class="pc">${P.wins.map((x,i)=>`<div class="tk"><b style="min-width:70px;color:var(--gold)">${ctx.esc(x.d)}</b><span style="flex:1">${ctx.esc(x.t)}</span><button class="btn ghost small" data-a="delwin" data-i="${i}" aria-label="Delete">✕</button></div>`).join('')||'<p class="muted">No wins yet. Your first one goes here.</p>'}</div>`}

function draw(){const el=$('v-p25');if(!el)return;if(!$('p25css')){const s=document.createElement('style');s.id='p25css';s.textContent=CSS;document.head.appendChild(s);bind(el)}
 if(!loaded||!P){el.innerHTML='<div class="pc muted">Loading your 25…</div>';return}
 sync();if(P.step<99){el.innerHTML=onboarding();return}
 const v={today,week,goals:goalsV,wins:winsV}[P.sub]();
 el.innerHTML=`<div class="sub">${[['today','Today'],['week','Week'],['goals','Goals'],['wins','Wins']].map(([k,l])=>`<button data-a="sub" data-v="${k}" aria-pressed="${P.sub===k}">${l}</button>`).join('')}</div>${v}`}

function bind(el){
 el.addEventListener('input',e=>{const t=e.target,f=t.dataset.f;if(!f)return;const id=t.dataset.id;
  if(f==='name')P.name=t.value;else if(f==='tt')P.tasks.find(x=>x.id===id).t=t.value;else if(f==='wk')P.wk[mon()][t.dataset.k]=t.value;
  else if(f==='gt')P.goals.find(x=>x.id===id).t=t.value;else if(f==='gs')P.goals.find(x=>x.id===id).sp=t.value;else if(f==='feel')P.feel=t.value;save()});
 el.addEventListener('change',e=>{const t=e.target,a=t.dataset.a,id=t.dataset.id;
  if(a==='tlink'){const x=P.tasks.find(q=>q.id===id);x.link=t.value?{k:'h',id:t.value,since:ctx.todayStr()}:null;save();draw()}
  if(a==='glink'){const x=P.goals.find(q=>q.id===id);x.link=t.value?{k:'g',id:t.value}:null;save();draw()}
  if(a==='gck'){P.goals.find(q=>q.id===id).ck=t.checked;save();draw()}});
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.dataset.a)return;const d=b.dataset,a=d.a,id=d.id;
  if(a==='av'){const k=d.k;P.av[k]=(k==='hs'||k==='ac')?d.v:+d.v}
  else if(a==='next'){P.step++;if(P.step>4){P.step=99;P.sub='today';if(!P.name)P.name='Me'}}
  else if(a==='back')P.step--;
  else if(a==='starter'){const i=P.tasks.findIndex(t=>t.t===d.v);i<0?P.tasks.push({id:rid(),t:d.v,link:null}):P.tasks.splice(i,1)}
  else if(a==='sub'){P.sub=d.v}
  else if(a==='edit')P.editT=!P.editT;
  else if(a==='redo'){P.step=0;P.editT=false}
  else if(a==='addtask'){const v=$('p25nt').value.trim();if(v)P.tasks.push({id:rid(),t:v,link:null})}
  else if(a==='deltask'){P.tasks=P.tasks.filter(t=>t.id!==id)}
  else if(a==='tick'){const t=P.tasks.find(q=>q.id===id),dt=ctx.todayStr();
   if(t.link&&t.link.k==='h'&&hab(t.link.id)){ctx.toggle(t.link.id);return}
   const day=P.days[dt]=P.days[dt]||{};if(day[t.id])delete day[t.id];else day[t.id]=1}
  else if(a==='flag'){const w=P.wk[mon()];w[d.k]=!w[d.k]}
  else if(a==='addgoal'){const v=$('p25ng').value.trim();if(v)P.goals.push({id:rid(),t:v,sp:'',ck:false,link:null})}
  else if(a==='delgoal'){P.goals=P.goals.filter(g=>g.id!==id)}
  else if(a==='gbump'){const g=P.goals.find(q=>q.id===id),s=g.link&&gl(g.link.id);if(s)ctx.bumpGoal(s,+d.by);return}
  else if(a==='addwin'){const v=$('p25nw').value.trim();if(v)P.wins.unshift({d:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}),t:v})}
  else if(a==='delwin')P.wins.splice(+d.i,1);
  save();draw()})}

export function initP25(c){ctx=c}
export function renderP25(){if(!ctx)return;if(loaded&&uidK!=='p25_'+uid()){loaded=false;P=null;uidK=''}if(!loaded){if(!uidK){uidK='x';load()}draw();return}draw()}
