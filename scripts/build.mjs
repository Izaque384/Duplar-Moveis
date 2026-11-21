import { cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Publica apenas o site estático. NUNCA publicar backend, migrations ou arquivos .env.
const out = resolve('dist');
mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'styles.css', 'script.js', 'cliente.html', 'cliente.css', 'cliente.js', 'equipe.html', 'equipe.js']) {
  copyFileSync(resolve(file), resolve(out, file));
}
cpSync(resolve('assets'), resolve(out, 'assets'), { recursive: true });
console.log('Duplar: arquivos públicos preparados em dist/');
