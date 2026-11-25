/* =====================================================================
   Luckor: data, kortinnehåll och interaktiva komponenter
   ---------------------------------------------------------------------
   LK.load()                      hämtar data/luckor-f6.json
   LK.stadie(grade)               "F"|"1" → "F-1", "2"|"3" → "2-3", annars "4-6"
   LK.item(grade, ctype, i)       ger en normaliserad lucka (se LuckItem nedan)
   LK.mount(el, inter, facit)     monterar Flerval/Sifferinmatning/timer/stoppur/
                                  älvöverfart i el och returnerar en städfunktion
   ---------------------------------------------------------------------
   LuckItem = {
     id, kategori ("snallkalendern"|"kluringar"|"fysiska_rastutmaningar"),
     chip (kort etikett), text, facit|null,
     bild: {src, alt}|null,                       bara om bildfilen finns
     inter: {typ, specifikation}|null
   }
   ===================================================================== */
(function(){
"use strict";
const SLUG={snall:"snallkalendern",rorelse:"fysiska_rastutmaningar",kluring:"kluringar"};
const CHIP={snallkalendern:"Snällhet",fysiska_rastutmaningar:"Rastutmaning",kluringar:"Kluring"};
const MIX=["snallkalendern","fysiska_rastutmaningar","kluringar"];
let DATA=null,AVAIL=new Set();
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

async function load(){
  try{const r=await fetch("data/luckor-f6.json");if(!r.ok)throw new Error(r.status);DATA=await r.json();AVAIL=new Set((DATA.meta&&DATA.meta.tillgangligaBilder)||[])}
  catch(e){console.error("Kunde inte läsa luckdata",e);DATA=null}
  return !!DATA;
}
const stadie=g=>({F:"F-1","1":"F-1","2":"2-3","3":"2-3"}[g]||"4-6");

/* i = elevens löpnummer (0,1,2…). Luckor för hela klassen får i = 100+dag. */
function item(grade,ctype,i){
  if(!DATA)return null;
  let kat,pos;
  if(ctype==="blandat"){kat=MIX[i%3];pos=Math.floor(i/3)}else{kat=SLUG[ctype]||"snallkalendern";pos=i}
  const list=((DATA.perStadie||{})[stadie(grade)]||{})[kat]||[];
  if(!list.length)return null;
  if(i>=100)pos=list.length-1-((i-100)%list.length);   // hela klassen: tas bakifrån
  const L=list[pos%list.length];
  const b=L.bild&&AVAIL.has(L.bild.filnamn)?{src:"img/luckor/"+L.bild.filnamn.replace(/\.png$/i,".jpg"),alt:L.bild.beskrivning||""}:null;
  return{id:L.id,kategori:kat,chip:CHIP[kat],text:L.lucktext,facit:L.facit||null,bild:b,inter:L.interaktivitet||null};
}

/* ---------- tolkning av specifikationer ---------- */
function parseChoice(spec){
  const m=/Alternativ:\s*\[(.*?)\]/.exec(spec||""),r=/Rätt:\s*'([^']*)'/.exec(spec||"");
  const alts=m?[...m[1].matchAll(/'([^']*)'/g)].map(x=>x[1]):[];
  return alts.length&&r?{alts,right:r[1]}:null;
}
function parseNumber(spec){const m=/Rätt svar:\s*(-?\d+(?:[.,]\d+)?)/.exec(spec||"");return m?parseFloat(m[1].replace(",",".")):null}
function parseTimer(spec){
  spec=spec||"";let m;
  if((m=/(\d+)\s*x\s*(\d+)\s*sekunder/i.exec(spec))){const n=+m[1],s=+m[2];return[...Array(n)].map((_,k)=>({s,label:`Omgång ${k+1} av ${n}`}))}
  const main=+((/(\d+)\s*sekunder/i.exec(spec)||[])[1]||30);
  if((m=/\+\s*(\d+)\s*s\s*vila\s*x\s*(\d+)/i.exec(spec))){const rest=+m[1],n=+m[2];const P=[];for(let k=0;k<=n;k++){P.push({s:main,label:`Kör! ${k+1} av ${n+1}`});if(k<n)P.push({s:rest,label:"Vila",rest:true})}return P}
  if(/per ben/i.test(spec))return[{s:main,label:"Första benet"},{s:main,label:"Byt ben!"}];
  const lab=(/\(för\s+([^)]+)\)/i.exec(spec)||[])[1];
  return[{s:main,label:lab?lab.charAt(0).toUpperCase()+lab.slice(1):"Kör!"}];
}

