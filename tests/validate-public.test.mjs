import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync, symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
const script=join(root,'scripts/validate-public.mjs');
function run(directory,mode='artifact'){
 assert.ok(existsSync(script),'Task 8 public package validator is missing');
 return spawnSync(process.execPath,[script,'--'+mode,directory],{encoding:'utf8'});
}
function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'public-package-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 for(const path of ['index.html','assets','data'])cpSync(join(root,path),join(dir,path),{recursive:true});
 writeFileSync(join(dir,'CNAME'),'reset.amm907.com\n');return dir;
}
test('repository and fixed artifact both validate',t=>{
 const dir=fixture(t);assert.equal(run(dir).status,0);
 assert.equal(run(root,'repository').status,0);
});
for(const path of ['runtime/private.txt','secrets/token.txt','tests/fixture.json','README.md','assets/private.json','data/raw-mail.json','.env']){
 test('artifact rejects extra path '+path,t=>{
  const dir=fixture(t),parts=path.split('/');parts.pop();
  if(parts.length)mkdirSync(join(dir,...parts),{recursive:true});
  writeFileSync(join(dir,path),'token=PRIVATE_CANARY_8');
  const result=run(dir);assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,/PRIVATE_CANARY_8/);
 });
}
for(const kind of ['sensitive','schema','duplicate','private_field','malformed']){
 test('artifact rejects '+kind+' calendar data',t=>{
  const dir=fixture(t),file=join(dir,'data/calendar.json');let data=JSON.parse(readFileSync(file));
  if(kind==='sensitive')data.coverage.notes=['token=PRIVATE_CANARY_8'];
  if(kind==='schema')data.calendar_schema_version=2;
  if(kind==='private_field')data.raw_mime='PRIVATE_CANARY_8';
  let text=JSON.stringify(data);
  if(kind==='duplicate')text=text.replace('"calendar_schema_version":1','"calendar_schema_version":1,"calendar_schema_version":1');
  if(kind==='malformed')text='{';writeFileSync(file,text);
  const result=run(dir);assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,/PRIVATE_CANARY_8/);
 });
}
test('artifact rejects symlinked data',t=>{
 const dir=fixture(t);rmSync(join(dir,'data/calendar.json'));symlinkSync(join(root,'data/calendar.json'),join(dir,'data/calendar.json'));
 assert.notEqual(run(dir).status,0);
});
test('artifact rejects wrong domain or missing asset',t=>{
 const dir=fixture(t);writeFileSync(join(dir,'CNAME'),'other.example.com\n');assert.notEqual(run(dir).status,0);
 writeFileSync(join(dir,'CNAME'),'reset.amm907.com\n');rmSync(join(dir,'assets/model.mjs'));assert.notEqual(run(dir).status,0);
});
test('artifact rejects invalid UTF-8 rather than replacing bytes',t=>{
 const dir=fixture(t);writeFileSync(join(dir,'data/calendar.json'),Buffer.from([0xff]));assert.notEqual(run(dir).status,0);
});
test('artifact rejects symlinked directory and root',t=>{
 const dir=fixture(t);rmSync(join(dir,'data'),{recursive:true});symlinkSync(join(root,'data'),join(dir,'data'),'dir');assert.notEqual(run(dir).status,0);
 const alias=join(dir,'alias');symlinkSync(root,alias,'dir');assert.notEqual(run(alias,'repository').status,0);
});
test('repository rejects ignored-looking private directory before publication',t=>{
 const dir=mkdtempSync(join(tmpdir(),'public-repository-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));
 cpSync(root,dir,{recursive:true,filter:p=>!p.includes('/.git/')&&!p.endsWith('/.git')});
 mkdirSync(join(dir,'runtime'));writeFileSync(join(dir,'runtime','private.txt'),'token=PRIVATE_CANARY_8');
 const result=run(dir,'repository');assert.notEqual(result.status,0);assert.doesNotMatch(result.stderr,/PRIVATE_CANARY_8/);
});
test('workflow pins official actions and packages only the fixed site directory',()=>{
 const text=readFileSync(join(root,'.github/workflows/pages.yml'),'utf8');
 const refs=[...text.matchAll(/uses:\s*([^\s#]+)/g)].map(match=>match[1]);
 assert.equal(refs.length,5);assert.ok(refs.every(ref=>/^actions\/[a-z-]+@[0-9a-f]{40}$/.test(ref)));
 assert.match(text,/persist-credentials: false/);assert.match(text,/pages: read/);
 assert.match(text,/node --test tests\/model\.test\.mjs tests\/validate-public\.test\.mjs/);
 assert.match(text,/cp index\.html CNAME "\$RUNNER_TEMP\/calendar-site\/"/);
 assert.match(text,/cp -R assets data "\$RUNNER_TEMP\/calendar-site\/"/);
 assert.match(text,/validate-public\.mjs --artifact "\$RUNNER_TEMP\/calendar-site"/);
 assert.match(text,/path: \$\{\{ runner\.temp \}\}\/calendar-site/);
 assert.doesNotMatch(text,/contents: write|pull_request_target|enablement: true/);
 assert.match(text,/if: github\.ref == 'refs\/heads\/main'/);
});
test('artifact rejects hardlinks',async t=>{
 const {linkSync}=await import('node:fs');const dir=fixture(t),file=join(dir,'data/calendar.json');
 const sibling=join(dir,'..',dir.split('/').at(-1)+'-linked.json');t.after(()=>rmSync(sibling,{force:true}));
 linkSync(file,sibling);assert.notEqual(run(dir).status,0);
});

for(const suffix of ['?access_token=SYNTHETIC_REVIEW_ONLY','?%61ccess%5Ftoken=SYNTHETIC_REVIEW_ONLY',
 '?%2561ccess%255Ftoken=SYNTHETIC_REVIEW_ONLY','#access_token=SYNTHETIC_REVIEW_ONLY',
 '#%61ccess%5Ftoken%3DSYNTHETIC_REVIEW_ONLY','#/notice?access_token=SYNTHETIC_REVIEW_ONLY']){
 test('Pages artifact and repository reject null-text credential URL '+suffix,async t=>{
  const {createHash}=await import('node:crypto');
  const dir=fixture(t),file=join(dir,'data/calendar.json');
  const data=JSON.parse(readFileSync(join(root,'tests/fixtures/calendar_public_v1.json'))),s=data.sources[0];
  s.text=null;s.text_completeness='unavailable';
  s.verification={state:'pending',fields:['published_at','text','text_completeness']};
  s.versions=[{text:null,published_at:null,publication_basis:'unknown',text_completeness:'unavailable',verification:structuredClone(s.verification)}];
  data.events=[];data.unlinked_sources=[{source_id:s.id,mentioned_at:null,display_date:null,display_basis:'mentioned'}];
  writeFileSync(file,JSON.stringify(data));assert.equal(run(dir).status,0,'valid null-text control');
  s.url='https://example.com/notice/1'+suffix;
  s.id='source-sha256:'+createHash('sha256').update('url:'+s.url).digest('hex');
  data.unlinked_sources[0].source_id=s.id;writeFileSync(file,JSON.stringify(data));
  const before=readFileSync(file),artifactResult=run(dir);
  assert.notEqual(artifactResult.status,0);assert.doesNotMatch(artifactResult.stderr,/SYNTHETIC_REVIEW_ONLY/);
  for(const path of ['README.md','scripts','tests','.github'])cpSync(join(root,path),join(dir,path),{recursive:true});
  const repositoryResult=run(dir,'repository');assert.notEqual(repositoryResult.status,0);
  assert.doesNotMatch(repositoryResult.stderr,/SYNTHETIC_REVIEW_ONLY/);assert.deepEqual(readFileSync(file),before);
 });
}

test('challenge UI preserves tweet layout and adds independent timer and 28-day section',()=>{
 const html=readFileSync(join(root,'index.html'),'utf8'),app=readFileSync(join(root,'assets/app.mjs'),'utf8');
 assert.match(html,/减额不是代表你的错，重置不是唯一的结果/);assert.match(html,/站起来蹬。/);
 assert.match(html,/id="elapsed"/);assert.match(html,/id="challengegrid"/);
 assert.ok(html.indexOf('id="challengegrid"')>html.indexOf('id="detail"'));
 assert.match(app,/visibilitychange/);assert.match(app,/60000/);assert.match(app,/loadChallenge/);
 assert.doesNotMatch(app,/innerHTML/);assert.match(app,/按完成公告计算/);
});
test('public validator validates packaged challenge fallback without new artifact paths',()=>{
 const scriptText=readFileSync(script,'utf8');assert.match(scriptText,/validateChallenge\(CHALLENGE_FALLBACK\)/);
});

test('banked reset card states announced versus completed without inventing issuance',async()=>{
 const {runInNewContext}=await import('node:vm');
 const {CHALLENGE_FALLBACK}=await import('../assets/model.mjs');
 const source=readFileSync(join(root,'assets/app.mjs'),'utf8');
 const cardFunction=source.slice(source.indexOf('function challengeCard('),source.indexOf('function renderChallenge('));
 const node=(tag,className,text)=>({tag,className,text,children:[],append(...children){this.children.push(...children);}});
 const make=runInNewContext(cardFunction+'; challengeCard',{node});
 const day=structuredClone(CHALLENGE_FALLBACK.days[2]);
 const note=card=>card.children.find(child=>child.className==='bankednote').text;
 assert.match(note(make(day,3)),/已发放/);
 day.reset.status='announced';day.reset.completion_source_url=null;
 assert.doesNotMatch(note(make(day,3)),/已发放/);assert.match(note(make(day,3)),/待确认/);
});
