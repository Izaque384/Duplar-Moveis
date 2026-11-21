import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

test('JavaScript do portal tem sintaxe válida', () => {
  for (const file of ['cliente.js', 'equipe.js', 'script.js', 'scripts/build.mjs', 'netlify/functions/duplar-portal.mjs']) {
    assert.doesNotThrow(() => execFileSync(process.execPath, ['--check', file]));
  }
});

test('build público contém quatro áreas e não distribui backend', () => {
  execFileSync(process.execPath, ['scripts/build.mjs']);
  const html = readFileSync('dist/cliente.html', 'utf8');
  for (const area of ['contratos', 'notas', 'projeto', 'atendimento']) {
    assert.ok(html.includes('id="' + area + '"'));
  }
  assert.ok(!existsSync('dist/netlify/functions/duplar-portal.mjs'));
  assert.ok(!existsSync('dist/netlify/database'));
});
