import { cpSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('dist');
// Limpa o destino para evitar republicar imagens removidas de builds anteriores.
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for(const file of ['index.html','styles.css','theme-monochrome.css','script.js','equipe.html','equipe.css','equipe.js']){
  if(existsSync(file))copyFileSync(resolve(file),resolve(out,file));
}
for(const dir of ['assets','cliente']){
  if(existsSync(dir))cpSync(resolve(dir),resolve(out,dir),{recursive:true});
}
// Fallback físico para /admin: funciona mesmo se uma regra de rewrite não for aplicada.
mkdirSync(resolve(out,'admin'),{recursive:true});
copyFileSync(resolve('equipe.html'),resolve(out,'admin','index.html'));
console.log('Somente arquivos públicos copiados para dist');
