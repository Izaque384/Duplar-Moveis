import { cpSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const out = resolve('dist');
mkdirSync(out, { recursive: true });
for(const file of ['index.html','styles.css','theme-monochrome.css','script.js','equipe.html','equipe.css','equipe.js']){
  if(existsSync(file))copyFileSync(resolve(file),resolve(out,file));
}
for(const dir of ['assets','cliente']){
  if(existsSync(dir))cpSync(resolve(dir),resolve(out,dir),{recursive:true});
}
console.log('Somente arquivos públicos copiados para dist');
