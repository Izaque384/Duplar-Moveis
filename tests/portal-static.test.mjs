import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
test('sintaxe dos JavaScript da aplicação',()=>{
 for(const name of ['cliente/app.js','equipe.js','netlify/functions/duplar-portal.mjs','server/admin-auth.mjs','scripts/build.mjs']){
  assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',name]));
 }
});
test('portal do cliente contém somente quatro áreas',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 assert.deepEqual([...html.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(m=>m[1]),['contratos','notas','projeto','atendimento']);
});
test('acesso administrativo é separado do OTP do cliente',()=>{
 const api=readFileSync('netlify/functions/duplar-portal.mjs','utf8');
 const auth=readFileSync('server/admin-auth.mjs','utf8');
 assert.equal(api.includes('isAdminPhone('),false);
 assert.ok(api.includes("route.startsWith('admin-auth/')"));
 assert.ok(auth.includes("route==='admin-auth/login'"));
 assert.ok(auth.includes("route==='admin-auth/bootstrap'"));
 assert.ok(auth.includes("route==='admin-auth/invite'"));
 assert.ok(auth.includes("route==='admin-auth/change-password'"));
 assert.ok(auth.includes('131072'));
});
test('build não publica o backend nem os segredos',()=>{
 execFileSync(process.execPath,['scripts/build.mjs']);
 assert.ok(existsSync('dist/cliente/index.html'));
 assert.ok(existsSync('dist/equipe.html'));
 assert.ok(existsSync('dist/admin/index.html'));
 assert.equal(existsSync('dist/netlify/functions/duplar-portal.mjs'),false);
 assert.equal(existsSync('dist/server/admin-auth.mjs'),false);
 assert.equal(existsSync('dist/database/migrations'),false);
});

test('rota /admin preserva a tela administrativa sem criar outra página',()=>{
  const config=readFileSync('netlify.toml','utf8');
  const html=readFileSync('equipe.html','utf8');
  const js=readFileSync('equipe.js','utf8');
  assert.match(config,/from = "\/admin"\s+to = "\/equipe\.html"\s+status = 200/);
  assert.match(config,/from = "\/admin\/"\s+to = "\/equipe\.html"\s+status = 200/);
  assert.match(html,/<link rel="stylesheet" href="\/equipe\.css">/);
  assert.match(html,/<script src="\/equipe\.js" defer>/);
  assert.ok(!html.includes('Administradores entram com e-mail e senha próprios.'));
  assert.ok(!html.includes('Não possui acesso? Solicite um convite'));
  assert.ok(js.includes("window.location.replace('/admin')"));
  assert.ok(js.includes("location.origin+'/admin#convite='"));
  assert.ok(readFileSync('equipe.css','utf8').includes('body:has(#accessDenied:not([hidden]))'));
});

test('hero não carrega fotografias antigas durante inicialização',()=>{
 const html=readFileSync('index.html','utf8');
 const css=readFileSync('theme-monochrome.css','utf8');
 assert.ok(html.includes('class="hero-poster" src="assets/video/hero-duplar-poster-v2.jpg"'));
 assert.ok(html.includes('poster="assets/video/hero-duplar-poster-v2.jpg"'));
 assert.ok(html.includes('data-src-desktop="assets/video/hero-duplar-wide-v2.mp4"'));
 assert.ok(html.includes('data-src-mobile="assets/video/hero-duplar-mobile-v2.mp4"'));
 for(const name of ['assets/img/hero.jpg','assets/img/hero.webp','assets/img/hero-cozinha-ajustada.avif']){
   assert.equal(html.includes(name),false);
   assert.equal(existsSync('dist/'+name),false);
 }
 assert.ok(css.includes('.hero-media .hero-poster'));
 assert.ok(css.includes('animation: none'));
 assert.ok(existsSync('dist/assets/video/hero-duplar-poster-v2.jpg'));
});


