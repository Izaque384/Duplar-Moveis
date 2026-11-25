(() => {
'use strict';
const $ = id => document.getElementById(id);
const headings = {contratos:'Contratos',notas:'Notas fiscais',projeto:'Meu projeto',atendimento:'Atendimento'};
const buttons = Array.from(document.querySelectorAll('.side-link[data-view]'));
const sections = Array.from(document.querySelectorAll('.portal-view[data-panel]'));
const sidebar = $('sidebar');
let demo = false, phone = '', portal = {projects:[],documents:[],supportWhatsapp:'558881734015'};
async function request(path,method='GET',body){
 const opts={method,credentials:'same-origin',headers:{'x-duplar-request':'1'}};
 if(body!==undefined){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
 const res=await fetch('/api/duplar/'+path,opts);const out=await res.json().catch(()=>({}));
 if(!res.ok)throw new Error(out.error||'falha');return out;
}
function status(text, error=false){$('loginMessage').textContent=text;$('loginMessage').classList.toggle('error',error);}
function closeMenu(){sidebar.classList.remove('is-open');$('drawerBackdrop').hidden=true;$('sidebarToggle').setAttribute('aria-expanded','false');}
function setView(key){
 if(!headings[key])key='contratos';
 sections.forEach(s=>s.hidden=s.dataset.panel!==key);
 buttons.forEach(b=>{const a=b.dataset.view===key;b.classList.toggle('is-active',a);if(a)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
 $('currentSection').textContent=headings[key];
 closeMenu();
 if(demo){const u=new URL(location.href);u.searchParams.set('demo','1');u.searchParams.set('secao',key);history.replaceState(null,'',u.pathname+u.search);}
 window.scrollTo(0,0);
}
function empty(id,kind) {
 const isContract = kind === 'contract';
 const item = document.createElement('div');
 item.className = 'client-empty-state';
 const icon = document.createElement('span');
 icon.className = 'client-empty-icon';
 icon.textContent = 'PDF';
 icon.setAttribute('aria-hidden','true');
 const title = document.createElement('h3');
 title.textContent = isContract ? 'Nenhum contrato disponível' : 'Nenhuma nota fiscal disponível';
 const detail = document.createElement('p');
 detail.textContent = 'Quando a Duplar adicionar um arquivo, ele aparecerá aqui.';
 const action = document.createElement('button');
 action.type='button';
 action.className='client-empty-action';
 action.textContent='Falar com a Duplar ↗';
 action.addEventListener('click',()=>setView('atendimento'));
 item.append(icon,title,detail,action);
 $(id).replaceChildren(item);
}
function updateDocumentCount(kind,count) {
 const prefix=kind==='contract'?'contracts':'invoices';
 $(prefix+'Count').textContent=String(count);
 $(prefix+'CountLabel').textContent=count===1?'arquivo':'arquivos';
}
async function downloadDoc(id,name,button) {
 button.disabled=true;
 button.setAttribute('aria-busy','true');
 const originalText=button.textContent;
 button.textContent='Baixando…';
 $('dashboardMessage').textContent='';
 try {
  const res=await fetch('/api/duplar/document/'+encodeURIComponent(id),{credentials:'same-origin'});
  if(!res.ok)throw new Error('download-failed');
  const url=URL.createObjectURL(await res.blob());
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
 } catch {
  $('dashboardMessage').textContent='Não foi possível baixar o arquivo. Tente novamente ou fale com a Duplar.';
 } finally {
  button.textContent=originalText;
  button.disabled=false;
  button.removeAttribute('aria-busy');
 }
}
function documents(id,kind,projectId) {
 const docs=demo||!projectId?[]:portal.documents.filter(d=>d.kind===kind && d.project_id===projectId);
 updateDocumentCount(kind,docs.length);
 const container=$(id);
 container.replaceChildren();
 if(!docs.length){empty(id,kind);return;}
 const dateFormat=new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:'numeric'});
 docs.forEach(d=>{
  const row=document.createElement('article');
  row.className='document-row client-document-row';
  const icon=document.createElement('div');
  icon.className='doc-icon client-doc-icon';
  icon.textContent='PDF';
  icon.setAttribute('aria-hidden','true');
  const info=document.createElement('div');
  info.className='client-document-info';
  const name=document.createElement('strong');
  name.textContent=d.filename||'Documento PDF';
  const meta=document.createElement('span');
  const when=d.created_at?new Date(d.created_at):null;
  meta.textContent='PDF'+(when && !Number.isNaN(when.getTime())?' · '+dateFormat.format(when):'');
  info.append(name,meta);
  const action=document.createElement('button');
  action.className='client-download-action';
  action.type='button';
  action.textContent='Baixar PDF ↗';
  action.setAttribute('aria-label','Baixar '+(d.filename||'documento')+' em PDF');
  action.addEventListener('click',()=>downloadDoc(d.id,d.filename||'documento.pdf',action));
  row.append(icon,info,action);
  container.append(row);
 });
}
function renderProject() {
 const p=portal.projects.find(project=>project.id===$('projectSelect').value);
 documents('contractsList','contract',p?.id);
 documents('invoicesList','invoice',p?.id);
 $('projectName').textContent=p?.title||'Nenhum projeto cadastrado';
 $('projectStatus').textContent=p?.status||'Aguardando cadastro';
 $('projectDescription').textContent=p?.description||'O projeto aparecerá aqui quando for cadastrado pela Duplar.';
 $('projectServices').textContent=p?.services||'Nenhum serviço informado ainda.';
 $('projectBudget').textContent=p?.budget_cents!=null
  ?(Number(p.budget_cents)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})
  :'Não informado';
}
function clientInitials(name) {
 const words = String(name || '').trim().split(/\s+/u).filter(Boolean);
 if (!words.length) return 'CL';
 const first = Array.from(words[0])[0] || 'C';
 const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] || '') : '';
 return (first + last).toLocaleUpperCase('pt-BR');
}
function renderClientProfile() {
 // Apenas o nome já autorizado pela API; não expõe telefone nem dados de outros clientes.
 const name = demo ? 'Visitante' : (typeof portal.name === 'string' && portal.name.trim() ? portal.name.trim() : 'Cliente Duplar');
 $('clientProfileName').textContent = name;
 $('clientProfileName').title = name;
 $('clientProfileInitials').textContent = clientInitials(name);
 $('clientProfileLabel').textContent = demo ? 'Prévia ilustrativa' : 'Cliente Duplar';
}
function showDashboard(){
 $('entryScreen').hidden=true;$('dashboard').hidden=false;
 renderClientProfile();
 $('projectSwitch').hidden=demo||portal.projects.length<=1;
 $('projectSelect').replaceChildren();
 portal.projects.forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.title;$('projectSelect').append(o);});
 $('supportLink').href='https://wa.me/'+(portal.supportWhatsapp||'558881734015')+'?text='+encodeURIComponent('Olá, sou cliente da Duplar e gostaria de falar sobre meu projeto.');
 renderProject();setView(new URLSearchParams(location.search).get('secao')||'contratos');
}
$('phoneForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('sendCode');button.disabled=true;status('');
 try{phone=$('phone').value;const data=await request('auth/request','POST',{phone});$('phoneForm').hidden=true;$('codeForm').hidden=false;status(data.message||'Se o número estiver cadastrado, o código será enviado.');$('code').focus();}
 catch(err){status(err.message==='servico_indisponivel'?'O acesso por WhatsApp ainda está sendo configurado.':err.message==='muitas_tentativas'?'Muitas tentativas. Tente novamente em 15 minutos.':'Não foi possível solicitar o código agora.',true);}
 finally{button.disabled=false;}
});
$('backPhone').addEventListener('click',()=>{$('phoneForm').hidden=false;$('codeForm').hidden=true;status('');});
$('codeForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('verifyCode');button.disabled=true;
 try{const verified=await request('auth/verify','POST',{phone,code:$('code').value});if(verified.admin){location.href='../equipe.html';return;}portal=await request('projects');showDashboard();}
 catch{status('Código inválido, expirado ou indisponível. Confira os dígitos e tente novamente.',true);}
 finally{button.disabled=false;}
});
buttons.forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-client-goto]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.clientGoto)));
$('projectSelect').addEventListener('change',renderProject);
$('sidebarToggle').addEventListener('click',()=>{const opened=sidebar.classList.toggle('is-open');$('drawerBackdrop').hidden=!opened;$('sidebarToggle').setAttribute('aria-expanded',String(opened));});
$('drawerBackdrop').addEventListener('click',closeMenu);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
async function exit(){if(!demo){try{await request('auth/logout','POST',{});}catch{}}location.href='./';}
$('topExit').addEventListener('click',exit);
(async()=>{const q=new URLSearchParams(location.search);if(q.get('demo')==='1'){demo=true;portal={name:'Prévia ilustrativa',projects:[],documents:[],supportWhatsapp:'558881734015'};showDashboard();return;}
 try{const s=await request('session');if(s.admin){location.href='../equipe.html';return;}portal=await request('projects');showDashboard();}catch{}
})();
})();