'use strict';
// Public page: no Auth, no storage, no demo data, no admin requests.
const form=document.querySelector('#lookup'), field=document.querySelector('#code'), button=document.querySelector('#openTask'), message=document.querySelector('#lookupError');
const config=window.ULOHOZOR_CONFIG||{};
function escapeText(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function normalizeCode(value){return value.replace(/[\s-]/g,'').toUpperCase();}
function showTask(task,code){
 const title=escapeText(task.title),body=escapeText(task.body),topic=escapeText(task.topic);
 document.querySelector('#app').innerHTML=`<section class="task-view"><a class="textbtn noprint" href="index.html">← Zadať iný kód</a><div class="eyebrow" style="margin-top:28px">${topic}</div><h1>${title}</h1><div class="row" style="margin-bottom:25px"><code>${code.match(/.{1,4}/g).join('-')}</code><span class="badge">Tvoje zadanie</span></div><article class="card"><div class="taskbody">${body}</div></article><div class="row noprint" style="margin-top:20px"><button id="printTask">Vytlačiť / uložiť PDF</button></div></section>`;
 document.querySelector('#printTask').onclick=()=>window.print();
 document.title=String(task.title)+' · Úlohozor';
}
form.addEventListener('submit',async event=>{
 event.preventDefault(); message.textContent='';
 const code=normalizeCode(field.value);
 if(!/^[A-Z0-9]{12}$/.test(code)){message.textContent='Kód má 12 písmen alebo číslic. Skontroluj, či si ho prepísal celý.';return;}
 if(!config.url||!config.key){message.textContent='Stránka zatiaľ nemá nastavené pripojenie. Oznám to učiteľovi.';return;}
 button.disabled=true;button.textContent='Otváram…';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  // apikey identifies this public app. No user session is sent or required.
  const response=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/rpc/uz_lookup',{method:'POST',headers:{apikey:config.key,'Content-Type':'application/json'},body:JSON.stringify({p_code:code}),credentials:'omit',signal:controller.signal});
  if(!response.ok)throw Error('Zadanie sa nepodarilo načítať zo servera. Skús to znova; ak chyba pretrváva, oznám to učiteľovi.');
  const task=await response.json();
  if(!task){message.textContent='Tento kód nepoznáme alebo je úloha zatiaľ skrytá. Over kód u učiteľa.';return;}
  if(typeof task.title!=='string'||typeof task.body!=='string')throw Error('Server vrátil neúplné zadanie. Oznám to učiteľovi.');
  showTask(task,code);
 }catch(error){message.textContent=error.name==='AbortError'?'Načítanie trvá príliš dlho. Skús to znova.':error.name==='TypeError'?'Nepodarilo sa pripojiť. Skontroluj internet a skús to znova.':error.message;}
 finally{clearTimeout(timeout);button.disabled=false;button.textContent='Otvoriť úlohu →';}
});
if(!config.url||!config.key)message.textContent='Stránka zatiaľ nemá nastavené pripojenie. Oznám to učiteľovi.';
