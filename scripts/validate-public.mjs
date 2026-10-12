// 仓库与站点包分别按精确文件白名单验证；错误不回显内容或敏感路径。
import {lstatSync, readdirSync, readFileSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseCalendarJSON, validateCalendar} from '../assets/model.mjs';
export const ARTIFACT_FILES=Object.freeze([
 'CNAME','index.html','assets/app.mjs','assets/model.mjs','assets/styles.css','data/calendar.json'
]);
export const REPOSITORY_FILES=Object.freeze([
 ...ARTIFACT_FILES,'README.md','scripts/validate-public.mjs','.github/workflows/pages.yml',
 'tests/model.test.mjs','tests/validate-public.test.mjs',
 'tests/fixtures/calendar_public_v1.json','tests/fixtures/unicode_public_predicates.json'
]);
const fail=()=>{throw new Error('public_package_invalid');};
function plain(path,directory=false){
 const info=lstatSync(path);
 if(info.isSymbolicLink()||!(directory?info.isDirectory():info.isFile())||!directory&&info.nlink!==1)fail();
}
export function validatePublicDirectory(directory,{mode='repository'}={}){
 if(!['repository','artifact'].includes(mode))fail();
 const root=resolve(directory);let parent=root;
 while(true){plain(parent,true);const next=dirname(parent);if(next===parent)break;parent=next;}
 const files=new Set(mode==='repository'?REPOSITORY_FILES:ARTIFACT_FILES);
 const dirs=new Set([...files].flatMap(file=>{const parts=file.split('/');parts.pop();return parts.map((_,i)=>parts.slice(0,i+1).join('/'));}));
 const seen=new Set();
 function walk(path,prefix=''){
  for(const name of readdirSync(path)){
   const item=join(path,name),relative=prefix+name;
   if(mode==='repository'&&relative==='.git'){plain(item,true);continue;}
   const info=lstatSync(item);
   if(info.isDirectory()){
    plain(item,true);if(!dirs.has(relative))fail();walk(item,relative+'/');
   }else{
    plain(item);if(!files.has(relative))fail();seen.add(relative);
   }
  }
 }
 walk(root);if(seen.size!==files.size||[...files].some(file=>!seen.has(file)))fail();
 if(readFileSync(join(root,'CNAME'),'utf8')!=='reset.amm907.com\n')fail();
 const bytes=readFileSync(join(root,'data/calendar.json'));
 const input=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
 validateCalendar(parseCalendarJSON(input));return true;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const args=process.argv.slice(2);let mode='repository',directory=dirname(dirname(fileURLToPath(import.meta.url)));
  if(args.length){if(args.length!==2||!['--repository','--artifact'].includes(args[0]))fail();mode=args[0].slice(2);directory=args[1];}
  validatePublicDirectory(directory,{mode});console.log('Public '+mode+' validated.');
 }catch{console.error('Public package validation failed.');process.exitCode=1;}
}
