#!/usr/bin/env node

/**
 * File Map Generator
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const minimatch = require('minimatch');

const OUT = '.cache/file-map.json';
const IGNORE_DIRS = ['.git','node_modules','.cache','dist','build','coverage','vendor','target'];
const IGNORE_FILES = ['.DS_Store','*.pyc','*.pyo','*.swp','*.swo','*.lock','*.log'];
const MAX_SIZE = 50*1024*1024;

async function hashFile(fp) {
  return new Promise(resolve=>{
    try{
      const h = crypto.createHash('sha256');
      fs.createReadStream(fp)
        .on('data',d=>h.update(d))
        .on('end',()=>resolve(h.digest('hex')))
        .on('error',()=>resolve('error'));
    }catch{resolve('error');}
  });
}

async function walk(dir, base='', map={}) {
  let entries;
  try { entries = await fs.promises.readdir(dir,{withFileTypes:true}); }
  catch{return map;}
  for(const ent of entries){
    const name=ent.name;
    const full=path.join(dir,name);
    const rel=path.join(base,name);
    if(ent.isDirectory()){
      if(IGNORE_DIRS.includes(name)) continue;
      await walk(full,rel,map);
    } else if(ent.isFile()){
      if(IGNORE_FILES.some(p=>minimatch(name,p))) continue;
      const st = await fs.promises.stat(full).catch(()=>null);
      if(!st||st.size>MAX_SIZE) continue;
      const c = await hashFile(full);
      map[rel]={sha256:c,size:st.size,mtimeMs:st.mtimeMs};
    }
  }
  return map;
}

async function main(){
  const map = await walk(process.cwd());
  await fs.promises.mkdir('.cache',{recursive:true});
  fs.writeFileSync(OUT,JSON.stringify(map,null,2));
  console.log('Generated file map with',Object.keys(map).length,'entries');
}

main().catch(e=>{console.error(e);process.exit(1);});
