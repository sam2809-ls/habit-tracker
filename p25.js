/* "25" — private personal space inside Our Road to Ready. Stored only in users/{uid}.p25, never in couples/*,
   so it never touches readiness, the kitten, or your partner's view. */
const TITLES=['Seedling','Apprentice','Explorer','Builder','Scholar','Strategist','Architect','Legend'];
const SK=['#f6d5b8','#e8b98f','#c68c5f','#9a6240','#6b4129'],HC=['#2b1d17','#5a3a22','#a0622d','#d8a24a','#8a8a8a','#c0396b','#111118','#7b4a2a','#c9a66b'],OC=['#e0457b','#1f9d8f','#7a5cff','#f2b134','#3b82f6','#24203b','#d9622b','#2f6f6a','#1c1c24','#e9e4d8','#1d3557','#6b705c','#d4a373','#7f1d1d','#2d6a4f','#6c757d'];
const HS1=['wolf','long','bun','curly','scarf','cap'],HS2=['crop','quiff','sidepart','fade','slick','curlytop','messy','spiky','bowl','buzz','manbun'],AC=['none','shades','headband','glasses','flower','headphones'],FS=['oval','round','square','long','heart'],FH=['none','stubble','stache','short','full'],OT=['tee','long','turtle','high','hoodie','jacket'];
const NMK={fs:{oval:'Oval',round:'Round',square:'Square',long:'Long',heart:'Heart'},fh:{none:'None',stubble:'Stubble',stache:'Moustache',short:'Short beard',full:'Full beard'},ot:{tee:'T-shirt',long:'Long sleeve',turtle:'Turtleneck',high:'High neck',hoodie:'Hoodie',jacket:'Jacket'},hs:{wolf:'Wolf cut',long:'Long',bun:'Bun',curly:'Curly',scarf:'Scarf',cap:'Cap',crop:'Textured crop',quiff:'Quiff',sidepart:'Side part',fade:'Fade',slick:'Slick back',curlytop:'Curly top',buzz:'Buzz cut',manbun:'Man bun',messy:'Messy part',spiky:'Spiky',bowl:'Bowl cut'},ac:{none:'None',shades:'Shades',headband:'Headband',glasses:'Glasses',flower:'Flower',headphones:'Headphones'}};
let ctx,P=null,loaded=false,saveT,uidK='';
const $=id=>document.getElementById(id);
const clamp=x=>Math.max(0,Math.min(1,x));
const mk=()=>({step:0,name:'',av:{s:1,h:1,hs:'wolf',o:6,ac:'none',fs:'oval',fh:'none',ot:'tee',v2:1,v3:1},tasks:[],days:{},goals:[],wk:{},wins:[],sub:'today',start:ctx.todayStr(),feel:''});
const uid=()=>ctx.me().uid;
const rid=()=>Math.random().toString(36).slice(2,8);
function mon(){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return ctx.fmt(d)}
function save(){try{localStorage.setItem(uidK,JSON.stringify(P))}catch(e){}clearTimeout(saveT);saveT=setTimeout(()=>ctx.updateDoc(ctx.doc(ctx.db,'users',uid()),{p25:JSON.stringify(P)}).catch(()=>{}),1200)}
async function load(){uidK='p25_'+uid();try{P=JSON.parse(localStorage.getItem(uidK))}catch(e){}
 try{const s=await ctx.getDoc(ctx.doc(ctx.db,'users',uid()));const r=s.data()&&s.data().p25;if(r){const q=JSON.parse(r);if(!P||(q.step>=99&&!(P.step>=99))||JSON.stringify(q).length>=JSON.stringify(P).length)P=q}}catch(e){}
 P=P||mk();if(P.av&&!P.av.v2){P.av.v2=1;P.av.hs='wolf'}if(P.av&&!P.av.v3){P.av.v3=1;if(P.av.hs==='short')P.av.hs='crop';P.av.fs=P.av.fs||'oval';P.av.fh=P.av.fh||'none';P.av.ot=P.av.ot||'tee'}ensure();save();loaded=true;draw()}
const hab=id=>ctx.habits().find(h=>h.id===id);
const gl=id=>ctx.goals().find(g=>g.id===id);
function isDone(t,d){return !!(P.days[d]&&P.days[d][t.id])}
function sync(){const L=ctx.logs(),u=uid();for(const t of P.tasks){if(!t.link||t.link.k!=='h'||!hab(t.link.id))continue;
 for(const d of ctx.lastDays(14)){if(d<t.link.since)continue;const day=P.days[d]=P.days[d]||{};if(L.has(ctx.logKey(t.link.id,u,d)))day[t.id]=1;else delete day[t.id]}}}
function goalPct(g){if(g.link&&g.link.k==='g'){const s=gl(g.link.id);if(s)return Math.min(1,(s.current||0)/Math.max(1,s.target||1))}return g.ck?1:0}
function xp(){let x=0;for(const d in P.days)x+=Object.keys(P.days[d]).length*10;for(const k in P.wk){if(P.wk[k].md)x+=100;if(P.wk[k].wd)x+=75;for(const q of ['s1d','s2d','s3d'])if(P.wk[k][q])x+=25}
 return x+P.wins.length*25+P.goals.filter(g=>goalPct(g)>=1).length*150}
const anyTick=d=>P.days[d]&&Object.keys(P.days[d]).length>0;
function miss(){const t=ctx.todayStr();if(anyTick(t))return 0;let n=0;for(const d of ctx.lastDays(12,1).reverse()){if(d<P.start)break;if(anyTick(d))break;n++}return n}
function streak(){let n=0;const ds=ctx.lastDays(60).reverse();for(let i=0;i<ds.length;i++){if(anyTick(ds[i]))n++;else if(i===0)continue;else break}return n}
const mix=(a,b,t)=>{const p=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)),x=p(a),y=p(b);return '#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};

let AVN=0;
const mir=d=>d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g,(m,x,y)=>(200-x)+' '+y);
const CATS0=[{id:'phys',n:'Physical',ic:'💪'},{id:'emo',n:'Emotional',ic:'💗'},{id:'spir',n:'Spiritual',ic:'🕌'},{id:'ment',n:'Mental',ic:'🧠'}];
const SUG={phys:['Workout','Walk 30 min','Stretch'],emo:['Journal','Call family','Gratitude'],spir:['Quran','Dhikr','Tahajjud','Sunnah prayers'],ment:['Arabic','Read 10 pages','No doom-scrolling','Learn something']};
const WORDS={phys:['Starting out','Warming up','Building','Strong','Beast mode'],emo:['Heavy','Opening up','Warm','Glowing','Radiant'],spir:['Dim','Seeking','Steady','Devoted','Luminous'],ment:['Foggy','Curious','Sharp','Focused','Brilliant']},WORDX=['Seedling','Growing','Steady','Thriving','Flourishing'];
const guessCat=t=>/work\s?out|gym|strength|lift|train|exercise|fitness|run|walk|stretch|sport|swim/i.test(t)?'phys':/quran|pray|salah|dua|dhikr|tahajjud|sunnah|fast|masjid/i.test(t)?'spir':/journal|gratitude|family|friend|therap|feel|talk|call|love|kind/i.test(t)?'emo':'ment';
const cats=()=>(P&&P.cats)||CATS0;
function ensure(){if(!P.cats)P.cats=CATS0.map(c=>({...c}));for(const t of P.tasks){if(!t.cat||!P.cats.some(c=>c.id===t.cat))t.cat=guessCat(t.t||'');if(!t.at)t.at=P.start||ctx.todayStr()}}
function cstat(cid){const ts=P.tasks.filter(t=>t.cat===cid);if(!ts.length)return{has:false,lv:null,n:0,pos:0,neg:false};
 const t0=ctx.todayStr(),span=Math.min(14,Math.max(1,dd(P.start||t0,t0)+1)),ds=ctx.lastDays(14).slice(-span),r3=ctx.lastDays(3);let n=0,rec=0;
 for(const t of ts){for(const d of ds)if(isDone(t,d))n++;for(const d of r3)if(isDone(t,d))rec++}
 const rate=n/(ts.length*span);return{has:true,lv:rate>=.75?4:rate>=.5?3:rate>=.28?2:n>0?1:0,n,pos:ts.length*span,neg:span>=3&&rec===0}}
const prState=pr=>{if(!pr||(pr.t<0&&pr.y<0))return{D:0,L:0,t:0};const t=pr.t<0?0:pr.t,y=pr.y<0?5:pr.y;return{D:clamp((5-y)/5*.9-t/5*.7+(t===0&&y<4?.1:0)),L:t/5,t}};
function traits(){const L={};for(const c of cats())L[c.id]=cstat(c.id);const g=id=>L[id]||{lv:null,neg:false};
 const S={p:g('phys').lv,e:g('emo').lv,m:g('ment').lv,s:g('spir').lv,np:g('phys').neg,ne:g('emo').neg,nm:g('ment').neg,ct:cats().filter(c=>c.x).map(c=>(L[c.id].lv||0)),_L:L};
 S.pr=ctx.prayers?{t:ctx.prayers(ctx.todayStr()),y:ctx.prayers(ctx.lastDays(2)[0])}:{t:-1,y:-1};S.rd=ctx.ready?ctx.ready():0;return S}

const IMPSVG='<path d="M-9 9 Q-11 -8 0 -11 Q11 -8 9 9 Q5 13 3 9 Q0 13 -3 9 Q-5 13 -9 9Z" fill="#0e0716"/><path d="M-8 -7 L-12 -18 L-3 -10Z M8 -7 L12 -18 L3 -10Z" fill="#0e0716"/><circle cx="-3.6" cy="-2" r="2" fill="#ff3b30"/><circle cx="3.6" cy="-2" r="2" fill="#ff3b30"/><path d="M-4 3.5 q4 3.5 8 0" stroke="#ff3b30" stroke-width="1.2" fill="none" stroke-linecap="round"/>';
const IMPP=[[28,74,1.5,.25],[294,66,1.5,.4],[24,160,1.7,.55],[296,150,1.7,.7],[160,18,1.4,.85]];
const WISP=['M24 240 q-18 -34 2 -58 q14 -18 -2 -40','M296 240 q18 -34 -2 -58 q-14 -18 2 -40','M60 244 q-12 -26 6 -44','M260 244 q12 -26 -6 -44','M10 190 q16 -14 8 -34','M310 190 q-16 -14 -8 -34'];

