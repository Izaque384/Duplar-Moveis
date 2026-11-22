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
