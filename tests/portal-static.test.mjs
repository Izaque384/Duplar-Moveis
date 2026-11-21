import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
test('sintaxe dos JavaScript da aplicação',()=>{
  for(const name of ['cliente/app.js','equipe.js','netlify/functions/duplar-portal.mjs','scripts/build.mjs']){
    assert.doesNotThrow(()=>execFileSync(process.execPath,['--check',name]));
  }
});
test('portal tem exatamente as quatro telas acordadas',()=>{
 const html=readFileSync('cliente/index.html','utf8');
 const actual=[...html.matchAll(/class="portal-view" data-panel="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(actual,['contratos','notas','projeto','atendimento']);
});
test('build não publica API, segredos e migrações',()=>{
 execFileSync(process.execPath,['scripts/build.mjs']);
 assert.ok(existsSync('dist/cliente/index.html'));
 assert.ok(existsSync('dist/equipe.html'));
 assert.equal(existsSync('dist/netlify/functions/duplar-portal.mjs'),false);
 assert.equal(existsSync('dist/database/migrations'),false);
});
