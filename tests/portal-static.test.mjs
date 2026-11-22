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
 assert.equal(existsSync('dist/netlify/functions/duplar-portal.mjs'),false);
 assert.equal(existsSync('dist/server/admin-auth.mjs'),false);
 assert.equal(existsSync('dist/database/migrations'),false);
});