test('admin possui cinco áreas claras, com IDs únicos e navegação associada',()=>{
 const html=readFileSync('equipe.html','utf8');
 const panels=[...html.matchAll(/<section class="admin-view" id="([^"]+)" data-admin-panel="([^"]+)"/g)]
   .map(match=>({id:match[1],view:match[2]}));
 const links=[...html.matchAll(/<button[^>]+data-admin-view="([^"]+)" aria-controls="([^"]+)"/g)]
   .map(match=>({view:match[1],id:match[2]}));
 assert.deepEqual(panels.map(p=>p.view),['overview','clients','projects','documents','account']);
 assert.deepEqual(links,panels.map(p=>({view:p.view,id:p.id})));
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(new Set(ids).size,ids.length,'Nenhum ID duplicado na página');
 for(const required of ['adminLoginForm','adminBootstrapForm','adminInviteAcceptForm',
  'clientForm','projectForm','documentForm','changePasswordForm',
  'inviteAdminForm','ownerPanel','adminUsers','logout','clientSearch',
  'recentClientsList','projectsList','statClients','statProjects','statActiveClients']){
   assert.ok(ids.includes(required),'ID ausente: '+required);
 }
});
test('navegação, filtros e contagem administrativa usam os dados atuais sem API nova',()=>{
 const code=readFileSync('equipe.js','utf8');
 assert.ok(code.includes("document.querySelectorAll('[data-admin-view], [data-admin-goto]')"));
 assert.ok(code.includes("adminCurrentView = view"));
 assert.ok(code.includes("data.clients"));
 assert.ok(code.includes("Number(c.project_count||0)"));
 assert.ok(code.includes("clientSearch"));
 assert.ok(code.includes("async function refreshClientProjects()"));
 assert.ok(code.includes("admin/projects?client="));
 assert.ok(code.includes("async function loadAdmin()"));
 const api=readFileSync('netlify/functions/duplar-portal.mjs','utf8');
 assert.ok(api.includes("if (!user.admin) return response({ error: 'acesso_negado' }, 403)"));
});

test('admin preserva um único landmark main e mantém login distinto do painel',()=>{
 const html=readFileSync('equipe.html','utf8');
 assert.equal((html.match(/<main\b/g)||[]).length,1);
 assert.match(html,/<main class="portal-main">/);
 assert.match(html,/<div class="admin-page" id="adminPage">/);
 assert.match(html,/<section id="accessDenied" class="login-layout" hidden/);
 assert.match(html,/<section id="staffView" class="admin-shell" hidden/);
});

test('entrada do cliente sem lista numerada de benefícios, preservando quatro áreas internas',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const screen=html.slice(html.indexOf('<div id="entryScreen"'),html.indexOf('<div id="dashboard"'));
 assert.ok(!screen.includes('entry-values'));
 for(const phrase of ['Contratos privados','Notas fiscais para download','Orçamento e serviços contratados','Atendimento pelo WhatsApp']){
  assert.ok(!screen.includes(phrase),'Texto antigo da entrada: '+phrase);
 }
 assert.ok(html.includes('id="phoneForm"'));
 assert.ok(html.includes('id="codeForm"'));
 assert.deepEqual([...html.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(m=>m[1]),['contratos','notas','projeto','atendimento']);
});

test('entrada do cliente sem título e instrução removidos, preservando login',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const entry=html.slice(html.indexOf('<div id="entryScreen"'),html.indexOf('<div id="dashboard"'));
 assert.ok(!entry.includes('Seu projeto, em <em>cada detalhe.'));
 assert.ok(!entry.includes('Receba um código temporário no WhatsApp cadastrado com a Duplar.'));
 assert.ok(entry.includes('Consulte seus contratos, notas fiscais'));
 assert.ok(entry.includes('id="phoneForm"'));
 assert.ok(entry.includes('id="codeForm"'));
 const css=readFileSync('cliente/styles.css','utf8');
 assert.ok(css.includes('.entry-lead{font-size:clamp(1rem,1.5vw,1.2rem)'));
 assert.ok(!css.includes('#entryScreen .entry-copy .entry-lead'));
 assert.ok(css.includes('.entry-copy .entry-lead { margin-top: clamp(18px, 3svh, 30px); margin-bottom: 0; }'));
});


