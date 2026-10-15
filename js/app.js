(()=>{'use strict';
const ADMIN_EMAIL='nachofrrd123@gmail.com',CATS=['FICHAS DE EMPLEADO','EXPEDIENTES','REGISTROS','CONFIDENCIAL','MISCELÁNEO'],PREFIX=['EMP','EXP','REG','CNF','MSC'],LEVELS=['','BÁSICO','RESTRINGIDO','CONFIDENCIAL','SECRETO','M.O.T.H.E.R'];
const $=id=>document.getElementById(id), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])), date=v=>v?String(v).slice(0,10):'—',uid=()=>crypto.randomUUID(), today=()=>new Date().toISOString().slice(0,10);
let user=null,view='login',cat=0,doc=null,formCat=0,attachments=[],registry={columns:['CAMPO','VALOR'],rows:[['001','ACTIVE']]},appConfig={},editing=false,searchTerm='';
const api=window.MotherAdapter;const readConfig=()=>api.getConfig();
api.connect();
const clearance=()=>Number(user?.clearance_level||0),isAdmin=()=>user?.role==='admin';function flash(m,bad=false){const e=$('flash');if(e){e.textContent=(bad?'ERROR :: ':'SYSTEM :: ')+m;e.className=bad?'error':'success'}}
function layout(body){document.querySelectorAll('body > #desktop-windows').forEach(node=>node.remove());$('app').innerHTML=`<header class="mast"><div><div class="eyebrow">CENTRAL ARCHIVE SYSTEM / ISOLATED TERMINAL AV_2663</div><h1>M.O.T.H.E.R<span class="blink">_</span></h1><div class="muted small">ARCHIVO DE EXPEDIENTES // INSTALACIÓN CLAUSURADA / 1976</div></div><div class="status"><strong>◌ SIGNAL DETECTED</strong>MODE: ${api.ready()?'SECURE DATABASE':'DISCONNECTED'}<br>${user?`USER: ${esc(user.email)}<br>CLEARANCE: ${clearance().toString().padStart(2,'0')} ${isAdmin()?' / ADMIN':''}`:'AUTHORIZATION REQUIRED'}</div></header><div id="flash" role="status" aria-live="polite"></div><main class="screen">${body}</main><footer><span>M.O.T.H.E.R // TERMINAL ${esc('AV_2663')}</span><span>ACTIVITY IS BEING RECORDED · <a href="#" id="crt" style="color:inherit">TOGGLE CRT</a></span></footer>`;$('crt').onclick=e=>{e.preventDefault();document.body.classList.toggle('no-crt');localStorage.setItem('mother_no_crt',document.body.classList.contains('no-crt')?'1':'0')}}
if(localStorage.getItem('mother_no_crt')==='1')document.body.classList.add('no-crt');
const nav=()=>`<nav class="utility-nav"><button data-nav="home">← ESCRITORIO</button><button data-nav="logout">CERRAR SESIÓN ↗</button></nav>`;
function wireNav(){document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>go(b.dataset.nav));document.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{cat=+b.dataset.cat;go('category')})}
async function fetchDocs(){if(!user)throw Error('AUTHORIZATION REQUIRED');return api.listDocuments()}
async function getDoc(id){if(!user)throw Error('AUTHORIZATION REQUIRED');return api.getDocument(id)}
async function fetchOwnAllDocs(){if(!isAdmin())throw Error('ACCESS DENIED');return api.listAdminDocuments()}
function splash(){
 document.body.classList.add('boot-screen');
 layout(`<section class="boot" id="boot" aria-label="Secuencia de arranque"><div class="boot-head">[BOOT SEQUENCE INITIATED]</div><div class="boot-dim">M.O.T.H.E.R // AV_2663</div><div id="boot-lines"></div><div class="boot-bar" id="boot-progress" style="--progress:0%"></div><div class="boot-dim" id="boot-percent">INITIALIZING... 0%</div><span class="boot-cursor" aria-hidden="true"></span></section><div class="actions"><button id="skip">[ OMITIR INTRO ]</button></div>`);
 const lines=['[LOADING ENVIRONMENT...]','> TERMINAL LOCAL INICIADO','> ARCHIVO CENTRAL: AV_2663','> PROTOCOLOS DE ACCESO CARGADOS','', '[!] INFORMACIÓN RESTRINGIDA. ACCESO SUJETO A AUTORIZACIÓN.'];
 let step=0,progress=0,finished=false,handle;
 function finish(){if(finished)return;finished=true;clearTimeout(handle);document.body.classList.remove('boot-screen');go('login')}
 function tick(){if(finished)return;if(step<lines.length){const d=document.createElement('div');d.textContent=lines[step++];$('boot-lines').appendChild(d)}progress=Math.min(100,progress+10);$('boot-progress').style.setProperty('--progress',progress+'%');$('boot-percent').textContent='INICIALIZANDO ARCHIVO... '+progress+'%';if(progress>=100){handle=setTimeout(finish,900)}else{handle=setTimeout(tick,305)}}
 $('skip').onclick=finish;
 handle=setTimeout(tick,480)
}
function go(s){if(!user&&s!=='login'){loginPage();return}view=s;if(s==='login'){loginPage();return}if(!user){loginPage();return}if(s==='logout'){logout();return}if(s==='home')home();if(s==='category')categoryPage();if(s==='search')searchPage();if(s==='admin'&&isAdmin())admin();if(s==='users'&&isAdmin())usersPage();if(s==='adminDocs'&&isAdmin())adminDocs();if(s==='create'&&isAdmin())formPage();if(s==='config'&&isAdmin())configPage()}
function loginPage(){
 document.body.classList.remove('boot-screen');user=null;view='login';
 layout(`<div class="login box"><h2>IDENTITY VERIFICATION</h2><p class="muted small">ACCESO A EXPEDIENTES ÚNICAMENTE MEDIANTE CUENTA AUTORIZADA.</p><form id="loginform"><div class="field"><label for="email">CORREO ELECTRÓNICO</label><input id="email" type="email" autocomplete="email" required></div><div class="field"><label for="password">CLAVE DE ACCESO</label><input id="password" type="password" autocomplete="current-password" required></div><div class="actions"><button class="primary" type="submit">[ INICIAR SESIÓN ]</button><button type="button" id="signup">[ CREAR CUENTA ]</button></div></form><p class="muted small">EL REGISTRO REQUIERE CONFIRMACIÓN POR CORREO Y APROBACIÓN POSTERIOR DEL ADMINISTRADOR.</p>${!api.ready()?'<p class="error small">CONEXIÓN NO CONFIGURADA. ACCESO BLOQUEADO.</p><button id="setup">[ CONFIGURAR SUPABASE ]</button>':''}</div>`);
 $('loginform').onsubmit=async e=>{e.preventDefault();if(!api.ready())return flash('SUPABASE NO CONFIGURADO',true);const btn=e.submitter;btn.disabled=true;try{const authUser=await api.login($('email').value.trim(),$('password').value);await sessionToUser(authUser)}catch(err){flash(err.message,true)}finally{if(btn.isConnected)btn.disabled=false}};
 $('signup').onclick=registerPage;
 if($('setup'))$('setup').onclick=setupPage;
}
function registerPage(){
 view='register';
 layout(`<div class="login box"><h2>USER REGISTRATION</h2><p class="muted small">LA CREACIÓN DE UNA CUENTA NO CONCEDE ACCESO A LOS ARCHIVOS. EL ADMINISTRADOR DEBE AUTORIZAR EL CORREO Y EL NIVEL 1-5.</p><form id="registerform"><div class="field"><label for="regemail">CORREO ELECTRÓNICO</label><input id="regemail" type="email" autocomplete="email" required></div><div class="field"><label for="regpass">CONTRASEÑA (MÍNIMO 8 CARACTERES)</label><input id="regpass" type="password" minlength="8" autocomplete="new-password" required></div><div class="field"><label for="regconfirm">REPETIR CONTRASEÑA</label><input id="regconfirm" type="password" minlength="8" autocomplete="new-password" required></div><div class="actions"><button type="submit" class="primary">[ SOLICITAR REGISTRO ]</button><button type="button" id="back-login">[ VOLVER ]</button></div></form></div>`);
 $('back-login').onclick=loginPage;
 $('registerform').onsubmit=async e=>{e.preventDefault();if(!api.ready())return flash('SUPABASE NO CONFIGURADO',true);const pass=$('regpass').value;if(pass!==$('regconfirm').value)return flash('LAS CONTRASEÑAS NO COINCIDEN',true);const btn=e.submitter;btn.disabled=true;try{await api.register($('regemail').value.trim().toLowerCase(),pass,location.origin+location.pathname);$('registerform').reset();flash('SOLICITUD RECIBIDA. REVISA TU CORREO PARA CONFIRMAR LA CUENTA. UN ADMINISTRADOR DEBE AUTORIZARTE PARA ACCEDER.')}catch(err){flash(err.message,true)}finally{btn.disabled=false}};
}
function setupPage(){layout(`<div class="box login"><h2>DATABASE CONFIGURATION</h2><p class="warning">Introduce únicamente URL de proyecto y ANON/PUBLISHABLE KEY. Jamás introduzcas SERVICE_ROLE_KEY.</p><form id="dbform"><div class="field"><label>SUPABASE PROJECT URL</label><input id="url" type="url" required placeholder="https://xxxxx.supabase.co"></div><div class="field"><label>PUBLISHABLE / ANON KEY</label><input id="key" required placeholder="sb_publishable_... / eyJ..."></div><button type="submit">[ CONNECT ]</button> <button type="button" id="back">ATRÁS</button></form><p class="muted small">Antes de conectar, ejecuta schema.sql en el SQL Editor de Supabase y crea tu usuario administrador.</p></div>`);$('dbform').onsubmit=e=>{e.preventDefault();try{api.configure($('url').value.trim(),$('key').value.trim());loginPage()}catch(e){flash(e.message,true)}};$('back').onclick=loginPage}
async function sessionToUser(authUser){
 try{user=await api.getAuthorizedProfile(authUser);go('home')}
 catch(err){await api.logout().catch(()=>{});loginPage();flash(err.message,true)}
}
async function logout(){await api.logout();user=null;go('login')}
function home(){layout(`<div class="eyebrow">CENTRAL MEMORY / USER WORKSTATION</div><h2>TERMINAL DESKTOP // AV_2663</h2><section class="desktop" id="desktop"><div class="desktop-head"><span><strong>M.O.T.H.E.R</strong> / SISTEMA CENTRAL DE ARCHIVOS</span><span>OPERATOR: ${esc(user?.email||'UNKNOWN')} // LVL ${clearance()}</span></div><div class="desktop-icons">${CATS.map((c,i)=>`<button class="desktop-entry" data-deskcat="${i}" title="Abrir ${c}"><span class="glyph" aria-hidden="true"></span><span class="entry-title">${c}</span><span class="entry-index">0${i+1} / ${PREFIX[i]}</span></button>`).join('')}<button class="desktop-entry" data-desksearch="1"><span class="glyph" aria-hidden="true"></span><span class="entry-title">BUSCAR</span><span class="entry-index">06 / QUERY</span></button>${isAdmin()?`<button class="desktop-entry" data-deskadmin="1"><span class="glyph" aria-hidden="true"></span><span class="entry-title">ADMINISTRACIÓN</span><span class="entry-index">99 / ROOT</span></button>`:''}</div><div class="desktop-note"><strong>ARCHIVOS NO RELACIONADOS // DESCARGO DE RESPONSABILIDAD</strong>LA ORGANIZACIÓN NO ASUME RESPONSABILIDAD POR LAS CONSECUENCIAS DEL VISIONADO, COPIA O DIFUSIÓN DEL CONTENIDO. EL OPERADOR ASUME LOS RIESGOS DE SU CONSULTA Y DIVULGACIÓN.</div><div class="desktop-foot"><span>NODE 07 / MEMORY INTEGRITY: UNVERIFIED</span><span>SELECT DIRECTORY TO RETRIEVE</span></div><div class="desktop-windows" id="desktop-windows"></div><div class="desktop-taskbar" id="desktop-taskbar"><span style="font:16px var(--font-terminal);color:#84bc8e">WORKSPACE 00 //</span></div></section>`);document.body.appendChild($('desktop-windows'));wireNav();document.querySelectorAll('[data-deskcat]').forEach(b=>b.onclick=()=>openDesktopWindow('cat',+b.dataset.deskcat));document.querySelector('[data-desksearch]')?.addEventListener('click',()=>openDesktopWindow('search'));document.querySelector('[data-deskadmin]')?.addEventListener('click',()=>openDesktopWindow('admin'));}
let desktopSerial=0;
async function openDesktopWindow(kind,index=0){const desktop=$('desktop'),host=$('desktop-windows'),bar=$('desktop-taskbar');if(!desktop||!host)return;const id='dw-'+(++desktopSerial),title=kind==='cat'?CATS[index]:kind==='search'?'BÚSQUEDA CENTRAL':'SYSTEM ADMINISTRATION';const el=document.createElement('section');el.className='desktop-window';el.id=id;el.setAttribute('aria-label',title);el.innerHTML=`<div class="desktop-titlebar"><span>AV_2663 // ${esc(title)}</span><span class="window-controls"><button data-min title="Minimizar" aria-label="Minimizar">_</button><button data-close title="Cerrar" aria-label="Cerrar">X</button></span></div><div class="desktop-window-main"><h3>RETRIEVING ARCHIVE...</h3></div>`;host.appendChild(el);const initialOffset=(desktopSerial%5)*27;el.style.setProperty('left',Math.max(8,Math.round((innerWidth-Math.min(760,innerWidth-32))/2)+initialOffset-54)+'px','important');el.style.setProperty('top',Math.max(8,Math.round((innerHeight-Math.min(608,innerHeight-32))/2)+initialOffset-54)+'px','important');const task=document.createElement('button');task.textContent=title;task.className='active';bar.appendChild(task);const focus=()=>{host.querySelectorAll('.desktop-window').forEach(w=>w.style.zIndex='1');el.style.zIndex=String(100+desktopSerial++);bar.querySelectorAll('button').forEach(b=>b.classList.remove('active'));task.classList.add('active')};const close=()=>{el.remove();task.remove()};el.querySelector('[data-close]').onclick=close;el.querySelector('[data-min]').onclick=()=>{el.hidden=true;task.classList.remove('active')};task.onclick=()=>{el.hidden=false;focus()};el.addEventListener('pointerdown',focus);focus();let drag=null;const handle=el.querySelector('.desktop-titlebar');
const clamp=(v,min,max)=>Math.max(min,Math.min(v,max));
 // Window coordinates are in viewport space: host is a direct child of BODY.
 // Pointer capture prevents loss of drag when the pointer crosses another window.
 const move=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const maxX=Math.max(0,window.innerWidth-el.offsetWidth);
   const maxY=Math.max(0,window.innerHeight-el.offsetHeight);
   el.style.setProperty('left',Math.round(clamp(e.clientX-drag.x,0,maxX))+'px','important');
   el.style.setProperty('top',Math.round(clamp(e.clientY-drag.y,0,maxY))+'px','important');
 };
 const stop=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   drag=null;
   handle.classList.remove('is-dragging');
   if(handle.hasPointerCapture(e.pointerId))handle.releasePointerCapture(e.pointerId);
 };
 handle.addEventListener('pointerdown',e=>{
   if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;
   e.preventDefault();focus();
   const rect=el.getBoundingClientRect();
   drag={id:e.pointerId,x:e.clientX-rect.left,y:e.clientY-rect.top};
   handle.classList.add('is-dragging');
   handle.setPointerCapture(e.pointerId);
 });
 handle.addEventListener('pointermove',move);
 handle.addEventListener('pointerup',stop);
 handle.addEventListener('pointercancel',stop);
 handle.addEventListener('lostpointercapture',()=>{drag=null;handle.classList.remove('is-dragging')});