/* ---- the world behind the character: it is built from what you do ---- */
function scene(u,o){const{w,D,L,sp,ph,em,mn,rd,ct,mx}=o,
 sky1=mx(mix('#79c7f2','#140a26',D*.92),w*.5),sky2=mx(mix('#ffe8b8','#3a1c57',D*.92),w*.5),
 h1=mx(mix('#8fd18a','#241a3a',D*.75),w*.5),h2=mx(mix('#6bb86f','#1c142e',D*.75),w*.5),gr=mx(mix('#4f9d5a','#150e24',D*.7),w*.5),
 wall=mx(mix('#f3e6c8','#2a2040',D*.55),w*.4),dome=mx(mix('#2a9d8f','#1d2a44',D*.5),w*.4),lit=(L>.2||sp>=3)?'#ffd166':mix('#3a3050','#1a1428',D),
 defs=`<linearGradient id="sk${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient>
 <radialGradient id="gl${u}"><stop offset="0" stop-color="#fff2b0" stop-opacity="${(L*.85).toFixed(2)}"/><stop offset=".45" stop-color="#ffd166" stop-opacity="${(L*.4).toFixed(2)}"/><stop offset="1" stop-color="#ffd166" stop-opacity="0"/></radialGradient>
 <radialGradient id="dk${u}"><stop offset=".35" stop-color="#12081f" stop-opacity="0"/><stop offset="1" stop-color="#12081f" stop-opacity="${Math.min(.85,D*.9).toFixed(2)}"/></radialGradient>`;
 let b=`<rect width="320" height="262" fill="url(#sk${u})"/>`;
 if(D>.3)b+=`<g fill="#fff" opacity="${D.toFixed(2)}">${[[40,24],[110,16],[196,30],[250,18],[60,70],[270,80],[140,40]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="1.4"/>`).join('')}</g>`;
 if(D>=.5)b+=`<circle cx="284" cy="36" r="13" fill="#e8d8c8"/><circle cx="290" cy="32" r="12" fill="${sky1}"/><circle cx="284" cy="36" r="22" fill="#c0392b" opacity=".18"/>`;
 else b+=`<circle cx="284" cy="36" r="22" fill="#fff2b0" opacity="${(.35*(1-D)).toFixed(2)}"/><circle cx="284" cy="36" r="12" fill="${mx('#ffd166',w*.6)}" opacity="${(1-D).toFixed(2)}"/>`;
 if(L>0)b+=`<circle cx="160" cy="104" r="150" fill="url(#gl${u})"/>`;
 if(L>=.6)b+=`<g fill="#ffe08a" opacity="${(L*.2).toFixed(2)}">${Array.from({length:14},(_,i)=>{const a=i/14*Math.PI*2,e=.07;return`<path d="M160 104 L${(160+Math.cos(a-e)*260).toFixed(1)} ${(104+Math.sin(a-e)*260).toFixed(1)} L${(160+Math.cos(a+e)*260).toFixed(1)} ${(104+Math.sin(a+e)*260).toFixed(1)}Z"/>`}).join('')}</g>`;
 if(w>.3||D>.4)b+=`<g fill="${mix('#c9d3e0','#4a4460',D)}" opacity="${clamp(Math.max(w,D)*1.2).toFixed(2)}"><ellipse cx="70" cy="34" rx="28" ry="9"/><ellipse cx="54" cy="40" rx="16" ry="8"/><ellipse cx="88" cy="40" rx="16" ry="8"/></g>`;
 ct.forEach((lv,i)=>{b+=`<text x="${198+i*18}" y="24" font-size="${11+lv*2}" fill="#ffd166" opacity="${(.35+lv*.15).toFixed(2)}">★</text>`});
 b+=`<path d="M0 190 Q70 150 140 186 T320 176 V262 H0Z" fill="${h1}"/><path d="M0 212 Q90 184 180 210 T320 200 V262 H0Z" fill="${h2}"/><rect y="238" width="320" height="24" fill="${gr}"/>`;
 /* spiritual: a mosque that grows with prayer + spiritual habits */
 {const x=10,y=240,W=30+sp*5,Hh=18+sp*8,dm=11+sp*2;
  b+=`<g transform="translate(${x} ${y})">${sp>=2?`<rect x="-8" y="${-Hh-22-sp*5}" width="7" height="${Hh+22+sp*5}" fill="${wall}"/><path d="M-9.5 ${-Hh-22-sp*5} L-4.5 ${-Hh-32-sp*5} L.5 ${-Hh-22-sp*5}Z" fill="${dome}"/>`:''}${sp>=4?`<rect x="${W+1}" y="${-Hh-22-sp*5}" width="7" height="${Hh+22+sp*5}" fill="${wall}"/><path d="M${W-.5} ${-Hh-22-sp*5} L${W+4.5} ${-Hh-32-sp*5} L${W+9.5} ${-Hh-22-sp*5}Z" fill="${dome}"/>`:''}
  <rect width="${W}" y="${-Hh}" height="${Hh}" fill="${wall}"/><path d="M${W/2-dm} ${-Hh} Q${W/2} ${-Hh-dm*1.7} ${W/2+dm} ${-Hh}Z" fill="${dome}"/>${sp>=3?`<circle cx="${W/2}" cy="${-Hh-dm*1.25-4}" r="3" fill="#ffd166"/><circle cx="${W/2+1.3}" cy="${-Hh-dm*1.25-4.6}" r="2.6" fill="${sky1}"/>`:''}
  <path d="M${W/2-5} 0 V-9 Q${W/2} -16 ${W/2+5} -9 V0Z" fill="${lit}"/>${sp>=1?`<rect x="5" y="${-Hh+6}" width="5" height="7" rx="2.5" fill="${lit}"/><rect x="${W-10}" y="${-Hh+6}" width="5" height="7" rx="2.5" fill="${lit}"/>`:''}</g>`}
 /* mental: a stack of books and an idea */
 {const n=Math.max(1,mn+1),cs=['#e0457b','#3b82f6','#f2b134','#1f9d8f','#7a5cff'];for(let i=0;i<n;i++)b+=`<rect x="${75+(i%2)*2}" y="${240-(i+1)*7}" width="${17-(i%3)*2}" height="6" rx="1.5" fill="${mx(cs[i%5],w*.5)}"/>`;
  if(mn>=3)b+=`<circle cx="84" cy="${240-n*7-10}" r="9" fill="#ffd166" opacity=".25"/><circle cx="84" cy="${240-n*7-10}" r="4.5" fill="#ffd166"/>`}
 /* physical: a rack that fills with weights */
 {const x=230;b+=`<rect x="${x+2}" y="222" width="3" height="18" fill="#5a5a66"/><rect x="${x+29}" y="222" width="3" height="18" fill="#5a5a66"/><rect x="${x}" y="220" width="34" height="4" rx="2" fill="#7a7a86"/>`;
  for(let i=0;i<ph;i++)b+=`<g transform="translate(${x+4+i*7} 213)"><rect x="0" y="2" width="5" height="3" fill="#9a9aa6"/><rect x="-1" y="0" width="2" height="7" rx="1" fill="#3a3a46"/><rect x="4" y="0" width="2" height="7" rx="1" fill="#3a3a46"/></g>`;
  if(ph>=3)b+=`<rect x="${x+2}" y="232" width="30" height="3" fill="#8c8c96"/><rect x="${x}" y="228" width="4" height="11" rx="1.5" fill="#3a3a46"/><rect x="${x+30}" y="228" width="4" height="11" rx="1.5" fill="#3a3a46"/>`}
 /* home: builds with our readiness for marriage */
 {const hx=272,st=rd<12?0:rd<30?1:rd<50?2:rd<70?3:rd<88?4:5,wl=mx('#f6d6a8',w*.4),rf=mx('#c8553d',w*.4),Hs=st===1?12:st>=2?28:0;
  b+=`<rect x="${hx-2}" y="236" width="48" height="4" fill="#7a6a5a" opacity=".7"/>`;
  if(st===0)b+=`<path d="M${hx+22} 236 V214" stroke="#7a6a5a" stroke-width="2"/><path d="M${hx+22} 214 l12 4 l-12 4Z" fill="#e0457b"/>`;
  if(st>=1)b+=`<rect x="${hx}" y="${236-Hs}" width="44" height="${Hs}" fill="${wl}"/>`;
  if(st===2)b+=`<path d="M${hx-3} 236 V206 M${hx+47} 236 V206 M${hx-3} 214 H${hx+47}" stroke="#a88b5a" stroke-width="1.5"/>`;
  if(st>=3)b+=`<path d="M${hx-5} 208 L${hx+22} 188 L${hx+49} 208Z" fill="${rf}"/><rect x="${hx+18}" y="222" width="9" height="14" rx="1.5" fill="#7a4b2a"/>`;
  if(st>=4)b+=`<rect x="${hx+5}" y="214" width="8" height="8" rx="1" fill="${st>=5?'#ffd166':'#bcd4e6'}"/><rect x="${hx+31}" y="214" width="8" height="8" rx="1" fill="${st>=5?'#ffd166':'#bcd4e6'}"/><path d="M${hx-8} 236 V228 M${hx-3} 236 V228 M${hx+47} 236 V228 M${hx+52} 236 V228" stroke="#d9c8a8" stroke-width="2"/>`;
  if(st>=5)b+=`<rect x="${hx+34}" y="190" width="5" height="11" fill="#a05a3a"/><text x="${hx+14}" y="182" font-size="12">💞</text>`;
  b+=`<text x="${hx+22}" y="256" font-size="9" font-weight="700" text-anchor="middle" fill="#fff" opacity=".9">Home ${rd}%</text>`}
 /* emotional: a garden that blooms or wilts */
 {const n=3+em*2,bad=em===0||w>.5||D>.6;[10,34,58,98,122,146,172,198,224,262,300,316,88,284].slice(0,n).forEach((x,i)=>{const c=bad?'#8a6a4a':['#ff8fb1','#ffd166','#fff'][i%3];b+=`<g transform="translate(${x} 246)"><path d="M0 0 V${bad?-6:-9}" stroke="${bad?'#7a6a4a':'#2f7d3a'}" stroke-width="1.6"/><circle cy="${bad?-8:-11}" r="3.2" fill="${c}"/><circle cy="${bad?-8:-11}" r="1.2" fill="${bad?'#5a4a3a':'#f2b134'}"/></g>`});
  if(em>=3&&!bad)for(let i=0;i<em-2;i++)b+=`<text x="${[34,300][i%2]-i*6}" y="${100+i*26}" font-size="${13+i*2}" fill="#ff7a90" opacity=".85">♥</text>`}
 if(D>.02)b+=`<rect width="320" height="262" fill="url(#dk${u})"/>`;
 const f=(D>.02?WISP.slice(0,Math.ceil(D*6)).map((p,i)=>`<path class="wisp" d="${p}" stroke="#3b1d5e" stroke-width="8" fill="none" stroke-linecap="round" stroke-opacity="${Math.min(.55,D*.9).toFixed(2)}" style="animation-delay:${i*.7}s"/>`).join(''):'')+
  IMPP.map(([x,y,s,t],i)=>{const op=clamp((D-t+.1)/.25);return op>.02?`<g transform="translate(${x} ${y}) scale(${s})" opacity="${op.toFixed(2)}"><g class="imp-in" style="animation-delay:${i*.5}s">${IMPSVG}</g></g>`:''}).join('');
 return{defs,back:b,front:f}}

/* ---- hair ---- */
function hairLegacy(hs,hair,hairD,hairL,out,out2,gold,u){let back='',front='';
 const sb=`<path d="M73 100 L75 84 L81 90 L79 108Z" fill="${hairD}"/><path d="M127 100 L125 84 L119 90 L121 108Z" fill="${hairD}"/>`,
 fade=`<path d="M72 102 L74 80 Q78 70 83 68 L84 86 L80 106Z" fill="${hair}" opacity=".4"/><path d="M72 94 L74 80 Q77 72 81 70 L81 84 L78 96Z" fill="${hair}" opacity=".7"/><path d="M128 102 L126 80 Q122 70 117 68 L116 86 L120 106Z" fill="${hair}" opacity=".4"/><path d="M128 94 L126 80 Q123 72 119 70 L119 84 L122 96Z" fill="${hair}" opacity=".7"/>`,
 st=(d,c,o,w=1.6)=>`<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`,
 slickTop=`<path d="M78 80 C72 56 86 42 102 42 C120 42 132 56 124 80 C120 66 112 61 100 61 C88 61 82 68 78 80Z" fill="${hair}"/>`;
 if(hs==='wolf'){const bt=[[144,153],[136,161],[126,154],[116,159],[108,149],[103,142]],tips=[...bt,...bt.slice(0,-1).reverse().map(([x,y])=>[200-x,y])];let bot='';for(let i=1;i<tips.length;i++){const[x0,y0]=tips[i-1],[x1,y1]=tips[i];bot+=` Q${(x0+x1)/2} ${Math.min(y0,y1)-5} ${x1} ${y1}`}
  const dk=mix(hair,'#000000',.2),
  mid='M74 78 C68 92 66 108 63 122 C61 132 58 140 54 147 C61 146 66 142 69 137 C69 142 68 148 67 153 C72 147 76 139 78 129 C80 119 80 110 79 100Z',
  cur='M100 56 C85 56 73 67 69 86 C67 98 68 108 71 118 C72 112 75 106 80 100 C86 92 88 84 92 76 C96 70 99 62 100 56Z';
  back=`<path d="M100 43 C121 41 136 56 135 80 C134 98 132 110 133 122 C134 134 139 144 144 153${bot} C61 144 66 134 67 122 C68 110 66 98 65 80 C64 56 79 41 100 43Z" fill="${dk}"/>${st('M68 100 Q64 126 57 150 M132 100 Q136 126 143 150 M76 112 Q72 134 68 154 M124 112 Q128 134 132 154',hairD,.5,1.8)}`;
  front=`<path d="${mid}" fill="${hair}"/><path d="${mir(mid)}" fill="${hair}"/><path d="M71 86 Q75 98 73 110 M129 86 Q125 98 127 110" stroke="${hairD}" stroke-width="1.6" fill="none" opacity=".45"/>
  <path d="M67 90 C62 62 80 44 100 44 C120 44 138 62 133 90 C129 74 120 66 100 64 C80 66 71 74 67 90Z" fill="${hair}"/>
  <path d="${cur}" fill="${hair}"/><path d="${mir(cur)}" fill="${hair}"/>${st('M97 47 Q82 51 74 66 M103 47 Q118 51 126 66',hairL,.5,1.7)}${st('M98 60 Q85 64 77 84 M102 60 Q115 64 123 84 M94 66 Q85 74 79 96 M106 66 Q115 74 121 96',hairD,.5,1.5)}${st('M71 114 Q66 124 61 138 M129 114 Q134 124 139 138',hairL,.4,1.5)}`} else if(hs==='long'){back=`<path d="M100 52 C72 50 58 72 58 104 L56 176 Q78 182 100 176 Q122 182 144 176 L142 104 C142 72 128 50 100 52Z" fill="${hair}"/>${st('M66 110 Q63 140 62 170 M134 110 Q137 140 138 170',hairD,.45,2)}`;
  front=`<path d="M73 98 C67 64 82 46 102 45 C122 46 133 64 127 98 L124 82 C121 74 116 68 108 66 C100 64 88 66 82 74 C78 80 76 88 73 98Z" fill="${hair}"/>${st('M90 47 Q92 58 88 68',hairD,.7,2)}${st('M92 52 Q108 52 121 66 M76 78 Q80 66 90 60',hairL,.55)}`}
 else if(hs==='bun'||hs==='manbun'){front=`${hs==='manbun'?fade:sb}<circle cx="100" cy="38" r="13" fill="${hair}"/>${st('M92 37 Q100 29 108 37 M94 43 Q100 35 106 43',hairD,.6)}<path d="M73 98 C67 62 82 46 100 46 C118 46 133 62 127 98 L124 84 C122 70 114 64 100 62 C86 64 78 70 76 84Z" fill="${hair}"/>${st('M80 66 Q100 52 122 62 M78 74 Q100 58 124 72',hairL,.55)}${st('M96 47 Q100 53 104 47',gold,1,2.4)}`}
 else if(hs==='curly')front=[[74,66],[88,54],[104,52],[120,56],[130,70],[71,84],[129,88],[70,102],[130,104]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="${hair}"/>`).join('')+st('M80 60 q4 -5 8 0 M100 50 q4 -5 8 0 M122 62 q4 -5 8 0 M70 90 q4 -5 8 0 M122 92 q4 -5 8 0',hairD,.5,1.4);
 else if(hs==='scarf'){back=`<path d="M66 92 Q64 48 100 46 Q136 48 134 92 L138 152 Q100 168 62 152Z" fill="${out2}"/>`;front=`<path fill-rule="evenodd" d="M64 98 C62 56 86 46 100 46 C114 46 138 56 136 98 L132 148 Q100 160 68 148Z M77 86 Q77 70 100 66 Q123 70 123 86 L123 98 Q123 110 117 118 Q109 128 100 129 Q91 128 83 118 Q77 110 77 98Z" fill="${out}"/>`}
 else if(hs==='cap')front=`<path d="M72 80 C72 52 86 46 100 46 C114 46 128 52 128 80Z" fill="${out2}"/><rect x="70" y="78" width="60" height="6" rx="3" fill="${out2}"/><rect x="100" y="76" width="36" height="6" rx="3" fill="${out2}"/><path d="M72 82 L69 108 L76 98Z" fill="${hair}"/><path d="M128 82 L131 108 L124 98Z" fill="${hair}"/>`;
 else if(hs==='crop')front=`${sb}<path d="M73 98 C67 66 80 46 100 45 C120 46 133 66 127 98 L124 82 L121 71 L113 66 L108 72 L103 64 L97 72 L91 65 L84 68 L79 75 L76 84Z" fill="${hair}"/>${st('M86 52 Q84 60 86 66 M96 48 Q96 58 98 64 M108 48 Q110 58 108 64 M118 52 Q118 60 116 66',hairD,.5)}${st('M90 50 Q100 46 112 50',hairL,.6,2)}`;
 else if(hs==='quiff')front=`${sb}<path d="M73 98 C66 64 78 40 104 38 C126 38 135 58 127 98 L124 80 C121 70 114 62 104 60 C94 60 84 64 79 74 C76 80 75 88 73 98Z" fill="${hair}"/><path d="M80 62 C80 44 104 34 124 46 C110 42 96 46 90 62Z" fill="${hairL}" opacity=".5"/>${st('M84 66 Q92 50 112 44 M92 64 Q100 50 120 48 M100 62 Q108 52 124 52',hairD,.5)}`;
 else if(hs==='sidepart')front=`${sb}<path d="M73 98 C67 64 82 46 102 45 C122 46 133 64 127 98 L124 82 C121 74 116 68 108 66 C100 64 88 66 82 74 C78 80 76 88 73 98Z" fill="${hair}"/>${st('M90 47 Q92 58 88 68',hairD,.8,2)}${st('M90 52 Q106 52 120 66 M92 58 Q108 56 124 74 M88 56 Q80 60 76 74',hairD,.45)}${st('M96 50 Q112 52 122 62',hairL,.6,2)}`;
 else if(hs==='fade')front=`${fade}${slickTop}<path d="M82 62 C84 46 108 38 124 52 C110 46 96 50 90 66Z" fill="${hairL}" opacity=".45"/>${st('M84 62 Q96 48 118 50 M88 66 Q102 52 122 58',hairD,.5)}`;
 else if(hs==='slick')front=`${sb}<path d="M73 98 C67 62 82 44 100 44 C118 44 133 62 127 98 L124 84 C122 70 114 64 100 62 C86 64 78 70 76 84Z" fill="${hair}"/>${st('M80 66 Q100 50 124 62 M78 72 Q100 54 126 70 M76 80 Q98 60 126 80',hairD,.5)}${st('M88 56 Q104 48 118 54',hairL,.6,2.4)}`;
 else if(hs==='curlytop'){front=fade+[[84,54],[98,48],[112,50],[124,58],[78,66],[92,60],[106,57],[120,66],[130,76],[72,78],[86,70],[100,66],[114,72]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9.5" fill="${hair}"/><path d="M${x-4} ${y+1} q4 -5 8 0" stroke="${hairD}" stroke-width="1.3" fill="none" opacity=".55"/>`).join('')}
 else if(hs==='buzz'){const cap='M74 94 C70 66 84 52 100 51 C116 52 130 66 126 94 L124 80 C121 72 112 69 100 69 C88 69 79 72 76 80Z';let dots='';for(let i=0;i<46;i++)dots+=`<circle cx="${76+(i*37)%50}" cy="${52+(i*23)%26}" r=".9" fill="${hairD}" opacity=".6"/>`;
  front=`<clipPath id="bz${u}"><path d="${cap}"/></clipPath><path d="${cap}" fill="${hair}" opacity=".8"/><g clip-path="url(#bz${u})">${dots}</g>`}
 return{back,front}}

function hairParts(hs,hair,hairD,hairL,out,out2,gold,u){
 const NEW=['crop','quiff','sidepart','fade','slick','curlytop','buzz','manbun','bun','curly','messy','spiky','bowl'];
 const F=`url(#hg${u})`,
 defs=`<defs><linearGradient id="hg${u}" x1="0.15" y1="0" x2="0.55" y2="1"><stop offset="0" stop-color="${hairL}"/><stop offset=".45" stop-color="${hair}"/><stop offset="1" stop-color="${mix(hair,'#000000',.16)}"/></linearGradient><linearGradient id="hf${u}" gradientUnits="userSpaceOnUse" x1="0" y1="68" x2="0" y2="104"><stop offset="0" stop-color="${hair}" stop-opacity=".9"/><stop offset="1" stop-color="${hair}" stop-opacity="0"/></linearGradient></defs>`;
 if(!NEW.includes(hs)){const r=hairLegacy(hs,hair,hairD,hairL,out,out2,gold,u),sw=s=>s.split(`fill="${hair}"`).join(`fill="${F}"`);return{back:sw(r.back),front:defs+sw(r.front)}}
 let sd=11;const rnd=()=>(sd=(sd*9301+49297)%233280)/233280,f1=n=>Math.round(n*10)/10,
 st=(d,c,o,w=1.6)=>`<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round" opacity="${o}"/>`,
 /* a hairline made of separate locks: tip, notch, tip... (right to left) */
 locks=(tips,notch=3.5)=>{let d=`L${tips[0][0]} ${tips[0][1]}`;for(let i=1;i<tips.length;i++){const a=tips[i-1],b=tips[i];d+=` Q${f1((a[0]+b[0])/2)} ${f1(Math.min(a[1],b[1])-notch)} ${b[0]} ${b[1]}`}return d},
 /* a shape with depth: gradient fill, strands clipped inside it, soft dark edge */
 layer=(k,d,inner,op=1)=>`<clipPath id="hc${u}${k}"><path d="${d}"/></clipPath><g opacity="${op}"><path d="${d}" fill="${F}"/><g clip-path="url(#hc${u}${k})">${inner}</g><path d="${d}" fill="none" stroke="${hairD}" stroke-width=".8" stroke-linejoin="round" opacity=".5"/></g>`,
 /* strands that fan out from a point, each bowed a little and alternating dark/light */
 fan=(sx,sy,tips,bow=5,w=1.2)=>tips.map(([x,y],i)=>{const dx=x-sx,dy=y-sy,L=Math.hypot(dx,dy)||1,o=(i%2?1:-1)*bow*(.6+rnd()*.8),cx=(sx+x)/2-dy/L*o,cy=(sy+y)/2+dx/L*o,lt=i%3===0;return `<path d="M${f1(sx+(rnd()-.5)*5)} ${f1(sy+(rnd()-.5)*3)} Q${f1(cx)} ${f1(cy)} ${x} ${y}" stroke="${lt?hairL:hairD}" stroke-width="${lt?f1(w*.9):w}" fill="none" stroke-linecap="round" opacity="${lt?.5:.42}"/>`}).join(''),
 sbd='M73 80 C71 90 72 98 74 105 L78 99 L79 90 L80 80Z',
 sbs=layer('sa',sbd,st('M76 84 Q75 94 76 101',hairD,.5,1))+layer('sb',mir(sbd),st('M124 84 Q125 94 124 101',hairD,.5,1)),
 fz='M73 100 C66 70 76 50 100 48 C124 50 134 70 127 100 L123 88 C120 76 112 70 100 70 C88 70 80 76 77 88Z',
 fadeSide=()=>{let dots='';for(let i=0;i<80;i++){const sd2=i%2?1:-1,x=100+sd2*(24.5+rnd()*4.5-rnd()*3),y=72+rnd()*30;dots+=`<circle cx="${f1(x)}" cy="${f1(y)}" r=".75" fill="${hairD}" opacity="${Math.max(.1,.75-(y-72)/45).toFixed(2)}"/>`}return `<clipPath id="fz${u}"><path d="${fz}"/></clipPath><path d="${fz}" fill="url(#hf${u})"/><g clip-path="url(#fz${u})">${dots}</g>`},
 /* slicked-back top, hairline with a soft M shape, strands running back over the crown */
 slickD='M74 94 C65 66 76 42 100 41 C124 42 135 66 126 94 L124 84 C122 78 120 74 116 71 C112 68 108 70 104 73 C101 75 99 75 96 73 C92 70 88 68 84 71 C80 74 78 78 76 84Z',
 slickIn=()=>st('M84 72 Q78 56 90 43 M92 71 Q88 55 96 42 M100 72 Q99 54 100 41 M108 71 Q112 55 104 42 M116 72 Q122 56 110 43 M78 80 Q72 64 84 48 M122 80 Q128 64 116 48',hairD,.5,1.3)+st('M88 71 Q84 56 94 44 M104 72 Q106 54 102 42 M112 71 Q118 56 108 43',hairL,.55,1.1)+`<path d="M82 58 Q100 40 120 54 Q100 47 86 64Z" fill="${hairL}" opacity=".45"/>`,
 bunBall=(cy,rx,ry,tie)=>`<ellipse cx="100" cy="${cy}" rx="${rx}" ry="${ry}" fill="${F}"/><ellipse cx="100" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${hairD}" stroke-width=".8" opacity=".5"/>${st(`M${100-rx+2} ${cy+2} Q100 ${cy-ry*1.3} ${100+rx-2} ${cy+2}`,hairD,.5,1.2)}${st(`M${100-rx+4} ${cy+6} Q100 ${cy-ry*.6} ${100+rx-4} ${cy+6}`,hairL,.5,1.1)}${st(`M${100-rx+1} ${cy+8} Q100 ${cy-1} ${100+rx-1} ${cy+8}`,hairD,.4,1.1)}`+(tie?`<path d="M${100-rx*.7} ${cy+ry*.82} Q100 ${cy+ry+3} ${100+rx*.7} ${cy+ry*.82}" stroke="${gold}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:''),
 curl=(x,y,r)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${F}"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${hairD}" stroke-width=".7" opacity=".4"/><path d="M${f1(x-r*.55)} ${f1(y-r*.2)} Q${f1(x-r*.1)} ${f1(y-r*.85)} ${f1(x+r*.5)} ${f1(y-r*.4)}" stroke="${hairL}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".6"/><path d="M${f1(x-r*.35)} ${f1(y+r*.15)} q${f1(r*.35)} ${f1(-r*.5)} ${f1(r*.7)} 0 q${f1(-r*.1)} ${f1(r*.45)} ${f1(-r*.45)} ${f1(r*.4)}" stroke="${hairD}" stroke-width="1" fill="none" stroke-linecap="round" opacity=".3"/>`;
 let front='';
 /* every style below is built like cartoon hair: a bold silhouette, then flowing strand lines */
 const sk=(d,o=.55,w=1.5)=>st(d,hairD,o,w),hl=(d,o=.55,w=2)=>st(d,hairL,o,w);
 if(hs==='crop'){ /* messy, swept to the side with a little flick */
  const tips=[[122,78],[113,71],[103,71],[93,74],[84,80],[78,88]],
  d=`M73 96 C64 74 66 52 86 45 C98 41 112 40 124 44 C130 46 134 50 139 48 C136 55 133 60 132 68 C131 78 129 86 127 96 L124 86 ${locks(tips,3)} L75 94Z`;
  front=sbs+layer('m',d,sk('M120 46 Q104 50 92 66 M118 47 Q106 56 100 70 M112 44 Q96 50 84 64 M104 42 Q90 48 80 62 M124 48 Q116 58 112 70 M126 46 Q132 48 138 48',.6,1.6)+hl('M96 47 Q108 43 122 46',.6,2.2))}
 else if(hs==='quiff'){ /* lifted wave sweeping forward */
  const tips=[[122,76],[114,68],[106,66],[98,66],[90,68],[82,74],[77,84]],
  d=`M73 96 C64 74 66 52 84 44 C98 38 114 38 124 42 C132 40 138 42 144 47 C137 50 134 56 133 64 C132 76 129 86 127 96 L124 86 ${locks(tips,2.5)} L75 94Z`;
  front=sbs+layer('m',d,sk('M84 70 Q92 52 120 46 M92 67 Q102 50 128 46 M102 66 Q112 52 134 48 M112 68 Q122 56 139 50 M80 76 Q82 58 100 48 M82 70 Q84 56 94 48',.6,1.6)+hl('M88 48 Q110 41 132 45',.6,2.4))}
 else if(hs==='sidepart'){ /* neat classic side part */
  const d='M72 98 C63 76 68 52 90 45 C106 40 126 46 130 66 C132 78 131 88 128 98 L125 88 C124 79 119 72 111 69 C103 67 95 67 88 70 C82 74 78 82 76 91Z';
  front=layer('m',d,sk('M88 69 Q87 54 96 44',.85,1.9)+sk('M92 46 Q116 48 126 64 M90 52 Q112 56 124 76 M90 60 Q104 62 112 71 M88 56 Q78 60 74 76',.5,1.5)+hl('M98 46 Q116 46 126 58',.6,2.4))}
 else if(hs==='fade'){ /* pointed front tuft, faded sides */
  const tips=[[117,66],[109,62],[101,64],[93,62],[86,66],[81,72]],
  d=`M79 76 C72 60 80 47 92 43 C96 37 99 31 103 25 C106 32 110 37 114 41 C127 45 130 60 123 76 L121 70 ${locks(tips,3)} L80 72Z`;
  front=fadeSide()+layer('m',d,sk('M86 64 Q88 46 103 28 M94 62 Q96 46 104 30 M101 63 Q106 46 105 29 M110 62 Q112 48 108 34 M82 70 Q80 56 90 46 M118 66 Q126 56 122 46',.6,1.5)+hl('M92 50 Q100 40 108 44',.6,2))}
 else if(hs==='slick'){ /* combed back, clean hairline */
  front=sbs+layer('m',slickD,slickIn())}
 else if(hs==='messy'){ /* centre part with loose tufts */
  const tips=[[122,78],[114,72],[106,69],[100,66],[94,69],[86,72],[78,78]],
  d=`M73 96 C64 76 66 58 76 52 L74 44 L84 49 L88 40 L95 47 L101 38 L107 46 L113 40 L118 48 L126 44 L124 54 C134 60 134 78 127 96 L124 88 ${locks(tips,3)} L75 92Z`;
  front=sbs+layer('m',d,sk('M100 66 Q100 54 101 40 M100 58 Q86 56 76 68 M100 58 Q114 56 124 68 M96 54 Q86 50 80 56 M104 54 Q114 50 120 56 M92 66 Q84 62 80 70 M108 66 Q116 62 120 70',.6,1.5)+hl('M90 50 Q94 44 98 48 M104 48 Q110 42 114 48',.6,2))}
 else if(hs==='spiky'){ /* spikes along the crown */
  const tips=[[120,76],[112,70],[104,72],[96,69],[88,72],[80,76]],
  d=`M73 96 C64 76 66 60 76 54 L72 46 L84 50 L86 38 L96 48 L102 34 L108 48 L118 38 L118 50 L128 46 L124 56 C134 62 134 78 127 96 L124 88 ${locks(tips,3)} L75 92Z`;
  front=sbs+layer('m',d,sk('M86 62 Q86 50 87 40 M96 60 Q100 46 102 36 M108 60 Q112 48 118 40 M78 66 Q76 56 74 48 M122 64 Q126 56 127 48 M92 66 Q92 58 96 50 M104 66 Q106 58 108 50',.6,1.5)+hl('M90 52 Q96 44 100 48',.6,2))}
 else if(hs==='bowl'){ /* bowl cut with a long straight fringe */
  const tips=[[124,84],[116,80],[108,83],[100,79],[92,83],[84,80],[77,86]],
  d=`M70 108 C58 80 62 52 84 44 C96 39 112 39 124 44 C142 52 144 80 130 108 L125 100 L126 90 ${locks(tips,2.5)} L75 100Z`;
  front=layer('m',d,sk('M100 44 Q80 52 74 80 M100 44 Q120 52 126 80 M96 50 Q88 62 86 80 M104 50 Q112 62 114 80 M100 56 Q100 68 100 78 M78 90 Q74 98 74 106 M122 90 Q126 98 126 106',.5,1.5)+hl('M86 48 Q100 42 114 48',.6,2.4))}
 else if(hs==='buzz'){
  const cap='M74 94 C66 68 76 48 100 47 C124 48 134 68 126 94 L124 84 C122 76 118 72 112 71 C106 70 94 70 88 71 C82 72 78 76 76 84Z';let dots='';for(let i=0;i<150;i++){const x=72+rnd()*56,y=46+rnd()*48,lt=i%3===0;dots+=`<circle cx="${f1(x)}" cy="${f1(y)}" r="${lt?.55:.8}" fill="${lt?hairL:hairD}" opacity="${lt?.45:.5}"/>`}
  front=layer('m',cap,dots,.82)}
 else if(hs==='curlytop'||hs==='curly'){ /* short curls all over, like a ruffled cap */
  const cs=[],big=hs==='curly';
  for(let a=-176;a<=-4;a+=11)cs.push([100+(big?37:34)*Math.cos(a*Math.PI/180),92+(big?36:32)*Math.sin(a*Math.PI/180),big?10:8.5]);
  for(let a=-160;a<=-20;a+=15)cs.push([100+22*Math.cos(a*Math.PI/180),86+24*Math.sin(a*Math.PI/180),8.5]);
  cs.push([72,96,7],[128,96,7],[75,86,8],[125,86,8]);
  front=(big?'':fadeSide())+`<path d="M72 98 C62 68 76 46 100 44 C124 46 138 68 128 98 L124 84 C120 70 112 66 100 66 C88 66 80 70 76 84Z" fill="${F}"/>`+cs.sort((p,q)=>p[1]-q[1]).map(([x,y,r])=>curl(f1(x),f1(y),r)).join('')}
 else if(hs==='manbun'||hs==='bun'){
  const man=hs==='manbun';
  front=(man?fadeSide():sbs)+bunBall(36,13,11,!man)+layer('m',slickD,slickIn())+(man?st('M96 47 Q100 53 104 47',gold,1,2.4):'')}
 return{back:'',front:defs+front}}


/* ---- the character: body, outfit, face, hair, inside a living scene ---- */
function avatar(a,w,stage,size=300,S={}){
 const u=++AVN,G='#8c8c96',mx=(c,t)=>mix(c,G,t),
  str=S.p==null?1:S.p,em=S.e==null?2:S.e,conf=S.m==null?2:S.m,
  ps=prState(S.pr),D=ps.D,L=ps.L,pt=ps.t,py=S.pr&&S.pr.y>0?S.pr.y:0,sp=Math.max(S.s||0,Math.max(0,Math.min(4,Math.round((py+pt)/10*4)))),
  wf=Math.max(w,S.ne?.45:0,S.nm?.3:0),ot=a.ot||'tee',fs=a.fs||'oval',fh=a.fh||'none',
  skin=mx(SK[a.s],w*.5),skinD=mix(skin,'#3b1d12',.26),hair=mx(HC[a.h],w*.4),hairD=mix(hair,'#000000',.34),hairL=mix(hair,'#ffffff',.26),
  out=mx(OC[a.o],w*.7),out2=mix(out,'#000000',.2),outL=mix(out,'#ffffff',.24),cream=mx('#f6ead0',w*.6),gold=mx('#f2b134',w*.6),ink='#2a2238',
  sw=40+str*4,wa=33+str,nk=8+str*1.3,aw=8+str*1.4,bl=str*1.1,
  hunch=(conf===0?3:0)+(S.np?2:0),sag=Math.round(wf*6)+hunch,sy=162+hunch+Math.round(w*4),ny=148+hunch+Math.round(w*3),
  tilt=wf>.3?-(wf*7):conf>=3?2:conf===0?-3:0,tf=`translate(0 ${sag}) rotate(${tilt.toFixed(1)} 100 128)`,
  L0=100-sw,R0=100+sw,top=sy-3,bot=sy+110,ye=ot==='tee'?top+30-str*3:bot-5,
  torso=`M${100-nk-1} ${ny} Q${100-sw*.6} ${ny+2} ${L0+2} ${sy-3} Q${L0-3} ${sy+1} ${L0} ${sy+12} L${100-wa} 270 L${100+wa} 270 L${R0} ${sy+12} Q${R0+3} ${sy+1} ${R0-2} ${sy-3} Q${100+sw*.6} ${ny+2} ${100+nk+1} ${ny}Z`,
  armP=xc=>`M${xc-aw} ${top} Q${xc-aw-bl} ${top+30} ${xc-aw*.72} ${bot} L${xc+aw*.72} ${bot} Q${xc+aw+bl} ${top+30} ${xc+aw} ${top}Z`;
 const sc=scene(u,{w,D,L,sp,ph:Math.min(4,str),em,mn:conf,rd:S.rd||0,ct:S.ct||[],mx});
 /* ---- body + outfit ---- */
 const inner=ot==='jacket'?`<path d="M${100-nk-4} ${ny} L${100+nk+4} ${ny} L115 270 L85 270Z" fill="${cream}"/><path d="M${100-nk-3} ${ny+4} L85 270 M${100+nk+3} ${ny+4} L115 270" stroke="${out2}" stroke-width="2.2" fill="none"/>`:'';
 const stripes=ot==='tee'?`<g clip-path="url(#tc${u})"><rect x="0" y="${sy+30}" width="200" height="5" fill="${cream}"/><rect x="0" y="${sy+38}" width="200" height="3" fill="${gold}"/></g>`:'';
 const knit=(ot==='turtle'||ot==='high')?`<g clip-path="url(#tc${u})" stroke="${out2}" stroke-width="1" opacity=".22">${Array.from({length:14},(_,i)=>`<path d="M${100-wa-8+i*((wa*2+16)/13)} ${sy} V270"/>`).join('')}</g>`:'';
 const pocket=ot==='hoodie'?`<path d="M${100-26} ${sy+46} L${100+26} ${sy+46} L${100+32} ${sy+70} L${100-32} ${sy+70}Z" fill="none" stroke="${out2}" stroke-width="2" opacity=".7"/><path d="M${100-24} ${sy+48} L${100-30} ${sy+68} M${100+24} ${sy+48} L${100+30} ${sy+68}" stroke="${out2}" stroke-width="1.5" opacity=".5"/>`:ot==='jacket'?`<path d="M${100-38} ${sy+44} h18 M${100+20} ${sy+44} h18" stroke="${out2}" stroke-width="2.4" stroke-linecap="round"/>`:'';
 const pecs=str>=2?`<g fill="none" stroke="${out2}" stroke-linecap="round" stroke-width="2" opacity="${(.12+str*.05).toFixed(2)}"><path d="M98 ${sy+17} Q${100-sw*.34} ${sy+32} ${100-sw*.72} ${sy+15}"/><path d="M102 ${sy+17} Q${100+sw*.34} ${sy+32} ${100+sw*.72} ${sy+15}"/>${str>=3&&ot!=='jacket'?`<path d="M100 ${sy+20} L100 ${sy+62}"/>`:''}${str>=4&&ot!=='hoodie'?`<path d="M90 ${sy+50} Q100 ${sy+54} 110 ${sy+50} M89 ${sy+62} Q100 ${sy+66} 111 ${sy+62}"/>`:''}</g>`:'';
 const cuff=xc=>ot==='tee'?`<rect x="${xc-aw-10}" y="${ye-5}" width="${aw*2+20}" height="5" fill="${cream}"/><rect x="${xc-aw-10}" y="${ye-8}" width="${aw*2+20}" height="2" fill="${gold}"/>`:`<rect x="${xc-aw-10}" y="${ye-7}" width="${aw*2+20}" height="8" fill="${out2}"/><path d="M${xc-aw-10} ${ye-4} h${aw*2+20} M${xc-aw-10} ${ye-1} h${aw*2+20}" stroke="${out}" stroke-width=".8" opacity=".6"/>`;
 const arm=(xc,dir,k)=>`<path d="${armP(xc)}" fill="${skin}"/>${ot==='tee'?`<ellipse cx="${xc-dir*aw*.15}" cy="${ye+15}" rx="${aw*.55}" ry="11" fill="${skinD}" opacity="${(.1+str*.05).toFixed(2)}"/>`:''}
  <g clip-path="url(#${k}${u})"><rect x="${xc-aw-10}" y="${top-4}" width="${aw*2+20}" height="${ye-top+4}" fill="${out}"/>${ot!=='tee'?`<ellipse cx="${xc+dir*aw*.1}" cy="${top+34}" rx="${aw*.7}" ry="14" fill="${out2}" opacity="${(.08+str*.045).toFixed(2)}"/><path d="M${xc+dir*aw*.6} ${top+14} Q${xc+dir*(aw+bl)*.95} ${top+34} ${xc+dir*aw*.6} ${top+52}" fill="none" stroke="${outL}" stroke-width="2" stroke-linecap="round" opacity="${(.2+str*.06).toFixed(2)}"/>`:''}${cuff(xc)}</g>
  <circle cx="${xc}" cy="${top+7}" r="${(aw+1.5+str*.4).toFixed(1)}" fill="${out}"/><path d="M${xc-aw*.7} ${top+3} Q${xc} ${top-3} ${xc+aw*.7} ${top+3}" fill="none" stroke="${outL}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`;
 const db=str>=2?`<rect x="${L0-14}" y="${bot}" width="28" height="4" rx="2" fill="#8c8c96"/><rect x="${L0-20}" y="${bot-8}" width="7" height="20" rx="2.5" fill="#3a3a46"/><rect x="${L0+13}" y="${bot-8}" width="7" height="20" rx="2.5" fill="#3a3a46"/>`:'';
 const book=stage>=2?`<rect x="${R0-4}" y="${bot-12}" width="24" height="17" rx="2" fill="${mx('#7a5cff',w*.6)}"/><rect x="${R0-1}" y="${bot-9}" width="18" height="2.5" fill="#fff" opacity=".7"/><rect x="${R0-1}" y="${bot-4}" width="12" height="2.5" fill="#fff" opacity=".5"/>`:'';
 const hands=`${db}${book}<circle cx="${L0}" cy="${bot+1}" r="${(aw*.78+1).toFixed(1)}" fill="${skin}"/><circle cx="${R0}" cy="${bot+1}" r="${(aw*.78+1).toFixed(1)}" fill="${skin}"/>`;
 const hood=ot==='hoodie'?`<path d="M${100-nk-16} ${ny-2} Q${100-nk-20} ${ny+16} ${100-nk-6} ${ny+22} Q100 ${ny+30} ${100+nk+6} ${ny+22} Q${100+nk+20} ${ny+16} ${100+nk+16} ${ny-2} Q100 ${ny-16} ${100-nk-16} ${ny-2}Z" fill="${out2}"/>`:'';
 const body=`<path d="${torso}" fill="${out}"/>${inner}${stripes}${knit}${pocket}${arm(L0,-1,'al')}${arm(R0,1,'ar')}${hood}`;
 /* ---- hair, face ---- */
 const hp=hairParts(a.hs==='short'?'crop':a.hs,hair,hairD,hairL,out,out2,gold,u);
 const FP={oval:'M75 86 Q75 62 100 62 Q125 62 125 86 L125 98 Q125 107 119 114 Q111 126 100 127 Q89 126 81 114 Q75 107 75 98Z',round:'M73 88 Q73 62 100 62 Q127 62 127 88 L127 100 Q127 124 100 128 Q73 124 73 100Z',square:'M75 86 Q75 62 100 62 Q125 62 125 86 L125 104 Q125 112 120 116 L112 124 Q106 128 100 128 Q94 128 88 124 L80 116 Q75 112 75 104Z',long:'M77 86 Q77 59 100 58 Q123 59 123 86 L123 100 Q122 116 112 127 Q106 134 100 135 Q94 134 88 127 Q78 116 77 100Z',heart:'M74 86 Q74 62 100 62 Q126 62 126 86 L125 96 Q122 110 110 122 Q104 130 100 132 Q96 130 90 122 Q78 110 75 96Z'},
  fw={oval:75,round:73,square:75,long:77,heart:74}[fs]||75,happy=wf<.3,gx=conf===0?-1.4:0,gy=conf===0?1:0;
 const eye=cx=>happy?`<ellipse cx="${cx}" cy="93" rx="4.6" ry="${conf===0?3.2:3.6}" fill="#fff"/><circle cx="${cx+gx}" cy="${93+gy}" r="2.5" fill="${ink}"/><circle cx="${cx+gx+.8}" cy="${92+gy}" r=".8" fill="#fff"/><path d="M${cx-5} 90.6 Q${cx} 88 ${cx+5} 90.6" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`:`<path d="M${cx-5} 93 q5 ${3-wf*3} 10 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
 const wb=conf===0?1.5:0,rr=conf>=3?2.2:0,brows=`<path d="M80 ${85+wf*2} L95 ${(84-wf*3-wb).toFixed(1)}M105 ${(84-wf*3-wb-rr).toFixed(1)} L120 ${(85+wf*2-rr).toFixed(1)}" stroke="${hairD}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
 const sm=Math.max(-7,(1.5+(conf+em)/2*1.7)-wf*20),mc=(conf+em)/2,
  mouth=!happy||mc<3?`<path d="M92 112 Q100 ${(112+sm).toFixed(1)} 108 112" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:mc<4?`<path d="M92 112.5 Q100 ${(112.5+sm).toFixed(1)} 108 109.5" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:`<path d="M91 110 Q100 ${(114+sm).toFixed(1)} 109 110 Q100 111.5 91 110Z" fill="#fff" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
 const circles=wf>.25?`<ellipse cx="88" cy="99" rx="6" ry="2.2" fill="#5b3b7a" opacity="${(wf*.45).toFixed(2)}"/><ellipse cx="112" cy="99" rx="6" ry="2.2" fill="#5b3b7a" opacity="${(wf*.45).toFixed(2)}"/>`:'',
  blush=happy&&em>=2?`<circle cx="80" cy="103" r="5" fill="#ff8fb1" opacity="${(.15+em*.06).toFixed(2)}"/><circle cx="120" cy="103" r="5" fill="#ff8fb1" opacity="${(.15+em*.06).toFixed(2)}"/>`:'',
  tear=wf>.55?`<ellipse class="p25tear" cx="84" cy="101" rx="2.4" ry="3.6" fill="#6ec6ff"/>`:'';
 const holeM='M90 114 a10 4.5 0 1 0 20 0 a10 4.5 0 1 0 -20 0Z',beard=fh==='full'?`<path fill-rule="evenodd" d="M75 90 L78 90 Q80 108 92 108 Q100 104 108 108 Q120 108 122 90 L125 90 Q126 112 118 126 Q110 138 100 138 Q90 138 82 126 Q74 112 75 90Z ${holeM}" fill="${hairD}"/>`:fh==='short'?`<path fill-rule="evenodd" d="M76 96 L79 96 Q82 108 92 108 Q100 105 108 108 Q118 108 121 96 L124 96 Q125 112 117 124 Q109 131 100 131 Q91 131 83 124 Q75 112 76 96Z ${holeM}" fill="${hairD}"/>`:fh==='stubble'?`<path d="M76 98 Q76 114 84 124 Q92 132 100 132 Q108 132 116 124 Q124 114 124 98 Q118 110 100 110 Q82 110 76 98Z" fill="${hairD}" opacity=".3"/>`:'',
  stache=fh==='full'||fh==='short'||fh==='stache'?`<path d="M88 106 Q94 102 100 105 Q106 102 112 106 Q106 110 100 108 Q94 110 88 106Z" fill="${hairD}"/>`:'';
 const face=`<ellipse cx="${fw-.5}" cy="98" rx="4.5" ry="7" fill="${skin}"/><ellipse cx="${200-fw+.5}" cy="98" rx="4.5" ry="7" fill="${skin}"/><path d="${FP[fs]||FP.oval}" fill="${skin}"/><path d="${FP[fs]||FP.oval}" fill="none" stroke="${skinD}" stroke-width="1.6" opacity=".28"/>
  <path d="M100 93 L97.5 103 Q100 105 102.5 103" stroke="${skinD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>${beard}${blush}${circles}${eye(88)}${eye(112)}${brows}${mouth}${stache}${tear}`;
 let acc='';
 if(a.ac==='glasses')acc=`<g fill="none" stroke="${ink}" stroke-width="2"><circle cx="88" cy="93" r="9.5"/><circle cx="112" cy="93" r="9.5"/><path d="M97.5 92 h5"/></g>`;
 if(a.ac==='shades')acc=`<path d="M77 85 H98 Q98 104 87 104 Q77 103 77 85Z" fill="#241a12" opacity=".9"/><path d="M102 85 H123 Q123 103 113 104 Q102 104 102 85Z" fill="#241a12" opacity=".9"/><path d="M77 85 H123" stroke="#c9a14a" stroke-width="2.2"/><path d="M82 89 l5 -2 M107 89 l5 -2" stroke="#fff" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>`;
 if(a.ac==='headband')acc=`<path d="M71 80 Q100 60 129 80" fill="none" stroke="${gold}" stroke-width="7" stroke-linecap="round"/><path d="M71 80 Q100 60 129 80" fill="none" stroke="${out}" stroke-width="2"/>`;
 if(a.ac==='flower')acc=`<g transform="translate(124 70)"><circle r="3" fill="#ffd76a"/>${[0,72,144,216,288].map(r=>`<circle cx="${(Math.cos(r*Math.PI/180)*6).toFixed(1)}" cy="${(Math.sin(r*Math.PI/180)*6).toFixed(1)}" r="3.4" fill="#ff8fb1"/>`).join('')}</g>`;
 if(a.ac==='headphones')acc=`<path d="M72 96 Q70 50 100 48 Q130 50 128 96" fill="none" stroke="${ink}" stroke-width="5"/><rect x="66" y="90" width="10" height="20" rx="4.5" fill="${ink}"/><rect x="124" y="90" width="10" height="20" rx="4.5" fill="${ink}"/>`;
 const crown=stage>=7?`<path d="M80 40 l6 -14 l14 10 l14 -10 l6 14Z" fill="${gold}"/>`:'',halo=L>=.6?`<ellipse cx="100" cy="40" rx="24" ry="6" fill="none" stroke="#ffd166" stroke-width="3" opacity="${(L*.9).toFixed(2)}"/><circle cx="100" cy="92" r="52" fill="#ffe08a" opacity="${(L*.22).toFixed(2)}"/>`:'';
 /* ---- neck + collar ---- */
 const nkB=`<path d="M${100-nk} 118 L${100-nk} ${ny+8} Q100 ${ny+16} ${100+nk} ${ny+8} L${100+nk} 118Z" fill="${skin}"/><path d="M${100-nk} 126 Q100 142 ${100+nk} 126 L${100+nk} 140 Q100 150 ${100-nk} 140Z" fill="${skinD}" opacity=".35"/>`,vc=`${100-nk-6} ${ny-2} Q100 ${ny+26} ${100+nk+6} ${ny-2}`;
 const roll=h=>`<path d="M${100-nk-5} ${ny-h} L${100+nk+5} ${ny-h} L${100+nk+8} ${ny+4} Q100 ${ny+12} ${100-nk-8} ${ny+4}Z" fill="${out}"/><path d="${Array.from({length:Math.floor(h/6)},(_,i)=>`M${100-nk-6} ${ny-h+7+i*6} Q100 ${ny-h+11+i*6} ${100+nk+6} ${ny-h+7+i*6}`).join(' ')}" stroke="${out2}" stroke-width="1.2" fill="none" opacity=".5"/><path d="M${100-nk-9} ${ny-2} L${100+nk+9} ${ny-2} Q${100+nk+16} ${ny+12} 100 ${ny+22} Q${100-nk-16} ${ny+12} ${100-nk-9} ${ny-2}Z" fill="${out}"/><ellipse cx="100" cy="${ny-h}" rx="${nk+5}" ry="3" fill="${out2}"/>`;
 const collar=ot==='tee'?`<path d="M${100-nk-5} ${ny-1} Q100 ${ny+24} ${100+nk+5} ${ny-1}Z" fill="${skin}"/><path d="M${vc}" fill="none" stroke="${cream}" stroke-width="5" stroke-linecap="round"/><path d="M${vc}" fill="none" stroke="${out2}" stroke-width="1.6"/>`
  :ot==='long'?`<path d="M${100-nk-4} ${ny-1} Q100 ${ny+11} ${100+nk+4} ${ny-1}Z" fill="${skin}"/><path d="M${100-nk-5} ${ny-2} Q100 ${ny+12} ${100+nk+5} ${ny-2}" fill="none" stroke="${out2}" stroke-width="4.5" stroke-linecap="round"/>`
  :ot==='turtle'?roll(26):ot==='high'?roll(13)
  :ot==='hoodie'?`<path d="M${100-nk-6} ${ny-3} Q100 ${ny+14} ${100+nk+6} ${ny-3} Q100 ${ny-9} ${100-nk-6} ${ny-3}Z" fill="${out2}"/><path d="M${100-nk-6} ${ny-3} Q100 ${ny+14} ${100+nk+6} ${ny-3}" fill="none" stroke="${out}" stroke-width="3"/><path d="M${100-6} ${ny+9} L${100-7} ${ny+36} M${100+6} ${ny+9} L${100+7} ${ny+36}" stroke="${cream}" stroke-width="2" stroke-linecap="round"/><circle cx="${100-7}" cy="${ny+37}" r="2" fill="${cream}"/><circle cx="${100+7}" cy="${ny+37}" r="2" fill="${cream}"/>`
  :`<path d="M${100-nk-4} ${ny-1} Q100 ${ny+9} ${100+nk+4} ${ny-1}Z" fill="${cream}"/><path d="M${100-nk-6} ${ny-6} L${100-nk-20} ${ny+10} L100 ${ny+30} L${100-nk-2} ${ny+4}Z" fill="${out2}"/><path d="M${100+nk+6} ${ny-6} L${100+nk+20} ${ny+10} L100 ${ny+30} L${100+nk+2} ${ny+4}Z" fill="${out2}"/>`;
 /* ---- overlays ---- */
 const bubble=!S.mini&&conf>=2&&w<.4&&D<.5?`<g><rect x="70" y="8" width="${conf>=4?78:conf===3?88:66}" height="26" rx="13" fill="${cream}"/><path d="M120 34 l5 8 l5 -8Z" fill="${cream}"/><text x="${70+(conf>=4?39:conf===3?44:33)}" y="26" font-size="14" font-weight="700" text-anchor="middle" fill="${ink}">${conf>=4?'أنا جاهز':conf===3?'كيف حالك؟':'مرحبا'}</text></g>`:'';
 const spark=!S.mini&&str>=3&&w<.3?`<text x="${60+L0-18}" y="${top+20}" font-size="14" fill="${gold}">✦</text><text x="${60+R0+8}" y="${top+14}" font-size="12" fill="${gold}">✦</text>`:'';
 const rain=w>.4?`<g opacity="${clamp(w*1.2).toFixed(2)}">${[56,70,84].map((x,i)=>`<path class="p25rain" style="animation-delay:${i*.35}s" d="M${x} 52 v8" stroke="#6ec6ff" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`:'';
 const glow=str>=4&&conf>=4&&w<.3&&D<.2?'filter:drop-shadow(0 0 12px rgba(255,200,87,.7));':'';
 return `<svg viewBox="${S.mini?'101 18 118 118':'0 0 320 262'}" width="${size}" height="${S.mini?size:Math.round(size*262/320)}" role="img" aria-label="Your character: physical ${str} of 4, mental ${conf} of 4, prayers ${pt} of 5 today" style="max-width:100%;height:auto;${glow}"><defs>${sc.defs}<clipPath id="fr${u}"><rect width="320" height="262" rx="24"/></clipPath><clipPath id="tc${u}"><path d="${torso}"/></clipPath><clipPath id="al${u}"><path d="${armP(L0)}"/></clipPath><clipPath id="ar${u}"><path d="${armP(R0)}"/></clipPath></defs>
 <g clip-path="url(#fr${u})">${sc.back}<g transform="translate(60 0)">${body}<g transform="${tf}">${halo}${hp.back}</g>${nkB}${collar}<g transform="${tf}">${face}${hp.front}${acc}${crown}</g></g>${bubble}${spark}${rain}${sc.front}</g>
 <rect width="320" height="262" rx="24" fill="none" stroke="${gold}" stroke-opacity=".6" stroke-width="2"/></svg>`}

const CSS=`#v-p25 .hero{position:relative;text-align:center;padding:14px 12px 16px;border-radius:26px;background:linear-gradient(165deg,#2d1b4e 0%,#5b2a66 52%,#c2486f 100%);color:#fff4e0;margin-bottom:12px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,200,87,.35)}
#v-p25 .hero:before{content:"";position:absolute;inset:auto 0 0 0;height:46%;background:repeating-linear-gradient(0deg,rgba(255,200,87,.14) 0 6px,transparent 6px 14px);pointer-events:none}
#v-p25 .hero>*{position:relative}
#v-p25 .hero .hedit{position:absolute;top:12px;right:12px;z-index:2;border:0;border-radius:999px;padding:7px 14px;background:var(--gold);color:#1b1405;font-weight:800;font-size:14px;box-shadow:2px 2px 0 rgba(0,0,0,.3)}
#v-p25 .hname{font-family:var(--head);font-weight:900;font-size:32px;letter-spacing:-1px;margin-top:8px;text-shadow:3px 3px 0 #e0457b,6px 6px 0 rgba(0,0,0,.28)}
#v-p25 .lvchip{display:inline-block;margin:8px 0 2px;padding:4px 14px;border-radius:999px;background:var(--gold);color:#1b1405;font-weight:800;font-size:14px;transform:rotate(-2deg);box-shadow:2px 2px 0 rgba(0,0,0,.3)}
#v-p25 .muted2,#v-p25 .hero small{color:#e8dcf5}
#v-p25 .xpb{height:14px;border-radius:9px;background:rgba(0,0,0,.35);overflow:hidden;margin:10px 4px 8px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18)}
#v-p25 .xpb i{display:block;height:100%;border-radius:9px;background:repeating-linear-gradient(115deg,#ffc857 0 10px,#ff9f43 10px 20px);background-size:28px 100%;animation:p25flow 1.4s linear infinite}
@keyframes p25flow{to{background-position:28px 0}}
#v-p25 .mts{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:12px 0 8px;text-align:left}
#v-p25 .cg{border-top:1px solid var(--line);padding:10px 0 4px}#v-p25 .cg:first-of-type{border-top:0}#v-p25 .cg-h{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px}
#v-p25 .mt{background:rgba(0,0,0,.28);border-radius:16px;padding:10px 12px}
#v-p25 .mt-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
#v-p25 .mt-h span{color:var(--gold);font-weight:800;font-size:13px}
#v-p25 .seg{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:7px 0 6px}
#v-p25 .seg i{height:10px;border-radius:5px;background:rgba(255,255,255,.16)}
#v-p25 .seg i.on{background:linear-gradient(90deg,#ffc857,#ff7a90);box-shadow:0 0 10px rgba(255,200,87,.55)}
#v-p25 .hero .ch{color:#fff4e0;border-color:rgba(255,255,255,.4)}
#v-p25 .lvup{margin:0 0 10px;padding:8px 12px;border-radius:14px;background:var(--gold);color:#1b1405;font-weight:800;animation:p25pop .6s cubic-bezier(.2,1.4,.4,1)}
@keyframes p25pop{from{transform:scale(.7);opacity:0}}
#v-p25 .pc{background:var(--card);border:1.5px solid var(--line);border-radius:16px;padding:16px;margin-bottom:12px}
#v-p25 .sub{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px}#v-p25 .sub button{display:grid;justify-items:center;gap:3px;border:1.5px solid var(--line);background:var(--card);color:var(--muted);border-radius:16px;padding:10px 4px 8px;font-weight:700;font-size:13px;transition:transform .2s,background .2s}#v-p25 .sub button b{font-size:20px;line-height:1;filter:grayscale(1);opacity:.7}
#v-p25 .sub button[aria-pressed=true]{background:var(--gold);border-color:var(--gold);color:#1b1405;transform:translateY(-2px)}#v-p25 .sub button[aria-pressed=true] b{filter:none;opacity:1}
#v-p25 .jr{display:grid;grid-template-columns:repeat(28,1fr);gap:3px;margin-top:12px}#v-p25 .jr i{aspect-ratio:1;border-radius:3px;background:var(--line)}#v-p25 .jr i.d{background:var(--you)}#v-p25 .jr i.b{background:var(--gold)}#v-p25 .jr i.n{background:var(--gold);animation:p25n 1.6s ease-in-out infinite}@keyframes p25n{50%{transform:scale(1.8);opacity:.6}}
#v-p25 .tk{display:flex;align-items:center;gap:10px;padding:10px 0;border-top:1px solid var(--line)}#v-p25 .tk:first-child{border-top:0}
#v-p25 .cb{flex:none;width:36px;height:36px;border-radius:10px;border:2px solid var(--muted);background:transparent;font-size:20px;font-weight:800;color:#fff}#v-p25 .cb[aria-pressed=true]{background:var(--you);border-color:var(--you)}
#v-p25 input[type=text],#v-p25 textarea,#v-p25 select{width:100%}#v-p25 textarea{font:inherit;color:var(--ink);background:var(--card);border:1.5px solid var(--line);border-radius:10px;padding:10px}
#v-p25 .sw{width:30px;height:30px;border-radius:50%;border:2px solid var(--line);padding:0}#v-p25 .sw[aria-pressed=true]{outline:3px solid var(--gold)}
#v-p25 .ch{border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:5px 12px}#v-p25 .ch[aria-pressed=true]{background:var(--me);border-color:var(--me);color:#fff}
#v-p25 .pb{height:8px;border-radius:9px;background:var(--bg);overflow:hidden;margin:6px 0}#v-p25 .pb i{display:block;height:100%;background:linear-gradient(90deg,var(--me),var(--you))}
.p25tear{animation:p25t 2.2s infinite}@keyframes p25t{0%{transform:translateY(0);opacity:1}100%{transform:translateY(16px);opacity:0}}.p25rain{animation:p25r .9s infinite}@keyframes p25r{0%{transform:translateY(0);opacity:1}100%{transform:translateY(10px);opacity:0}}
@media(prefers-reduced-motion:reduce){#v-p25 .xpb i,#v-p25 .lvup,.p25tear,.p25rain,#v-p25 .jr i.n{animation:none}}`;

const sw=(k,arr,v,f)=>arr.map((c,i)=>`<button class="sw" data-a="av" data-k="${k}" data-v="${i}" aria-pressed="${v===i}" style="background:${c}" aria-label="${k} ${i+1}"></button>`).join('');
const chips=(k,arr,v)=>arr.map(c=>`<button class="ch" data-a="av" data-k="${k}" data-v="${c}" aria-pressed="${v===c}">${(NMK[k]||{})[c]||c}</button>`).join('');
function maker(){const a=P.av,g=(l,h)=>`<div><small class="muted">${l}</small><div class="row">${h}</div></div>`;return `<div style="display:grid;gap:12px;margin-top:10px">${g('Skin',sw('s',SK,a.s))}${g('Face shape',chips('fs',FS,a.fs||'oval'))}${g('Hair, longer styles',chips('hs',HS1,a.hs))}${g('Hair, short styles',chips('hs',HS2,a.hs==='short'?'crop':a.hs))}${g('Hair colour',sw('h',HC,a.h))}${g('Facial hair',chips('fh',FH,a.fh||'none'))}${g('Outfit style',chips('ot',OT,a.ot||'tee'))}${g('Outfit colour',sw('o',OC,a.o))}${g('Extra',chips('ac',AC,a.ac))}</div>`}
const pd=s=>{const[a,b,c]=String(s).split('-').map(Number);return new Date(a,b-1,c)};
const dd=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const LEG={start:'2026-11-09',age:25,weeks:252,dob:'',bd:{44:21,96:22,148:23,201:24}};
const jr=()=>P&&P.jr?P.jr:LEG;
function jcalc(dob,age,start){const d=pd(dob),tg=new Date(d.getFullYear()+age,d.getMonth(),d.getDate()),weeks=Math.max(1,Math.ceil(Math.round((tg-pd(start))/864e5)/7)),bd={};
 for(let a=1;a<=age;a++){const b=new Date(d.getFullYear()+a,d.getMonth(),d.getDate()),k=Math.floor(Math.round((b-pd(start))/864e5)/7)+1;if(k>=1&&k<=weeks)bd[k]=a}return{weeks,bd,target:tg}}
function ageOn(dob){const d=pd(dob),t=new Date();let a=t.getFullYear()-d.getFullYear();if(t.getMonth()<d.getMonth()||(t.getMonth()===d.getMonth()&&t.getDate()<d.getDate()))a--;return a}
function wkNow(){return Math.floor(dd(jr().start,ctx.todayStr())/7)+1}
function journey(){const w=wkNow(),J=jr(),N=J.weeks,bd=J.bd||{};let c='';for(let i=1;i<=N;i++)c+=`<i class="${[i<w?'d':'',i===w?'n':'',bd[i]?'b':''].join(' ')}" title="Week ${i}${bd[i]?', turning '+bd[i]:''}"></i>`;
 return `<div class="pc"><div class="row" style="justify-content:space-between;align-items:baseline"><h3>${w<1?'Starts soon':'Week '+Math.min(w,N)}<small class="muted"> of ${N}</small></h3><small class="muted">${Math.max(0,N-Math.max(w,1))} left</small></div><div class="jr" style="grid-template-columns:repeat(${N>252?52:28},1fr)" role="img" aria-label="${N} weeks until ${J.age}, ${Math.max(0,Math.min(w-1,N))} lived">${c}</div><small class="muted" style="display:block;margin-top:8px">Each square is a week, until you turn ${J.age}. Gold ones are your birthdays.</small></div>`}
const moodOf=(m,w,sk)=>m===0?(w===0&&sk>=3?'Thriving 🌟':'Doing well 🙂'):m<=2?'A bit low…':m<=5?'Worn down 😔':'Miserable 🥺';
export function p25Progress(){if(!ctx||!loaded||!P||P.step<99)return{on:false,pct:0,done:0,total:0};const d=ctx.todayStr(),total=P.tasks.length,done=P.tasks.filter(t=>isDone(t,d)).length;return{on:true,pct:total?Math.round(done/total*100):0,done,total}}
export function p25Week(){const N=jr().weeks,w=wkNow();return{n:Math.min(Math.max(w,1),N),left:Math.max(0,N-Math.max(w,1)),total:N}}
function stats(){const x=xp(),lv=Math.floor(x/300)+1,st=Math.min(7,lv-1),m=miss();return{x,lv,st,m,w:clamp(m/10),title:TITLES[st],pr:(x%300)/300}}
function mood(s){if(s.m===0)return s.w===0&&streak()>=3?'Thriving 🌟':'Doing well 🙂';return s.m<=2?'A bit low…':s.m<=5?'Worn down 😔':'Miserable. Please tick something 🥺'}
const taskRow=t=>{const d=ctx.todayStr(),l=t.link&&t.link.k==='h'&&hab(t.link.id);return `<div class="tk"><button class="cb" data-a="tick" data-id="${t.id}" aria-pressed="${isDone(t,d)}" aria-label="${ctx.esc(t.t)}">${isDone(t,d)?'✓':''}</button><div style="flex:1"><b>${ctx.esc(t.t)}</b>${l?`<div class="muted" style="font-size:12px">🔗 shared with “${ctx.esc(l.name)}”: one tick counts for both</div>`:''}</div></div>`};
const linkSel=(t)=>{const o=ctx.habits().map(h=>`<option value="${h.id}" ${t.link&&t.link.id===h.id?'selected':''}>${ctx.esc(h.name)}</option>`).join('');return `<select data-a="tlink" data-id="${t.id}" aria-label="Link ${ctx.esc(t.t)}"><option value="">Personal only</option>${o}</select>`};
const goalSel=g=>{const o=ctx.goals().map(s=>`<option value="${s.id}" ${g.link&&g.link.id===s.id?'selected':''}>${ctx.esc(s.title)}</option>`).join('');return `<select data-a="glink" data-id="${g.id}" aria-label="Link goal"><option value="">Personal only</option>${o}</select>`};

function jsetup(){const j=P.js=P.js||{st:'dob',dob:'',age:25,err:''},na=j.dob?ageOn(j.dob):0;let b='',fin=false;
 if(j.st==='dob')b=`<h2>When were you born? 🎂</h2><p class="muted">Your 25 is counted in weeks, from today until the birthday you choose.</p><input type="date" data-f="jdob" value="${j.dob}" max="${ctx.todayStr()}" aria-label="Date of birth">`;
 if(j.st==='age')b=`<h2>Until which age? 🎯</h2><p class="muted">You’re ${na} now. Pick the age you want this journey to end on.</p><input type="number" data-f="jage" min="${na+1}" max="100" value="${j.age}" aria-label="Target age">`;
 if(j.st==='sum'){fin=true;const c=jcalc(j.dob,j.age,ctx.todayStr());b=`<h2>${c.weeks} weeks 🗓</h2><p>From today until your ${j.age}th birthday on <b>${c.target.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</b>. That’s about ${(c.weeks/52.18).toFixed(1)} years, and every square on your page is one week.</p>${P.restart?'<p class="muted">Restarting resets your XP, streak, weekly quests and wins. Your character, daily ticks and goals stay.</p>':''}`}
 const back=j.st==='dob'?(P.restart?'<button class="btn ghost" data-a="jcancel">Cancel</button>':''):'<button class="btn ghost" data-a="jback">Back</button>';
 return `<div class="pc">${b}${j.err?`<p role="alert" style="color:var(--me)">${ctx.esc(j.err)}</p>`:''}<div class="row" style="justify-content:flex-end;margin-top:14px">${back}<button class="btn" data-a="${fin?'jstart':'jnext'}">${fin?(P.restart?'Restart my 25 ✨':'Start my 25 ✨'):'Next'}</button></div></div>`}

function onboarding(){const s=P.step,nx=`<button class="btn" data-a="next">${s===4?'Start my 25 ✨':'Next'}</button>`,bk=s>0?`<button class="btn ghost" data-a="back">Back</button>`:'';let b='';
 if(s===0)b=`<h2>Welcome to 25 🌱</h2><p>This is <b>your own private space</b> inside our app. Your partner can’t see it, and it never changes our readiness bar or our kitten.</p><p class="muted">It’s for who you’re becoming by 25: your goals, tasks, wild cards and wins.</p>`;
 if(s===1)b=`<h2>What’s inside</h2><p><b>Today</b>: your daily ticks and your character.<br><b>Week</b>: one main quest, side quests and a wild card (something you’ve never done).<br><b>Goals</b>: who you’re becoming. Add a number or date, tick only when it’s truly you.<br><b>Wins</b>: your wall of proof.</p>`;
 if(s===2)b=`<h2>Shared things, ticked once</h2><p>If a habit or goal here is already one of our shared ones (like Workout), you can <b>link</b> it. Then one tick counts in both places, so you never tick twice. Linking is optional and you can change it anytime in <i>Today → Edit</i>.</p>`;
 if(s===3)b=`<h2>Make your character</h2><p class="muted">It grows as you do. If you stop showing up, it slowly gets sadder. 🥺</p><input type="text" data-f="name" placeholder="Character name" value="${ctx.esc(P.name)}" maxlength="20"><div style="text-align:center;margin:8px 0">${avatar(P.av,0,0,300,{p:2,e:2,m:2,s:1,pr:{t:-1,y:-1},rd:0,ct:[]})}</div>${maker()}`;
 if(s===4)b=`<h2>Pick your daily habits</h2><p class="muted">Habits live under aspects: Physical, Emotional, Spiritual and Mental. Each one shapes part of your character and the world behind it. Tap to add. You can add your own habits and new aspects later.</p>${cats().map(c=>`<div style="margin:10px 0"><b>${c.ic} ${ctx.esc(c.n)}</b><div class="row" style="margin-top:6px">${(SUG[c.id]||[]).map(x=>`<button class="ch" data-a="starter" data-v="${ctx.esc(x)}" data-c="${c.id}" aria-pressed="${P.tasks.some(t=>t.t===x)}">${x}</button>`).join('')}</div></div>`).join('')}`;
 return `<div class="pc">${b}<div class="row" style="justify-content:flex-end;margin-top:14px">${bk}${nx}</div></div>`}

function today(){const s=stats(),d=ctx.todayStr(),n=P.tasks.filter(t=>isDone(t,d)).length,ed=P.editT,ec=P.editC,S=traits(),L=S._L,C=cats();
 const cur={};for(const c of C)cur[c.id]=L[c.id].lv||0;
 if(!P.lv||(P.lv.phys===undefined&&P.lv.emo===undefined&&P.lv.spir===undefined&&P.lv.ment===undefined)){P.lv=cur;save()}
 else{const m=C.filter(c=>cur[c.id]>(P.lv[c.id]||0)).map(c=>`${c.ic} ${c.n} levelled up!`);if(m.length){P.up=m.join(' ');P.upT=Date.now()}if(C.some(c=>cur[c.id]!==(P.lv[c.id]||0))){P.lv=cur;save()}}
 const mt=c=>{const st=L[c.id],lv=st.lv,wd=WORDS[c.id]||WORDX;return `<div class="mt"><div class="mt-h"><b>${c.ic} ${ctx.esc(c.n)}</b><span>${lv==null?'Not started':wd[lv]}</span></div><div class="seg">${[1,2,3,4].map(i=>`<i class="${(lv||0)>=i?'on':''}"></i>`).join('')}</div><small>${st.has?`${st.n} of ${st.pos} ticks in the last 14 days${st.neg?'. Quiet lately, tick one to bring it back.':'.'}`:`<button class="ch" data-a="openadd" data-v="${c.id}">+ Add a habit</button> to grow this`}</small></div>`};
 const ps=prState(S.pr),pk=S.pr.t>=0||S.pr.y>=0,
  prb=pk?`<div class="mt"><div class="mt-h"><b>🕌 Prayers today</b><span>${Math.max(0,S.pr.t)}/5</span></div><div class="seg" style="grid-template-columns:repeat(5,1fr)">${[0,1,2,3,4].map(i=>`<i class="${i<S.pr.t?'on':''}"></i>`).join('')}</div><small>${ps.D>.5?'Darkness is closing in. Pray to push it back 🕌':ps.D>.15?'It’s getting dim. A prayer brings the light back.':ps.t>=3?'Light surrounds you ✨':'Pray and your character begins to shine.'}</small></div>`:'',
  rdb=`<div class="mt"><div class="mt-h"><b>💞 Ready for marriage</b><span>${S.rd}%</span></div><div class="seg" style="grid-template-columns:repeat(10,1fr)">${Array.from({length:10},(_,i)=>`<i class="${S.rd>=(i+1)*10?'on':''}"></i>`).join('')}</div><small>Prayers, habits, meals and sleep move this, and it builds the home in your background.</small></div>`;
 let h=`<div class="hero"><button class="hedit" data-a="editc" aria-label="Edit character">${ec?'Done ✓':'✏️ Edit'}</button>${P.up&&Date.now()-(P.upT||0)<20000?`<div class="lvup">${ctx.esc(P.up)}</div>`:''}${avatar(P.av,s.w,s.st,340,S)}<h2 class="hname">${ctx.esc(P.name||'You')}</h2><div class="lvchip">Lv ${s.lv} · ${s.title}</div><div class="muted2">${mood(s)}</div><div class="xpb"><i style="width:${Math.max(4,s.pr*100)}%"></i></div><div class="row" style="justify-content:center;gap:18px"><span>🔥 ${streak()} day streak</span><span>${s.x} XP</span></div>
 <div class="mts">${C.map(mt).join('')}${prb}${rdb}</div>
 ${s.m>0?`<small class="muted2">${s.m} day${s.m>1?'s':''} without a tick. ${ctx.esc(P.name||'They')} is fading.</small>`:`<small class="muted2">${n}/${P.tasks.length} ticked today</small>`}</div>
 ${ec?`<div class="pc" id="p25char" style="border:2px solid var(--gold)"><h3>Edit your character</h3><input type="text" data-f="name" value="${ctx.esc(P.name)}" maxlength="20" placeholder="Name"><small class="muted">Everything changes live on the avatar above.</small>${maker()}<hr style="border:0;border-top:1px solid var(--line);margin:14px 0"><label class="row" style="gap:8px"><input type="checkbox" data-a="shareck" ${P.share!==false?'checked':''} style="width:22px;height:22px"> Show my character to my partner (only the character and mood, never tasks, goals or wins)</label><div class="row" style="margin-top:12px"><button class="btn" data-a="restart">🔄 Restart my 25 (date of birth + age)</button><button class="btn ghost small" data-a="redo">Re-do intro</button></div></div>`:''}
 ${journey()}`;
 const crow=t=>ed?`<div class="tk"><div style="flex:1;display:grid;gap:6px"><input type="text" data-f="tt" data-id="${t.id}" value="${ctx.esc(t.t)}"><div class="row"><select data-a="tcat" data-id="${t.id}" aria-label="Aspect for ${ctx.esc(t.t)}">${C.map(c=>`<option value="${c.id}" ${t.cat===c.id?'selected':''}>${c.ic} ${ctx.esc(c.n)}</option>`).join('')}</select>${linkSel(t)}</div></div><button class="btn ghost small" data-a="deltask" data-id="${t.id}" aria-label="Delete">✕</button></div>`:taskRow(t);
 const groups=C.map(c=>{const ts=P.tasks.filter(t=>t.cat===c.id),sg=(SUG[c.id]||[]).filter(x=>!P.tasks.some(t=>t.t===x));
  return `<div class="cg"><div class="cg-h"><b>${c.ic} ${ctx.esc(c.n)}</b><small class="muted">${ts.filter(t=>isDone(t,d)).length}/${ts.length} today</small>${ed&&c.x?`<button class="btn ghost small" data-a="delcat" data-id="${c.id}" aria-label="Delete ${ctx.esc(c.n)}">✕</button>`:''}</div>${ts.map(crow).join('')||'<p class="muted" style="margin:2px 0 6px;font-size:14px">Nothing here yet.</p>'}${ed?`<div class="row" style="margin:6px 0"><input type="text" id="p25nt_${c.id}" placeholder="Add a ${ctx.esc(c.n.toLowerCase())} habit" style="flex:1"><button class="btn small" data-a="addtask" data-v="${c.id}">Add</button></div>${sg.length?`<div class="row">${sg.map(x=>`<button class="ch" data-a="addsug" data-v="${ctx.esc(x)}" data-c="${c.id}">+ ${ctx.esc(x)}</button>`).join('')}</div>`:''}`:''}</div>`}).join('');
 const newc=ed?`<div class="cg"><div class="cg-h"><b>➕ New aspect</b></div><div class="row"><input type="text" id="p25ncn" placeholder="e.g. Social, Money, Career" maxlength="18" style="flex:1"><input type="text" id="p25nci" placeholder="🙂" maxlength="2" style="width:64px"><button class="btn small" data-a="addcat">Add</button></div></div>`:'';
 return h+`<div class="pc"><div class="row" style="justify-content:space-between"><h3>Today</h3><button class="btn ghost small" data-a="edit">${ed?'Done':'Edit habits'}</button></div>${groups}${newc}</div>`}
function week(){const k=mon(),w=P.wk[k]=P.wk[k]||{};const f=(l,key,ta)=>`<small class="muted">${l}</small>${ta?`<textarea data-f="wk" data-k="${key}" rows="2">${ctx.esc(w[key])}</textarea>`:`<input type="text" data-f="wk" data-k="${key}" value="${ctx.esc(w[key])}">`}`;
 const sq=(l,key)=>`<div class="tk" style="border-top:0;padding:8px 0 0"><button class="cb" data-a="flag" data-k="${key}d" aria-pressed="${!!w[key+'d']}" aria-label="${l} done">${w[key+'d']?'✓':''}</button><div style="flex:1"><small class="muted">${l}${w[key+'d']?' · done ✓':''}</small><input type="text" data-f="wk" data-k="${key}" value="${ctx.esc(w[key])}"></div></div>`;
 return `<div class="pc" style="border-color:var(--gold);border-width:2px">${f('MAIN QUEST (one thing, done or not done by Sunday)','main',1)}<div style="margin-top:8px">${f('It makes me more…','more')}</div><button class="btn ghost" style="margin-top:10px;width:100%" data-a="flag" data-k="md" aria-pressed="${!!w.md}">${w.md?'Main quest DONE ✓':'Main quest done? +100 XP'}</button></div>
 <div class="pc"><small class="muted">Side quests: tick each one when it's done (+25 XP each)</small>${sq('Side quest 1','s1')}${sq('Side quest 2','s2')}${sq('Side quest 3','s3')}</div>
 <div class="pc">${f('Wild card: something I’ve NEVER done','wild')}<button class="btn ghost" style="margin-top:10px;width:100%" data-a="flag" data-k="wd">${w.wd?'Wild card DONE ✓':'Wild card done? +75 XP'}</button></div>
 <div class="pc">${f('This week I became more…','became')}<div style="margin-top:8px">${f('Next week I dare to…','dare')}</div></div>`}

function goalsV(){let h=`<p class="muted">Add a number or date to each goal. Tick only when it’s truly part of who you are.</p>`;
 h+=P.goals.map(g=>{const s=g.link&&gl(g.link.id),p=goalPct(g);return `<div class="pc"><div class="row" style="flex-wrap:nowrap"><input type="text" data-f="gt" data-id="${g.id}" value="${ctx.esc(g.t)}" placeholder="Goal" style="flex:1"><button class="btn ghost small" data-a="delgoal" data-id="${g.id}" aria-label="Delete">✕</button></div>
 <input type="text" data-f="gs" data-id="${g.id}" value="${ctx.esc(g.sp)}" placeholder="specifically: a number or a date" style="margin-top:6px">
 ${s?`<div class="pb"><i style="width:${p*100}%"></i></div><div class="row"><small class="muted">🔗 ${ctx.esc(s.title)}: ${s.current||0}/${s.target}</small><button class="btn ghost small" data-a="gbump" data-id="${g.id}" data-by="-1">−</button><button class="btn ghost small" data-a="gbump" data-id="${g.id}" data-by="1">+</button></div>`:`<label class="row" style="margin-top:8px"><input type="checkbox" data-a="gck" data-id="${g.id}" ${g.ck?'checked':''} style="width:22px;height:22px"> This is truly me now (+150 XP)</label>`}
 <div style="margin-top:8px">${goalSel(g)}</div></div>`}).join('')||'';
 return h+`<div class="pc"><div class="row"><input type="text" id="p25ng" placeholder="New goal, e.g. I read the Quran fluently" style="flex:1"><button class="btn" data-a="addgoal">Add</button></div></div><div class="pc"><small class="muted">When I look back at 25, I want to feel…</small><textarea data-f="feel" rows="3">${ctx.esc(P.feel)}</textarea></div>`}

function winsV(){return `<div class="pc"><div class="row"><input type="text" id="p25nw" placeholder="What I achieved" style="flex:1"><button class="btn" data-a="addwin">Add (+25 XP)</button></div></div><div class="pc">${P.wins.map((x,i)=>`<div class="tk"><b style="min-width:70px;color:var(--gold)">${ctx.esc(x.d)}</b><span style="flex:1">${ctx.esc(x.t)}</span><button class="btn ghost small" data-a="delwin" data-i="${i}" aria-label="Delete">✕</button></div>`).join('')||'<p class="muted">No wins yet. Your first one goes here.</p>'}</div>`}

function draw(){drawInner();if(ctx&&ctx.badge)ctx.badge()}
function drawInner(){const el=$('v-p25');if(!el)return;if(!$('p25css')){const s=document.createElement('style');s.id='p25css';s.textContent=CSS;document.head.appendChild(s);bind(el)}
 if(!loaded||!P){el.innerHTML='<div class="pc muted">Loading your 25…</div>';return}
 sync();if(P.step<99){el.innerHTML=P.step===98?jsetup():onboarding();return}
 pub();
 const v={today,week,goals:goalsV,wins:winsV}[P.sub]();
 el.innerHTML=`<div class="sub">${[['today','🌤','Today'],['week','🗓','Week'],['goals','🎯','Goals'],['wins','🏆','Wins']].map(([k,i,l])=>`<button data-a="sub" data-v="${k}" aria-pressed="${P.sub===k}"><b aria-hidden="true">${i}</b>${l}</button>`).join('')}</div>${v}`}

function bind(el){
 el.addEventListener('input',e=>{const t=e.target,f=t.dataset.f;if(!f)return;const id=t.dataset.id;
  if(f==='name')P.name=t.value;else if(f==='tt')P.tasks.find(x=>x.id===id).t=t.value;else if(f==='wk')P.wk[mon()][t.dataset.k]=t.value;
  else if(f==='gt')P.goals.find(x=>x.id===id).t=t.value;else if(f==='gs')P.goals.find(x=>x.id===id).sp=t.value;else if(f==='feel')P.feel=t.value;else if(f==='jdob'&&P.js)P.js.dob=t.value;else if(f==='jage'&&P.js)P.js.age=+t.value;save()});
 el.addEventListener('change',e=>{const t=e.target,a=t.dataset.a,id=t.dataset.id;
  if(a==='tcat'){const x=P.tasks.find(q=>q.id===id);if(x){x.cat=t.value;save();draw()}}
  if(a==='tlink'){const x=P.tasks.find(q=>q.id===id);x.link=t.value?{k:'h',id:t.value,since:ctx.todayStr()}:null;save();draw()}
  if(a==='glink'){const x=P.goals.find(q=>q.id===id);x.link=t.value?{k:'g',id:t.value}:null;save();draw()}
  if(a==='shareck'){P.share=t.checked;save();draw()}
  if(a==='gck'){P.goals.find(q=>q.id===id).ck=t.checked;save();draw()}});
 el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!b.dataset.a)return;const d=b.dataset,a=d.a,id=d.id;
  if(a==='av'){const k=d.k;P.av[k]=['hs','ac','fs','fh','ot'].includes(k)?d.v:+d.v}
  else if(a==='next'){P.step++;if(P.step>4){P.step=98;P.js=null;P.restart=false;P.sub='today';if(!P.name)P.name='Me'}}
  else if(a==='back')P.step--;
  else if(a==='starter'){const i=P.tasks.findIndex(t=>t.t===d.v);i<0?P.tasks.push({id:rid(),t:d.v,cat:d.c||guessCat(d.v),link:null,at:ctx.todayStr()}):P.tasks.splice(i,1)}
  else if(a==='sub'){P.sub=d.v}
  else if(a==='openadd')P.editT=true;
  else if(a==='editc')P.editC=!P.editC;
  else if(a==='addsug'){if(!P.tasks.some(t=>t.t===d.v))P.tasks.push({id:rid(),t:d.v,cat:d.c,link:null,at:ctx.todayStr()})}
  else if(a==='addcat'){const nm=$('p25ncn').value.trim(),ic=$('p25nci').value.trim()||'⭐';if(nm&&P.cats.length<10)P.cats.push({id:'c'+rid(),n:nm.slice(0,18),ic,x:1})}
  else if(a==='delcat'){if(confirm('Delete this aspect and all its habits?')){P.tasks=P.tasks.filter(t=>t.cat!==id);P.cats=P.cats.filter(c=>c.id!==id)}}
  else if(a==='edit')P.editT=!P.editT;
  else if(a==='redo'){P.step=0;P.editT=false;P.editC=false}
  else if(a==='restart'){P.restart=true;P.step=98;P.js=null;P.editT=false;P.editC=false}
  else if(a==='jcancel'){P.restart=false;P.js=null;P.step=99}
  else if(a==='jback'){P.js.err='';P.js.st=P.js.st==='sum'?'age':'dob'}
  else if(a==='jnext'){const j=P.js;j.err='';
   if(j.st==='dob'){if(!j.dob||pd(j.dob)>new Date()||ageOn(j.dob)<1)j.err='Please enter your date of birth.';else{j.st='age';if(!j.age||j.age<=ageOn(j.dob))j.age=Math.max(25,ageOn(j.dob)+1)}}
   else if(j.st==='age'){if(!(j.age>ageOn(j.dob))||j.age>100)j.err='Pick an age above your current age ('+ageOn(j.dob)+').';else j.st='sum'}}
  else if(a==='jstart'){const j=P.js,t=ctx.todayStr(),c=jcalc(j.dob,j.age,t);P.jr={dob:j.dob,age:j.age,start:t,weeks:c.weeks,bd:c.bd};
   if(P.restart){P.days={};P.wk={};P.wins=[];P.lv=null;P.up='';P.start=t}
   P.restart=false;P.js=null;P.step=99;P.sub='today'}
  else if(a==='addtask'){const v=(($('p25nt_'+d.v)||{}).value||'').trim();if(v)P.tasks.push({id:rid(),t:v,cat:d.v,link:null,at:ctx.todayStr()})}
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
  save();draw();if(a==='openadd')setTimeout(()=>{const e=document.getElementById('p25nt_'+d.v);if(e){e.scrollIntoView({block:'center'});e.focus()}},60);if(a==='editc'&&P.editC)setTimeout(()=>{const e=document.getElementById('p25char');e&&e.scrollIntoView({behavior:'smooth',block:'start'})},60)})}

function summary(){const s=stats(),S=traits();let last='';for(const d of ctx.lastDays(60).reverse()){if(anyTick(d)){last=d;break}}
 return{name:P.name||'Me',av:P.av,st:s.st,lv:s.lv,title:s.title,x:s.x,xb:Math.round(s.pr*100),sk:streak(),last,start:P.start||ctx.todayStr(),S:{p:S.p,e:S.e,m:S.m,s:S.s,np:+!!S.np,ne:+!!S.ne,nm:+!!S.nm,ct:S.ct,pr:S.pr,pd:ctx.todayStr(),rd:S.rd}}}
export function p25Summary(force){if(!ctx||!loaded||!P||P.step<99||(!force&&P.share===false))return null;return summary()}
export function p25View(sm,size=300,ov){const t=ctx.todayStr();let m=0;if(sm.last!==t){const b=sm.last||sm.start||t;m=Math.min(12,Math.max(0,dd(b,t)-1))}const w=clamp(m/10);
 const q=sm.S||{p:sm.s,m:sm.c},S2={...q,np:!!q.np,ne:!!q.ne,nm:!!q.nm,pr:(ov&&ov.pr)||{t:-1,y:-1},rd:ov&&ov.rd!=null?ov.rd:(q.rd||0),mini:!!(ov&&ov.mini)};
 return{svg:avatar(sm.av,w,sm.st,size,S2),title:sm.title,mood:moodOf(m,w,sm.sk),m,sk:m?0:sm.sk}}
let lastPub;function pub(){if(!ctx.shareChar||!P||P.step<99)return;const sm=P.share===false?null:summary(),k=JSON.stringify(sm);if(k===lastPub)return;lastPub=k;try{ctx.shareChar(sm)}catch(e){}}
export function initP25(c){ctx=c}
export function renderP25(){if(!ctx)return;if(loaded&&uidK!=='p25_'+uid()){loaded=false;P=null;uidK=''}if(!loaded){if(!uidK){uidK='x';load()}draw();return}draw()}