test('seção Diferenciais não mostra fotos antigas enquanto vídeo carrega',()=>{
 const html=readFileSync('index.html','utf8');
 const script=readFileSync('script.js','utf8');
 const css=readFileSync('theme-monochrome.css','utf8');
 const section=html.slice(html.indexOf('<section class="diferenciais cine-section"'),html.indexOf('<!-- ATENDIMENTO / CONVERSÃO FINAL -->'));
 assert.ok(section.includes('id="cineVideo"'));
 assert.ok(section.includes('data-src-desktop="assets/video/duplar-detalhes-wide.mp4"'));
 assert.ok(section.includes('data-src-mobile="assets/video/duplar-detalhes-mobile.mp4"'));
 assert.equal((section.match(/data-cine-scene=/g)||[]).length,4);
 assert.ok(!section.includes('data-cine-still'));
 assert.ok(!section.includes('cozinha-planejada-full'));
 assert.ok(!section.includes('cozinha-gourmet-full'));
 assert.ok(!section.includes('cozinha-bancada-full'));
 assert.ok(!section.includes('sala-integrada-full'));
 assert.ok(!section.includes('poster="assets/video/duplar-detalhes-poster.jpg"'));
 assert.ok(!script.includes("querySelectorAll('[data-cine-still]')"));
 assert.ok(!css.includes('.cine-still'));
 assert.ok(css.includes('.cine-media { z-index: 0; overflow: hidden; background: #111315; }'));
});

test('identificador e texto de entrada têm espaço apropriado sem mudar fonte',()=>{
 const css=readFileSync('cliente/styles.css','utf8');
 const html=readFileSync('cliente/index.html','utf8');
 const entry=html.slice(html.indexOf('<div id="entryScreen"'),html.indexOf('<div id="dashboard"'));
 assert.ok(entry.includes('DUPLAR / ÁREA DO CLIENTE'));
 assert.ok(entry.includes('Consulte seus contratos, notas fiscais, informações do projeto e converse diretamente com a Duplar.'));
 assert.ok(css.includes('.entry-copy .entry-lead { margin-top: clamp(18px, 3svh, 30px); margin-bottom: 0; }'));
 assert.ok(css.includes('.entry-copy .entry-lead { margin-top: clamp(14px, 2.5svh, 22px); }'));
 assert.ok(!css.includes('#entryScreen .entry-copy .entry-lead'));
});


test('interior do portal sem avisos e blocos de demonstração redundantes',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const js=readFileSync('cliente/app.js','utf8');
 const css=readFileSync('cliente/styles.css','utf8');
 const dashboard=html.slice(html.indexOf('<div id="dashboard"'));
 for(const phrase of ['Seu espaço, em construção.','PORTAL DO CLIENTE','ÁREAS DO CLIENTE',
    'Encerrar demonstração','DADOS ILUSTRATIVOS','Prévia visual.','Nenhuma informação de cliente está sendo exibida.']){
   assert.equal(dashboard.includes(phrase),false,phrase);
 }
 for(const id of ['demoNotice','demoIndicator','portalGreeting','exitPortal']){
   assert.equal(js.includes("$('"+id+"')"),false,'Referência JS obsoleta: '+id);
 }
 assert.match(dashboard,/<a href="\.\.\/" class="top-home" aria-label="Voltar ao site da Duplar">Voltar ao site/);
 assert.ok(css.includes('.top-home{display:inline-flex;'));
 assert.ok(html.includes('id="topExit"'));
 assert.ok(js.includes("$('topExit').addEventListener('click',exit)"));
 assert.deepEqual([...html.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(x=>x[1]),['contratos','notas','projeto','atendimento']);
});


test('rodapé lateral identifica cliente real ou visitante em demonstração sem inventar dados',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const js=readFileSync('cliente/app.js','utf8');
 const css=readFileSync('cliente/styles.css','utf8');
 const sidebar=html.slice(html.indexOf('<aside class="sidebar"'),html.indexOf('</aside>'));
 assert.match(sidebar,/<div class="sidebar-client-profile" role="group" aria-label="Identificação do cliente">/);
 for(const id of ['clientProfileInitials','clientProfileName','clientProfileLabel']){
   assert.ok(sidebar.includes('id="'+id+'"'));
   assert.ok(js.includes("$('"+id+"')"));
 }
 assert.ok(sidebar.indexOf('sidebar-client-profile')>sidebar.indexOf('</nav>'));
 assert.ok(js.includes("const name = demo ? 'Visitante'"));
 assert.ok(js.includes("portal.name.trim()"));
 assert.ok(js.includes("renderClientProfile();"));
 assert.ok(js.includes("demo ? 'Prévia ilustrativa' : 'Cliente Duplar'"));
 assert.ok(css.includes('margin-top: auto;'));
 assert.ok(css.includes('text-overflow: ellipsis;'));
 assert.deepEqual([...html.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(m=>m[1]),['contratos','notas','projeto','atendimento']);
});