const body=el.querySelector('.desktop-window-main');if(kind==='cat'){try{const rows=(await fetchDocs()).filter(d=>d.category===CATS[index]);if(!el.isConnected)return;const render=q=>{const filtered=rows.filter(d=>(d.document_code+' '+d.title+' '+d.index_title).toLowerCase().includes(q.toLowerCase()));body.innerHTML=`<h3>${esc(title)} / ${String(filtered.length).padStart(4,'0')} REGISTROS</h3><input class="desktop-filter" placeholder="FILTRAR EXPEDIENTES..." value="${esc(q)}"><div class="archive-rows">${filtered.map(d=>`<button class="archive-row" data-document="${esc(d.id)}"><span>${esc(d.document_code)}</span><span class="archive-date">${esc(date(d.document_date))}</span><span>${esc(d.index_title||d.title)}</span><span>LVL ${Number(d.clearance_level)}</span></button>`).join('')||'<div class="archive-empty">NO HAY REGISTROS DISPONIBLES_</div>'}</div>`;body.querySelector('.desktop-filter').oninput=e=>{const pos=e.target.selectionStart;render(e.target.value);body.querySelector('.desktop-filter').focus();body.querySelector('.desktop-filter').setSelectionRange(pos,pos)};body.querySelectorAll('[data-document]').forEach(b=>b.onclick=()=>{cat=index;openDoc(b.dataset.document)})};render('')}catch(e){body.textContent='ERROR // '+e.message}}
else if(kind==='search'){body.innerHTML='<h3>GLOBAL ARCHIVE SEARCH</h3><p class="window-description">RECUPERACIÓN DE DOCUMENTOS POR IDENTIFICADOR, TÍTULO O CONTENIDO.</p><div class="window-actions"><button data-go="search">OPEN SEARCH TERMINAL →</button></div>'}
else{body.innerHTML='<h3>ADMINISTRATOR ACCESS / LEVEL 05</h3><p class="window-description">GESTIÓN DE EXPEDIENTES, LISTAS DE ACCESO Y CONFIGURACIÓN.</p><div class="window-actions"><button data-go="admin">OPEN CONTROL PANEL →</button></div>'}
body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));}

