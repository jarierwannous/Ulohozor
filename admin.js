'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let topics=[],tasks=[],assignments=[],editor=[{title:'',body:'',solution:''}],pendingImport=null,busy=false,renderId=0;
const sample={topic:'Ukážková téma',subject:'Matematika',tasks:[{title:'Ukážková úloha',body:'Sem napíš zadanie úlohy.',solution:'Sem môžeš doplniť riešenie pre učiteľa.'}]};
function fmt(c){return c.match(/.{1,4}/g)?.join('-')||c}
function toast(s){$('#toast').textContent=s;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',4000)}
function download(name,text,type='application/json'){const a=document.createElement('a'),u=URL.createObjectURL(new Blob([text],{type}));a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function fail(e){toast(e.message||String(e))}
function heading(k,title,sub,extra=''){return `<div class="pagehead"><div><div class="eyebrow">${k}</div><h1>${title}</h1><p class="muted">${sub}</p></div>${extra}</div>`}
function login(){return `<div class="narrow">${heading('PRE UČITEĽA','Vitaj späť.','Prihlás sa do svojho učiteľského účtu.')}<form id="login" class="card"><div class="field"><label for="email">E-mail</label><input type="email" id="email" autocomplete="username" required></div><div class="field"><label for="password">Heslo</label><input type="password" id="password" autocomplete="current-password" required></div><button class="primary">Prihlásiť sa →</button><p class="error" id="loginError" role="alert"></p><p class="hint">Účet vytvára správca v Supabase. Prístup majú iba učitelia zapísaní v zozname administrátorov.</p></form></div>`}
function topicList(){return heading('UČITEĽSKÝ PRIESTOR','Dobré úlohy. Férové losovanie.','Vyber tému, vlož mená a nechaj náhodu rozdeliť zadania.','<a class="primary" href="#import">＋ Pridať tému</a>')+tabs('topics')+`<div class="row" style="margin-bottom:24px"><span class="badge">${topics.length} tém</span><span class="muted small">${tasks.length} úloh · ${assignments.length} uložených priradení</span></div><div class="grid">${topics.map(t=>`<article class="card topic"><div class="row" style="margin:0"><span class="badge">${esc(t.subject||'Všeobecné')}</span><span class="small muted">${t.active?'Zverejnené':'Skryté'}</span></div><h3>${esc(t.title)}</h3><p class="muted">${tasks.filter(x=>x.topic_id===t.id).length} úloh pripravených na losovanie</p><div class="row"><a class="primary" href="#topic/${t.id}">Otvoriť tému →</a><span class="small muted">${assignments.filter(x=>x.topic_id===t.id).length} priradení</span></div></article>`).join('')||'<div class="card empty">Zatiaľ tu nie sú témy. Začni importom alebo vytvorením súboru úloh.</div>'}</div>`}
function topicPage(id){const t=topics.find(x=>x.id===id);if(!t)throw Error('Téma neexistuje.');const ts=tasks.filter(x=>x.topic_id===id);return heading(esc(t.subject||'TÉMA'),esc(t.title),`${ts.length} úloh · kódy zostávajú rovnaké aj pri ďalšom priraďovaní.`,`<button id="toggle">${t.active?'Skryť pred žiakmi':'Sprístupniť žiakom'}</button>`)+tabs('topics')+`<div class="two-col"><section class="card"><span class="badge">01 / PRIPRAV SKUPINU</span><h2 style="margin-top:18px">Jedno meno alebo celá trieda</h2><form id="draw"><div class="field"><label for="group">Trieda / názov priraďovania</label><input id="group" placeholder="Napr. 2.B · október" required maxlength="100"></div><div class="field"><label for="names">Mená žiakov — každé na samostatný riadok</label><textarea id="names" placeholder="Anna Nováková\nMartin Kováč\n…" required rows="5"></textarea><div class="hint">Môžeš sem vložiť aj stĺpec mien z Excelu. Pri menovcoch doplň rozlišovací údaj.</div></div><div class="field"><label for="strategy">Spôsob rozdelenia</label><select id="strategy"><option value="balanced">Vyvážene — úlohy sa opakujú rovnomerne</option><option value="unique">Bez opakovania v tejto skupine</option><option value="random">Úplne náhodne — opakovanie je možné</option></select></div><button class="primary" id="drawBtn">✦ Roztočiť a priradiť</button><p class="hint">Celá skupina naraz, animácia približne 1,6 sekundy. Už priradené meno v rovnakej skupine si ponechá pôvodný kód.</p></form></section><section class="card"><div class="row" style="justify-content:space-between"><span class="badge">02 / ULOŽENÉ PRIRADENIA</span><button class="textbtn" id="exportAssignments">Export CSV ↓</button></div><h2 style="margin-top:18px">Kto dostal akú úlohu</h2><label for="filterGroup">Skupina</label><select id="filterGroup"><option value="">Všetky skupiny</option>${[...new Set(assignments.filter(a=>a.topic_id===id).map(a=>a.group_name))].map(g=>`<option>${esc(g)}</option>`).join('')}</select><div class="overflow" id="assignmentTable"></div></section></div><section class="card" style="margin-top:24px"><div class="row" style="justify-content:space-between"><h2>Úlohy v téme</h2><button id="exportTopic">Stiahnuť súbor úloh</button></div>${ts.map((x,i)=>`<details><summary>${i+1}. ${esc(x.title)} <code>${fmt(x.code)}</code></summary><p class="taskbody">${esc(x.body)}</p>${x.solution?`<div class="notice"><strong>Riešenie — iba pre učiteľa</strong><p style="white-space:pre-wrap;margin:8px 0 0">${esc(x.solution)}</p></div>`:''}</details>`).join('')}</section>`}
function table(id){const rows=assignments.filter(a=>a.topic_id===id&&(!$('#filterGroup').value||a.group_name===$('#filterGroup').value));$('#assignmentTable').innerHTML=rows.length?`<table><thead><tr><th>Žiak</th><th>Kód</th><th>Skupina</th></tr></thead><tbody>${rows.map(a=>`<tr><td>${esc(a.student_name)}</td><td><code>${fmt(tasks.find(t=>t.id===a.task_id)?.code||'')}</code></td><td>${esc(a.group_name)}</td></tr>`).join('')}</tbody></table>`:'<div class="empty">Tu sa zobrazia uložené priradenia.</div>'}
function csvCell(s){s=String(s??'');if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
function validate(raw){if(!raw||typeof raw.topic!=='string'||!raw.topic.trim()||raw.topic.length>200||!Array.isArray(raw.tasks)||!raw.tasks.length||raw.tasks.length>300)throw Error('Súbor musí obsahovať názov témy „topic“ a 1 až 300 úloh v „tasks“.');return {topic:raw.topic.trim(),subject:String(raw.subject||'Všeobecné').slice(0,100),tasks:raw.tasks.map((t,i)=>{if(!t||typeof t.body!=='string'||!t.body.trim()||t.body.length>30000)throw Error(`Úloha ${i+1}: chýba zadanie alebo má viac než 30 000 znakov.`);return {title:String(t.title||`Úloha ${i+1}`).slice(0,200),body:t.body.trim(),solution:String(t.solution||'').slice(0,30000)}})}}
function importPage(){return heading('KNIŽNICA ZADANÍ','Nová téma za pár kliknutí.','Najprv skontroluj úlohy. Kódy sa vytvoria automaticky pri importe.')+tabs('import')+`<div class="two-col"><section class="card"><h2>Načítať súbor úloh</h2><p class="muted">Nahraj JSON vytvorený v našom editore alebo pripravený cez ChatGPT.</p><label for="importFile">Súbor JSON (najviac 5 MB)</label><input id="importFile" type="file" accept=".json,application/json"><button id="sampleDownload" style="margin-top:15px">Stiahnuť vzor JSON ↓</button><hr class="divider"><h3>Import obyčajného textu</h3><p class="hint">Každú úlohu oddeľ riadkom s tromi pomlčkami: ---</p><label for="textTopic">Názov témy</label><input id="textTopic" placeholder="Napr. Newtonove zákony"><label for="textBody" style="margin-top:15px">Zadania úloh</label><textarea id="textBody" rows="6" placeholder="Znenie prvej úlohy…\n---\nZnenie druhej úlohy…"></textarea><button id="parseText" style="margin-top:15px">Pripraviť náhľad →</button></section><section class="card"><h2>Kontrola pred importom</h2><div id="importPreview" class="muted">Po nahratí súboru tu uvidíš jeho obsah.</div><p id="importError" class="error" role="alert"></p></section></div><div class="notice" style="margin-top:24px">PDF a Word sa automaticky nerozdeľujú na úlohy. Text vlož do editora alebo si nechaj pripraviť JSON podľa vzoru. Každý import vytvorí novú tému; staré kódy a priradenia sa nemenia.</div>`}
function editorPage(){return heading('TVORBA ÚLOH','Od nápadu k zadaniu.','Vyplň formulár, stiahni JSON a importuj ho teraz alebo neskôr.')+tabs('editor')+`<section class="card"><div class="two-col"><div><label for="editTopic">Názov témy</label><input id="editTopic" maxlength="200" placeholder="Napr. Práca a energia"></div><div><label for="editSubject">Predmet</label><input id="editSubject" value="Fyzika" maxlength="100"></div></div><div id="editorItems"></div><div class="row"><button id="addTask">＋ Pridať úlohu</button><button class="primary" id="saveFile">Stiahnuť JSON ↓</button></div><p class="hint">Zadania sú obyčajný text. Podporujú znaky ako ², √, π či Δ. Riešenia uvidí iba učiteľ. Rozpracovaný formulár sa pri odchode zo stránky neukladá.</p><div id="editError" class="error" role="alert"></div></section>`}
function renderEditor(){const container=$('#editorItems');container.innerHTML=editor.map((t,i)=>`<div class="editor-item"><div class="row" style="justify-content:space-between"><strong>Úloha ${i+1}</strong>${editor.length>1?`<button class="textbtn" data-remove="${i}">Odstrániť</button>`:''}</div><label for="et${i}">Názov</label><input id="et${i}" data-i="${i}" data-field="title" value="${esc(t.title)}" maxlength="200"><label for="eb${i}">Zadanie</label><textarea id="eb${i}" data-i="${i}" data-field="body" maxlength="30000">${esc(t.body)}</textarea><label for="es${i}">Riešenie pre učiteľa (nepovinné)</label><textarea id="es${i}" data-i="${i}" data-field="solution" maxlength="30000">${esc(t.solution)}</textarea></div>`).join('');container.querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>editor[el.dataset.i][el.dataset.field]=el.value);container.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{editor.splice(Number(el.dataset.remove),1);renderEditor()})}
const cfg=window.ULOHOZOR_CONFIG||{};
const sessionKey='uz-admin-v2:'+String(cfg.url||'');
let session=null,refreshPending=null;
try{const stored=JSON.parse(sessionStorage.getItem(sessionKey)||'null');if(stored?.access_token&&stored?.refresh_token)session=stored;}catch{}
function setSession(data){session={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+Number(data.expires_in||3600)*1000};try{sessionStorage.setItem(sessionKey,JSON.stringify(session));}catch{}}
function clearSession(){session=null;topics=[];tasks=[];assignments=[];try{sessionStorage.removeItem(sessionKey);}catch{}}
async function send(path,options={},token=null){
 if(!cfg.url||!cfg.key)throw Error('Chýba pripojenie Supabase v súbore config.js.');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
 try{
  const response=await fetch(cfg.url.replace(/\/$/,'')+path,{...options,headers:{apikey:cfg.key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...options.headers},credentials:'omit',signal:controller.signal});
  const data=await response.json().catch(()=>null);
  if(!response.ok){const error=new Error(data?.message||data?.msg||data?.error_description||'Požiadavka sa nepodarila.');error.status=response.status;throw error;}
  return data;
 }catch(error){if(error.name==='AbortError')throw Error('Server neodpovedá včas. Skús to znova.');if(error.name==='TypeError')throw Error('Nepodarilo sa pripojiť k Supabase. Skontroluj internet.');throw error;}finally{clearTimeout(timeout);}
}
async function refreshSession(){
 if(!session)throw Error('Prihlás sa do administrácie.');
 if(session.expires_at>Date.now()+30000)return;
 if(!refreshPending)refreshPending=(async()=>{try{const data=await send('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:session.refresh_token})});setSession(data);}catch(error){if(error.status===400||error.status===401||error.status===403)clearSession();throw error;}finally{refreshPending=null;}})();
 await refreshPending;
}
async function request(path,options={}){await refreshSession();try{return await send(path,options,session.access_token);}catch(error){if(error.status===401)clearSession();throw error;}}
const rpc=(name,args={})=>request('/rest/v1/rpc/'+name,{method:'POST',body:JSON.stringify(args)});
async function load(){
 const data=await Promise.all(['uz_topics','uz_tasks','uz_assignments'].map(async name=>{const result=[];for(let offset=0;;offset+=1000){const chunk=await request('/rest/v1/'+name+'?select=*&order=created_at.asc,id.asc&limit=1000&offset='+offset);result.push(...chunk);if(chunk.length<1000)return result;}}));
 [topics,tasks,assignments]=data;tasks.sort((a,b)=>a.position-b.position);
}
function tabs(active){return `<div class="tabs"><a class="${active==='topics'?'active':''}" href="#admin">Moje témy</a><a class="${active==='import'?'active':''}" href="#import">Importovať úlohy</a><a class="${active==='editor'?'active':''}" href="#editor">Vytvoriť súbor úloh</a><a href="#help">Návod</a><button class="textbtn" id="logout">Odhlásiť sa</button></div>`;}
function bindLogout(){const button=$('#logout');if(!button)return;button.onclick=async()=>{button.disabled=true;try{if(session)await send('/auth/v1/logout',{method:'POST'},session.access_token);}catch{}finally{clearSession();location.hash='admin';await renderAdmin();}};}
function helpPage(){return heading('PRE UČITEĽA','Dve stránky. Jedna databáza.','Žiak zadá iba kód. Ty spravuješ témy v administrácii.')+tabs('help')+`<section class="card"><h2>Žiacka stránka</h2><p>Žiakom pošli adresu <a href="index.html" target="_blank" rel="noopener">index.html</a>. Zadajú kód a otvorí sa zadanie, bez účtu a bez výberu témy. Funguje to aj v inom prehliadači alebo v inkognite.</p><h2>Priraďovanie úloh</h2><ol><li>Importuj JSON alebo vytvor súbor úloh v editore.</li><li>Otvor tému, zadaj názov skupiny a mená po riadkoch.</li><li>Spusti losovanie. Výsledky sa uložia do Supabase pred animáciou.</li><li>Žiaci si zapíšu kódy a otvoria index.html.</li></ol><p>Rovnaké meno v rovnakej skupine a téme si ponechá pôvodné priradenie. Pre novú sériu použi nový názov skupiny. Skrytá téma sa cez kódy neotvára.</p><p>Všetky témy a priradenia sa ukladajú do Supabase. Táto verzia nemá ukážkový režim ani lokálnu databázu. Prihlásenie učiteľa platí pre aktuálnu kartu prehliadača.</p><a href="NAVOD.md" download>Stiahnuť návod</a></section>`;}
function showLogin(){
 $('#app').innerHTML=login();const form=$('#login');
 form.onsubmit=async event=>{event.preventDefault();const button=form.querySelector('button'),errorBox=$('#loginError');button.disabled=true;errorBox.textContent='';
  try{const data=await send('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email:$('#email').value.trim(),password:$('#password').value})});setSession(data);if(!await rpc('uz_is_admin')){clearSession();throw Error('Tento účet nemá oprávnenie správcu. Skontroluj jeho zápis v uz_admins.');}await renderAdmin();}
  catch(error){errorBox.textContent=/invalid login credentials/i.test(error.message)?'Nesprávny e-mail alebo heslo.':error.message;button.disabled=false;}
 };
}
async function renderAdmin(){
 if(busy)return;
 const revision=++renderId;
 if(!cfg.url||!cfg.key){$('#app').innerHTML='<div class="card narrow"><h2>Chýba pripojenie</h2><p>Na GitHub nahraj vyplnený súbor config.js z dodaného balíka. Údaje sa do prehliadača neukladajú ako náhradná databáza.</p></div>';return;}
 if(!session){showLogin();return;}
 const [page,id]=(location.hash||'#admin').slice(1).split('/');
 try{
  if(!await rpc('uz_is_admin')){clearSession();showLogin();$('#loginError').textContent='Tento účet nemá oprávnenie administrátora.';return;}
  if(revision!==renderId)return;
  if(page==='admin'||page==='topic'||page==='')await load();
  if(revision!==renderId)return;
  if(page==='topic'){$('#app').innerHTML=topicPage(id);bindTopic(id);}
  else if(page==='import'){$('#app').innerHTML=importPage();bindImport();}
  else if(page==='editor'){editor=[{title:'',body:'',solution:''}];$('#app').innerHTML=editorPage();renderEditor();$('#addTask').onclick=()=>{if(editor.length>=300)return toast('Najviac 300 úloh.');editor.push({title:'',body:'',solution:''});renderEditor();};$('#saveFile').onclick=()=>{try{download('ulohy.json',JSON.stringify(validate({topic:$('#editTopic').value,subject:$('#editSubject').value,tasks:editor}),null,2));toast('Súbor je pripravený na import.');}catch(error){$('#editError').textContent=error.message;}};}
  else if(page==='help'||page==='setup')$('#app').innerHTML=helpPage();
  else $('#app').innerHTML=topicList();
  bindLogout();
 }catch(error){if(revision!==renderId)return;if(!session){showLogin();$('#loginError').textContent='Prihlásenie vypršalo. Prihlás sa znova.';return;}$('#app').innerHTML=`<div class="card narrow"><h2>Údaje sa nepodarilo načítať</h2><p class="error">${esc(error.message)}</p><div class="row"><button id="retry">Skúsiť znova</button><button id="logout">Odhlásiť sa</button></div></div>`;$('#retry').onclick=renderAdmin;bindLogout();}
}
function bindTopic(id){
 table(id);$('#filterGroup').onchange=()=>table(id);
 $('#toggle').onclick=async()=>{const button=$('#toggle');button.disabled=true;try{const topic=topics.find(t=>t.id===id);await rpc('uz_set_active',{p_topic:id,p_active:!topic.active});await renderAdmin();}catch(error){fail(error);button.disabled=false;}};
 $('#exportTopic').onclick=()=>{const topic=topics.find(t=>t.id===id);download('ulohozor-ulohy.json',JSON.stringify({topic:topic.title,subject:topic.subject,tasks:tasks.filter(t=>t.topic_id===id).map(({title,body,solution})=>({title,body,solution}))},null,2));};
 $('#exportAssignments').onclick=()=>{const selected=$('#filterGroup').value,rows=assignments.filter(a=>a.topic_id===id&&(!selected||a.group_name===selected));download('priradenia.csv','\uFEFF'+[['Žiak','Kód','Skupina','Úloha','Priradené'],...rows.map(a=>[a.student_name,fmt(tasks.find(t=>t.id===a.task_id)?.code||''),a.group_name,tasks.find(t=>t.id===a.task_id)?.title,a.created_at])].map(row=>row.map(csvCell).join(';')).join('\r\n'),'text/csv;charset=utf-8');};
 $('#draw').onsubmit=async event=>{
  event.preventDefault();if(busy)return;
  const group=$('#group').value.trim(),names=[...new Set($('#names').value.split('\n').map(n=>n.trim()).filter(Boolean))],strategy=$('#strategy').value,button=$('#drawBtn');
  if(!group||!names.length)return toast('Vyplň skupinu aj mená.');
  if(names.length>300||names.some(n=>n.length>150))return toast('Najviac 300 mien, každé do 150 znakov.');
  busy=true;button.disabled=true;
  try{
   const results=await rpc('uz_assign',{p_topic:id,p_group:group,p_names:names,p_strategy:strategy});
   const dialog=$('#drawDialog'),wheel=$('#wheel');$('#closeDraw').hidden=true;$('#drawStatus').textContent='Priradenia sú uložené. Odhaľujeme výsledok…';wheel.style.transition='none';wheel.style.transform='rotate(0deg)';dialog.showModal();void wheel.offsetWidth;wheel.style.transition='';wheel.style.transform='rotate(1440deg)';
   const timer=setTimeout(()=>{$('#drawStatus').textContent=`Hotovo. ${results.length} žiakov má svoj kód.`;$('#closeDraw').hidden=false;},1650);
   const finish=async()=>{clearTimeout(timer);busy=false;dialog.close();await renderAdmin();if($('#filterGroup')){$('#filterGroup').value=group;table(id);}if($('#group'))$('#group').value=group;};
   $('#closeDraw').onclick=finish;dialog.oncancel=event=>{event.preventDefault();finish();};
  }catch(error){busy=false;button.disabled=false;fail(error);}
 };
}
function bindImport(){
 pendingImport=null;
 const reset=()=>{pendingImport=null;$('#importPreview').textContent='Po nahratí súboru tu uvidíš jeho obsah.';$('#importError').textContent='';};
 $('#sampleDownload').onclick=()=>download('vzor-uloh.json',JSON.stringify(sample,null,2));
 $('#importFile').onchange=async event=>{reset();try{const file=event.target.files[0];if(!file)return;if(file.size>5*1024*1024)throw Error('Súbor je väčší než 5 MB.');previewImport(JSON.parse(await file.text()));}catch(error){$('#importError').textContent=error.message;}};
 $('#parseText').onclick=()=>{reset();try{previewImport({topic:$('#textTopic').value,subject:'Všeobecné',tasks:$('#textBody').value.split(/^\s*---\s*$/m).filter(x=>x.trim()).map((body,i)=>({title:'Úloha '+(i+1),body}))});}catch(error){$('#importError').textContent=error.message;}};
}
function previewImport(raw){
 pendingImport=validate(raw);$('#importPreview').innerHTML=`<span class="badge">${pendingImport.tasks.length} úloh</span><h3 style="margin-top:18px">${esc(pendingImport.topic)}</h3>${pendingImport.tasks.map(t=>`<details><summary>${esc(t.title)}</summary><p style="white-space:pre-wrap">${esc(t.body)}</p></details>`).join('')}<button id="confirmImport" class="primary" style="margin-top:20px">Importovať a vytvoriť kódy</button>`;
 $('#confirmImport').onclick=async()=>{const button=$('#confirmImport');button.disabled=true;try{const id=await rpc('uz_import',{p_data:pendingImport});toast('Téma je uložená v Supabase. Kódy sú pripravené.');location.hash='topic/'+id;}catch(error){$('#importError').textContent=error.message;button.disabled=false;}};
}
window.addEventListener('hashchange',renderAdmin);
renderAdmin();
