const root = '/api/duplar/';
const $ = id => document.getElementById(id);
let clients = [];
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
async function refreshClients() {
  const data = await api('admin/clients');
  clients = data.clients;
  ['projectClient', 'documentClient'].forEach(id => {
    const selected = $(id).value;
    $(id).replaceChildren(option('', 'Selecione um cliente'));
    clients.filter(c => c.active).forEach(c => $(id).append(option(c.id, c.name + ' · ' + c.phone)));
    $(id).value = clients.some(c => c.id === selected) ? selected : '';
  });
  const list = $('clientsList');
  list.replaceChildren();
  if (!clients.length) { list.textContent = 'Ainda não há clientes cadastrados.'; return; }
  clients.forEach(c => {
    const row = document.createElement('div');
    row.className = 'staff-row';
    const title = document.createElement('strong');
    title.textContent = c.name;
    const detail = document.createElement('small');
    detail.textContent = '+' + c.phone + ' · ' + c.project_count + ' projeto(s)';
    row.append(title, detail);
    list.append(row);
  });
}
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
    note('projectMessage', 'Projeto cadastrado. Já pode enviar contrato e nota fiscal.');
  } catch { note('projectMessage', 'Não foi possível salvar este projeto.', true); }
  finally { buttonBusy(e.currentTarget, false); }
});
$('documentForm').addEventListener('submit', async e => {
  e.preventDefault(); buttonBusy(e.currentTarget, true); note('documentMessage', '');
  try {
    const file = $('documentFile').files[0];
    if (!file || !file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
      throw new Error('invalid');
    }
    const form = new FormData();
    form.append('projectId', $('documentProject').value);
    form.append('kind', $('documentType').value);
    form.append('file', file, file.name);
    await api('admin/documents', { method: 'POST', body: form });
    $('documentFile').value = '';
    note('documentMessage', 'Documento enviado. O cliente já poderá baixá-lo na área dele.');
  } catch { note('documentMessage', 'Não foi possível enviar. Verifique o projeto e o PDF (até 10 MB).', true); }
  finally { buttonBusy(e.currentTarget, false); }
});
$('logout').addEventListener('click', async () => {
  try { await api('auth/logout', { method: 'POST', body: {} }); } catch {}
  window.location.replace('cliente.html');
});
(async () => {
  try {
    const session = await api('session');
    if (!session.admin) throw new Error('no-admin');
    $('staffView').hidden = false;
    $('logout').hidden = false;
    await refreshClients();
  } catch { $('accessDenied').hidden = false; $('staffView').hidden = true; }
})();
