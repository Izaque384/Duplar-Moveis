const apiRoot = '/api/duplar/';
const $ = (id) => document.getElementById(id);
let accountPhone = '';
let portal = null;

async function requestApi(path, options = {}) {
  const config = {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers: { 'x-duplar-request': '1' }
  };
  if (options.body !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(options.body);
  }
  const response = await fetch(apiRoot + path, config);
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) {
    const error = new Error(data.error || 'Não foi possível realizar a operação.');
    error.status = response.status;
    throw error;
  }
  return data;
}
function message(el, content, error = false) {
  el.textContent = content;
  el.classList.toggle('error', error);
}
function humanError(error) {
  const names = {
    servico_indisponivel: 'O acesso por WhatsApp ainda não está ativo. Tente novamente após a configuração.',
    envio_indisponivel: 'Não foi possível enviar o código neste momento. Tente novamente mais tarde.',
    muitas_tentativas: 'Muitas solicitações. Aguarde pelo menos 15 minutos antes de tentar novamente.',
    codigo_invalido_ou_expirado: 'Código incorreto ou expirado. Solicite outro e tente novamente.',
    telefone_invalido: 'Informe um WhatsApp válido com DDD.',
    nao_autorizado: 'Sua sessão expirou. Entre novamente.'
  };
  return names[error.message] || 'Não foi possível continuar. Tente novamente.';
}
function setBusy(button, active) {
  button.disabled = active;
  button.dataset.caption ||= button.textContent;
  button.textContent = active ? 'Aguarde…' : button.dataset.caption;
}
$('phoneForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('sendCode');
  setBusy(btn, true);
  message($('loginMessage'), '');
  try {
    accountPhone = $('phone').value;
    const result = await requestApi('auth/request', { method: 'POST', body: { phone: accountPhone } });
    $('phoneStep').hidden = true;
    $('codeStep').hidden = false;
    $('code').focus();
    message($('loginMessage'), result.message || 'Confira seu WhatsApp.');
  } catch (err) { message($('loginMessage'), humanError(err), true); }
  finally { setBusy(btn, false); }
});
$('backPhone').addEventListener('click', () => {
  $('codeStep').hidden = true;
  $('phoneStep').hidden = false;
  message($('loginMessage'), '');
});
$('codeForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('verifyCode');
  setBusy(btn, true);
  message($('loginMessage'), '');
  try {
    const result = await requestApi('auth/verify', {
      method: 'POST', body: { phone: accountPhone, code: $('code').value.trim() }
    });
    $('code').value = '';
    if (result.admin) { window.location.replace('equipe.html'); return; }
    await loadPortal();
  } catch (err) { message($('loginMessage'), humanError(err), true); }
  finally { setBusy(btn, false); }
});
$('logout').addEventListener('click', async () => {
  try { await requestApi('auth/logout', { method: 'POST', body: {} }); } catch {}
  window.location.reload();
});
function empty(container, text) {
  container.replaceChildren();
  const p = document.createElement('p');
  p.className = 'no-data';
  p.textContent = text;
  container.append(p);
}
function renderDocuments(target, kind, projectId) {
  const container = $(target);
  container.replaceChildren();
  const docs = portal.documents.filter(doc => doc.kind === kind && doc.project_id === projectId);
  if (!docs.length) {
    empty(container, kind === 'contract' ? 'Nenhum contrato disponibilizado para este projeto.' : 'Nenhuma nota fiscal disponibilizada para este projeto.');
    return;
  }
  docs.forEach(doc => {
    const row = document.createElement('div');
    row.className = 'document';
    const left = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = doc.filename;
    const caption = document.createElement('small');
    caption.textContent = new Date(doc.created_at).toLocaleDateString('pt-BR');
    left.append(title, caption);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Baixar PDF';
    button.addEventListener('click', () => downloadPdf(doc.id, doc.filename, button));
    row.append(left, button);
    container.append(row);
  });
}
async function downloadPdf(id, filename, button) {
  button.disabled = true;
  message($('dashboardMessage'), '');
  let objectUrl;
  try {
    const res = await fetch(apiRoot + 'document/' + encodeURIComponent(id), { credentials: 'same-origin' });
    if (!res.ok) throw new Error('download');
    const file = await res.blob();
    objectUrl = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename.toLowerCase().endsWith('.pdf') ? filename : filename + '.pdf';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
  } catch {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    message($('dashboardMessage'), 'Não foi possível baixar o arquivo. Entre em contato com a Duplar.', true);
  } finally { button.disabled = false; }
}
function updateProject() {
  const project = portal.projects.find(p => p.id === $('projectSelect').value);
  ['projectTitle','projectStatus','projectBudget','projectDescription','projectServices'].forEach(id => $(id).textContent = '—');
  renderDocuments('contracts', 'contract', project?.id);
  renderDocuments('invoices', 'invoice', project?.id);
  if (!project) return;
  $('projectTitle').textContent = project.title;
  $('projectStatus').textContent = project.status || 'Não informado';
  $('projectBudget').textContent = project.budget_cents === null ? 'Não informado' :
    (Number(project.budget_cents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  $('projectDescription').textContent = project.description || 'A Duplar ainda não adicionou uma descrição.';
  $('projectServices').textContent = project.services || 'A Duplar ainda não detalhou os serviços.';
}
$('projectSelect').addEventListener('change', updateProject);
async function loadPortal() {
  portal = await requestApi('projects');
  $('loginView').hidden = true;
  $('dashboardView').hidden = false;
  $('logout').hidden = false;
  $('welcome').textContent = 'Olá, ' + (portal.name || 'cliente') + '. Consulte suas informações de forma privada.';
  const select = $('projectSelect');
  select.replaceChildren();
  portal.projects.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = p.title;
    select.append(option);
  });
  $('emptyProjects').hidden = portal.projects.length !== 0;
  $('projectSelect').disabled = portal.projects.length === 0;
  updateProject();
  if (portal.supportWhatsapp) {
    $('supportLink').href = 'https://wa.me/' + portal.supportWhatsapp + '?text=' + encodeURIComponent('Olá, sou cliente da Duplar e gostaria de falar sobre meu projeto.');
    $('supportLink').hidden = false;
    $('supportUnavailable').hidden = true;
  } else {
    $('supportUnavailable').hidden = false;
  }
  try {
    const session = await requestApi('session');
    $('teamLink').hidden = !session.admin;
  } catch {}
}
(async () => {
  try {
    const session = await requestApi('session');
    if (session.authenticated) {
      if (session.admin) { window.location.replace('equipe.html'); return; }
      await loadPortal();
    }
  } catch (err) {
    if (err.status !== 401) message($('loginMessage'), 'O portal ainda não está disponível. Tente mais tarde.', true);
  }
})();
