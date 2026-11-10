/* "25" — private personal space inside Our Road to Ready. Stored only in users/{uid}.p25, never in couples/*,
   so it never touches readiness, the kitten, or your partner's view. */
const TITLES=['Seedling','Apprentice','Explorer','Builder','Scholar','Strategist','Architect','Legend'];
const SK=['#f6d5b8','#e8b98f','#c68c5f','#9a6240','#6b4129'],HC=['#2b1d17','#5a3a22','#a0622d','#d8a24a','#8a8a8a','#c0396b'],OC=['#e0457b','#1f9d8f','#7a5cff','#f2b134','#3b82f6','#24203b','#d9622b','#2f6f6a'];
const HS=['wolf','short','long','bun','curly','scarf','cap'],AC=['none','shades','headband','glasses','flower','headphones'];
const STARTERS=['Quran','Arabic','Strength / workout','Learn something','No doom-scrolling'];
let ctx,P=null,loaded=false,saveT,uidK='';
const $=id=>document.getElementById(id);
const clamp=x=>Math.max(0,Math.min(1,x));
const mk=()=>({step:0,name:'',av:{s:1,h:1,hs:'wolf',o:6,ac:'none',v2:1},tasks:[],days:{},goals:[],wk:{},wins:[],sub:'today',start:ctx.todayStr(),feel:''});
const uid=()=>ctx.me().uid;
const rid=()=>Math.random().toString(36).slice(2,8);
function mon(){const d=new Date();d.setDate(d.getDate()-((d.getDay()+6)%7));return ctx.fmt(d)}
function save(){try{localStorage.setItem(uidK,JSON.stringify(P))}catch(e){}clearTimeout(saveT);saveT=setTimeout(()=>ctx.updateDoc(ctx.doc(ctx.db,'users',uid()),{p25:JSON.stringify(P)}).catch(()=>{}),1200)}
async function load(){uidK='p25_'+uid();try{P=JSON.parse(localStorage.getItem(uidK))}catch(e){}
 try{const s=await ctx.getDoc(ctx.doc(ctx.db,'users',uid()));const r=s.data()&&s.data().p25;if(r){const q=JSON.parse(r);if(!P||(q.step>=99&&!(P.step>=99))||JSON.stringify(q).length>=JSON.stringify(P).length)P=q}}catch(e){}
 P=P||mk();if(P.av&&!P.av.v2){P.av.v2=1;P.av.hs='wolf';save()}loaded=true;draw()}
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

let AVN=0;
const lvl=n=>n>=12?4:n>=8?3:n>=4?2:n>=1?1:0;
const RE_W=/work\s?out|gym|strength|lift|train|exercise|fitness/i,RE_A=/arabic|عرب/i;
function tcount(re){const ds=ctx.lastDays(14);let n=0,has=false;for(const t of P.tasks){const l=t.link&&t.link.k==='h'&&hab(t.link.id);if(!(re.test(t.t)||(l&&re.test(l.name))))continue;has=true;for(const d of ds)if(isDone(t,d))n++}return{n,has}}
function traits(){const a=tcount(RE_W),b=tcount(RE_A);return{s:lvl(a.n),sn:a.n,sh:a.has,c:lvl(b.n),cn:b.n,ch:b.has}}
const mir=d=>d.replace(/(-?\d*\.?\d+)[ ,](-?\d*\.?\d+)/g,(m,x,y)=>(200-x)+' '+y);

/* A full character: shoulders, torso, arms, neck, jaw, hair. str 0-4 = body (workout ticks), conf 0-4 = posture + face (Arabic ticks),
   w = 0..1 how worn down (missed days), stage = overall level. */
