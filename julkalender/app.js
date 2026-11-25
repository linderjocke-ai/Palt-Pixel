(function(){
const C=window.claude||{use:async()=>null};
const A=window.ART;
/* ===================== grunddata ===================== */
const DAYS=["2026-12-01","2026-12-02","2026-12-03","2026-12-04","2026-12-07","2026-12-08","2026-12-09","2026-12-10","2026-12-11","2026-12-14","2026-12-15","2026-12-16","2026-12-17","2026-12-18"];
const WD=["söndag","måndag","tisdag","onsdag","torsdag","fredag","lördag"];
const dLabel=i=>{const d=new Date(DAYS[i]+"T12:00");return WD[d.getDay()]+" "+d.getDate()+" december"};
const dNum=i=>+DAYS[i].slice(8);
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const GRADES=[["F","Förskoleklass","Läses högt · ja/nej-frågor och rita"],["1","Årskurs 1","Korta kapitel · kryssfrågor"],["2","Årskurs 2","Kryss och korta svar"],["3","Årskurs 3","Mellanlånga kapitel"],["4","Årskurs 4","Längre kapitel · resonera"],["5","Årskurs 5","Ordförståelse och tolkning"],["6","Årskurs 6","Tolka, jämföra, reflektera"]];
const gName=g=>(GRADES.find(x=>x[0]===g)||["","Årskurs "+g])[1];
const CTYPES=[
 {id:"snall",name:"Snällkalender",sub:"Snälla uppmaningar som gör klassen varmare",ex:"Säg något snällt till den som sitter bredvid dig.",col:"#c23a2b",icon:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'},
 {id:"rorelse",name:"Fysiska rastutmaningar",sub:"En fysisk utmaning att göra på rasten, ibland med timer",ex:"Gör en snöängel på rasten!",col:"#2d5e48",icon:'<circle cx="14" cy="4.5" r="2"/><path d="M9 21l2.5-6 3 2.5V21M7 11l3-3.5 4 1 2.5 3.5M10 7.5l-1.5 6"/>'},
 {id:"kluring",name:"Kluringar",sub:"Gåtor, logik och matte – med svar att visa",ex:"Vad blir blötare och blötare ju mer den torkar?",col:"#5f4b8b",icon:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>'},
 {id:"blandat",name:"Blandat",sub:"Lite av allt – snällhet, rörelse och kluringar",ex:"Varje dag blir en överraskning.",col:"#c9762b",icon:'<path d="M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.4 6.8 19.2l1-5.9L3.5 9.2l5.9-.8z"/>'}];
const CHIP={"Snällhet":"#c23a2b","Rastutmaning":"#2d5e48","Kluring":"#5f4b8b","Matte":"#8a4a6a","Svenska":"#a8452f","SO":"#34506e","NO":"#3f6f5a"};
const DEF={v:2,onboarded:false,grade:null,n:22,names:[],theme:"byn",ctype:"blandat",opened:{},testDay:null,edits:{}};
let S=JSON.parse(JSON.stringify(DEF));
let STORY=null,LIB=null,TID=null,db=null,uid=null,tts=null,dl=null;
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
try{const c=JSON.parse(localStorage.getItem("julkalender-v1")||"null");if(c)S={...DEF,...c,edits:c.edits||{}}}catch(e){}
const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ===================== skalning ===================== */
function fit(){const k=Math.min(innerWidth/1600,innerHeight/900);document.documentElement.style.setProperty("--k",k);
  const b=document.getElementById("bdrop");if(b){const t=64*k,isF=b.classList.contains("filt");b.style.backgroundImage=isF?`url("data:image/svg+xml,${encodeURIComponent(A.wallTile)}")`:"";b.style.backgroundSize=isF?`${t}px ${t}px`:"";b.style.backgroundPosition=isF?`${(innerWidth-1600*k)/2}px ${(innerHeight-900*k)/2}px`:"";const c=$("bsnow");if(c){c.width=innerWidth;c.height=innerHeight}}}
function setBackdrop(th){const b=document.getElementById("bdrop");if(!b)return;b.className=th==="byn"?"byn":"filt";document.body.classList.toggle("th-filt",th!=="byn");fit()}
addEventListener("resize",fit);fit();
/* filtfickorna dinglar när muspekaren drar förbi */
(function(){let lx=null,lt=0;const RM=matchMedia("(prefers-reduced-motion: reduce)");
  function kick(el,amp){if(!el||RM.matches)return;const cur=el._sw;if(cur&&cur.playState==="running"&&Math.abs(el._amp||0)>Math.abs(amp)*.8)return;
    el._amp=amp;const k=[1,-.72,.5,-.34,.22,-.13,.06,0];
    el._sw=el.animate([{transform:"rotate(0deg)"}].concat(k.map(f=>({transform:`rotate(${(amp*f).toFixed(2)}deg)`}))),{duration:2200,easing:"ease-in-out"});
    el._sw.onfinish=()=>{el._amp=0}}
  addEventListener("pointermove",e=>{const now=performance.now(),dx=lx==null?0:e.clientX-lx,dt=Math.max(16,now-lt);lx=e.clientX;lt=now;
    if(e.pointerType==="touch")return;const pk=e.target.closest&&e.target.closest("#world .pk");if(!pk)return;
    const v=dx/dt;if(Math.abs(v)<.05&&pk._amp)return;
    const dir=v===0?(Math.random()<.5?-1:1):-Math.sign(v),amp=dir*Math.min(24,10+Math.abs(v)*14);
    kick(pk,amp);kick(pk.previousElementSibling&&pk.previousElementSibling.classList.contains("pk")?pk.previousElementSibling:null,amp*.35);
    kick(pk.nextElementSibling&&pk.nextElementSibling.classList.contains("pk")?pk.nextElementSibling:null,amp*.35)},{passive:true});
})();


/* ===================== datum ===================== */
function nowISO(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function dayInfo(){
  if(S.testDay!=null&&S.testDay!=="")return{idx:+S.testDay,isSchool:true,test:true};
  const t=nowISO();let idx=-1;DAYS.forEach((d,i)=>{if(d<=t)idx=i});
  return{idx,isSchool:DAYS.includes(t),before:t<DAYS[0],after:t>DAYS[13]};
}

/* ===================== luckor ===================== */
function buildLuckor(){
  const n=Math.max(1,Math.min(40,S.n|0)),base=Math.floor(n/14),extra=n%14,L=[];let k=0;
  for(let d=0;d<14;d++){
    const c=base+(Math.floor((d+1)*extra/14)>Math.floor(d*extra/14)?1:0);
    if(c===0){L.push({id:"k"+d,day:d,name:"Hela klassen",idx:null,whole:true});continue}
    for(let j=0;j<c;j++,k++){const nm=(S.names[k]||"").trim();L.push({id:"s"+k,day:d,name:nm||("Lucka "+(k+1)),idx:k,named:!!nm})}
  }
  return L;
}
const young=()=>["F","1","2","3"].includes(S.grade||"1");
function content(l){
  const i=l.idx!=null?l.idx:(100+l.day);
  const it=LK.item(S.grade||"1",S.ctype,i)||{chip:"Snällhet",text:"…",facit:null,bild:null,inter:null,id:"x"};
  const key=S.ctype+":"+l.id,ed=S.edits[key];
  return{typ:it.chip,text:ed!=null?ed:it.text,orig:it.text,svar:ed!=null?null:it.facit,bild:it.bild,inter:ed!=null?null:it.inter,lib:it.id,key,edited:ed!=null};
}
const isRich=c=>!!(c.bild||c.inter);
function state(l,D){if(S.opened[l.id])return"open";if(l.day===D.idx)return"today";if(l.day<D.idx)return"missed";return"locked"}

const HANDLING={"F": "Under en stor gran bor musen Pim. En kväll faller något glittrande ner från himlen och landar i snön alldeles i närheten. Det är en liten stjärna som heter Glimt, och hon har kommit bort. Hur tar man sig upp till himlen när man är en liten mus? Pim, ekorren Ester och haren Hoppe gör allt de kan. Men varje dag lyser Glimt lite svagare, och snart är det bråttom.", "1": "Mormor har stickat de finaste röda vantarna i hela världen. Men en dag är den ena borta! Lo och hennes kompis Love hittar spår i snön och en röd tråd som leder bort mot den mörka skogen. Vem har tagit vanten, och varför? Svaret är något helt annat än Lo någonsin hade kunnat tro.", "2": "Noor har just flyttat till Glimmerbyn, och allt är nytt och främmande. Hennes klass ska göra lyktor till den stora Ljusfesten, och Noors lykta blir den finaste av alla. Men så kommer stormen. När allt verkar förstört måste någon våga räcka upp handen och komma med en idé. Kan det verkligen bli en Ljusfest i år?", "3": "Någon smyger omkring i trappuppgången. En pappersstjärna på en dörrmatta, små hjärtan på dörrhandtagen, en pappersfågel i brevlådan. Vem är den hemliga hjälparen? Elsa och Omar bestämmer sig för att ta reda på det. De gör listor, spanar och letar ledtrådar. Men hemligheten de kommer på spåren är större än de anar.", "4": "Det börjar med en smäll. Sedan blir allt mörkt i hela byn. Ingen ström, ingen värme, inga lampor, och snöstormen bara fortsätter. Vera kan inte sluta tänka på gamla Ingrid, som bor ensam längst bort på vägen. Ingen har sett röken från hennes skorsten. Hur långt är man beredd att gå för att hjälpa någon när det är som mörkast?", "5": "En kväll vid den frusna älven hittar Lisa en hund. Den är ensam, frusen och har ett öra som hänger. Lisa vill inget hellre än att få behålla den. Men någonstans finns kanske någon som saknar den. Chippet ger ett namn och en adress, men ingen öppnar dörren. Vem är A. Holm, och varför har ingen letat efter sin hund?", "6": "Klass 6b har ett mål: 20 000 kronor till fjällresan. Ståndet på julmarknaden blir succé, med knäck, pepparkakor och varm choklad. Men dagen efter är kassaskrinet borta, och snart viskar alla om vem som har tagit det. Jonna vet något som ingen annan vet. Frågan är om hon vågar säga det."};
/* ===================== guide ===================== */
const TOUR=[[null,"Inställningar hittar du här uppe."],["klass","Klassen – byt årskurs och antal elever."],["namn","Elevernas namn – skriv in eller ändra namnen."],["utseende","Utseende – byn i snön eller filtfickorna."],["innehall","Luckornas innehåll – snällhet, rastutmaningar eller kluringar."],["forhand","Förhandsgranska – se luckor och kapitel innan eleverna gör det."]];
let tourT=null;
function startTour(){
  endTour(true);const st=$("stage");const t=document.createElement("div");t.id="tour";
  t.innerHTML=`<div class="tspot" id="tSpot"></div><div class="tcap" id="tCap"><span id="tTxt"></span><div class="tbar"><i id="tBar"></i></div><div class="trow"><span id="tNum"></span><button id="tSkip">Hoppa över</button></div></div>`;
  st.appendChild(t);$("tSkip").onclick=()=>endTour();let i=0;
  const step=()=>{
    if(i>=TOUR.length){closeOv();const sp=$("tSpot");sp.style.opacity="0";$("tTxt").textContent="Klart! Guiden finns kvar under Inställningar → Om kalendern.";$("tBar").style.transition="none";$("tBar").style.width="100%";$("tNum").textContent="";$("tSkip").textContent="Sätt igång";const c=$("tCap");c.style.left="560px";c.style.top="380px";return}
    const [tab,txt]=TOUR[i];if(tab)openSettings(tab);else if($("ovl").innerHTML)closeOv();
    setTimeout(()=>{const el=tab?document.querySelector(`.snav button[data-t="${tab}"]`):$("gearBtn");if(!el){i++;step();return}
      const k=st.getBoundingClientRect().width/1600,r=el.getBoundingClientRect(),sr=st.getBoundingClientRect();
      const x=(r.left-sr.left)/k,y=(r.top-sr.top)/k,w=r.width/k,h=r.height/k,sp=$("tSpot");
      Object.assign(sp.style,{left:x-8+"px",top:y-8+"px",width:w+16+"px",height:h+16+"px",opacity:"1"});
      const c=$("tCap");const cx=tab?x+w+40:x-480,cy=tab?y-20:y+h+30;c.style.left=Math.max(20,Math.min(1600-470,cx))+"px";c.style.top=Math.max(20,Math.min(900-170,cy))+"px";
      $("tTxt").textContent=txt;$("tNum").textContent=(i+1)+" av "+TOUR.length;
      const b=$("tBar");b.style.transition="none";b.style.width="0";void b.offsetWidth;b.style.transition="width 3.4s linear";b.style.width="100%";
      i++;tourT=setTimeout(step,3600)},tab?420:60)};
  step();
}
function endTour(quiet){clearTimeout(tourT);const t=$("tour");if(t)t.remove();if(!quiet){S.tourSeen=true;save();if($("ovl").innerHTML)closeOv()}}
/* ===================== spara ===================== */
let saveT;
function save(){
  try{localStorage.setItem("julkalender-v1",JSON.stringify(S))}catch(e){}
  clearTimeout(saveT);saveT=setTimeout(async()=>{if(!db||!uid)return;try{await db.collection("data/users/"+uid).doc("kalender").set(JSON.parse(JSON.stringify(S)))}catch(e){}},600);
}

/* ===================== data ===================== */
async function loadStory(){if(!S.grade)return;try{STORY=await (await fetch("data/"+S.grade+".json")).json()}catch(e){STORY=null}}
async function loadLib(){LIB=await LK.load()}
async function loadTid(){try{TID=await (await fetch("audio/tider.json")).json()}catch(e){TID=null}}

/* ===================== toast ===================== */
let tT;function toast(m){const t=$("toast");t.textContent=m;t.classList.add("on");clearTimeout(tT);tT=setTimeout(()=>t.classList.remove("on"),2800)}

/* ===================== snö ===================== */
let snowRAF=null;const cv=$("snow"),cx=cv.getContext("2d");const flakes=[];
for(let i=0;i<150;i++)flakes.push({x:Math.random()*1600,y:Math.random()*900,r:1+Math.random()*2.4,s:.3+Math.random()*.6,w:Math.random()*6});
const bcv=document.getElementById("bsnow"),bcx=bcv?bcv.getContext("2d"):null;const bfl=[];for(let i=0;i<160;i++)bfl.push({x:Math.random(),y:Math.random(),r:Math.random()*1.8+.6,s:Math.random()*.0012+.0006,w:Math.random()*6});
function snowOn(on){
  cancelAnimationFrame(snowRAF);cx.clearRect(0,0,1600,900);cv.style.display=on?"block":"none";if(bcx){bcx.clearRect(0,0,bcv.width,bcv.height);bcv.style.display=on?"block":"none"}if(!on)return;
  let t0=0;const step=t=>{snowRAF=requestAnimationFrame(step);if(t-t0<33)return;t0=t;cx.clearRect(0,0,1600,900);cx.fillStyle="rgba(255,255,255,.88)";
    for(const f of flakes){if(!reduce){f.y+=f.s;f.x+=Math.sin((t/1800)+f.w)*.3;if(f.y>905){f.y=-5;f.x=Math.random()*1600}}cx.beginPath();cx.arc(f.x,f.y,f.r,0,7);cx.fill()}
    if(bcx&&bcv.width>0){const W=bcv.width,H=bcv.height;bcx.clearRect(0,0,W,H);bcx.fillStyle="rgba(255,255,255,.85)";for(const f of bfl){if(!reduce){f.y+=f.s;f.x+=Math.sin((t/1800)+f.w)*.0002;if(f.y>1.01){f.y=-.01;f.x=Math.random()}}bcx.beginPath();bcx.arc(f.x*W,f.y*H,f.r,0,7);bcx.fill()}}};
  snowRAF=requestAnimationFrame(step);
}

/* ===================== ikoner ===================== */
const ICO={
 book:c=>`<svg width="44" height="38" viewBox="0 0 58 50" aria-hidden="true"><path d="M29 10C22 4 10 4 3 7v37c7-3 19-3 26 3 7-6 19-6 26-3V7c-7-3-19-3-26 3Z" fill="none" stroke="${c}" stroke-width="4" stroke-linejoin="round"/><path d="M29 10v37" stroke="${c}" stroke-width="4"/></svg>`,
 gear:`<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`,
 print:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/></svg>`,
 spk:`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>`,
 play:`<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>`,
 pause:`<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`,
 pen:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>`,
 x:`<svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>`,
 lock:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`};
const ctIcon=(t,c,sz=40)=>`<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.icon}</svg>`;

/* ===================== kalendern ===================== */
let busy=false,LCUR=[];
function topUI(L,D){
  const todays=L.filter(l=>l.day===D.idx);let line="";
  if(D.before&&!D.test){const days=Math.ceil((new Date(DAYS[0]+"T00:00")-new Date())/864e5);line=`Kalendern öppnar <b>tisdag 1 december</b> · om ${days} ${days===1?"dag":"dagar"}`}
  else if(D.after&&!D.test)line="<b>God jul och trevligt lov!</b>";
  else if(!D.isSchool&&!D.test)line=`Ingen skoldag i dag · nästa lucka öppnas <b>${D.idx<13?dLabel(D.idx+1):""}</b>`;
  else{const nm=todays.map(l=>"<b>"+esc(l.name)+"</b>");line=cap(dLabel(D.idx))+" · I dag öppnar "+(nm.length>1?nm.slice(0,-1).join(", ")+" och "+nm.slice(-1):nm[0]||"")}
  const left=D.before&&!D.test?14:DAYS.filter((d,i)=>i>D.idx).length;
  let ban="";
  if(D.test)ban=`<div class="banner">Förhandsvisar ${esc(dLabel(D.idx))}<button id="endTest">Tillbaka till dagens datum</button></div>`;
  else if(D.before)ban=`<div class="banner">Kalendern börjar den 1 december.<button id="tryTest">Förhandsgranska dag 1</button></div>`;
  return`<div class="top"><div class="ttl"><h1>Julkalendern</h1><div class="d">${line}</div></div>
  <div class="tools"><div class="count"><b>${D.after&&!D.test?"0":left===0?"Sista":left}</b><span>${left===0?"dagen!":"skoldagar kvar"}</span></div><button class="tbtn" id="kopBtn">${ICO.print}Kopieringsmaterial</button><button class="tbtn sq" id="gearBtn" aria-label="Inställningar">${ICO.gear}</button></div></div>${ban}`;
}
function chapLabel(D){const i=Math.max(0,D.idx),ch=STORY&&STORY.kapitel[i];return D.idx<0?"Kapitel 1 öppnas 1 december":ch?`Kapitel ${i+1}: ${ch.rubrik}`:""}
function render(){try{cardCleanup();cardCleanup=()=>{}}catch(e){}

  if(!S.onboarded){renderOnbBg();return}
  const L=buildLuckor(),D=dayInfo();LCUR=L;
  $("stage").dataset.theme=S.theme;
  const w=$("world");w.style.transition="none";w.style.transform="";void w.offsetWidth;w.style.transition="";
  $("fly").innerHTML="";busy=false;
  const ui=$("ui");ui.style.opacity="1";
  setBackdrop(S.theme);
  if(S.theme==="byn"){
    const r=A.bynSVG(L.map(l=>({...l,st:state(l,D)})));
    const bsz=Math.round(Math.max(22,Math.min(38,r.sc*.82)));
    w.innerHTML=`<svg class="bg" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">${r.svg}</svg><div class="hs">${r.cent.map(c=>{const st=c.l.st;return`<button class="bd ${st}" data-id="${c.l.id}" data-x="${c.x.toFixed(1)}" data-y="${c.y.toFixed(1)}" style="left:${c.x.toFixed(1)}px;top:${c.y.toFixed(1)}px;--b:${bsz}px" aria-label="${esc(c.l.name)}, ${dLabel(c.l.day)}"><span class="no">${dNum(c.l.day)}</span><span class="nm">${esc(c.l.name)}</span></button>`}).join("")}</div>`;
    ui.innerHTML=topUI(L,D)+`<button class="moonbtn" id="chBtn">${ICO.book("#1e2f5c")}<b>Dagens kapitel</b><span>${esc(chapLabel(D))}</span></button>`;
    snowOn(true);
  }else{
    const nR=L.length<=24?2:L.length<=36?3:4,y0=292,gap=nR===2?290:nR===3?196:148;
    const rows=[...Array(nR)].map((_,i)=>y0+i*gap);
    const counts=[];{let left=L.length;for(let r=0;r<nR;r++){const c=Math.ceil(left/(nR-r));counts.push(c);left-=c}}
    const per=Math.max(...counts),pw=Math.min(128,1500/per-22),ph=Math.min(gap-52,pw*1.2);
    const cols=["#b23a2e","#2f6a6a","#d39b3d","#5c6f9e","#c7703c","#7b4f7d"];
    let pk="",i=0;
    rows.forEach((ry,r)=>{for(let k=0;k<counts[r]&&i<L.length;k++,i++){const l=L[i],st=state(l,D),t=(k+.5)/counts[r],x=t*1600,y=ry+100*2*t*(1-t);
      const fs=Math.round(pw*.4);
      pk+=`<button class="pk ${st}" data-id="${l.id}" style="left:${(x-pw/2).toFixed(1)}px;top:${(y-2).toFixed(1)}px;width:${pw.toFixed(1)}px;height:${ph.toFixed(1)}px;--d:${(4.5+(i%5)*.6).toFixed(1)}s;--dl:-${(i*.7%5).toFixed(1)}s" aria-label="${esc(l.name)}, ${dLabel(l.day)}"><span class="in"><span class="pin"></span><span class="body" style="background-color:${cols[i%6]}"><span class="st"></span><b style="font-size:${fs}px">${dNum(l.day)}</b><span class="tag" style="font-size:${Math.max(13,Math.min(17,pw*.14)).toFixed(0)}px;max-width:${(pw-16).toFixed(0)}px">${esc(l.name)}</span></span>${st==="today"?'<span class="oppna">Öppna!</span>':""}</span></button>`}});
    w.innerHTML=`<svg class="bg" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">${A.filtBgSVG(rows,true)}</svg><div class="hs">${pk}</div>`;
    ui.innerHTML=topUI(L,D)+`<button class="feltbtn" id="chBtn">${ICO.book("#fff")}<span><b>Dagens kapitel</b><span>${esc(chapLabel(D))}</span></span></button>`;
    snowOn(false);
  }
  $("chBtn").onclick=()=>openReader();
  $("kopBtn").onclick=()=>openKop();
  $("gearBtn").onclick=()=>openSettings();
  if($("endTest"))$("endTest").onclick=()=>{S.testDay=null;save();render()};
  if($("tryTest"))$("tryTest").onclick=()=>{S.testDay=0;save();render()};
  w.querySelectorAll("[data-id]").forEach(b=>b.onclick=()=>{
    if(busy)return;const l=L.find(x=>x.id===b.dataset.id),D2=dayInfo(),st=state(l,D2);
    if(st==="locked"){b.classList.remove("shake");void b.offsetWidth;b.classList.add("shake");toast("Den här luckan öppnas "+dLabel(l.day));return}
    if(S.theme==="byn")zoomTo(b,l);else pullOut(b,l);
  });
}

/* ----- luckkortet ----- */
function cardHTML(l,o={}){
  const c=content(l),D=dayInfo(),rich=isRich(c);
  const who=l.whole?"Hela klassens lucka":l.named?esc(l.name)+"s lucka":esc(l.name);
  const late=!o.preview&&l.day<D.idx&&!S.opened[l.id]?" · sparad lucka":"";
  const n=c.text.length,fs=rich?(c.bild?(n<70?38:n<140?32:n<240?26:22):(n<90?40:n<180?32:26)):(n<60?50:n<110?42:n<200?34:28);
  const pic=c.bild?`<figure class="cimg"><img src="${c.bild.src}" alt="${esc(c.bild.alt)}" onerror="this.closest('.cimg').remove();this.closest('.cbody')&&this.closest('.cbody').classList.remove('withimg')"></figure>`:"";
  return`<div class="cardin${rich?" rich":""}"><div class="chead"><span class="who">${who} · ${dLabel(l.day)}${late}</span><span class="chip" style="background:${CHIP[c.typ]||"#1b2747"}">${esc(c.typ)}</span></div>
  <div class="cbody${c.bild?" withimg":""}">${pic}<div class="cmid"><h3 id="ltxt" style="font-size:${fs}px">${esc(c.text)}</h3>${c.svar?`<div class="svar hide" id="svar"><span>Svar</span>${esc(c.svar)}</div>`:""}</div></div>
  ${c.inter?`<div class="cint" id="cint"></div>`:""}
  <div class="crow" id="crow"><button class="lnk" id="edBtn">${ICO.pen}Ändra texten</button><span style="flex:1"></span>${c.svar?'<button class="btn light sm" id="showSvar" aria-pressed="false">Visa svar</button>':""}<button class="btn main" id="cClose">Klar</button></div></div>`;
}
let cardCleanup=()=>{};
function bindCard(root,l,close){
  const c=content(l);
  cardCleanup();cardCleanup=c.inter?LK.mount($("cint"),c.inter):()=>{};
  const sb=$("showSvar");
  if(sb)sb.onclick=()=>{const h=$("svar").classList.toggle("hide");sb.textContent=h?"Visa svar":"Dölj svar";sb.setAttribute("aria-pressed",String(!h))};
  $("cClose").onclick=()=>{stopAudio();cardCleanup();cardCleanup=()=>{};close()};
  $("edBtn").onclick=()=>{cardCleanup();cardCleanup=()=>{};editLucka(root,l,close)};
}
function editLucka(root,l,close){
  stopAudio();const c=content(l),h=$("ltxt");
  h.contentEditable="true";h.classList.add("editing");h.focus();
  const sel=getSelection(),rg=document.createRange();rg.selectNodeContents(h);rg.collapse(false);sel.removeAllRanges();sel.addRange(rg);
  const svar=$("svar");if(svar)svar.classList.add("hide");if($("showSvar"))$("showSvar").style.display="none";
  $("crow").innerHTML=`<span class="edhint">Skriv den nya texten direkt i luckan.</span><span style="flex:1"></span>${c.edited?'<button class="btn light" id="edReset">Återställ originalet</button>':""}<button class="btn light" id="edCancel">Avbryt</button><button class="btn main" id="edSave">Spara</button>`;
  const done=()=>{const keep=root.querySelector(".cardin");keep.outerHTML=cardHTML(l,{preview:true});bindCard(root,l,close)};
  $("edCancel").onclick=done;
  $("edSave").onclick=()=>{const t=h.innerText.replace(/\s+/g," ").trim();if(!t){toast("Luckan behöver en text");return}if(t===c.orig)delete S.edits[c.key];else S.edits[c.key]=t;save();toast("Luckan är sparad");done()};
  if($("edReset"))$("edReset").onclick=()=>{delete S.edits[c.key];save();toast("Originaltexten är tillbaka");done()};
}

/* ----- öppna: byn (kamerazoom) ----- */
function zoomTo(el,l){
  busy=true;const x=+el.dataset.x,y=+el.dataset.y,w=$("world"),sc=+(w.dataset.sc||30);
  const k=Math.max(2.2,Math.min(4,95/(parseFloat(el.style.getPropertyValue("--b"))||32)));
  $("ui").style.opacity="0";w.style.transform=`translate(${400-x*k}px,${480-y*k}px) scale(${k})`;
  setTimeout(()=>{const f=$("fly");f.innerHTML=`<div class="dim soft"></div><div class="burst"></div><div class="card byncard${isRich(content(l))?" rich":""}" id="lcard">${cardHTML(l)}</div>`;
    const card=$("lcard");requestAnimationFrame(()=>card.classList.add("on"));
    S.opened[l.id]=true;save();
    bindCard(card,l,()=>{card.classList.remove("on");f.querySelector(".dim").style.opacity="0";setTimeout(()=>{f.innerHTML="";w.style.transform="";setTimeout(()=>{render()},1050)},320)});
  },reduce?50:1050);
}
/* ----- öppna: filtfickorna (dras fram och vänds) ----- */
function pullOut(el,l){
  busy=true;const st=$("stage").getBoundingClientRect(),k=st.width/1600,body=el.querySelector(".body"),r=body.getBoundingClientRect();
  const x0=(r.left-st.left)/k,y0=(r.top-st.top)/k,w0=r.width/k,h0=r.height/k;
  const f=$("fly");
  f.innerHTML=`<div class="dim" style="opacity:0"></div><div class="flip" id="flip" style="left:${x0}px;top:${y0}px;width:${w0}px;height:${h0}px"><div class="fx"><div class="ff">${body.outerHTML}</div><div class="fb"><div class="card feltcard" id="lcard">${cardHTML(l)}</div></div></div></div>`;
  el.style.visibility="hidden";
  const fl=$("flip"),ffb=fl.querySelector(".ff .body");ffb.style.inset="0";ffb.style.position="absolute";
  S.opened[l.id]=true;save();
  requestAnimationFrame(()=>requestAnimationFrame(()=>{fl.classList.add("go");const RB=isRich(content(l))?[300,40,1000,820]:[400,170,800,560];fl.style.left=RB[0]+"px";fl.style.top=RB[1]+"px";fl.style.width=RB[2]+"px";fl.style.height=RB[3]+"px";f.querySelector(".dim").style.opacity="1";setTimeout(()=>fl.classList.add("turn"),reduce?0:560)}));
  bindCard($("lcard"),l,()=>{fl.classList.remove("turn");f.querySelector(".dim").style.opacity="0";setTimeout(()=>{fl.style.left=x0+"px";fl.style.top=y0+"px";fl.style.width=w0+"px";fl.style.height=h0+"px";setTimeout(()=>render(),820)},reduce?0:650)});
}
/* ----- förhandsvisa en lucka (lärare) ----- */
function previewLucka(l,back){
  const o=$("ovl2");o.innerHTML=`<div class="ov"><div class="card ${S.theme==="byn"?"byncard":"feltcard"} on static${isRich(content(l))?" rich":""}" id="lcard">${cardHTML(l,{preview:true})}</div></div>`;
  bindCard($("lcard"),l,()=>{o.innerHTML="";if(back)back()});
}

/* ===================== ljud ===================== */
const AU=new Audio();AU.preload="none";
let auSegs=null,auI=-1,auCb=null,auRAF=null,auSrc="";
const AUV="20261125e";
function fmtT(s){s=Math.max(0,Math.round(s||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
let TIDER=null;const tiderP=()=>TIDER?Promise.resolve(TIDER):fetch("audio/ola/tider.json?v="+AUV).then(r=>r.json()).then(j=>TIDER=j).catch(()=>null);
let hlRAF=0;
function wrapSentences(key){const T=TIDER&&TIDER[key];if(!T)return null;const els=[];
  const byP={};T.forEach((u,k)=>{(byP[u[0]]=byP[u[0]]||[]).push([u,k])});
  Object.keys(byP).forEach(pi=>{const el=pi==="-1"?$("rh"):document.querySelector('#paras p[data-p="'+pi+'"]');if(!el)return;
    if(pi==="-1"){els[byP[pi][0][1]]=el;return}
    const txt=el.textContent;let h="",pos=0;byP[pi].forEach(([u,k])=>{h+=esc(txt.slice(pos,u[1]))+'<span class="ss" data-k="'+k+'">'+esc(txt.slice(u[1],u[2]))+"</span>";pos=u[2]});h+=esc(txt.slice(pos));el.innerHTML=h;
    el.querySelectorAll(".ss").forEach(s=>els[+s.dataset.k]=s)});
  return{T,els}}
function bindListen(g,cur){const b=$("lyssna");if(!b)return;const key=g+"-"+String(cur+1).padStart(2,"0");let W=null,lastK=-1;
  tiderP().then(()=>{W=wrapSentences(key)});
  const mark=()=>{if(!W)return;const t=AU.currentTime,on=AU.src.indexOf(key+".mp3")>=0&&!AU.paused;let k=-1;
    if(on||AU.currentTime>0&&AU.src.indexOf(key+".mp3")>=0){for(let i=0;i<W.T.length;i++){if(t>=W.T[i][3]-0.15)k=i;else break}}
    if(k===lastK)return;if(lastK>=0&&W.els[lastK])W.els[lastK].classList.remove("hl");lastK=k;
    const el=k>=0&&W.els[k];if(el){el.classList.add("hl");const box=$("rtext");if(box&&el.id!=="rh"){const r=el.getBoundingClientRect(),bb=box.getBoundingClientRect();if(r.bottom>bb.bottom-40||r.top<bb.top+20)box.scrollBy({top:r.top-bb.top-bb.height*.35,behavior:"smooth"})}}};
  const loop=()=>{mark();if(!AU.paused)hlRAF=requestAnimationFrame(loop)};
  AU.onseeked=mark;const src="audio/ola/"+g+"-"+String(cur+1).padStart(2,"0")+".mp3?v="+AUV;
  const ui=()=>{const on=!AU.paused&&AU.src.indexOf(src.split("?")[0])>=0;b.classList.toggle("playing",on);b.innerHTML=(on?ICO.pause:ICO.play)+"<span>"+(on?"Pausa":(AU.currentTime>0&&AU.src.indexOf(src.split("?")[0])>=0?"Fortsätt":"Lyssna"))+"</span>";
    const f=$("lfill"),t=$("ltime");if(f&&AU.duration)f.style.width=(100*AU.currentTime/AU.duration)+"%";if(t)t.textContent=AU.duration?fmtT(AU.currentTime)+" / "+fmtT(AU.duration):""};
  AU.ontimeupdate=ui;AU.onplay=()=>{ui();cancelAnimationFrame(hlRAF);loop()};AU.onpause=()=>{ui();mark()};AU.onended=()=>{AU.currentTime=0;ui();if(lastK>=0&&W&&W.els[lastK])W.els[lastK].classList.remove("hl");lastK=-1};AU.onloadedmetadata=ui;
  b.onclick=()=>{if(AU.src.indexOf(src.split("?")[0])<0){AU.src=src;AU.preload="auto"}
    if(AU.paused)AU.play().catch(()=>toast("Ljudet kunde inte spelas"));else AU.pause()};
  const bar=b.parentNode.querySelector(".lbar");bar.onclick=e=>{if(AU.src.indexOf(src.split("?")[0])<0||!AU.duration)return;const r=bar.getBoundingClientRect();AU.currentTime=AU.duration*(e.clientX-r.left)/r.width};
  ui()}
function stopAudio(){try{AU.pause()}catch(e){}cancelAnimationFrame(hlRAF);cancelAnimationFrame(auRAF);if(auCb&&auCb.end)auCb.end();auSegs=null;auCb=null;if(tts){try{tts.stop()}catch(e){}}}
function playSegs(src,segs,cb,from=0){
  stopAudio();if(!segs||!segs.length)return false;
  auSegs=segs;auCb=cb;auI=-1;
  if(auSrc!==src){AU.src=src;auSrc=src}
  const go=()=>{AU.currentTime=segs[from][2];AU.play().then(tick).catch(()=>{toast("Ljudet kunde inte spelas");stopAudio()})};
  if(AU.readyState>=1)go();else{AU.preload="auto";AU.addEventListener("loadedmetadata",go,{once:true});AU.load()}
  return true;
}
function tick(){if(!auSegs)return;const t=AU.currentTime;let i=auSegs.findIndex(s=>t>=s[2]-.05&&t<s[3]+.6);
  if(i!==auI&&i>=0){auI=i;if(auCb&&auCb.seg)auCb.seg(auSegs[i])}
  if(t>=auSegs[auSegs.length-1][3]||AU.ended){const cb=auCb;auSegs=null;AU.pause();if(cb&&cb.end)cb.end();auCb=null;return}
  auRAF=requestAnimationFrame(tick)}
async function ttsSpeak(lines,cb){
  if(!tts){toast("Uppläsning finns inte här");return}
  stopAudio();auCb=cb;
  try{if(tts.onLine)tts.onLine(({id})=>{if(cb&&cb.seg)cb.seg(id)});await tts.speak(lines.map((t,i)=>({text:t,id:String(i),language:"sv"})),{rate:.92})}catch(e){}
  if(auCb===cb){if(cb&&cb.end)cb.end();auCb=null}
}
function playLucka(l,btn){
  if(btn.classList.contains("playing")){stopAudio();return}
  const c=content(l);const lab=btn.querySelector("span");
  const cb={end:()=>{btn.classList.remove("playing");btn.innerHTML=ICO.spk+"<span>Läs upp</span>"}};
  btn.classList.add("playing");btn.innerHTML=ICO.pause+"<span>Stoppa</span>";
  const seg=!c.edited&&TID&&TID.luckor&&TID.luckor.segs.find(s=>s[0]===c.lib&&s[1]===c.item);
  if(seg)playSegs("audio/luckor.mp3",[seg],cb);else ttsSpeak([c.text],cb);
}

/* ===================== överlägg ===================== */
function overlay(html,cls=""){
  const o=$("ovl");o.innerHTML=`<div class="ov ${cls}" id="ovBg">${html}</div>`;
  $("ovBg").addEventListener("click",e=>{if(e.target.id==="ovBg")closeOv()});
  o.querySelectorAll("[data-close]").forEach(b=>b.onclick=closeOv);
}
function closeOv(){$("ovl").innerHTML="";$("ovl2").innerHTML="";stopAudio();render()}
addEventListener("keydown",e=>{if(e.key!=="Escape")return;if($("ovl2").innerHTML){$("ovl2").innerHTML="";stopAudio();return}if($("ovl").innerHTML)closeOv()});
const X=`<button class="x" data-close aria-label="Stäng">${ICO.x}</button>`;

/* ===================== läsaren ===================== */
let rf=30;
function openReader(i,preview){
  const D=dayInfo();const max=preview?13:(D.before&&!D.test?-1:D.idx);
  if(!STORY){toast("Berättelsen laddas…");return}
  if(max<0){toast("Första kapitlet öppnas tisdag 1 december");return}
  const cur=i!=null?i:max,k=STORY.kapitel[cur],g=S.grade;
  overlay(`<div class="panel reader">${X}
   <div class="rhead"><div class="rt"><b>${esc(STORY.titel)}</b><span>${gName(g)}${preview?" · förhandsgranskning":""}</span></div>
   <div class="chs">${STORY.kapitel.map((c,j)=>`<button class="chb ${j===cur?"on":""} ${j>max?"lock":""}" data-ch="${j}" aria-label="Kapitel ${j+1}${j>max?", låst":""}">${j>max?ICO.lock:j+1}</button>`).join("")}</div></div>
   <div class="rbody"><div class="rleft"><div class="pic${A.isPhoto(g)?" wide":""}">${A.chapterSVG(g,cur)}</div>
     <div class="rk">Kapitel ${cur+1} av 14 · ${dLabel(cur)}</div><h2 data-p="-1" id="rh">${esc(k.rubrik)}</h2>
     <div class="rbar"><div class="lplay"><button id="lyssna" class="lbtn" aria-label="Lyssna på kapitlet">${ICO.play}<span>Lyssna</span></button><div class="lbar"><i id="lfill"></i></div><span id="ltime" class="ltime"></span><span class="aitag" title="Uppläsningen är en AI-röst, inte en människa">AI-röst</span></div><div class="size"><button id="fm" aria-label="Mindre text">A−</button><button id="fp" aria-label="Större text">A+</button></div></div>
     <button class="btn light" id="toKop">${ICO.print}Arbetsblad till kapitlet</button></div>
   <div class="rtext" id="rtext"><div id="paras" style="--rf:${rf}px">${k.text.map((p,j)=>`<p data-p="${j}">${esc(p)}</p>`).join("")}</div>
     <div class="rnav">${cur>0?'<button class="btn light" id="prevCh">Förra kapitlet</button>':"<span></span>"}${cur<max?'<button class="btn main" id="nextCh">Nästa kapitel</button>':""}</div></div></div></div>`,"rd");
  document.querySelectorAll(".chb").forEach(b=>b.onclick=()=>{const j=+b.dataset.ch;if(j>max){toast("Kapitel "+(j+1)+" öppnas "+dLabel(j));return}stopAudio();openReader(j,preview)});
  $("fm").onclick=()=>{rf=Math.max(22,rf-3);$("paras").style.setProperty("--rf",rf+"px")};
  $("fp").onclick=()=>{rf=Math.min(46,rf+3);$("paras").style.setProperty("--rf",rf+"px")};
  $("toKop").onclick=()=>{stopAudio();openKop(cur)};
  bindListen(g,cur);
  if($("prevCh"))$("prevCh").onclick=()=>{stopAudio();openReader(cur-1,preview)};
  if($("nextCh"))$("nextCh").onclick=()=>{stopAudio();openReader(cur+1,preview)};
}

/* ===================== kopieringsmaterial ===================== */
const EXTRA={
  "2":[["pyssel-papperslykta","Papperslykta med stjärnor","Som Dagnys lykta · mall ingår"],["pyssel-platburkslykta","Plåtburkslykta","Som morfar Yusufs · mönster ingår"]],
  "3":[["pyssel-pappersstjarna","Vik en pappersstjärna","Ett enda klipp · mall ingår"]],
  "6":[["pyssel-standet","Saker till ståndet","Knäck, pepparkakor, ljusstake, choklad, affisch"]]
};
function openKop(hl){
  if(!S.grade)return;
  const D=dayInfo(),g=S.grade,t=STORY?STORY.titel:"";
  const card=(file,title,sub,big,today)=>`<button class="kcard ${big?"big":""} ${today?"today":""}" data-f="${file}" data-n="${esc(title)}"><img src="kopiering/${g}/${file}.jpg" alt="Miniatyr av ${esc(title)}" loading="lazy"><b>${esc(title)}</b><span>${esc(sub)}</span><span class="pdf">PDF · ladda ner</span></button>`;
  let cards=`<button class="kcard big bokc" id="bokCard"><img src="bok/${g}.jpg" alt="Bokens framsida"><b>Boken</b><span>Hela berättelsen som A5-bok${"F123".includes(g)?", med plats att rita":""}</span><span class="pdf">Skriv ut som bok</span></button>`;
  cards+=card("alla-arbetsblad","Alla arbetsblad","Kapitel 1–14 i en fil",true)+card("facit","Facit","Svar till alla frågor",true);
  if(STORY)STORY.kapitel.forEach((k,i)=>{cards+=card("kapitel-"+String(i+1).padStart(2,"0"),"Kapitel "+(i+1),k.rubrik,false,hl!=null?i===hl:i===D.idx)});
  const ex=(EXTRA[g]||[]).map(e=>card(e[0],e[1],e[2],false)).join("");
  overlay(`<div class="panel kop">${X}<h2>Kopieringsmaterial</h2><div class="sub">Läsförståelse till <b>${esc(t)}</b> · ${gName(g)}. Klicka på ett blad för att ladda ner det som PDF och skriva ut.</div><div class="kscroll"><div class="kgrid">${cards}</div>${ex?`<h3 class="kh3">Pyssel och gör-det-själv</h3><div class="sub">Instruktioner och mallar till sådant som görs i berättelsen.</div><div class="kgrid">${ex}</div>`:""}</div></div>`);
  document.querySelectorAll(".kcard[data-f]").forEach(b=>b.onclick=()=>getPdf(b.dataset.f,b.dataset.n));
  $("bokCard").onclick=()=>openBok();
  const t2=document.querySelector(".kcard.today");if(t2)t2.scrollIntoView({block:"nearest"});
}
/* ===================== boken ===================== */
const GREETS=[["jul","God jul önskar"],["lov","Ha ett skönt jullov önskar"],["egen","Egen hälsning"]];
function greetText(){const n=(S.bokNamn||"").trim();if(S.bokTyp==="egen")return (S.bokEgen||"").trim()||"God jul!";const base=S.bokTyp==="lov"?"Ha ett skönt jullov":"God jul";return n?`${base} önskar ${n}!`:`${base}!`}
function openBok(){
  if(!S.bokTyp)S.bokTyp="jul";const g=S.grade,t=STORY?STORY.titel:"";
  overlay(`<div class="panel bokd">${X}<button class="bokback" id="bokBack">‹ Kopieringsmaterial</button><h2>Skriv ut boken</h2><div class="sub"><b>${esc(t)}</b> · ${gName(g)} · 14 kapitel med bilder${"F123".includes(g)?" och en ritsida till varje kapitel":""}</div>
  <div class="bokw"><div class="bokprev"><img src="bok/${g}.jpg" alt=""><div class="bokg" id="bokG"></div></div>
  <div class="bokc2"><h3>Hälsning på framsidan</h3><div class="gopts">${GREETS.map(x=>`<button data-gt="${x[0]}" class="${S.bokTyp===x[0]?"on":""}">${x[1]}${x[0]==="egen"?"":" …"}</button>`).join("")}</div>
  <div id="gIn"></div>
  <h3>Välj hur du vill skriva ut</h3>
  <button class="bokbtn main" data-k="hafte"><b>Häfte att vika</b><span>Skriv ut dubbelsidigt på A4 och vänd längs kortsidan. Vik arken på mitten, så blir det en bok. Häfta i vecket om du vill.</span></button>
  <button class="bokbtn" data-k="a5"><b>A5-sidor</b><span>Varje sida för sig, för A5-papper eller för att läsa på skärmen. Hälsningen går att ändra i PDF:en också.</span></button>
  <div class="bokst" id="bokSt"></div></div></div></div>`);
  $("bokBack").onclick=()=>openKop();
  const upd=()=>{$("bokG").textContent=greetText()};
  const inputs=()=>{$("gIn").innerHTML=S.bokTyp==="egen"?`<label class="fl">Din hälsning<input id="gE" maxlength="60" value="${esc(S.bokEgen||"")}" placeholder="God jul och tack för en fin termin!"></label>`:`<label class="fl">Ditt namn<input id="gN" maxlength="30" value="${esc(S.bokNamn||"")}" placeholder="t.ex. fröken Anna"></label>`;
    const i=$("gE")||$("gN");i.oninput=()=>{if(i.id==="gE")S.bokEgen=i.value;else S.bokNamn=i.value;upd();save()};upd()};
  document.querySelectorAll("[data-gt]").forEach(b=>b.onclick=()=>{S.bokTyp=b.dataset.gt;save();document.querySelectorAll("[data-gt]").forEach(x=>x.classList.toggle("on",x===b));inputs()});
  inputs();
  document.querySelectorAll(".bokbtn").forEach(b=>b.onclick=()=>makeBook(b.dataset.k,b));
}
let PDFLIBP=null;
function loadPdfLib(){if(PDFLIBP)return PDFLIBP;const ld=src=>new Promise((r,j)=>{const s=document.createElement("script");s.src=src;s.onload=r;s.onerror=j;document.head.appendChild(s)});PDFLIBP=ld("bok/pdf-lib.min.js").then(()=>ld("bok/fontkit.umd.min.js"));PDFLIBP.catch(()=>{PDFLIBP=null});return PDFLIBP}
async function makeBook(kind,btn){
  const st=$("bokSt");document.querySelectorAll(".bokbtn").forEach(b=>b.disabled=true);st.textContent="Boken skapas …";
  try{
    await loadPdfLib();const {PDFDocument}=window.PDFLib;const g=S.grade,text=greetText();
    const [pb,fb]=await Promise.all([fetch(`bok/${g}.pdf`).then(r=>r.arrayBuffer()),fetch("bok/fredoka.ttf").then(r=>r.arrayBuffer())]);
    const doc=await PDFDocument.load(pb);doc.registerFontkit(window.fontkit);
    const font=await doc.embedFont(fb,{subset:true,features:{liga:false,kern:false,calt:false}});
    const f=doc.getForm().getTextField("halsning");f.setText(text);
    const maxW=112*72/25.4-14;f.setFontSize(Math.max(8,Math.min(16,maxW/font.widthOfTextAtSize(text,1))));f.updateAppearances(font);
    let out;
    if(kind==="a5")out=await doc.save();
    else{doc.getForm().flatten();const flat=await PDFDocument.load(await doc.save());const n0=flat.getPageCount();
      const order=[...Array(n0-1).keys()];while((order.length+1)%4)order.push(null);order.push(n0-1);const n=order.length;
      const bk=await PDFDocument.create();const emb=await bk.embedPages(flat.getPages());const W=841.89,H=595.28;
      const put=(p,i,x)=>{if(i!=null)p.drawPage(emb[i],{x,y:0,width:W/2,height:H})};
      for(let s=0;s<n/4;s++){const a=bk.addPage([W,H]);put(a,order[n-1-2*s],0);put(a,order[2*s],W/2);const b=bk.addPage([W,H]);put(b,order[2*s+1],0);put(b,order[n-2-2*s],W/2)}
      out=await bk.save()}
    const blob=new Blob([out],{type:"application/pdf"}),name=`${STORY?STORY.titel:"Julberättelse"} – ${kind==="a5"?"bok A5":"häfte att vika"}.pdf`;
    if(dl){try{await dl.save({filename:name,data:blob});st.textContent="Klart! Boken är nedladdad."}catch(e){if(!(e&&e.code==="declined")){saveLink(URL.createObjectURL(blob),name);st.textContent="Klart! Boken är nedladdad."}else st.textContent=""}}
    else{saveLink(URL.createObjectURL(blob),name);st.textContent="Klart! Boken är nedladdad."}
  }catch(e){console.error(e);st.textContent="Det gick inte att skapa boken just nu. Försök igen om en stund."}
  document.querySelectorAll(".bokbtn").forEach(b=>b.disabled=false);
}
function saveLink(href,name){const a=document.createElement("a");a.href=href;a.download=name;document.body.appendChild(a);a.click();a.remove()}
async function getPdf(f,name){
  const url=`kopiering/${S.grade}/${f}.pdf`;
  if(dl){try{const blob=await (await fetch(url)).blob();await dl.save({filename:`${STORY?STORY.titel:"Julberättelse"} – ${name}.pdf`,data:blob});toast("PDF:en är nedladdad")}catch(e){if(e&&e.code==="declined")return;window.open(url,"_blank")}}
  else{saveLink(url,`${STORY?STORY.titel:"Julberättelse"} – ${name}.pdf`);toast("PDF:en laddas ner")}
}

/* ===================== inställningar ===================== */
let setTab="klass";
function perDayText(){const t=perDayBase();return S.n>28&&S.ctype!=="blandat"?t+" Varje innehållstyp har 28 olika luckor, så med fler elever börjar de om. Välj Blandat för 84 olika.":t}
function perDayBase(){const n=S.n;const b=Math.floor(n/14),e=n%14;if(n<14)return`${n} luckor fördelas över 14 skoldagar. Dagar utan elevlucka får en lucka för hela klassen.`;return e?`${e} dagar öppnas ${b+1} luckor, ${14-e} dagar öppnas ${b} ${b===1?"lucka":"luckor"}.`:`Varje dag öppnas ${b} ${b===1?"lucka":"luckor"}.`}
function themeCards(){return`<button class="tcard ${S.theme==="byn"?"on":""}" data-th="byn"><span class="pv">${A.miniByn()}</span><b>Byn i snön</b><span class="ds">En isometrisk miniatyrby som svävar under norrskenet. Varje fönster är en lucka – kameran zoomar in när den öppnas.</span></button>
  <button class="tcard ${S.theme==="filt"?"on":""}" data-th="filt"><span class="pv">${A.miniFilt()}</span><b>Filtfickorna</b><span class="ds">Målat som en sagobok: tovade fickor på snören mot en varm trävägg. Fickan dras fram och vänds när den öppnas.</span></button>`}
function ctypeCards(cls=""){return CTYPES.map(t=>`<button class="ccard ${cls} ${S.ctype===t.id?"on":""}" data-ct="${t.id}"><span class="ci" style="background:${t.col}">${ctIcon(t,"#fff",34)}</span><span class="ct"><b>${t.name}</b><span>${t.sub}</span><i>”${esc(t.ex)}”</i></span></button>`).join("")}
function openSettings(tab){
  if(tab)setTab=tab;
  const tabs=[["klass","Klassen"],["namn","Elevernas namn"],["utseende","Utseende"],["innehall","Luckornas innehåll"],["forhand","Förhandsgranska"],["borja","Börja om"],["om","Om kalendern"]];
  overlay(`<div class="panel set">${X}<div class="snav"><h3>Inställningar</h3>${tabs.map(t=>`<button data-t="${t[0]}" class="${t[0]===setTab?"on":""}">${t[1]}</button>`).join("")}</div><div class="sbody" id="sbody"></div></div>`);
  document.querySelectorAll(".snav button").forEach(b=>b.onclick=()=>{setTab=b.dataset.t;openSettings()});
  const sb=$("sbody");
  if(setTab==="klass"){
    sb.innerHTML=`<h2>Klassen</h2><p>Årskursen styr vilken julberättelse, vilka luckor och vilket kopieringsmaterial ni får.</p>
    <div class="gmini">${GRADES.map(g=>`<button class="${S.grade===g[0]?"on":""}" data-g="${g[0]}"><b>${g[0]}</b><span>${g[1]}</span></button>`).join("")}</div>
    <h2 class="h2s">Antal elever</h2><p>Varje elev får en egen lucka. Antalet styr hur många luckor som öppnas varje dag.</p>
    <div class="stepper dark"><button id="sm" aria-label="Färre">−</button><span class="num" id="sn">${S.n}</span><button id="sp" aria-label="Fler">+</button></div><p id="perDay"></p>`;
    sb.querySelectorAll("[data-g]").forEach(b=>b.onclick=async()=>{S.grade=b.dataset.g;save();await loadStory();openSettings()});
    const upd=()=>{$("sn").textContent=S.n;$("perDay").textContent=perDayText();save()};
    $("sm").onclick=()=>{S.n=Math.max(1,S.n-1);if(S.names.length>S.n)S.names=S.names.slice(0,S.n);upd()};
    $("sp").onclick=()=>{S.n=Math.min(40,S.n+1);upd()};upd();
  }
  if(setTab==="namn"){
    sb.innerHTML=`<h2>Elevernas namn</h2><p>Skriv ett namn per rad. Namnen hamnar på luckorna i den ordning du skriver dem. Antalet elever räknas automatiskt.</p>
    <textarea id="nm" style="height:440px" placeholder="Alva&#10;Hugo&#10;Elsa">${esc(S.names.join("\n"))}</textarea>
    <div style="display:flex;gap:14px;align-items:center"><button class="btn light" id="mix">Blanda ordningen</button><span id="nmInfo" class="muted"></span></div>`;
    const nm=$("nm"),info=()=>{const c=S.names.length;$("nmInfo").textContent=c?`${c} namn · ${c} luckor`:"Inga namn ännu – luckorna visar nummer i stället."};
    nm.oninput=()=>{S.names=nm.value.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,40);if(S.names.length)S.n=S.names.length;info();save()};
    $("mix").onclick=()=>{for(let i=S.names.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[S.names[i],S.names[j]]=[S.names[j],S.names[i]]}nm.value=S.names.join("\n");save();toast("Ordningen är blandad")};info();
  }
  if(setTab==="utseende"){
    sb.innerHTML=`<h2>Utseende</h2><p>Välj hur kalendern ska se ut. Du kan byta när du vill.</p><div class="tcards in">${themeCards()}</div>`;
    sb.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{S.theme=b.dataset.th;save();openSettings()});
  }
  if(setTab==="innehall"){
    sb.innerHTML=`<h2>Luckornas innehåll</h2><p>Välj vad luckorna ska innehålla. Texterna anpassas efter stadiet (${LK.stadie(S.grade||"1").replace("-","–")}). Egna ändringar sparas för varje innehållstyp.</p><div class="ccards in">${ctypeCards("lite")}</div>`;
    sb.querySelectorAll("[data-ct]").forEach(b=>b.onclick=()=>{S.ctype=b.dataset.ct;save();openSettings()});
  }
  if(setTab==="forhand"){
    const L=buildLuckor();const t=CTYPES.find(x=>x.id===S.ctype);
    sb.innerHTML=`<h2>Förhandsgranska</h2><p>Titta på allt i förväg. Det du tittar på här räknas inte som öppnat.</p>
    <div class="pvrow"><button class="btn main" id="pvStory">${ICO.book("#fff")}Läs hela berättelsen</button><label class="sel">Visa kalendern som<select id="td"><option value="">dagens datum</option>${DAYS.map((d,i)=>`<option value="${i}" ${String(S.testDay)===String(i)?"selected":""}>${cap(dLabel(i))}</option>`).join("")}</select></label></div>
    <h2 class="h2s">Alla luckor · ${t?t.name:""}</h2><p>Klicka på en lucka för att se den. I luckan kan du trycka på <b>Ändra texten</b> och skriva en egen.</p>
    <div class="llist">${L.map(l=>{const c=content(l);return`<button class="li" data-lid="${l.id}"><span class="ld">${dNum(l.day)}/12</span><span class="ln">${esc(l.name)}</span><span class="chip sm" style="background:${CHIP[c.typ]||"#1b2747"}">${esc(c.typ)}</span><span class="lt">${esc(c.text)}</span>${c.edited?'<span class="led">Ändrad</span>':""}</button>`}).join("")}</div>`;
    $("pvStory").onclick=()=>{if(!STORY){toast("Välj årskurs först");return}openReader(0,true)};
    $("td").onchange=e=>{S.testDay=e.target.value===""?null:+e.target.value;save();toast(S.testDay==null?"Kalendern följer dagens datum":"Förhandsvisar "+dLabel(S.testDay))};
    sb.querySelectorAll("[data-lid]").forEach(b=>b.onclick=()=>{const l=L.find(x=>x.id===b.dataset.lid);const top=sb.scrollTop;previewLucka(l,()=>{openSettings("forhand");$("sbody").scrollTop=top})});
  }
  if(setTab==="borja"){
    sb.innerHTML=`<h2>Börja om</h2><p>Stäng alla luckor igen, till exempel efter att du har provat kalendern.</p><div><button class="btn light" id="rs">Stäng alla luckor</button></div>
    <h2 class="h2s">Egna lucktexter</h2><p>Ta bort alla texter du har ändrat och gå tillbaka till originalen.</p><div><button class="btn light" id="re">Återställ alla lucktexter</button></div>
    <h2 class="h2s">Gör om startguiden</h2><p>Välj årskurs, elever, utseende och innehåll från början. Namnen du skrivit finns kvar.</p><div><button class="btn red" id="ro">Starta guiden igen</button></div>`;
    $("rs").onclick=()=>{S.opened={};save();toast("Alla luckor är stängda")};
    $("re").onclick=()=>{S.edits={};save();toast("Alla lucktexter är återställda")};
    $("ro").onclick=()=>{S.onboarded=false;save();$("ovl").innerHTML="";onbStep=0;render();showOnb()};
  }
  if(setTab==="om"){
    sb.innerHTML=`<h2>Om julkalendern</h2>
    <div class="about"><div class="pp"><span class="ppmark"><svg width="54" height="54" viewBox="0 0 3 3" aria-hidden="true"><rect width="1" height="1" fill="#ffd27a"/><rect x="1" width="1" height="1" fill="#c23a2b"/><rect x="2" width="1" height="1" fill="#ffd27a"/><rect y="1" width="1" height="1" fill="#c23a2b"/><rect x="1" y="1" width="1" height="1" fill="#f7f1e6"/><rect x="2" y="1" width="1" height="1" fill="#2d5e48"/><rect y="2" width="1" height="1" fill="#ffd27a"/><rect x="1" y="2" width="1" height="1" fill="#2d5e48"/><rect x="2" y="2" width="1" height="1" fill="#c23a2b"/></svg></span><div><b>Utvecklad av Palt &amp; pixel</b><span>Digitala verktyg för klassrummet.</span><a href="https://paltpixel.se" target="_blank" rel="noopener">paltpixel.se</a></div></div>
    <p>En digital julkalender för förskoleklass till årskurs 6, med en följetong i fjorton kapitel, läsförståelse som kopieringsmaterial och en lucka för varje elev.</p>
    <p>Berättelserna har en icke-konfessionell inriktning och handlar om glädje, gemenskap, mod, omsorg och empati.</p>
    <p>Alla berättelser finns inlästa. Tryck på Lyssna i läsaren.</p><p><b>Skapat med AI:</b> Berättelserna, arbetsbladen och luckornas uppgifter är skrivna med hjälp av AI (Claude) och granskade av en lärare. Bilderna i åk 2–6 är ritade med hjälp av AI. Uppläsningen är en AI-röst (Ola från ElevenLabs), inte en människa.</p><button class="btn light" id="tourAgain">Visa guiden till inställningarna igen</button></div>`;
    $("tourAgain").onclick=()=>{closeOv();setTimeout(startTour,300)};
  }
}

/* ===================== startguiden ===================== */
let onbStep=0,nameMode=null;
function renderOnbBg(){
  $("stage").dataset.theme="onb";$("ui").innerHTML="";$("ui").style.opacity="1";$("fly").innerHTML="";
  const w=$("world");w.style.transform="";w.innerHTML=`<svg class="bg" viewBox="0 0 1600 900" xmlns="http://www.w3.org/2000/svg">${A.onbSVG()}</svg>`;setBackdrop("byn");snowOn(true);
}
function showOnb(){
  const o=$("onb");if(S.onboarded){o.innerHTML="";return}
  const N=5,dots=`<div class="dots">${[...Array(N)].map((_,i)=>`<i class="${i<=onbStep?"on":""}"></i>`).join("")}</div>`;
  let h="",wcls="";
  if(onbStep===0){const gi=GRADES.find(g=>g[0]===S.grade);
    h=`${dots}<h1>Välkommen till julkalendern!</h1><p class="lead">Vilken årskurs går dina elever i? Då anpassar vi julberättelsen, luckorna och kopieringsmaterialet.</p>
    <div class="grades">${GRADES.map(g=>`<button class="${S.grade===g[0]?"on":""}" data-g="${g[0]}"><b>${g[0]}</b><span>${g[0]==="F"?"Förskolekl.":"Åk "+g[0]}</span></button>`).join("")}</div>
    <p class="gsel">${gi?`<b>${gi[1]}</b> · ${gi[2]}`:"Klicka på en årskurs."}</p>
    <div class="foot"><span></span><button class="go" id="next" ${S.grade?"":"disabled"}>Nästa</button></div>`}
  if(onbStep===1){
    h=`${dots}<h1>Hur många elever går i klassen?</h1><p class="lead">Varje elev får en egen lucka. Antalet styr hur många luckor som öppnas varje dag.</p>
    <div class="stepper"><button id="sm" aria-label="Färre">−</button><div class="sv"><span class="num" id="sn">${S.n}</span><span class="lab">elever</span></div><button id="sp" aria-label="Fler">+</button></div>
    <div class="choice"><button id="cNow" class="${nameMode==="now"?"on":""}">${ICO.pen}<span><b>Skriv in namnen nu</b><span>Namnen syns på luckorna</span></span></button><button id="cLater" class="${nameMode==="later"?"on":""}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><span><b>Gör det senare</b><span>Under Inställningar, när du vill</span></span></button></div>
    ${nameMode==="now"?`<div class="names"><textarea id="nm" placeholder="Skriv ett namn per rad&#10;Alva&#10;Hugo">${esc(S.names.join("\n"))}</textarea><div class="info" id="nmInfo">${S.names.length?S.names.length+" namn – antalet elever följer namnlistan":"Ett namn per rad. Antalet elever räknas automatiskt."}</div></div>`:""}
    <div class="foot"><button class="back" id="back">Tillbaka</button><button class="go" id="next" ${nameMode?"":"disabled"}>Nästa</button></div>`}
  if(onbStep===2){wcls="wide";
    h=`${dots}<h1>Hur ska kalendern se ut?</h1><p class="lead">Båda är levande men lugna. Du kan byta när du vill under Inställningar.</p><div class="tcards">${themeCards()}</div>
    <div class="foot"><button class="back" id="back">Tillbaka</button><button class="go" id="next">Nästa</button></div>`}
  if(onbStep===3){wcls="wide";
    h=`${dots}<h1>Vad ska luckorna innehålla?</h1><p class="lead">Texterna anpassas efter stadiet (${LK.stadie(S.grade||"1").replace("-","–")}). Du kan byta och ändra enskilda luckor senare.</p><div class="ccards">${ctypeCards()}</div>
    <div class="foot"><button class="back" id="back">Tillbaka</button><button class="go" id="next">Nästa</button></div>`}
  if(onbStep===4){const t=CTYPES.find(x=>x.id===S.ctype);
    h=`${dots}<h1>Allt är klart!</h1><p class="lead">${esc(gName(S.grade))} · ${S.n} elever · ${S.theme==="byn"?"Byn i snön":"Filtfickorna"} · ${t?t.name:""}</p>
    <div class="ready"><div><b>Luckorna</b><span>Dagens luckor lyser. Missade luckor kan öppnas i efterhand. Framtida luckor är låsta.</span></div><div><b>Dagens kapitel</b><span>${STORY?"”"+esc(STORY.titel)+"” – ":""}ett nytt kapitel varje skoldag.</span></div><div><b>Kopieringsmaterial</b><span>Läsförståelse till varje kapitel som PDF, plus facit. Knappen finns uppe till höger.</span></div></div>
    ${STORY&&HANDLING[S.grade]?`<div class="plot"><b>”${esc(STORY.titel)}”</b><p>${esc(HANDLING[S.grade])}</p></div>`:""}
    <div class="foot"><button class="back" id="back">Tillbaka</button><button class="go" id="next">Öppna kalendern</button></div>`}
  const gear=onbStep===1&&nameMode==="later"?`<div class="ogear"><span class="tbtn sq">${ICO.gear}<i class="ring"></i></span></div><div class="pointer"><svg width="96" height="74" viewBox="0 0 96 74" aria-hidden="true"><path d="M8 66 C34 62 64 48 80 14" stroke="#ffd27a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M66 16 82 8 84 26" stroke="#ffd27a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg><div class="bubble">Här hittar du <b>Inställningar</b>. Där kan du skriva in namnen när du vill.</div></div>`:"";
  o.innerHTML=`${gear}<div class="onbcard ${wcls}">${h}</div>`;
  const nx=$("next"),bk=$("back");
  if(bk)bk.onclick=()=>{onbStep--;showOnb()};
  if(onbStep===0){o.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{S.grade=b.dataset.g;save();loadStory();showOnb()});nx.onclick=()=>{onbStep=1;showOnb()}}
  if(onbStep===1){
    const upd=()=>{$("sn").textContent=S.n;save()};
    $("sm").onclick=()=>{S.n=Math.max(1,S.n-1);if(S.names.length>S.n)S.names=S.names.slice(0,S.n);upd();if($("nm"))$("nm").value=S.names.join("\n")};
    $("sp").onclick=()=>{S.n=Math.min(40,S.n+1);upd()};
    $("cNow").onclick=()=>{nameMode="now";showOnb();setTimeout(()=>$("nm")&&$("nm").focus(),50)};
    $("cLater").onclick=()=>{nameMode="later";showOnb()};
    if($("nm"))$("nm").oninput=e=>{S.names=e.target.value.split("\n").map(s=>s.trim()).filter(Boolean).slice(0,40);if(S.names.length)S.n=S.names.length;$("sn").textContent=S.n;$("nmInfo").textContent=S.names.length?S.names.length+" namn – antalet elever följer namnlistan":"Ett namn per rad. Antalet elever räknas automatiskt.";save()};
    nx.onclick=()=>{onbStep=2;showOnb()};
  }
  if(onbStep===2){o.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{S.theme=b.dataset.th;save();showOnb()});nx.onclick=()=>{onbStep=3;showOnb()}}
  if(onbStep===3){o.querySelectorAll("[data-ct]").forEach(b=>b.onclick=()=>{S.ctype=b.dataset.ct;save();showOnb()});nx.onclick=async()=>{if(!STORY)await loadStory();onbStep=4;showOnb()}}
  if(onbStep===4)nx.onclick=()=>{S.onboarded=true;save();o.innerHTML="";render();if(!S.tourSeen)setTimeout(startTour,900)};
}

/* ===================== start ===================== */
window.__JK={get S(){return S},render,openReader,openSettings,openKop,previewLucka,buildLuckor,showOnb,set onbStep(v){onbStep=v},set nameMode(v){nameMode=v}};
(async()=>{
  await Promise.all([loadLib(),loadStory(),loadTid()]);render();showOnb();
  const webTts=()=>{if(!("speechSynthesis" in window))return null;let lineCb=null;const pick=()=>{const v=speechSynthesis.getVoices();return v.find(x=>/^sv/i.test(x.lang))||null};
    return{onLine(f){lineCb=f},stop(){speechSynthesis.cancel()},speak(items,o={}){return new Promise(res=>{speechSynthesis.cancel();let i=0;const next=()=>{if(i>=items.length)return res();const it=items[i++];const u=new SpeechSynthesisUtterance(it.text);u.lang="sv-SE";const v=pick();if(v)u.voice=v;u.rate=o.rate||1;u.onstart=()=>{if(lineCb)lineCb({id:it.id})};u.onend=next;u.onerror=()=>res();speechSynthesis.speak(u)};next()})}}};
  C.use("tts").then(t=>{tts=t||webTts()}).catch(()=>{tts=webTts()});
  C.use("downloads").then(d=>{dl=d||null}).catch(()=>{});
  try{
    db=await C.use("db");const user=await C.use("user");
    if(db&&user&&user.id){uid=await user.id();
      const ref=db.collection("data/users/"+uid).doc("kalender");
      const snap=await ref.get();const v=snap&&(typeof snap.data==="function"?snap.data():snap);
      if(v&&v.v){S={...DEF,...v,edits:v.edits||{}};try{localStorage.setItem("julkalender-v1",JSON.stringify(S))}catch(e){}await loadStory();if(!$("ovl").innerHTML)render();showOnb()}
      else if(S.onboarded)save();
    }
  }catch(e){}
})();
})();
