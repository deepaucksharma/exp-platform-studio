#!/usr/bin/env node

/**
 * Update Checksum Cache
 */

const fs = require('fs');
const path = require('path');
const { walk } = require('./gen-file-map');

const CACHE = '.cache/file-map.json';
const DIFF_LOG = '.cache/checksum-diff.log';

function readJSON(p){ try{return JSON.parse(fs.readFileSync(p,'utf8'));}catch{return {};}}
function log(msg){
  console.log(msg);
  fs.appendFileSync(DIFF_LOG,`[${new Date().toISOString()}] ${msg}\n`);
}

async function main(){
  const oldMap = readJSON(CACHE);
  const newMap = await walk(process.cwd());
  const added=[],removed=[],modified=[];
  const oldKeys=new Set(Object.keys(oldMap));

  for(const k of Object.keys(newMap)){
    if(!oldKeys.has(k)) added.push(k);
    else{
      if(oldMap[k].sha256!==newMap[k].sha256) modified.push(k);
      oldKeys.delete(k);
    }
  }
  removed.push(...oldKeys);

  log(`Diff: +${added.length} -${removed.length} ~${modified.length}`);
  if(process.env.LOG_CHECKSUM_DETAILS==='true'){
    if(added.length) log('Added: '+added.join(','));
    if(removed.length) log('Removed: '+removed.join(','));
    if(modified.length) log('Modified: '+modified.join(','));
  }

  if(added.length||removed.length||modified.length){
    fs.writeFileSync(CACHE,JSON.stringify(newMap,null,2));
    console.log('Cache updated');
  } else console.log('No changes');
}

main().catch(e=>{console.error(e);process.exit(1);});