function avatar(a,w,stage,size=210,str=1,conf=2){
 const u=++AVN,G='#8c8c96',mx=(c,t)=>mix(c,G,t),
  skin=mx(SK[a.s],w*.5),skinD=mix(skin,'#3b1d12',.26),
  hair=mx(HC[a.h],w*.4),hairD=mix(hair,'#000000',.34),hairL=mix(hair,'#ffffff',.26),
  out=mx(OC[a.o],w*.7),out2=mix(out,'#000000',.2),outL=mix(out,'#ffffff',.24),cream=mx('#f6ead0',w*.6),gold=mx('#f2b134',w*.6),ink='#2a2238',
  sw=40+str*4,wa=33+str,nk=8+str*1.3,aw=8+str*1.4,bl=str*1.1,
  hunch=conf===0?3:0,sag=Math.round(w*6)+hunch,sy=162+hunch+Math.round(w*4),ny=148+hunch+Math.round(w*3),
  tilt=w>.3?-(w*7):conf>=3?2:conf===0?-3:0,tf=`translate(0 ${sag}) rotate(${tilt.toFixed(1)} 100 128)`,
  L=100-sw,R=100+sw,top=sy-3,bot=sy+64,ye=top+30-str*3,
  torso=`M${100-nk-1} ${ny} Q${100-sw*.6} ${ny+2} ${L+2} ${sy-3} Q${L-3} ${sy+1} ${L} ${sy+12} L${100-wa} 270 L${100+wa} 270 L${R} ${sy+12} Q${R+3} ${sy+1} ${R-2} ${sy-3} Q${100+sw*.6} ${ny+2} ${100+nk+1} ${ny}Z`,
  armP=xc=>`M${xc-aw} ${top} Q${xc-aw-bl} ${top+30} ${xc-aw*.72} ${bot} L${xc+aw*.72} ${bot} Q${xc+aw+bl} ${top+30} ${xc+aw} ${top}Z`,
  xl=L,xr=R,
  bg1=mx('#2d1b4e',w*.6),bg2=mx('#a8366b',w*.6),
  rb=['#ef476f','#ff8c42','#ffd166','#06d6a0'].map(c=>mx(c,w*.75));
 /* ---- scene: 70s rainbow halo ---- */
 const scene=`<defs><linearGradient id="bg${u}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
 <clipPath id="fr${u}"><rect width="200" height="240" rx="24"/></clipPath><clipPath id="tc${u}"><path d="${torso}"/></clipPath>
 <clipPath id="al${u}"><path d="${armP(xl)}"/></clipPath><clipPath id="ar${u}"><path d="${armP(xr)}"/></clipPath></defs>
 <g clip-path="url(#fr${u})"><rect width="200" height="240" fill="url(#bg${u})"/>
 ${[126,114,102,90].map((r,i)=>`<circle cx="100" cy="150" r="${r}" fill="${rb[i]}"/>`).join('')}<circle cx="100" cy="150" r="78" fill="${bg1}" opacity=".92"/>
 <g fill="#fff" opacity="${(.55-w*.4).toFixed(2)}"><circle cx="16" cy="60" r="1.6"/><circle cx="184" cy="64" r="1.6"/><circle cx="26" cy="108" r="1.2"/><circle cx="176" cy="104" r="1.2"/></g>`;
 /* ---- body ---- */
 const stripes=`<g clip-path="url(#tc${u})"><rect x="0" y="${sy+30}" width="200" height="5" fill="${cream}"/><rect x="0" y="${sy+38}" width="200" height="3" fill="${gold}"/></g>`;
 const pecs=str>=2?`<g fill="none" stroke="${out2}" stroke-linecap="round" stroke-width="2" opacity="${(.14+str*.05).toFixed(2)}"><path d="M98 ${sy+17} Q${100-sw*.34} ${sy+32} ${100-sw*.72} ${sy+15}"/><path d="M102 ${sy+17} Q${100+sw*.34} ${sy+32} ${100+sw*.72} ${sy+15}"/>${str>=3?`<path d="M100 ${sy+20} L100 ${sy+62}"/>`:''}${str>=4?`<path d="M90 ${sy+50} Q100 ${sy+54} 110 ${sy+50} M89 ${sy+62} Q100 ${sy+66} 111 ${sy+62}"/>`:''}</g>`:'';
 const arm=(xc,dir,id)=>{const k=dir<0?'al':'ar';return `<path d="${armP(xc)}" fill="${skin}"/>
  <ellipse cx="${xc-dir*aw*.15}" cy="${ye+15}" rx="${aw*.55}" ry="11" fill="${skinD}" opacity="${(.1+str*.05).toFixed(2)}"/>
  ${str>=2?`<path d="M${xc+dir*aw*.55} ${ye+4} Q${xc+dir*(aw+bl)*.9} ${ye+16} ${xc+dir*aw*.55} ${ye+30}" fill="none" stroke="${mix(skin,'#ffffff',.3)}" stroke-width="2" stroke-linecap="round" opacity=".5"/>`:''}
  <g clip-path="url(#${k}${u})"><rect x="${xc-aw-10}" y="${top-4}" width="${aw*2+20}" height="${ye-top+4}" fill="${out}"/><rect x="${xc-aw-10}" y="${ye-5}" width="${aw*2+20}" height="5" fill="${cream}"/><rect x="${xc-aw-10}" y="${ye-8}" width="${aw*2+20}" height="2" fill="${gold}"/></g>
  <circle cx="${xc}" cy="${top+7}" r="${(aw+1.5+str*.4).toFixed(1)}" fill="${out}"/><path d="M${xc-aw*.7} ${top+3} Q${xc} ${top-3} ${xc+aw*.7} ${top+3}" fill="none" stroke="${outL}" stroke-width="2" stroke-linecap="round" opacity=".6"/>`};
 const db=str>=2?`<rect x="${xl-14}" y="${bot}" width="28" height="4" rx="2" fill="#8c8c96"/><rect x="${xl-20}" y="${bot-8}" width="7" height="20" rx="2.5" fill="#3a3a46"/><rect x="${xl+13}" y="${bot-8}" width="7" height="20" rx="2.5" fill="#3a3a46"/>`:'';
 const book=stage>=2?`<rect x="${xr-4}" y="${bot-12}" width="24" height="17" rx="2" fill="${mx('#7a5cff',w*.6)}"/><rect x="${xr-1}" y="${bot-9}" width="18" height="2.5" fill="#fff" opacity=".7"/><rect x="${xr-1}" y="${bot-4}" width="12" height="2.5" fill="#fff" opacity=".5"/>`:'';
 const hands=`${db}${book}<circle cx="${xl}" cy="${bot+1}" r="${(aw*.78+1).toFixed(1)}" fill="${skin}"/><circle cx="${xr}" cy="${bot+1}" r="${(aw*.78+1).toFixed(1)}" fill="${skin}"/>`;
 const body=`<path d="${torso}" fill="${out}"/>${stripes}${pecs}${arm(xl,-1)}${arm(xr,1)}${hands}`;
 /* ---- hair ---- */
 const wolfBack=`<path d="M100 50 C70 48 55 72 56 100 C56 124 51 146 49 164 L57 157 L61 170 L68 159 L73 171 L80 150 L100 145 L120 150 L127 171 L132 159 L139 170 L143 157 L151 164 C149 146 144 124 144 100 C145 72 130 48 100 50Z" fill="${hair}"/><path d="M63 112 Q59 136 55 156 M137 112 Q141 136 145 156 M71 122 Q67 142 65 160 M129 122 Q133 142 135 160" stroke="${hairD}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>`;
 const cur='M100 58 C82 57 70 70 69 92 C68 108 70 122 76 134 C79 124 76 114 77 104 C79 92 90 76 100 58Z',lay='M70 100 C63 118 61 134 55 148 C64 142 70 132 75 120Z';
 const wolfFront=`<path d="M69 88 C64 56 82 42 100 42 C118 42 136 56 131 88 C125 68 114 61 100 61 C86 61 75 68 69 88Z" fill="${hair}"/><path d="${lay}" fill="${hair}"/><path d="${mir(lay)}" fill="${hair}"/><path d="${cur}" fill="${hair}"/><path d="${mir(cur)}" fill="${hair}"/><path d="M92 47 Q78 58 74 80 M108 47 Q122 58 126 80 M84 51 Q72 66 71 88 M116 51 Q128 66 129 88" stroke="${hairL}" stroke-width="1.7" fill="none" opacity=".6" stroke-linecap="round"/>`;
 const cap0='M72 88 C70 60 84 50 100 50 C116 50 130 60 128 88 C122 72 112 66 100 66 C88 66 78 72 72 88Z';
 let back='',front='';
 if(a.hs==='wolf'){back=wolfBack;front=wolfFront}
 else if(a.hs==='short')front=`<path d="${cap0}" fill="${hair}"/>`;
 else if(a.hs==='long'){back=`<path d="M100 52 C72 50 58 72 58 104 L56 176 Q78 182 100 176 Q122 182 144 176 L142 104 C142 72 128 50 100 52Z" fill="${hair}"/>`;front=`<path d="${cap0}" fill="${hair}"/>`}
 else if(a.hs==='bun')front=`<circle cx="100" cy="42" r="13" fill="${hair}"/><path d="${cap0}" fill="${hair}"/>`;
 else if(a.hs==='curly')front=[[74,66],[88,54],[104,52],[120,56],[130,70],[71,84],[129,88],[70,102],[130,104]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="13" fill="${hair}"/>`).join('');
 else if(a.hs==='scarf'){back=`<path d="M66 92 Q64 48 100 46 Q136 48 134 92 L138 152 Q100 168 62 152Z" fill="${out2}"/>`;front=`<path fill-rule="evenodd" d="M64 98 C62 56 86 46 100 46 C114 46 138 56 136 98 L132 148 Q100 160 68 148Z M77 86 Q77 70 100 66 Q123 70 123 86 L123 98 Q123 110 117 118 Q109 128 100 129 Q91 128 83 118 Q77 110 77 98Z" fill="${out}"/>`}
 else if(a.hs==='cap')front=`<path d="M72 80 C72 52 86 46 100 46 C114 46 128 52 128 80Z" fill="${out2}"/><rect x="70" y="78" width="60" height="6" rx="3" fill="${out2}"/><rect x="100" y="76" width="36" height="6" rx="3" fill="${out2}"/><path d="M72 82 L69 108 L76 98Z" fill="${hair}"/><path d="M128 82 L131 108 L124 98Z" fill="${hair}"/>`;
 /* ---- face ---- */
 const happy=w<.3,gx=conf===0?-1.4:0,gy=conf===0?1:0;
 const eye=cx=>happy?`<ellipse cx="${cx}" cy="93" rx="4.6" ry="${conf===0?3.2:3.6}" fill="#fff"/><circle cx="${cx+gx}" cy="${93+gy}" r="2.5" fill="${ink}"/><circle cx="${cx+gx+.8}" cy="${92+gy}" r=".8" fill="#fff"/><path d="M${cx-5} 90.6 Q${cx} 88 ${cx+5} 90.6" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`:`<path d="M${cx-5} 93 q5 ${3-w*3} 10 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
 const wb=conf===0?1.5:0,rr=conf>=3?2.2:0;
 const brows=`<path d="M80 ${85+w*2} L95 ${(84-w*3-wb).toFixed(1)}M105 ${(84-w*3-wb-rr).toFixed(1)} L120 ${(85+w*2-rr).toFixed(1)}" stroke="${hairD}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
 const sm=Math.max(-7,(1.5+conf*1.7)-w*20);
 const mouth=!happy||conf<3?`<path d="M92 112 Q100 ${(112+sm).toFixed(1)} 108 112" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:conf===3?`<path d="M92 112.5 Q100 ${(112.5+sm).toFixed(1)} 108 109.5" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`:`<path d="M91 110 Q100 ${(114+sm).toFixed(1)} 109 110 Q100 111.5 91 110Z" fill="#fff" stroke="${ink}" stroke-width="1.8" stroke-linejoin="round"/>`;
 const circles=w>.25?`<ellipse cx="88" cy="99" rx="6" ry="2.2" fill="#5b3b7a" opacity="${(w*.45).toFixed(2)}"/><ellipse cx="112" cy="99" rx="6" ry="2.2" fill="#5b3b7a" opacity="${(w*.45).toFixed(2)}"/>`:'';
 const blush=happy?`<circle cx="80" cy="103" r="5" fill="#ff8fb1" opacity=".3"/><circle cx="120" cy="103" r="5" fill="#ff8fb1" opacity=".3"/>`:'';
 const tear=w>.55?`<ellipse class="p25tear" cx="84" cy="101" rx="2.4" ry="3.6" fill="#6ec6ff"/>`:'';
 const face=`<ellipse cx="75" cy="98" rx="4.5" ry="7" fill="${skin}"/><ellipse cx="125" cy="98" rx="4.5" ry="7" fill="${skin}"/>
  <path d="M75 86 Q75 62 100 62 Q125 62 125 86 L125 98 Q125 107 119 114 Q111 126 100 127 Q89 126 81 114 Q75 107 75 98Z" fill="${skin}"/>
  <path d="M77 100 Q80 114 90 122 Q100 128 110 122 Q120 114 123 100" fill="none" stroke="${skinD}" stroke-width="1.4" opacity=".35"/>
  <path d="M100 93 L97.5 103 Q100 105 102.5 103" stroke="${skinD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".7"/>${blush}${circles}${eye(88)}${eye(112)}${brows}${mouth}${tear}`;
 let acc='';
 if(a.ac==='glasses')acc=`<g fill="none" stroke="${ink}" stroke-width="2"><circle cx="88" cy="93" r="9.5"/><circle cx="112" cy="93" r="9.5"/><path d="M97.5 92 h5"/></g>`;
 if(a.ac==='shades')acc=`<path d="M77 85 H98 Q98 104 87 104 Q77 103 77 85Z" fill="#241a12" opacity=".9"/><path d="M102 85 H123 Q123 103 113 104 Q102 104 102 85Z" fill="#241a12" opacity=".9"/><path d="M77 85 H123" stroke="#c9a14a" stroke-width="2.2"/><path d="M82 89 l5 -2 M107 89 l5 -2" stroke="#fff" stroke-width="1.6" opacity=".4" stroke-linecap="round"/>`;
 if(a.ac==='headband')acc=`<path d="M71 80 Q100 60 129 80" fill="none" stroke="${gold}" stroke-width="7" stroke-linecap="round"/><path d="M71 80 Q100 60 129 80" fill="none" stroke="${out}" stroke-width="2"/>`;
 if(a.ac==='flower')acc=`<g transform="translate(124 70)"><circle r="3" fill="#ffd76a"/>${[0,72,144,216,288].map(r=>`<circle cx="${(Math.cos(r*Math.PI/180)*6).toFixed(1)}" cy="${(Math.sin(r*Math.PI/180)*6).toFixed(1)}" r="3.4" fill="#ff8fb1"/>`).join('')}</g>`;
 if(a.ac==='headphones')acc=`<path d="M72 96 Q70 50 100 48 Q130 50 128 96" fill="none" stroke="${ink}" stroke-width="5"/><rect x="66" y="90" width="10" height="20" rx="4.5" fill="${ink}"/><rect x="124" y="90" width="10" height="20" rx="4.5" fill="${ink}"/>`;
 const crown=stage>=7?`<path d="M80 40 l6 -14 l14 10 l14 -10 l6 14Z" fill="${gold}"/>`:'';
 /* ---- neck + collar (drawn between back hair and head) ---- */
 const neck=`<path d="M${100-nk} 118 L${100-nk} ${ny+8} Q100 ${ny+16} ${100+nk} ${ny+8} L${100+nk} 118Z" fill="${skin}"/><path d="M${100-nk} 126 Q100 142 ${100+nk} 126 L${100+nk} 140 Q100 150 ${100-nk} 140Z" fill="${skinD}" opacity=".35"/><path d="M${100-nk-5} ${ny-1} Q100 ${ny+24} ${100+nk+5} ${ny-1}Z" fill="${skin}"/><path d="M${100-nk-6} ${ny-2} Q100 ${ny+26} ${100+nk+6} ${ny-2}" fill="none" stroke="${cream}" stroke-width="5" stroke-linecap="round"/><path d="M${100-nk-6} ${ny-2} Q100 ${ny+26} ${100+nk+6} ${ny-2}" fill="none" stroke="${out2}" stroke-width="1.6"/>`;
 /* ---- overlays ---- */
 const bubble=conf>=2&&w<.4?`<g><rect x="8" y="10" width="${conf>=4?78:conf===3?88:66}" height="26" rx="13" fill="${cream}"/><path d="M26 36 l5 8 l5 -8Z" fill="${cream}"/><text x="${8+(conf>=4?39:conf===3?44:33)}" y="28" font-size="14" font-weight="700" text-anchor="middle" fill="${ink}">${conf>=4?'أنا جاهز':conf===3?'كيف حالك؟':'مرحبا'}</text></g>`:'';
 const spark=str>=3&&w<.3?`<text x="${xl-18}" y="${top+20}" font-size="14" fill="${gold}">✦</text><text x="${xr+8}" y="${top+14}" font-size="12" fill="${gold}">✦</text>`:'';
 const sparkle=stage>=5&&w<.3?`<text x="168" y="30" font-size="14">✨</text>`:'';
 const cloud=w>.4?`<g opacity="${clamp(w*1.2).toFixed(2)}"><ellipse cx="100" cy="16" rx="34" ry="11" fill="#6b6b7a"/><ellipse cx="82" cy="22" rx="18" ry="9" fill="#6b6b7a"/><ellipse cx="120" cy="22" rx="18" ry="9" fill="#6b6b7a"/>${[86,100,114].map((x,i)=>`<path class="p25rain" style="animation-delay:${i*.35}s" d="M${x} 34 v8" stroke="#6ec6ff" stroke-width="2" stroke-linecap="round"/>`).join('')}</g>`:'';
 const n=Math.min(8,stage+1),gar=Array.from({length:n},(_,i)=>`<text x="${8+i*22}" y="257" font-size="${12+(i<stage?2:0)}">${w>.5?'🥀':(i<2?'🌱':i<5?'🌿':i<7?'🌷':'🌳')}</text>`).join('');
 const glow=str>=4&&conf>=4&&w<.3?'filter:drop-shadow(0 0 12px rgba(255,200,87,.7));':'';
 return `<svg viewBox="0 0 200 262" width="${size}" height="${Math.round(size*1.31)}" role="img" aria-label="Your character: strength ${str} of 4, confidence ${conf} of 4" style="max-width:100%;height:auto;${glow}">${scene}${body}
 <g transform="${tf}">${back}</g>${neck}<g transform="${tf}">${face}${front}${acc}${crown}</g>${bubble}${spark}${cloud}</g>
 <rect width="200" height="240" rx="24" fill="none" stroke="${gold}" stroke-opacity=".6" stroke-width="2"/><rect y="240" width="200" height="22" fill="${mx('#1d1330',w*.4)}"/>${gar}${sparkle}</svg>`}

const CSS=`#v-p25 .hero{position:relative;text-align:center;padding:14px 12px 16px;border-radius:26px;background:linear-gradient(165deg,#2d1b4e 0%,#5b2a66 52%,#c2486f 100%);color:#fff4e0;margin-bottom:12px;overflow:hidden;box-shadow:0 14px 34px rgba(0,0,0,.4),inset 0 0 0 2px rgba(255,200,87,.35)}
#v-p25 .hero:before{content:"";position:absolute;inset:auto 0 0 0;height:46%;background:repeating-linear-gradient(0deg,rgba(255,200,87,.14) 0 6px,transparent 6px 14px);pointer-events:none}
#v-p25 .hero>*{position:relative}
#v-p25 .hname{font-family:var(--head);font-weight:900;font-size:32px;letter-spacing:-1px;margin-top:8px;text-shadow:3px 3px 0 #e0457b,6px 6px 0 rgba(0,0,0,.28)}
#v-p25 .lvchip{display:inline-block;margin:8px 0 2px;padding:4px 14px;border-radius:999px;background:var(--gold);color:#1b1405;font-weight:800;font-size:14px;transform:rotate(-2deg);box-shadow:2px 2px 0 rgba(0,0,0,.3)}
#v-p25 .muted2,#v-p25 .hero small{color:#e8dcf5}
#v-p25 .xpb{height:14px;border-radius:9px;background:rgba(0,0,0,.35);overflow:hidden;margin:10px 4px 8px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.18)}
#v-p25 .xpb i{display:block;height:100%;border-radius:9px;background:repeating-linear-gradient(115deg,#ffc857 0 10px,#ff9f43 10px 20px);background-size:28px 100%;animation:p25flow 1.4s linear infinite}
@keyframes p25flow{to{background-position:28px 0}}
#v-p25 .mts{display:grid;gap:10px;margin:12px 0 8px;text-align:left}
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
#v-p25 .cb{width:36px;height:36px;border-radius:10px;border:1.5px solid var(--line);background:transparent;font-size:18px;color:#fff}#v-p25 .cb[aria-pressed=true]{background:var(--you);border-color:var(--you)}
#v-p25 input[type=text],#v-p25 textarea,#v-p25 select{width:100%}#v-p25 textarea{font:inherit;color:var(--ink);background:var(--card);border:1.5px solid var(--line);border-radius:10px;padding:10px}
#v-p25 .sw{width:30px;height:30px;border-radius:50%;border:2px solid var(--line);padding:0}#v-p25 .sw[aria-pressed=true]{outline:3px solid var(--gold)}
#v-p25 .ch{border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:5px 12px}#v-p25 .ch[aria-pressed=true]{background:var(--me);border-color:var(--me);color:#fff}
#v-p25 .pb{height:8px;border-radius:9px;background:var(--bg);overflow:hidden;margin:6px 0}#v-p25 .pb i{display:block;height:100%;background:linear-gradient(90deg,var(--me),var(--you))}
.p25tear{animation:p25t 2.2s infinite}@keyframes p25t{0%{transform:translateY(0);opacity:1}100%{transform:translateY(16px);opacity:0}}.p25rain{animation:p25r .9s infinite}@keyframes p25r{0%{transform:translateY(0);opacity:1}100%{transform:translateY(10px);opacity:0}}
@media(prefers-reduced-motion:reduce){#v-p25 .xpb i,#v-p25 .lvup,.p25tear,.p25rain,#v-p25 .jr i.n{animation:none}}`;

const sw=(k,arr,v,f)=>arr.map((c,i)=>`<button class="sw" data-a="av" data-k="${k}" data-v="${i}" aria-pressed="${v===i}" style="background:${c}" aria-label="${k} ${i+1}"></button>`).join('');
const chips=(k,arr,v)=>arr.map(c=>`<button class="ch" data-a="av" data-k="${k}" data-v="${c}" aria-pressed="${v===c}">${c}</button>`).join('');
function maker(){const a=P.av;return `<div style="display:grid;gap:10px;margin-top:10px"><div><small class="muted">Skin</small><div class="row">${sw('s',SK,a.s)}</div></div><div><small class="muted">Hair / headwear</small><div class="row">${chips('hs',HS,a.hs)}</div></div><div><small class="muted">Hair colour</small><div class="row">${sw('h',HC,a.h)}</div></div><div><small class="muted">Outfit</small><div class="row">${sw('o',OC,a.o)}</div></div><div><small class="muted">Extra</small><div class="row">${chips('ac',AC,a.ac)}</div></div></div>`}
const J0=new Date(2026,10,9),BD={44:21,96:22,148:23,201:24};
function wkNow(){const t=new Date();t.setHours(0,0,0,0);return Math.floor(Math.round((t-J0)/864e5)/7)+1}
function journey(){const w=wkNow();let c='';for(let i=1;i<=252;i++)c+=`<i class="${[i<w?'d':'',i===w?'n':'',BD[i]?'b':''].join(' ')}" title="Week ${i}${BD[i]?', turning '+BD[i]:''}"></i>`;
 return `<div class="pc"><div class="row" style="justify-content:space-between;align-items:baseline"><h3>${w<1?'Starts 9 Nov':'Week '+Math.min(w,252)}<small class="muted"> of 252</small></h3><small class="muted">${Math.max(0,252-Math.max(w,1))} left</small></div><div class="jr" role="img" aria-label="252 weeks, ${Math.max(0,Math.min(w-1,252))} lived">${c}</div><small class="muted" style="display:block;margin-top:8px">Each square is a week. Gold ones are your birthdays.</small></div>`}
export function p25Progress(){if(!ctx||!loaded||!P||P.step<99)return{on:false,pct:0,done:0,total:0};const d=ctx.todayStr(),total=P.tasks.length,done=P.tasks.filter(t=>isDone(t,d)).length;return{on:true,pct:total?Math.round(done/total*100):0,done,total}}
export function p25Week(){const w=wkNow();return{n:Math.min(Math.max(w,1),252),left:Math.max(0,252-Math.max(w,1))}}
function stats(){const x=xp(),lv=Math.floor(x/300)+1,st=Math.min(7,lv-1),m=miss();return{x,lv,st,m,w:clamp(m/10),title:TITLES[st],pr:(x%300)/300}}
function mood(s){if(s.m===0)return s.w===0&&streak()>=3?'Thriving 🌟':'Doing well 🙂';return s.m<=2?'A bit low…':s.m<=5?'Worn down 😔':'Miserable. Please tick something 🥺'}
const taskRow=t=>{const d=ctx.todayStr(),l=t.link&&t.link.k==='h'&&hab(t.link.id);return `<div class="tk"><button class="cb" data-a="tick" data-id="${t.id}" aria-pressed="${isDone(t,d)}" aria-label="${ctx.esc(t.t)}">${isDone(t,d)?'✓':''}</button><div style="flex:1"><b>${ctx.esc(t.t)}</b>${l?`<div class="muted" style="font-size:12px">🔗 shared with “${ctx.esc(l.name)}”: one tick counts for both</div>`:''}</div></div>`};
const linkSel=(t)=>{const o=ctx.habits().map(h=>`<option value="${h.id}" ${t.link&&t.link.id===h.id?'selected':''}>${ctx.esc(h.name)}</option>`).join('');return `<select data-a="tlink" data-id="${t.id}" aria-label="Link ${ctx.esc(t.t)}"><option value="">Personal only</option>${o}</select>`};
const goalSel=g=>{const o=ctx.goals().map(s=>`<option value="${s.id}" ${g.link&&g.link.id===s.id?'selected':''}>${ctx.esc(s.title)}</option>`).join('');return `<select data-a="glink" data-id="${g.id}" aria-label="Link goal"><option value="">Personal only</option>${o}</select>`};

function onboarding(){const s=P.step,nx=`<button class="btn" data-a="next">${s===4?'Start my 25 ✨':'Next'}</button>`,bk=s>0?`<button class="btn ghost" data-a="back">Back</button>`:'';let b='';
 if(s===0)b=`<h2>Welcome to 25 🌱</h2><p>This is <b>your own private space</b> inside our app. Your partner can’t see it, and it never changes our readiness bar or our kitten.</p><p class="muted">It’s for who you’re becoming by 25: your goals, tasks, wild cards and wins.</p>`;
 if(s===1)b=`<h2>What’s inside</h2><p><b>Today</b>: your daily ticks and your character.<br><b>Week</b>: one main quest, side quests and a wild card (something you’ve never done).<br><b>Goals</b>: who you’re becoming. Add a number or date, tick only when it’s truly you.<br><b>Wins</b>: your wall of proof.</p>`;
 if(s===2)b=`<h2>Shared things, ticked once</h2><p>If a habit or goal here is already one of our shared ones (like Workout), you can <b>link</b> it. Then one tick counts in both places, so you never tick twice. Linking is optional and you can change it anytime in <i>Today → Edit</i>.</p>`;
 if(s===3)b=`<h2>Make your character</h2><p class="muted">It grows as you do. If you stop showing up, it slowly gets sadder. 🥺</p><input type="text" data-f="name" placeholder="Character name" value="${ctx.esc(P.name)}" maxlength="20"><div style="text-align:center;margin:8px 0">${avatar(P.av,0,0,190,2,2)}</div>${maker()}`;
 if(s===4)b=`<h2>Pick your daily ticks</h2><p class="muted">Tap what you want. You can add your own later.</p><div class="row" style="margin:8px 0">${STARTERS.map(x=>`<button class="ch" data-a="starter" data-v="${ctx.esc(x)}" aria-pressed="${P.tasks.some(t=>t.t===x)}">${x}</button>`).join('')}</div>`;
 return `<div class="pc">${b}<div class="row" style="justify-content:flex-end;margin-top:14px">${bk}${nx}</div></div>`}

function today(){const s=stats(),d=ctx.todayStr(),n=P.tasks.filter(t=>isDone(t,d)).length,ed=P.editT;
 const tr=traits();if(!P.lv)P.lv={s:tr.s,c:tr.c};else if(tr.s>P.lv.s||tr.c>P.lv.c){const m=[];if(tr.s>P.lv.s)m.push('💪 Stronger! Your shoulders just levelled up.');if(tr.c>P.lv.c)m.push('🗣 More confident! Your Arabic is showing.');P.up=m.join(' ');P.upT=Date.now();P.lv={s:tr.s,c:tr.c};save()}else if(tr.s<P.lv.s||tr.c<P.lv.c){P.lv={s:tr.s,c:tr.c};save()}
 const mt=(ic,l,lv,n,has,k,words,wd)=>`<div class="mt"><div class="mt-h"><b>${ic} ${l}</b><span>${words[lv]}</span></div><div class="seg">${[1,2,3,4].map(i=>`<i class="${lv>=i?'on':''}"></i>`).join('')}</div><small>${has?`${n} ${wd} in the last 14 days. ${lv<4?'Keep showing up to level up.':'Max level. Keep it alive.'}`:`<button class="ch" data-a="addnamed" data-v="${k}">+ Add a ${k==='w'?'Workout':'Arabic'} tick</button> to grow this`}</small></div>`;
 let h=`<div class="hero">${P.up&&Date.now()-(P.upT||0)<20000?`<div class="lvup">${P.up}</div>`:''}${avatar(P.av,s.w,s.st,230,tr.s,tr.c)}<h2 class="hname">${ctx.esc(P.name||'You')}</h2><div class="lvchip">Lv ${s.lv} · ${s.title}</div><div class="muted2">${mood(s)}</div><div class="xpb"><i style="width:${Math.max(4,s.pr*100)}%"></i></div><div class="row" style="justify-content:center;gap:18px"><span>🔥 ${streak()} day streak</span><span>${s.x} XP</span></div>
 <div class="mts">${mt('💪','Strength',tr.s,tr.sn,tr.sh,'w',['Starting out','Warming up','Building','Strong','Beast mode'],'workouts')}${mt('🗣','Confidence',tr.c,tr.cn,tr.ch,'a',['Quiet','Finding words','Speaking up','Confident','Unshakable'],'Arabic days')}</div>
 ${s.m>0?`<small class="muted2">${s.m} day${s.m>1?'s':''} without a tick. ${ctx.esc(P.name||'They')} is fading.</small>`:`<small class="muted2">${n}/${P.tasks.length} ticked today</small>`}</div>
 ${journey()}
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

function draw(){drawInner();if(ctx&&ctx.badge)ctx.badge()}
function drawInner(){const el=$('v-p25');if(!el)return;if(!$('p25css')){const s=document.createElement('style');s.id='p25css';s.textContent=CSS;document.head.appendChild(s);bind(el)}
 if(!loaded||!P){el.innerHTML='<div class="pc muted">Loading your 25…</div>';return}
 sync();if(P.step<99){el.innerHTML=onboarding();return}
 const v={today,week,goals:goalsV,wins:winsV}[P.sub]();
 el.innerHTML=`<div class="sub">${[['today','🌤','Today'],['week','🗓','Week'],['goals','🎯','Goals'],['wins','🏆','Wins']].map(([k,i,l])=>`<button data-a="sub" data-v="${k}" aria-pressed="${P.sub===k}"><b aria-hidden="true">${i}</b>${l}</button>`).join('')}</div>${v}`}

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
  else if(a==='addnamed'){const nm=d.v==='w'?'Workout':'Arabic';if(!P.tasks.some(t=>t.t===nm))P.tasks.push({id:rid(),t:nm,link:null})}
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