async function categoryPage(){layout(nav()+`<div class="eyebrow">ROOT / ${esc(CATS[cat])}</div><h2>DIRECTORY : ${esc(CATS[cat])}</h2><section class="pc-window"><div class="pc-topline">PERSONAL TERMINAL</div><div class="window-tabs"><span class="win-tab active">${esc(PREFIX[cat])} / DIRECTORY</span><span class="win-tab">ARCHIVE BROWSER</span></div><div class="window-toolbar"><input id="filter" placeholder="FILTRAR ARCHIVOS..." aria-label="Filtrar archivos"><span id="count" class="muted small"></span></div><div class="window-body"><div id="results" class="box muted">RETRIEVING ARCHIVE...</div></div></section>`);wireNav();try{const rows=(await fetchDocs()).filter(d=>d.category===CATS[cat]);renderList(rows,'results');$('filter').oninput=()=>renderList(rows.filter(d=>(d.index_title+' '+d.title+' '+d.document_code).toLowerCase().includes($('filter').value.toLowerCase())),'results');}catch(e){flash(e.message,true)}}
function renderList(rows,target){const count=$('count');if(count)count.textContent='RECORDS: '+String(rows.length).padStart(4,'0');$(target).innerHTML=rows.length?`<div class="tablewrap"><table><thead><tr><th>ID</th><th>FECHA</th><th>IDENTIFICACIÓN</th><th>LVL</th><th>ACCIÓN</th></tr></thead><tbody>${rows.map(d=>`<tr><td>${esc(d.document_code)}</td><td>${esc(date(d.document_date))}</td><td>${esc(d.index_title||d.title)}</td><td>${d.clearance_level}</td><td><button data-open="${esc(d.id)}">[ OPEN ]</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="box muted">NO RECORDS AVAILABLE.</div>';document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openDoc(b.dataset.open))}
async function searchPage(){layout(nav()+`<div class="eyebrow">ROOT / GLOBAL SEARCH</div><h2>GLOBAL ARCHIVE SEARCH</h2><section class="pc-window"><div class="pc-topline">PERSONAL TERMINAL</div><div class="window-tabs"><span class="win-tab active">SEARCH</span><span class="win-tab">ALL DIRECTORIES</span></div><div class="window-toolbar"><input id="query" placeholder="ENTER SEARCH QUERY..." value="${esc(searchTerm)}"></div><div class="window-body"><div id="results" class="box muted">ENTER SEARCH TERMS TO BEGIN.</div></div></section>`);wireNav();try{const rows=await fetchDocs();const run=()=>{const q=$('query').value.toLowerCase().trim();searchTerm=q;renderList(q?rows.filter(d=>[d.title,d.index_title,d.document_code,d.author,d.content,JSON.stringify(d.extra||{})].join(' ').toLowerCase().includes(q)):rows,'results')};$('query').oninput=run;run()}catch(e){flash(e.message,true)}}
async function openDoc(id){
 try {
  doc=await getDoc(id);
  if(!doc){flash('ACCESS DENIED / FILE NOT FOUND',true);return}
  const x=doc.extra||{};
  let special='';
  if(doc.category===CATS[0]){
   const pairs=[['FULL NAME',x.full_name],['BLOOD TYPE',x.blood_type],['DATE OF BIRTH',date(x.date_of_birth)],['DATE OF DEATH',date(x.date_of_death)],['HEIGHT',x.height_cm?x.height_cm+' CM':'—'],['WEIGHT',x.weight_kg?x.weight_kg+' KG':'—'],['LAST KNOWN LOCATION',x.location],['OCCUPATION',x.occupation],['LAST RECORDED ACTIVITY',x.last_records]];
   special='<div class="tablewrap"><table><tbody>'+pairs.map(p=>'<tr><th>'+esc(p[0])+'</th><td>'+esc(p[1]||'—')+'</td></tr>').join('')+'</tbody></table></div>';
  }
  if(doc.category===CATS[2]&&x.registry){
   const r=x.registry;
   const head=(r.columns||[]).map(c=>'<th>'+esc(c)+'</th>').join('');
   const body=(r.rows||[]).map(row=>'<tr>'+row.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>').join('');
   special='<h3>'+esc(r.title||'DATA TABLE')+'</h3><div class="tablewrap"><table><thead><tr>'+head+'</tr></thead><tbody>'+body+'</tbody></table></div>';
  }
  let files='';
  {
   const data=await api.listAttachments(id);
   files=(data||[]).map(f=>'<button data-attach="'+esc(f.path)+'">↓ '+esc(f.filename)+'</button>').join(' ');
  }
  layout(nav()+`<button class="back" id="back">← RETURN TO DIRECTORY</button><div class="eyebrow">RECOVERED FILE // ${esc(doc.document_code)}</div><h2>${esc(doc.title)}</h2><section class="pc-window"><div class="pc-topline">PERSONAL TERMINAL</div><div class="window-tabs"><span class="win-tab active">${esc(doc.document_code)}</span><span class="win-tab">${esc(doc.category)}</span></div><div class="window-body"><div class="metadata"><div><span>CLASSIFICATION:</span> LEVEL ${doc.clearance_level} / ${LEVELS[doc.clearance_level]}</div><div><span>AUTHOR:</span> ${esc(doc.author||'UNKNOWN')}</div><div><span>DATE:</span> ${esc(date(doc.document_date))}</div><div><span>FILE TYPE:</span> ${esc(doc.category)}</div></div>${special}<h3>DOCUMENT BODY</h3><div class="content">${esc(doc.content||'NO FURTHER INFORMATION AVAILABLE.')}</div>${files?`<hr class="divider"><h3>ATTACHED DOCUMENTS</h3><div class="filelist">${files}</div>`:''}<hr class="divider"><span class="muted small">*** END OF RECORD ${esc(doc.document_code)} ***</span></div></section>`);
  wireNav();
  $('back').onclick=()=>go('category');
  document.querySelectorAll('[data-attach]').forEach(b=>b.onclick=async()=>{
   try{const url=await api.getAttachmentUrl(b.dataset.attach);window.open(url,'_blank','noopener')}catch(e){flash(e.message,true)}
  });
 }catch(e){flash(e.message,true)}
}
function admin(){layout(nav()+`<div class="eyebrow">SECURE AREA / ADMINISTRATOR AUTHORIZED</div><h2>SYSTEM ADMINISTRATION</h2><section class="pc-window"><div class="pc-topline">PERSONAL TERMINAL</div><div class="window-tabs"><span class="win-tab active">ADMIN</span><span class="win-tab">CONTROL NODE</span></div><div class="window-body"><div class="admin-air-grid">${[['CREAR ARCHIVO','create','SYS 01'],['EDITAR / ARCHIVAR DOCUMENTOS','adminDocs','SYS 02'],['GESTIÓN DE WHITELIST','users','SYS 03'],['CONFIGURACIÓN','config','SYS 04']].map(([t,v,code])=>`<button class="admin-air-card" data-admin="${v}"><span class="microline">${code}</span><b>${t}</b><small>EXECUTE</small></button>`).join('')}</div><p class="warning small">${'DATABASE SECURITY ENFORCED BY SUPABASE RLS.'}</p></div></section>`);wireNav();document.querySelectorAll('[data-admin]').forEach(b=>b.onclick=()=>{editing=false;doc=null;go(b.dataset.admin)})}
async function adminDocs(){layout(nav()+`<div class="eyebrow">SECURE AREA / DOCUMENT CONTROL</div><h2>DOCUMENT CONTROL</h2><section class="pc-window"><div class="pc-topline">PERSONAL TERMINAL</div><div class="window-tabs"><span class="win-tab active">CONTROL</span><span class="win-tab">ARCHIVE FILES</span></div><div class="window-body"><div id="results" class="box muted">LOADING...</div></div></section>`);wireNav();try{const rows=await fetchOwnAllDocs();$('results').innerHTML=`<div class="tablewrap"><table><tr><th>ID</th><th>DOCUMENTO</th><th>NIVEL</th><th>ESTADO</th><th>OPERACIONES</th></tr>${rows.map(d=>`<tr><td>${esc(d.document_code)}</td><td>${esc(d.title)}</td><td>${d.clearance_level}</td><td>${esc(d.status)}</td><td><button data-edit="${d.id}">EDITAR</button> <button class="danger" data-archive="${d.id}">ARCHIVAR</button></td></tr>`).join('')}</table></div>`;document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{doc=rows.find(x=>x.id===b.dataset.edit);editing=true;formCat=CATS.indexOf(doc.category);go('create')});document.querySelectorAll('[data-archive]').forEach(b=>b.onclick=async()=>{if(!confirm('¿Archivar expediente? No aparecerá en el índice.'))return;try{await api.archiveDocument(b.dataset.archive);adminDocs()}catch(e){flash(e.message,true)}})}catch(e){flash(e.message,true)}}
const field=(id,label,value='',type='text',required=false)=>`<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" ${required?'required':''} value="${esc(value)}"></div>`,area=(id,label,value='')=>`<div class="field"><label for="${id}">${label}</label><textarea id="${id}" rows="8">${esc(value)}</textarea></div>`;
function formPage(){const x=doc?.extra||{};if(!editing)doc=null;const sec=editing?formCat:formCat;let specific='';if(sec===0)specific=`<div class="cols">${field('full_name','NOMBRE COMPLETO',x.full_name,'text',true)}${field('blood_type','GRUPO SANGUÍNEO',x.blood_type)}${field('date_of_birth','FECHA NACIMIENTO',x.date_of_birth,'date')}${field('date_of_death','FECHA DEFUNCIÓN',x.date_of_death,'date')}${field('height_cm','ALTURA (CM)',x.height_cm,'number')}${field('weight_kg','PESO (KG)',x.weight_kg,'number')}${field('location','LOCALIZACIÓN',x.location)}${field('occupation','OCUPACIÓN',x.occupation)}</div>${area('last_records','ÚLTIMOS REGISTROS',x.last_records||'')}`;
if(sec===2)specific=`${field('table_title','TÍTULO DE TABLA',x.registry?.title||'DATA LOG')}<div class="topline"><h3>CONSTRUCTOR DE TABLAS</h3><div class="row-actions"><button type="button" id="addcol">+ COLUMNA</button><button type="button" id="addrow">+ FILA</button><button type="button" id="delrow">− FILA</button></div></div><div id="tableeditor"></div><div class="field"><label>IMPORTAR TABLA DESDE EXCEL (.XLSX, .XLS, .CSV)</label><input id="excel" type="file" accept=".xlsx,.xls,.csv"><small>Se importará la primera hoja y podrás editar sus valores antes de guardar.</small></div>`;
if(sec===3)specific='<div class="notice">CLASSIFIED INFORMATION — EL NIVEL ELEGIDO RESTRINGE EL ACCESO A ESTE EXPEDIENTE.</div>';
layout(nav()+`<div class="eyebrow">ADMIN / ${editing?'EDIT EXISTING':'NEW RECORD'}</div><h2>${editing?'EDITAR ARCHIVO':'CREAR NUEVO ARCHIVO'}</h2>${!editing?`<div class="field"><label>TIPO DE DOCUMENTO</label><select id="doctype">${CATS.map((c,i)=>`<option value="${i}" ${i===sec?'selected':''}>${c}</option>`).join('')}</select></div>`:''}<form id="record"><div class="cols">${field('title',sec===0?'TÍTULO DE FICHA':'TÍTULO',doc?.title||'', 'text',true)}${field('index_title','NOMBRE EN ÍNDICE',doc?.index_title||'','text',true)}${field('author','AUTOR',doc?.author||'')}${field('document_date','FECHA DEL DOCUMENTO',doc?.document_date||today(),'date',true)}<div class="field"><label>NIVEL DE VISIBILIDAD / SEGURIDAD</label><select id="level">${[1,2,3,4,5].map(n=>`<option value="${n}" ${+(doc?.clearance_level||1)===n?'selected':''}>${n} — ${LEVELS[n]}</option>`).join('')}</select></div><div class="field"><label>ESTADO</label><select id="status"><option value="published" ${doc?.status!=='draft'?'selected':''}>PUBLICADO</option><option value="draft" ${doc?.status==='draft'?'selected':''}>BORRADOR</option></select></div></div>${specific}${area('content',sec===0?'INFORMACIÓN ADICIONAL':'CUERPO DEL DOCUMENTO',doc?.content||'')}<div class="field"><label>IMÁGENES / DOCUMENTOS ADJUNTOS</label><input type="file" id="uploads" multiple accept=".pdf,.txt,.docx,.xlsx,.xls,.csv,.jpg,.jpeg,.png,.webp"><small>Los archivos se almacenan en Supabase Storage privado y requieren autorización.</small></div><div class="actions"><button class="primary" type="submit">[ ${editing?'GUARDAR CAMBIOS':'CREAR ARCHIVO'} ]</button><button type="button" id="cancel">[ CANCELAR ]</button></div></form>`);wireNav();$('cancel').onclick=()=>go('admin');if($('doctype'))$('doctype').onchange=()=>{formCat=+$('doctype').value;formPage()};if(sec===2){registry=x.registry?structuredClone(x.registry):{title:'DATA LOG',columns:['CAMPO','VALOR'],rows:[['001','ACTIVE']]};renderEditor();$('addcol').onclick=()=>{captureEditor();registry.columns.push('COLUMNA '+(registry.columns.length+1));registry.rows.forEach(r=>r.push(''));renderEditor()};$('addrow').onclick=()=>{captureEditor();registry.rows.push(registry.columns.map(() =>''));renderEditor()};$('delrow').onclick=()=>{captureEditor();registry.rows.pop();renderEditor()};$('excel').onchange=async()=>{try{const f=$('excel').files[0];if(!f)return;if(f.size>10*1024*1024)throw Error('EL ARCHIVO SUPERA 10 MB');const wb=XLSX.read(await f.arrayBuffer(),{type:'array',cellDates:true});const sheet=wb.Sheets[wb.SheetNames[0]],raw=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});if(!raw.length)throw Error('HOJA VACÍA');registry={title:$('table_title').value,columns:raw[0].map(String),rows:raw.slice(1,1001).map(r=>raw[0].map((_,i)=>String(r[i]??'')))};renderEditor();flash('TABLA IMPORTADA / '+registry.rows.length+' FILAS')}catch(e){flash(e.message,true)}}}
$('record').onsubmit=submitRecord}
function renderEditor(){$('tableeditor').innerHTML=`<div class="tablewrap spreadsheet"><table><thead><tr><th>#</th>${registry.columns.map((c,i)=>`<th><input aria-label="Nombre columna ${i+1}" data-head="${i}" value="${esc(c)}"></th>`).join('')}</tr></thead><tbody>${registry.rows.map((row,i)=>`<tr><td>${i+1}</td>${registry.columns.map((_,j)=>`<td><input data-cell="${i}:${j}" aria-label="Fila ${i+1} columna ${j+1}" value="${esc(row[j]||'')}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function captureEditor(){document.querySelectorAll('[data-head]').forEach(i=>registry.columns[+i.dataset.head]=i.value);document.querySelectorAll('[data-cell]').forEach(i=>{const [r,c]=i.dataset.cell.split(':').map(Number);registry.rows[r][c]=i.value})}
async function submitRecord(e){e.preventDefault();const s=formCat,extras=editing?structuredClone(doc.extra||{}):{},get=k=>$(k)?.value||'';if(s===0)['full_name','blood_type','date_of_birth','date_of_death','height_cm','weight_kg','location','occupation','last_records'].forEach(k=>extras[k]=get(k));if(s===2){captureEditor();registry.title=get('table_title');extras.registry=registry}const data={category:CATS[s],title:get('title'),index_title:get('index_title'),author:get('author'),document_date:get('document_date'),clearance_level:+get('level'),status:get('status'),content:get('content'),extra:extras};const btn=e.submitter;if(btn)btn.disabled=true;try{let id=await api.saveDocument(data,editing?doc?.id:null);for(const f of [...$('uploads').files])await api.uploadAttachment(id,f);editing=false;doc=null;formCat=0;go('adminDocs');flash('ARCHIVO GUARDADO CORRECTAMENTE')}catch(err){flash(err.message,true)}finally{if(btn)btn.disabled=false}}
async function usersPage(){layout(nav()+`<h2>USER ACCESS CONTROL / WHITELIST</h2><p class="muted small">APRUEBA EL CORREO DE UNA CUENTA REGISTRADA PARA ACTIVAR SU ACCESO. SUPABASE SINCRONIZA AUTOMÁTICAMENTE EL PERFIL AL AUTORIZARLO.</p><div class="box"><form id="adduser"><div class="cols">${field('newemail','CORREO AUTORIZADO','','email',true)}<div class="field"><label>NIVEL DE SEGURIDAD</label><select id="newlevel">${[1,2,3,4,5].map(n=>`<option value="${n}">${n} — ${LEVELS[n]}</option>`).join('')}</select></div></div><button type="submit">[ AUTORIZAR USUARIO ]</button></form></div><div id="users">LOADING PERSONNEL...</div>`);wireNav();$('adduser').onsubmit=async e=>{e.preventDefault();try{const mail=$('newemail').value.trim().toLowerCase();await api.authorizeUser(mail,+$('newlevel').value);usersPage();flash('USUARIO AÑADIDO A WHITELIST')}catch(e){flash(e.message,true)}};try{let rows;{rows=await api.listAllowedUsers()} $('users').innerHTML=`<div class="tablewrap"><table><tr><th>EMAIL</th><th>RANGO</th><th>ESTADO</th><th>OPERACIÓN</th></tr>${rows.map(u=>`<tr><td>${esc(u.email)} ${u.role==='admin'?'[ADMIN]':''}</td><td><select data-level="${esc(u.email)}" ${u.email===ADMIN_EMAIL?'disabled':''}>${[1,2,3,4,5].map(n=>`<option value="${n}" ${+u.clearance_level===n?'selected':''}>${n}</option>`).join('')}</select></td><td><select data-status="${esc(u.email)}" ${u.email===ADMIN_EMAIL?'disabled':''}><option value="active" ${u.status==='active'?'selected':''}>ACTIVE</option><option value="suspended" ${u.status==='suspended'?'selected':''}>SUSPENDED</option></select></td><td><button data-saveuser="${esc(u.email)}" ${u.email===ADMIN_EMAIL?'disabled':''}>GUARDAR</button></td></tr>`).join('')}</table></div>`;document.querySelectorAll('[data-saveuser]').forEach(b=>b.onclick=async()=>{try{const email=b.dataset.saveuser,lv=+document.querySelector('[data-level="'+CSS.escape(email)+'"]').value,status=document.querySelector('[data-status="'+CSS.escape(email)+'"]').value;await api.updateAllowedUser(email,lv,status);flash('PERMISSIONS UPDATED')}catch(e){flash(e.message,true)}})}catch(e){flash(e.message,true)}}
function configPage(){const cfg=readConfig();layout(nav()+`<h2>SYSTEM CONFIGURATION</h2><div class="box"><p>DISPLAY HARDWARE</p><button id="crtbutton">TOGGLE CRT FILTER</button> <button id="bootbutton">RESTART BOOT SEQUENCE</button></div><div class="box"><h3>DATABASE CONNECTION</h3><p class="small muted">${api.ready()?'SUPABASE CONNECTED TO '+esc(cfg.url):'NO SUPABASE PROJECT CONFIGURED'}</p><button id="configure">SET / CHANGE SUPABASE CONNECTION</button><p class="warning small">No pegues claves privadas. El proyecto SQL debe instalarse antes de acceder con usuarios reales.</p></div>`);wireNav();$('crtbutton').onclick=()=>{$('crt').click()};$('bootbutton').onclick=splash;$('configure').onclick=()=>{if(!confirm('Cambiar conexión cerrará esta sesión. ¿Continuar?'))return;user=null;setupPage()}}

/* SOUND DESIGN / WebAudio only: no external files, no autoplay before interaction. */
const motherAudio=(()=>{
 let ctx=null,hum=null,hum2=null,mod=null,master=null,humGain=null;
 let enabled=localStorage.getItem('mother_audio')!=='0';
 const AC=window.AudioContext||window.webkitAudioContext;
 function drawButton(){const b=document.getElementById('mother-audio-toggle');if(b){b.textContent=enabled?'[ AUDIO: ON ]':'[ AUDIO: OFF ]';b.setAttribute('aria-pressed',String(enabled))}}
 function init(){
   if(!AC)return;
   if(!ctx){
     ctx=new AC();master=ctx.createGain();master.gain.value=0.23;master.connect(ctx.destination);
     humGain=ctx.createGain();humGain.gain.value=0.0;humGain.connect(master);
     const filter=ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=145;filter.Q.value=.45;filter.connect(humGain);
     hum=ctx.createOscillator();hum.type='sine';hum.frequency.value=47.5;
     hum2=ctx.createOscillator();hum2.type='triangle';hum2.frequency.value=95.2;
     const mix1=ctx.createGain();mix1.gain.value=.20;const mix2=ctx.createGain();mix2.gain.value=.032;
     hum.connect(mix1);hum2.connect(mix2);mix1.connect(filter);mix2.connect(filter);
     hum.start();hum2.start();
     mod=ctx.createOscillator();mod.frequency.value=.27;
     const depth=ctx.createGain();depth.gain.value=.013;mod.connect(depth);depth.connect(humGain.gain);mod.start();
   }
   if(ctx.state==='suspended')ctx.resume().catch(()=>{});
   humGain.gain.cancelScheduledValues(ctx.currentTime);
   humGain.gain.setTargetAtTime(enabled?.11:0,ctx.currentTime,.35);
 }
 function beep(){
   if(!enabled||!ctx||ctx.state!=='running')return;
   const t=ctx.currentTime,osc=ctx.createOscillator(),g=ctx.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(670,t);osc.frequency.exponentialRampToValueAtTime(485,t+.075);
   g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.055,t+.008);
   g.gain.exponentialRampToValueAtTime(.0001,t+.093);
   osc.connect(g);g.connect(master);osc.start(t);osc.stop(t+.105);
 }
 function toggle(){enabled=!enabled;localStorage.setItem('mother_audio',enabled?'1':'0');init();drawButton();if(enabled)beep()}
 function install(){
   const b=document.createElement('button');b.id='mother-audio-toggle';b.className='terminal-audio';
   b.type='button';b.setAttribute('aria-label','Activar o desactivar sonido del terminal');
   b.onclick=e=>{e.stopPropagation();toggle()};document.body.appendChild(b);drawButton();
   document.addEventListener('pointerdown',e=>{
     if(!enabled||e.target.closest('#mother-audio-toggle'))return;
     // Browsers require a direct gesture before starting an audio context.
     init();
     if(e.target.closest('button,a,[role="button"],.desktop-entry'))beep();
   },{capture:true});
   document.addEventListener('keydown',e=>{
     if(!enabled||e.repeat||!['Enter',' '].includes(e.key))return;
     init();beep();
   });
   document.addEventListener('visibilitychange',()=>{
     if(!ctx||!humGain)return;
     humGain.gain.setTargetAtTime(document.hidden?0:(enabled?.11:0),ctx.currentTime,.2);
   });
 }
 return {install};
})();
motherAudio.install();
async function start(){if(api.ready()){try{const authUser=await api.getAuthUser();if(authUser){await sessionToUser(authUser);return}}catch(e){/* no session */}}splash()}
start();
})();
