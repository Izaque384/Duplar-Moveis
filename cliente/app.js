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
function empty(id,label){const p=document.createElement('p');p.className='empty-state';p.textContent=label;$(id).replaceChildren(p);}
async function downloadDoc(id,name,button){
 button.disabled=true;
 try {const r=await fetch('/api/duplar/document/'+encodeURIComponent(id),{credentials:'same-origin'});if(!r.ok)throw Error();
 const url=URL.createObjectURL(await r.blob());const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
 catch{$('dashboardMessage').textContent='Não foi possível baixar o documento. Entre em contato com a Duplar.';}
 finally{button.disabled=false;}
}
function documents(id,kind,projectId){
 $(id).replaceChildren();
 if(demo){empty(id,kind==='contract'?'Nenhum contrato real nesta demonstração.':'Nenhuma nota fiscal real nesta demonstração.');return;}
 const docs=portal.documents.filter(d=>d.kind===kind&&d.project_id===projectId);
 if(!docs.length){empty(id,kind==='contract'?'Nenhum contrato disponibilizado para este projeto.':'Nenhuma nota fiscal disponibilizada para este projeto.');return;}
 docs.forEach(d=>{const row=document.createElement('div');row.className='document-row';const icon=document.createElement('div');icon.className='doc-icon';icon.textContent='PDF';const info=document.createElement('div');const title=document.createElement('strong');title.textContent=d.filename;const when=document.createElement('span');when.textContent=new Date(d.created_at).toLocaleDateString('pt-BR');info.append(title,when);const btn=document.createElement('button');btn.type='button';btn.textContent='Baixar ↗';btn.addEventListener('click',()=>downloadDoc(d.id,d.filename,btn));row.append(icon,info,btn);$(id).append(row);});
}
function renderProject(){
 const p=portal.projects.find(p=>p.id===$('projectSelect').value);
 documents('contractsList','contract',p?.id);documents('invoicesList','invoice',p?.id);
 $('projectName').textContent=p?.title||'Nenhum projeto cadastrado';
 $('projectTitleCard').textContent=p?.title||'—';
 $('projectStatus').textContent=p?.status||'Aguardando cadastro';
 $('projectStatusCard').textContent=p?.status||'Aguardando cadastro';
 $('projectDescription').textContent=p?.description||'Assim que a Duplar cadastrar o projeto, seus detalhes aparecerão aqui.';
 $('projectServices').textContent=p?.services||'Ainda não há serviços cadastrados para este projeto.';
 $('projectBudget').textContent=p?.budget_cents!=null?(Number(p.budget_cents)/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):'Não informado';
}
function showDashboard(){
 $('entryScreen').hidden=true;$('dashboard').hidden=false;
 $('projectSwitch').hidden=demo||!portal.projects.length;
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