test('quatro telas do cliente priorizam arquivos e ações sem banners repetitivos',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const dashboard=html.slice(html.indexOf('<div id="dashboard"'));
 const sections=[...dashboard.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(sections,['contratos','notas','projeto','atendimento']);
 for(const id of ['contractsCount','invoicesCount','contractsList','invoicesList','projectName',
   'projectStatus','projectBudget','projectServices','supportLink']){
   assert.ok(dashboard.includes('id="'+id+'"'),'Campo do portal: '+id);
 }
 assert.ok(!dashboard.includes('class="details-banner"'));
 assert.ok(!dashboard.includes('class="financial-grid"'));
 assert.ok(!dashboard.includes('class="support-grid"'));
 assert.ok(!dashboard.includes('projectStatusCard'));
 assert.ok(!dashboard.includes('projectTitleCard'));
 assert.equal((dashboard.match(/class="client-files-panel"/g)||[]).length,2);
 assert.equal((dashboard.match(/data-client-goto=/g)||[]).length,5);
 assert.match(dashboard,/<a id="supportLink"[^>]+target="_blank" rel="noopener noreferrer">Abrir WhatsApp/);
});
test('downloads protegidos, contadores dinâmicos e ações rápidas funcionam pelo mesmo backend',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const js=readFileSync('cliente/app.js','utf8');
 const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
 assert.ok(js.includes("function updateDocumentCount(kind,count)"));
 assert.ok(js.includes("count===1?'arquivo':'arquivos'"));
 assert.ok(js.includes("portal.documents.filter(d=>d.kind===kind && d.project_id===projectId)"));
 assert.ok(js.includes("fetch('/api/duplar/document/'+encodeURIComponent(id)"));
 assert.ok(js.includes("button.disabled=true"));
 assert.ok(js.includes("textContent='Baixar PDF ↗'"));
 assert.ok(js.includes("data-client-goto"));
 assert.ok(js.includes("button.addEventListener('click',()=>setView(button.dataset.clientGoto))"));
 assert.ok(js.includes("portal.projects.length<=1"));
 assert.ok(js.includes("demo||!projectId?[]"));
 for(const match of js.matchAll(/\$\('([^']+)'\)/g)){
  assert.ok(ids.has(match[1]),'ID referenciado pelo JS: '+match[1]);
 }
 assert.equal(ids.size,[...html.matchAll(/\bid="([^"]+)"/g)].length);
});
test('telas internas responsivas com botões e estados vazios, sem alterar login',()=>{
 const css=readFileSync('cliente/styles.css','utf8');
 const html=readFileSync('cliente/index.html','utf8');
 const entry=html.slice(html.indexOf('<div id="entryScreen"'),html.indexOf('<div id="dashboard"'));
 assert.ok(entry.includes('id="phoneForm"'));
 assert.ok(entry.includes('id="codeForm"'));
 for(const selector of ['#dashboard .client-page-heading','#dashboard .client-files-panel',
 '#dashboard .client-document-info','#dashboard .client-download-action',
 '#dashboard .client-empty-state','#dashboard .client-project-overview',
 '#dashboard .client-project-details','#dashboard .client-whatsapp-action']){
  assert.ok(css.includes(selector),'Estilo ausente: '+selector);
 }
 assert.ok(css.includes('@media (max-width: 480px)'));
 assert.ok(css.includes('grid-column: 1 / -1;'));
});


