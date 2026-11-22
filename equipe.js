const root = '/api/duplar/';
const $ = id => document.getElementById(id);
let clients = [];
const ADMIN_VIEW_LABELS = {overview: 'Visão geral', clients: 'Clientes', projects: 'Projetos', documents: 'Documentos', account: 'Equipe e acesso'};
let adminCurrentView = 'overview';
async function api(path, options = {}) {
  const config = { method: options.method || 'GET', credentials: 'same-origin', headers: { 'x-duplar-request': '1' } };
  if (options.body instanceof FormData) config.body = options.body;
  else if (options.body !== undefined) { config.headers['Content-Type'] = 'application/json'; config.body = JSON.stringify(options.body); }
  const res = await fetch(root + path, config);
  let data = {};
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data.error || 'falha');
  return data;
}
function note(id, text, error = false) {
  $(id).textContent = text;
  $(id).classList.toggle('error', error);
}
function buttonBusy(form, busy) { form.querySelector('button[type="submit"]').disabled = busy; }
function option(value, label) { const o = document.createElement('option'); o.value = value; o.textContent = label; return o; }
function showAdminView(view, updateHash = true) {
  if (!Object.hasOwn(ADMIN_VIEW_LABELS, view)) view = 'overview';
  adminCurrentView = view;
  document.querySelectorAll('[data-admin-panel]').forEach(panel => {
    panel.hidden = panel.dataset.adminPanel !== view;
  });
  document.querySelectorAll('[data-admin-view]').forEach(button => {
    const active = button.dataset.adminView === view;
    button.classList.toggle('is-current', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('adminBreadcrumb').textContent = ADMIN_VIEW_LABELS[view];
  if (updateHash) history.replaceState(null, '', location.pathname + location.search + '#' + view);
  window.scrollTo({top: 0, behavior: 'instant'});
}
document.querySelectorAll('[data-admin-view], [data-admin-goto]').forEach(button => {
  button.addEventListener('click', () => showAdminView(button.dataset.adminView || button.dataset.adminGoto));
});
function emptyContent(message) {
  const element = document.createElement('p');
  element.className = 'admin-empty';
  element.textContent = message;
  return element;
}
function adminRecord(name, meta, state = '', actionLabel = '', onAction = null) {
  const row = document.createElement('div');
  row.className = 'admin-row';
  const main = document.createElement('div');
  main.className = 'admin-row-main';
  const title = document.createElement('strong');
  title.className = 'admin-row-name';
  title.textContent = name;
  const subtitle = document.createElement('small');
  subtitle.className = 'admin-row-meta';
  subtitle.textContent = meta;
  main.append(title,subtitle);
  row.append(main);
  if(actionLabel && onAction){
    const button=document.createElement('button');
    button.type='button';
    button.className='admin-row-action';
    button.textContent=actionLabel;
    button.addEventListener('click',onAction);
    row.append(button);
  } else if(state){
    const label=document.createElement('span');
    label.className='admin-row-state'+(state==='Inativo'?' is-muted':'');
    label.textContent=state;
    row.append(label);
  }
  return row;
}
function openClientProjects(client) {
  if (!client.active) return;
  $('projectClient').value = client.id;
  $('documentClient').value = client.id;
  showAdminView('projects');
  refreshClientProjects().catch(()=> {
    $('projectsList').replaceChildren(emptyContent('Não foi possível carregar os projetos. Tente novamente.'));
  });
}
function renderClients() {
  const total=clients.length;
  const active=clients.filter(c=>c.active).length;
  $('statClients').textContent=String(total);
  $('statProjects').textContent=String(clients.reduce((sum,c)=>sum+Number(c.project_count||0),0));
  $('statActiveClients').textContent=String(active);
  $('clientCountLabel').textContent=total===1?'1 cliente cadastrado':total+' clientes cadastrados';
  const recent=$('recentClientsList');
  recent.replaceChildren();
  if(!total) recent.append(emptyContent('Ainda não há clientes. Cadastre o primeiro para iniciar.'));
  else clients.slice(0,5).forEach(c=>{
    recent.append(adminRecord(c.name,'+'+c.phone+' · '+c.project_count+' projeto(s)',c.active?'Ativo':'Inativo'));
  });
  const list=$('clientsList');
  const search=$('clientSearch').value.trim().toLocaleLowerCase('pt-BR');
  const filtered=clients.filter(c=>(c.name+' '+c.phone).toLocaleLowerCase('pt-BR').includes(search));
  list.replaceChildren();
  if(!filtered.length) {
    list.append(emptyContent(total?'Nenhum cliente corresponde à pesquisa.':'Nenhum cliente cadastrado até agora.'));
    return;
  }
  filtered.forEach(c=>{
    list.append(adminRecord(c.name,'+'+c.phone+' · '+c.project_count+' projeto(s)',
      c.active?'Ativo':'Inativo',c.active?'Ver projetos':'',c.active?()=>openClientProjects(c):null));
  });
}
$('clientSearch').addEventListener('input',renderClients);
async function refreshClients() {
  const data = await api('admin/clients');
  clients = data.clients;
  ['projectClient', 'documentClient'].forEach(id => {
    const selected = $(id).value;
    $(id).replaceChildren(option('', 'Selecione um cliente'));
    clients.filter(c=>c.active).forEach(c=>$(id).append(option(c.id,c.name+' · '+c.phone)));
    $(id).value=clients.some(c=>c.id===selected && c.active)?selected:'';
  });
  renderClients();
}
async function refreshClientProjects() {
  const id=$('projectClient').value;
  const list=$('projectsList');
  const hint=$('projectsClientHint');
  if(!id) {
    hint.textContent='Selecione um cliente ao lado para consultar os projetos vinculados.';
    list.replaceChildren(emptyContent('Escolha um cliente para ver seus projetos.'));
    return;
  }
  const selected=clients.find(c=>c.id===id);
  hint.textContent=selected?'Projetos de '+selected.name:'Projetos cadastrados';
  list.replaceChildren(emptyContent('Carregando projetos...'));
  const result=await api('admin/projects?client='+encodeURIComponent(id));
  if($('projectClient').value!==id)return;
  list.replaceChildren();
  if(!result.projects.length){
    list.append(emptyContent('Este cliente ainda não possui projetos.'));
    return;
  }
  result.projects.forEach(p=>{
    const budget=p.budget_cents!==null && p.budget_cents!==undefined
      ? ' · '+new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(p.budget_cents)/100)
      : '';
    list.append(adminRecord(p.title,(p.status||'Sem etapa')+budget));
  });
}
$('projectClient').addEventListener('change',()=>{
  refreshClientProjects().catch(()=>{
    $('projectsList').replaceChildren(emptyContent('Não foi possível carregar os projetos.'));
  });
});
async function refreshProjects() {
  const id = $('documentClient').value;
  const select = $('documentProject');
  select.replaceChildren(option('', 'Selecione um projeto'));
  if (!id) return;
  const data = await api('admin/projects?client=' + encodeURIComponent(id));
  data.projects.forEach(p => select.append(option(p.id, p.title)));
}
$('documentClient').addEventListener('change', () => refreshProjects().catch(() => note('documentMessage', 'Não foi possível carregar os projetos.', true)));
$('clientForm').addEventListener('submit', async e => {
  e.preventDefault(); buttonBusy(e.currentTarget, true); note('clientMessage', '');
  try {
    const result = await api('admin/clients', { method: 'POST', body: { name: $('clientName').value, phone: $('clientPhone').value } });
    await refreshClients();
    $('projectClient').value = result.client.id;
    $('documentClient').value = result.client.id;
    await refreshProjects();
    e.currentTarget.reset();
    note('clientMessage', 'Cliente cadastrado com sucesso.');
  } catch { note('clientMessage', 'Não foi possível salvar. Confira os dados e tente novamente.', true); }
  finally { buttonBusy(e.currentTarget, false); }
});
$('projectForm').addEventListener('submit', async e => {
  e.preventDefault(); buttonBusy(e.currentTarget, true); note('projectMessage', '');
  try {
    const budgetText = $('projectBudget').value.trim();
    const budgetCents = budgetText ? Math.round(Number(budgetText) * 100) : null;
    const data = {
      clientId: $('projectClient').value,
      title: $('projectName').value,
      status: $('projectStatus').value,
      budgetCents,
      description: $('projectDescription').value,
      services: $('projectServices').value
    };
    await api('admin/projects', { method: 'POST', body: data });
    $('documentClient').value = data.clientId;
    await refreshProjects();
    e.currentTarget.reset();
    await refreshClients();
    $('projectClient').value = data.clientId;
    await refreshClientProjects();
    note('projectMessage', 'Projeto cadastrado. Já pode enviar contrato e nota fiscal.');
  } catch { note('projectMessage', 'Não foi possível salvar este projeto.', true); }
  finally { buttonBusy(e.currentTarget, false); }
});
$('documentForm').addEventListener('submit', async e => {
  e.preventDefault(); buttonBusy(e.currentTarget, true); note('documentMessage', '');
  try {
    const file = $('documentFile').files[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf') || file.size > 4 * 1024 * 1024) {
      throw new Error('invalid');
    }
    const form = new FormData();
    form.append('projectId', $('documentProject').value);
    form.append('kind', $('documentType').value);
    form.append('file', file, file.name);
    await api('admin/documents', { method: 'POST', body: form });
    $('documentFile').value = '';
    note('documentMessage', 'Documento enviado. O cliente já poderá baixá-lo na área dele.');
  } catch { note('documentMessage', 'Não foi possível enviar. Verifique o projeto e o PDF (até 4 MB).', true); }
  finally { buttonBusy(e.currentTarget, false); }
});

let invitationToken = null;
function showAuthScreen(formId) {
  $('accessDenied').hidden = false;
  $('staffView').hidden = true;
  for(const id of ['adminLoginForm','adminBootstrapForm','adminInviteAcceptForm']) $(id).hidden = id !== formId;
}
function authNote(message, error=false) { note('authMessage',message,error); }
$('adminLoginForm').addEventListener('submit',async e=>{
  e.preventDefault();buttonBusy(e.currentTarget,true);authNote('');
  try{
    await api('admin-auth/login',{method:'POST',body:{email:$('adminEmail').value,password:$('adminPassword').value}});
    $('adminPassword').value='';
    await loadAdmin();
  }catch(err){
    authNote(err.message==='acesso_temporariamente_bloqueado'?'Muitas tentativas. Tente novamente após 15 minutos.':err.message==='erro_interno'?'O serviço ainda não está configurado.':'E-mail ou senha incorretos.',true);
  }finally{buttonBusy(e.currentTarget,false);}
});
$('adminBootstrapForm').addEventListener('submit',async e=>{
  e.preventDefault();buttonBusy(e.currentTarget,true);authNote('');
  try {
    await api('admin-auth/bootstrap',{method:'POST',body:{name:$('bootstrapName').value,email:$('bootstrapEmail').value,password:$('bootstrapPassword').value,setupToken:$('bootstrapToken').value}});
    $('adminBootstrapForm').reset();showAuthScreen('adminLoginForm');authNote('Conta principal criada. Faça login com o e-mail e a senha cadastrados.');
  }catch(err){authNote(err.message==='ativacao_nao_configurada'?'A chave do primeiro acesso ainda não foi configurada no servidor.':'Não foi possível ativar. Verifique a chave e os dados.',true);}
  finally{buttonBusy(e.currentTarget,false);}
});
$('adminInviteAcceptForm').addEventListener('submit',async e=>{
  e.preventDefault();buttonBusy(e.currentTarget,true);authNote('');
  try{
    await api('admin-auth/accept',{method:'POST',body:{email:$('invitedEmail').value,password:$('invitedPassword').value,token:invitationToken}});
    invitationToken=null;
    $('adminInviteAcceptForm').reset();showAuthScreen('adminLoginForm');
    authNote('Sua senha foi cadastrada. Faça login para acessar a administração.');
  }catch{authNote('Convite inválido, expirado ou já utilizado. Solicite um novo ao responsável.',true);}
  finally{buttonBusy(e.currentTarget,false);}
});
async function loadAdmin() {
  const session=await api('session');
  if(!session.admin)throw new Error('unauthorized');
  $('staffView').hidden=false;$('accessDenied').hidden=true;$('logout').hidden=false;
  $('adminTopUser').textContent=session.name||'Administrador';
  $('adminIdentity').textContent=(session.name||'Administrador')+' · '+(session.email||'')+' · '+(session.role==='owner'?'Responsável principal':'Administrador');
  $('ownerPanel').hidden=session.role!=='owner';
  const requested=location.hash.slice(1);
  showAdminView(Object.hasOwn(ADMIN_VIEW_LABELS,requested)?requested:'overview',false);
  try { await refreshClients(); } catch {
    $('recentClientsList').replaceChildren(emptyContent('Não foi possível carregar os clientes. Atualize a página para tentar novamente.'));
    $('clientsList').replaceChildren(emptyContent('Não foi possível carregar os cadastros.'));
    $('statClients').textContent='—';$('statProjects').textContent='—';$('statActiveClients').textContent='—';
  }
  if(session.role==='owner') {
    try { await refreshAdminUsers(); }
    catch { note('inviteAdminMessage','Não foi possível carregar a equipe. Atualize a página para tentar novamente.',true); }
  }
}
$('changePasswordForm').addEventListener('submit',async e=>{
  e.preventDefault();buttonBusy(e.currentTarget,true);note('changePasswordMessage','');
  try{
    await api('admin-auth/change-password',{method:'POST',body:{currentPassword:$('oldPassword').value,newPassword:$('newPassword').value}});
    $('changePasswordForm').reset();
    $('staffView').hidden=true;$('logout').hidden=true;showAuthScreen('adminLoginForm');
    authNote('Senha alterada. Faça login novamente com a nova senha.');
  }catch{note('changePasswordMessage','Não foi possível trocar a senha. Confira a senha atual e o mínimo de 12 caracteres.',true);}
  finally{buttonBusy(e.currentTarget,false);}
});
$('inviteAdminForm').addEventListener('submit',async e=>{
  e.preventDefault();buttonBusy(e.currentTarget,true);note('inviteAdminMessage','');
  try{
    const created=await api('admin-auth/invite',{method:'POST',body:{name:$('inviteName').value,email:$('inviteEmail').value}});
    $('invitationLink').value=location.origin+'/admin#convite='+created.invitationToken;
    $('invitationResult').hidden=false;
    $('inviteAdminForm').reset();
    note('inviteAdminMessage','Convite individual gerado. Válido por 24 horas. Envie o link em um canal privado.');
  }catch{note('inviteAdminMessage','Não foi possível criar o convite. Confira os dados.',true);}
  finally{buttonBusy(e.currentTarget,false);}
});
$('copyInvitation').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('invitationLink').value);note('inviteAdminMessage','Link copiado. Compartilhe somente com o destinatário.');}
  catch{$('invitationLink').select();note('inviteAdminMessage','Selecione e copie o link acima manualmente.');}
});
async function refreshAdminUsers(){
  const result=await api('admin-auth/users');
  const list=$('adminUsers');list.replaceChildren();
  result.users.forEach(user=>{
    const row=document.createElement('div');row.className='staff-row admin-user-row';
    const info=document.createElement('div');const title=document.createElement('strong');
    title.textContent=user.name+' · '+(user.role==='owner'?'Responsável principal':'Administrador');
    const sub=document.createElement('small');sub.textContent=user.email+' · '+(user.active?'Ativo':'Desativado');
    info.append(title,sub);row.append(info);
    if(user.role==='admin'){
      const btn=document.createElement('button');btn.className='text-button';btn.type='button';
      btn.textContent=user.active?'Desativar acesso':'Reativar acesso';
      btn.addEventListener('click',async()=>{
        const active=!user.active;
        if(!window.confirm(active?'Reativar acesso deste administrador?':'Desativar acesso deste administrador e encerrar as sessões dele?'))return;
        btn.disabled=true;
        try{await api('admin-auth/user-status',{method:'POST',body:{id:user.id,active}});await refreshAdminUsers();}
        catch{note('inviteAdminMessage','Não foi possível atualizar o acesso.',true);btn.disabled=false;}
      });
      row.append(btn);
    }
    list.append(row);
  });
}
$('logout').addEventListener('click', async () => {
  try{await api('auth/logout',{method:'POST',body:{}});}catch{}
  window.location.replace('/admin');
});
(async()=>{
  const params=new URLSearchParams(location.hash.slice(1));
  invitationToken=params.get('convite');
  if(invitationToken)history.replaceState(null,'',location.pathname+location.search);
  try{
    if(invitationToken){showAuthScreen('adminInviteAcceptForm');return;}
    const session=await api('session');
    if(session.admin){await loadAdmin();return;}
  }catch{}
  try{
    const status=await api('admin-auth/status');
    showAuthScreen(status.initialized?'adminLoginForm':'adminBootstrapForm');
  }catch{
    showAuthScreen('adminLoginForm');
    authNote('O banco de dados da área administrativa ainda não está disponível.',true);
  }
})();

