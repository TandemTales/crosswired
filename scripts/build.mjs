import {mkdir,copyFile,writeFile,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),target=new URL('docs/',root);
const assets=['index.html','style.css','app.js','engine.js','favicon.svg'];
await mkdir(target,{recursive:true});
for(const asset of assets){
  await copyFile(new URL(asset,root),new URL(asset,target));
  if(!(await readFile(new URL(asset,root))).equals(await readFile(new URL(asset,target)))) throw new Error('Build copy mismatch: '+asset);
}
await writeFile(new URL('.nojekyll',target),'');
console.log(`Verified ${assets.length} runtime assets in ${fileURLToPath(target)}. No tests, QA evidence or local server files included.`);