test('diagnóstico do acesso WhatsApp não expõe segredos e exige responsável principal',()=>{
 const api=readFileSync('netlify/functions/duplar-portal.mjs','utf8');
 const js=readFileSync('equipe.js','utf8');
 const html=readFileSync('equipe.html','utf8');
 const css=readFileSync('equipe.css','utf8');
 const route="if (method === 'GET' && route === 'admin/client-access-status')";
 const ownerCheck="if (user.role !== 'owner') return response({ error: 'acesso_negado' }, 403)";
 assert.ok(api.includes(route));
 assert.ok(api.includes(ownerCheck));
 assert.ok(api.indexOf("if (!user.admin)")<api.indexOf(route));
 assert.ok(api.indexOf(route)<api.indexOf("if (method === 'GET' && route === 'admin/clients')"));
 const source=api.slice(api.indexOf('function clientAccessReadiness()'),api.indexOf('function sha(value)'));
 for(const key of ['PORTAL_OTP_SECRET','META_WHATSAPP_TOKEN','META_PHONE_NUMBER_ID','PORTAL_SUPPORT_WHATSAPP']){
   assert.ok(source.includes(key));
 }
 assert.ok(source.includes('templateApprovalVerified: false'));
 assert.ok(source.includes('deliveryTested: false'));
 assert.ok(source.includes('configurationComplete:'));
 assert.ok(!source.includes('accessToken: accessToken'));
 assert.ok(!source.includes('otpSecret: otpSecret,'));
 for(const id of ['otpPanel','otpSummary','otpSecretState','otpMetaTokenState','otpPhoneIdState',
  'otpSupportState','otpTemplateState','refreshOtpStatus']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.ok(html.includes('id="otpPanel" hidden'));
 assert.ok(js.includes("$('otpPanel').hidden=session.role!=='owner'"));
 assert.ok(js.includes("await api('admin/client-access-status')"));
 assert.ok(js.includes("refreshClientAccessStatus()"));
 assert.ok(css.includes('.admin-otp-panel { grid-column: 1 / -1; }'));
});


test('botão WhatsApp é responsivo sem rolagem horizontal em celulares',()=>{
 const css=readFileSync('cliente/styles.css','utf8');
 assert.ok(css.includes('#dashboard .client-contact-panel { overflow-wrap: anywhere; }'));
 assert.ok(css.includes('#dashboard .client-whatsapp-action {'));
 assert.ok(css.includes('white-space: normal;'));
 assert.ok(css.includes('max-width: 100%;'));
});

test('upload privado exige cliente e projeto associados no servidor',()=>{
 const api=readFileSync('netlify/functions/duplar-portal.mjs','utf8');
 const js=readFileSync('equipe.js','utf8');
 assert.ok(api.includes("String(form.get('clientId') || '')"),'Falta vincular cliente no payload');
 assert.ok(api.includes("'SELECT id FROM portal_projects WHERE id = $1 AND client_id = $2 LIMIT 1'"),'Associação cliente/projeto não validada');
 assert.ok(api.includes('[projectId, clientId]'),'Parâmetros do vínculo ausentes');
 assert.ok(api.includes("if (!/\\.pdf$/i.test(file.name || ''))"),'Extensão PDF não validada');
 assert.ok(js.includes("form.append('clientId', $('documentClient').value)"),'Frontend não envia cliente');
 assert.ok(js.includes("requestId !== documentProjectsRequest"),'Respostas atrasadas podem misturar clientes');
 assert.ok(js.includes("select.disabled = true"),'Seleção de projeto deve aguardar nova consulta');
});

test('fluxos privados filtram documentos por cliente e impedem projetos de clientes inativos',()=>{
 const api=readFileSync('netlify/functions/duplar-portal.mjs','utf8');
 assert.ok(api.includes('WHERE p.client_id = $1 ORDER BY d.created_at DESC'),'Documentos da sessão não filtrados');
 assert.ok(api.includes('WHERE d.id = $1 AND ($2::boolean OR p.client_id = $3::uuid)'),'Download não verifica o proprietário');
 assert.ok(api.includes("SELECT id FROM portal_clients WHERE id = $1 AND active = true LIMIT 1"),'Projetos não devem ser criados para cliente inativo');
 assert.ok(api.includes("if (!user.admin) return response({ error: 'acesso_negado' }, 403)"),'Ações administrativas devem exigir sessão');
 assert.ok(api.includes("if (user.role !== 'owner') return response({ error: 'acesso_negado' }, 403)"),'Diagnóstico Meta deve exigir responsável');
});
