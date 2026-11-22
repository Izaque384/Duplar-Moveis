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


test('marca d’água DM original presente apenas nas regiões escuras planejadas', () => {
 const homepage = readFileSync('theme-monochrome.css','utf8');
 const clientCss = readFileSync('cliente/styles.css','utf8');
 const adminCss = readFileSync('equipe.css','utf8');
 for (const css of [homepage,clientCss,adminCss]) {
   assert.ok(css.includes('logo-marca.png'));
   assert.ok(css.includes('pointer-events: none;'));
   assert.ok(css.includes('aspect-ratio: 400 / 403;'));
 }
 assert.ok(homepage.includes('.ambientes::before'));
 assert.ok(homepage.includes('.depoimento-secao::after'));
 assert.ok(homepage.includes('.cta-final::after'));
 assert.ok(clientCss.includes('.entry-screen::after'));
 assert.ok(clientCss.includes('.portal-workspace::before'));
 assert.ok(adminCss.includes('.login-layout::before'));
 assert.ok(adminCss.includes('#staffView::before'));
});