/* ---------- små hjälpare ---------- */
function beep(f=880,ms=180){try{const A=window.__lkAC||(window.__lkAC=new (window.AudioContext||window.webkitAudioContext)());const o=A.createOscillator(),g=A.createGain();o.frequency.value=f;o.connect(g);g.connect(A.destination);g.gain.setValueAtTime(.18,A.currentTime);g.gain.exponentialRampToValueAtTime(.001,A.currentTime+ms/1000);o.start();o.stop(A.currentTime+ms/1000)}catch(e){}}
const fmt=s=>{s=Math.max(0,Math.ceil(s));return`${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};

/* ---------- Flerval ---------- */
function mountChoice(el,spec){
  const p=parseChoice(spec);if(!p)return null;
  el.innerHTML=`<div class="itl">Vad tror klassen?</div><div class="ich">${p.alts.map((a,k)=>`<button data-k="${k}">${esc(a)}</button>`).join("")}</div><div class="ifb" aria-live="polite"></div>`;
  const fb=el.querySelector(".ifb");
  el.querySelectorAll(".ich button").forEach(b=>b.onclick=()=>{
    const ok=p.alts[+b.dataset.k]===p.right;
    if(ok){el.querySelectorAll(".ich button").forEach(x=>{x.disabled=true;x.classList.toggle("ok",x===b)});fb.className="ifb good";fb.textContent="Rätt svar!"}
    else{b.classList.add("bad");b.disabled=true;fb.className="ifb tryagain";fb.textContent="Inte riktigt – försök igen!"}
  });
  return()=>{};
}
/* ---------- Sifferinmatning ---------- */
function mountNumber(el,spec){
  const right=parseNumber(spec);if(right==null)return null;
  el.innerHTML=`<div class="itl">Skriv klassens svar</div><form class="inum"><input type="text" inputmode="numeric" autocomplete="off" aria-label="Svar"><button type="submit">Kolla</button></form><div class="ifb" aria-live="polite"></div>`;
  const f=el.querySelector("form"),inp=f.querySelector("input"),fb=el.querySelector(".ifb");
  inp.oninput=()=>{inp.value=inp.value.replace(/[^\d,.\-]/g,"").slice(0,6);fb.textContent="";fb.className="ifb"};
  f.onsubmit=e=>{e.preventDefault();const v=parseFloat(inp.value.replace(",","."));if(isNaN(v)){fb.className="ifb tryagain";fb.textContent="Skriv ett tal först.";return}
    if(v===right){fb.className="ifb good";fb.textContent=`Rätt! Svaret är ${String(right).replace(".",",")}.`;inp.disabled=true;f.querySelector("button").disabled=true}
    else{fb.className="ifb tryagain";fb.textContent=v<right?"Nej – svaret är större. Försök igen!":"Nej – svaret är mindre. Försök igen!";inp.select()}};
  return()=>{};
}
/* ---------- Nedräkningstimer (en eller flera faser) ---------- */
function mountTimer(el,spec){
  const P=parseTimer(spec);let ph=0,left=P[0].s,run=false,last=0,raf=0;
  el.innerHTML=`<div class="itimer"><div class="tlab"></div><div class="tdig"></div><div class="tbar"><i></i></div><div class="tbtns"><button class="go">Starta</button><button class="rs">Börja om</button></div></div>`;
  const lab=el.querySelector(".tlab"),dig=el.querySelector(".tdig"),bar=el.querySelector(".tbar i"),go=el.querySelector(".go"),box=el.querySelector(".itimer");
  const draw=()=>{const p=P[ph];lab.textContent=P.length>1?p.label:(p.label||"");dig.textContent=fmt(left);bar.style.width=(100*(1-left/p.s))+"%";box.classList.toggle("rest",!!p.rest);box.classList.toggle("done",ph>=P.length-1&&left<=0)};
  const tick=t=>{if(!run)return;const dt=(t-last)/1000;last=t;left-=dt;
    if(left<=0){if(ph<P.length-1){ph++;left=P[ph].s;beep(660)}else{left=0;run=false;go.textContent="Klart!";go.disabled=true;beep(880,500);draw();return}}
    draw();raf=requestAnimationFrame(tick)};
  go.onclick=()=>{if(run){run=false;go.textContent="Fortsätt";cancelAnimationFrame(raf)}else{run=true;go.textContent="Paus";last=performance.now();raf=requestAnimationFrame(tick)}};
  el.querySelector(".rs").onclick=()=>{run=false;cancelAnimationFrame(raf);ph=0;left=P[0].s;go.textContent="Starta";go.disabled=false;draw()};
  draw();return()=>{run=false;cancelAnimationFrame(raf)};
}
/* ---------- Stoppur ---------- */
function mountStopwatch(el){
  let t=0,run=false,last=0,raf=0,best=null;
  el.innerHTML=`<div class="itimer sw"><div class="tlab">Stoppur</div><div class="tdig">0,0</div><div class="tbest"></div><div class="tbtns"><button class="go">Starta</button><button class="rs">Nollställ</button></div></div>`;
  const dig=el.querySelector(".tdig"),go=el.querySelector(".go"),bst=el.querySelector(".tbest");
  const draw=()=>{dig.textContent=t.toFixed(1).replace(".",",");bst.textContent=best!=null?`Bästa: ${best.toFixed(1).replace(".",",")} sekunder`:""};
  const tick=n=>{if(!run)return;t+=(n-last)/1000;last=n;draw();raf=requestAnimationFrame(tick)};
  go.onclick=()=>{if(run){run=false;cancelAnimationFrame(raf);go.textContent="Starta igen";if(best==null||t>best)best=t;draw()}else{if(go.textContent==="Starta igen")t=0;run=true;go.textContent="Stopp – foten i marken!";last=performance.now();raf=requestAnimationFrame(tick)}};
  el.querySelector(".rs").onclick=()=>{run=false;cancelAnimationFrame(raf);t=0;go.textContent="Starta";draw()};
  draw();return()=>{run=false;cancelAnimationFrame(raf)};
}
/* ---------- Älvöverfart: varg, get och kålhuvud ---------- */
function mountRiver(el){
  const N={varg:"Varg",get:"Get",kal:"Kålhuvud"},DEF={varg:"vargen",get:"geten",kal:"kålhuvudet"},E={varg:"🐺",get:"🐐",kal:"🥬"};
  const start=()=>({side:"L",boat:null,pos:{varg:"L",get:"L",kal:"L"},trips:0,over:null});
  let s=start(),hist=[];
  el.innerHTML=`<div class="river"><div class="bank L"><span class="bl">Den här sidan</span><div class="slots"></div></div><div class="water"><div class="boat"><span class="farmer" title="Bonden">🧑‍🌾</span><span class="cargo"></span></div></div><div class="bank R"><span class="bl">Andra sidan</span><div class="slots"></div></div></div>
<div class="rctl"><button class="row">Ro över ⇄</button><button class="undo">Ångra</button><button class="again">Börja om</button><span class="trips"></span></div><div class="ifb" aria-live="polite">Klicka på ett djur eller kålhuvudet för att lasta i båten.</div>`;
  const banks={L:el.querySelector(".bank.L .slots"),R:el.querySelector(".bank.R .slots")},boat=el.querySelector(".boat"),cargo=el.querySelector(".cargo"),fb=el.querySelector(".ifb");
  const rowB=el.querySelector(".row"),undoB=el.querySelector(".undo");
  const tok=(k,where)=>`<button class="tok" data-k="${k}" ${s.over?"disabled":""} aria-label="${N[k]}${where}"><span>${E[k]}</span><b>${N[k]}</b></button>`;
  const check=()=>{const other=s.side==="L"?"R":"L";const on=k=>s.pos[k]===other&&s.boat!==k;
    if(on("varg")&&on("get"))return"Aj då! Vargen åt upp geten när bonden var borta.";
    if(on("get")&&on("kal"))return"Aj då! Geten åt upp kålhuvudet när bonden var borta.";return null};
  const draw=()=>{
    ["L","R"].forEach(b=>banks[b].innerHTML=Object.keys(N).filter(k=>s.pos[k]===b&&s.boat!==k).map(k=>tok(k,b===s.side?", klicka för att lasta":"")).join(""));
    cargo.innerHTML=s.boat?tok(s.boat,", i båten, klicka för att lasta av"):"";
    boat.classList.toggle("right",s.side==="R");
    el.querySelectorAll(".tok").forEach(t=>t.onclick=()=>click(t.dataset.k));
    rowB.disabled=!!s.over;undoB.disabled=!hist.length;
    el.querySelector(".trips").textContent=`Antal turer: ${s.trips}`;
  };
  const snap=()=>hist.push(JSON.stringify(s));
  function click(k){if(s.over)return;
    if(s.boat===k){snap();s.boat=null;s.pos[k]=s.side;fb.className="ifb";fb.textContent=`${N[k]} kliver ur båten.`}
    else if(s.pos[k]!==s.side){fb.className="ifb tryagain";fb.textContent=`${N[k]} står på andra sidan – båten måste vara där.`;return}
    else if(s.boat){fb.className="ifb tryagain";fb.textContent="Båten är full! Bara bonden och en sak får plats.";return}
    else{snap();s.boat=k;fb.className="ifb";fb.textContent=`${N[k]} kliver i båten.`}
    draw()}
  rowB.onclick=()=>{snap();s.side=s.side==="L"?"R":"L";s.trips++;if(s.boat)s.pos[s.boat]=s.side;
    const bad=check();
    if(bad){s.over="fail";fb.className="ifb fail";fb.textContent=bad+" Tryck på Ångra eller Börja om."}
    else if(Object.keys(N).every(k=>s.pos[k]==="R")&&(!s.boat||s.side==="R")){s.boat=null;s.over="win";fb.className="ifb good";fb.textContent=`Snyggt! Alla kom över på ${s.trips} turer.${s.trips===7?" Det är det minsta möjliga!":" Går det på färre? Det minsta är 7."}`;beep(880,400)}
    else{fb.className="ifb";fb.textContent=s.boat?`Bonden ror över med ${DEF[s.boat]}.`:"Bonden ror över ensam."}
    draw()};
  undoB.onclick=()=>{if(!hist.length)return;s=JSON.parse(hist.pop());fb.className="ifb";fb.textContent="Ett steg tillbaka.";draw()};
  el.querySelector(".again").onclick=()=>{s=start();hist=[];fb.className="ifb";fb.textContent="Klicka på ett djur eller kålhuvudet för att lasta i båten.";draw()};
  draw();return()=>{};
}

const WIDGETS={"Flerval":mountChoice,"Sifferinmatning":mountNumber,"Nedräkningstimer":mountTimer,"Stoppur":mountStopwatch,"Simulering (Älvöverfart)":mountRiver};
function mount(el,inter){
  if(!el||!inter)return()=>{};
  const fn=WIDGETS[inter.typ];
  if(!fn){el.remove();return()=>{}}
  try{const c=fn(el,inter.specifikation);if(!c){el.remove();return()=>{}}return c}
  catch(e){console.error("Interaktiv del",inter,e);el.remove();return()=>{}}
}
window.LK={load,stadie,item,mount,_parse:{parseChoice,parseNumber,parseTimer}};
})();
