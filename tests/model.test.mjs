import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {validateCalendar, calendarRecords, monthStats, filterRecords, dayDetails, safeSourceURL, parseCalendarJSON} from '../assets/model.mjs';
const fixture = JSON.parse(readFileSync(new URL('./fixtures/calendar_public_v1.json', import.meta.url)));
const copy = x => structuredClone(x);
const verification = (...fields) => ({state:fields.length?'pending':'verified',fields:fields.sort()});
const date = value => ({value,precision:value.length===10?'date':value.length===22?'minute':'second'});
function source(n) {
 const s=copy(fixture.sources[0]);
 s.url=`https://x.com/test/status/${n}`;
 s.id='source-sha256:'+createHash('sha256').update(`x:${n}`).digest('hex');
 return s;
}
function event(n, overrides={}) {
 return {...copy(fixture.events[0]),id:`123e4567-e89b-12d3-a456-${String(n).padStart(12,'0')}`, ...overrides};
}
function dataset(events, sources, unlinked_sources=[]) {
 return {...copy(fixture),events:events.sort((a,b)=>a.id.localeCompare(b.id)),sources:sources.sort((a,b)=>a.id.localeCompare(b.id)),unlinked_sources:unlinked_sources.sort((a,b)=>a.source_id.localeCompare(b.source_id))};
}

test('shared Task 6 contract fixture validates without changing original text or precision',()=>{
 const before=JSON.stringify(fixture); assert.equal(validateCalendar(fixture),fixture);
 assert.equal(JSON.stringify(fixture),before);
 assert.equal(fixture.sources[0].id,'source-sha256:96d83a375baee82501356c68b3c0bf2133f902e74776e517d205f4e9da5a41ec');
});
test('test_month_stats_unique_and_filter_independent',()=>{
 const a=source(123),b=source(124),c=source(125);
 a.versions.push({...copy(a.versions[0]),text:'Earlier approved text.'});
 a.versions.sort((x,y)=>canonical(x).localeCompare(canonical(y)));
 const data=dataset([
  event(1,{source_ids:[a.id,b.id].sort()}),
  event(2,{reset_kind:'banked',source_ids:[a.id]}),
  event(3,{reset_kind:'unknown',verification:verification('reset_kind'),source_ids:[b.id]}),
  event(4,{executed_at:null,display_date:null,display_basis:null,verification:verification('executed_at'),source_ids:[b.id]}),
 ],[a,b,c],[{source_id:c.id,mentioned_at:date('2026-10-09'),display_date:'2026-10-09',display_basis:'mentioned'}]);
 validateCalendar(data);
 const before=monthStats(data,'2026-10');
 assert.deepEqual(before,{confirmed_resets:3,confirmed_dates:1,associated_sources:3,unlinked_sources:1,pending_events:2});
 assert.equal(calendarRecords(data).length,5);
 assert.equal(filterRecords(calendarRecords(data),{kind:'banked',status:'confirmed'}).length,1);
 assert.deepEqual(monthStats(data,'2026-10'),before);
 assert.equal(dayDetails(data,'2026-10-08',{kind:'forced',status:'all'}).length,1);
 assert.equal(monthStats(data,'2026-09').confirmed_resets,0);
});
function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
test('test_null_precision_and_status_placement',()=>{
 const s=source(123),ids=[s.id];
 const data=dataset([
  event(1,{executed_at:date('2026-11-01T00:01+08:00'),display_date:'2026-11-01',source_ids:ids}),
  event(2,{status:'announced',executed_at:null,planned_at:date('2026-10-30'),display_date:'2026-10-30',display_basis:'planned_at',source_ids:ids}),
  event(3,{status:'delayed',executed_at:null,previous_planned_at:date('2026-10-31'),display_date:'2026-10-31',display_basis:'previous_planned_at',source_ids:ids,verification:verification('planned_at')}),
  event(4,{status:'cancelled',executed_at:null,previous_planned_at:date('2026-10-29T16:00:01+08:00'),display_date:'2026-10-29',display_basis:'previous_planned_at',source_ids:ids}),
  event(5,{status:'unknown',reset_kind:'unknown',executed_at:null,display_date:'2026-10-28',display_basis:'source_stated',source_ids:ids,verification:verification('reset_kind','status')}),
  event(6,{executed_at:null,display_date:null,display_basis:null,source_ids:ids,verification:verification('executed_at')}),
 ],[s]);
 validateCalendar(data);
 assert.equal(monthStats(data,'2026-10').confirmed_resets,0);
 assert.equal(monthStats(data,'2026-11').confirmed_resets,1);
 assert.equal(monthStats(data,'2026-10').pending_events,3);
 const record=dayDetails(data,'2026-10-30')[0];
 assert.deepEqual(record.event.planned_at,date('2026-10-30'));
 assert.equal(dayDetails(data,'2026-10-28')[0].basis,'source_stated');
 assert.equal(calendarRecords(data).find(r=>r.id===data.events[5].id).date,null);
 assert.equal(dayDetails(data,'2026-10-12').length,0,'publication/check time must never place a record');
});
test('confirmation gate is independently association, status and executed_at',()=>{
 const s=source(123); const data=dataset([event(1,{source_ids:[s.id],verification:{state:'conflict',fields:['eligibility_summary']}})],[s]);
 validateCalendar(data); assert.equal(monthStats(data,'2026-10').confirmed_resets,1);
 assert.equal(monthStats(data,'2026-10').pending_events,0);
 data.events[0].verification=verification('association');
 assert.equal(monthStats(data,'2026-10').confirmed_resets,0);
 assert.equal(monthStats(data,'2026-10').pending_events,1);
});
test('true empty production data validates and stays empty',()=>{
 const data=JSON.parse(readFileSync(new URL('../data/calendar.json',import.meta.url)));
 validateCalendar(data); assert.deepEqual(calendarRecords(data),[]);
 assert.deepEqual(monthStats(data,'2026-10'),{confirmed_resets:0,confirmed_dates:0,associated_sources:0,unlinked_sources:0,pending_events:0});
});
const invalidChanges=[
 d=>d.registry_revision=1,d=>d.events[0].mail_id='x',d=>d.sources[0].versions[0].fingerprint='x',
 d=>d.calendar_schema_version=true,d=>d.checked_at_range.min=null,d=>d.generated_at='2026-10-12T00:00+08:00',
 d=>d.events[0].executed_at=date('2026-02-30'),d=>d.events[0].executed_at={value:'2026-10-08T00:00+00:00',precision:'minute'},
 d=>d.events[0].display_date='2026-10-09',d=>d.events[0].source_ids=['source-sha256:'+'a'.repeat(64)],
 d=>d.sources[0].id='source:'+'a'.repeat(64),d=>d.sources[0].id='source-sha256:'+'a'.repeat(64),
 d=>d.events.push(copy(d.events[0])),d=>d.sources.push(copy(d.sources[0])),
 d=>d.events[0].status='unknown',d=>d.sources[0].publication_basis='verified',
 d=>d.coverage.protocol_versions=[],d=>d.unlinked_sources=[{source_id:d.sources[0].id,mentioned_at:null,display_date:null,display_basis:'mentioned'}],
 d=>d.sources[0].verification.fields=['published_at','published_at'],
 d=>d.sources[0].versions[0].verification={state:'verified',fields:[]},
 d=>d.sources[0].versions[0].published_at={value:'2026-10-01',precision:'minute'},
 d=>d.sources[0].versions.push(copy(d.sources[0].versions[0])),
];
for(const [i,change] of invalidChanges.entries())test(`validator rejects invalid public contract ${i+1}`,()=>{const data=copy(fixture);change(data);assert.throws(()=>validateCalendar(data));});
for(const text of ['private@example.com','QQ 群号：123456','MIME-Version: 1.0','/home/private/file','token=canary-token','ghp_abcdefghijklmnop','message_key=private','a\u0001b','a\u202eb','a\ud800b'])test('rejects unsafe public text '+JSON.stringify(text),()=>{const data=copy(fixture);data.coverage.notes=[text];assert.throws(()=>validateCalendar(data));});
const unsafeURLs=['javascript:alert(1)','data:text/html,hi','https://user:password@example.com/','http://localhost/','http://a.local/','http://a.internal/','http://127.0.0.1/','http://10.0.0.1/','http://100.64.0.1/','http://192.168.0.1/','http://[::1]/','http://[fc00::1]/','http://[::ffff:127.0.0.1]/','http://224.1.1.1/','http://2130706433/','http://127.1/','http://0177.0.0.1/','http://0x7f.0x.0x.1/','http://0x.0x.0x.1/','http://127.0.0.1\\private','https://example.com/a\\b','http://%31%32%37.0.0.1/','http://127%2e0%2e0%2e1/','https://%65xample.com/notice','http://１２７.０.０.１/','http://ｌｏｃａｌｈｏｓｔ/','http://localhoſt/','http://local\u200bhost/','https://example.com/a b','https://example.com/\n'];
for(const url of unsafeURLs)test('unsafe URL fails closed '+url,()=>assert.equal(safeSourceURL(url),false));
for(const url of ['https://Example.COM:443/公告?literal=%31#片段','http://example.com:80/news','https://xn--bcher-kva.example/notice','https://[2606:4700:4700::1111]/notice','https://twitter.com/another/status/123?s=20'])test('safe external URL retains spelling '+url,()=>assert.equal(safeSourceURL(url),true));
test('HTML and scripts remain original plain text data',()=>{const data=copy(fixture);const text='<img src="https://example.com/x" onerror="alert(1)"><script>alert(2)</script>';data.sources[0].text=text;data.sources[0].versions[0].text=text;validateCalendar(data);assert.equal(dayDetails(data,'2026-10-08')[0].sources[0].text,text);});
test('strict JSON parsing rejects duplicate keys and nonfinite values',()=>{
 assert.deepEqual(parseCalendarJSON('{"x":1,"s":"a\\\"b","a":[null,true,false]}'),{x:1,s:'a"b',a:[null,true,false]});
 for(const text of ['{"x":1,"x":2}','{"x":{"a":1,"a":2}}','{"x":1e999}','{"x":NaN}'])assert.throws(()=>parseCalendarJSON(text));
});

test('UI assets preserve approved layout, unknown filter and secure DOM-only rendering',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const app=readFileSync(new URL('../assets/app.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../assets/styles.css',import.meta.url),'utf8');
 assert.match(html,/每一次重置，都有迹可循/);
 assert.match(html,/<option value="unknown">状态待核实<\/option>/);
 assert.match(html,/assets\/app.mjs/);
 assert.match(app,/fetch\('\.\/data\/calendar\.json'/);
 assert.doesNotMatch(app,/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
 assert.match(app,/textContent/); assert.match(app,/noopener noreferrer/);
 assert.match(css,/\.heat\.one/); assert.match(css,/\.heat\.information/);
 assert.doesNotMatch(html,/DEMO-|ALL DATA IS FICTIONAL|复制原型提示词|演示月份/);
});

test('delayed event with verified new plan does not require the obsolete previous plan',()=>{
 const s=source(123),data=dataset([event(1,{status:'delayed',executed_at:null,planned_at:date('2026-10-21'),previous_planned_at:null,display_date:'2026-10-21',display_basis:'planned_at',source_ids:[s.id],verification:verification('previous_planned_at')})],[s]);
 validateCalendar(data);assert.equal(monthStats(data,'2026-10').pending_events,0);
});

test('valid Unicode notes follow Python code-point ordering',()=>{
 const data=copy(fixture);data.coverage.notes=['\ue000','😀'];assert.equal(validateCalendar(data),data);
});
for(const [url,key]of [
 ['https://Example.COM:443/公告?literal=%31#片段','url:https://example.com/公告?literal=%31#片段'],
 ['https://x.com:/test/status/123','x:123'],
 ['https://TWITTER.COM:00443/another/status/123/?s=20','x:123'],
 ['https://example.com:00444/a?b=2&a=1#','url:https://example.com:00444/a?b=2&a=1#'],
 ['https://example.com/path?','url:https://example.com/path?'],
])test('independent SHA-256 source identity vector '+url,()=>{
 const data=copy(fixture),id='source-sha256:'+createHash('sha256').update(key).digest('hex');
 data.sources[0].url=url;data.sources[0].id=id;data.events[0].source_ids=[id];validateCalendar(data);
});

const unicodePredicates=JSON.parse(readFileSync(new URL('./fixtures/unicode_public_predicates.json',import.meta.url)));
for(const vector of unicodePredicates.cases)test('binding Python Unicode predicate: '+vector.name,()=>{
 const data=copy(fixture);
 if(vector.mode==='text'){data.sources[0].text=vector.value;data.sources[0].versions[0].text=vector.value;}
 else{assert.equal(safeSourceURL(vector.value),vector.safe_url);data.sources[0].url=vector.value;data.sources[0].id=vector.source_id;data.events[0].source_ids=[vector.source_id];}
 if(vector.accepted)assert.equal(validateCalendar(data),data);
 else assert.throws(()=>validateCalendar(data));
});

// I1：查询与 OAuth/路由 fragment 参数必须在模型与 DOM 链接入口同时阻断。
const credentialNames=[
 'token','access_token','refresh_token','id_token','auth_token','bearer_token',
 'api_token','api_key','access_key','access_key_id','secret_access_key','secret',
 'client_secret','api_secret','password','passwd','pwd','authorization','auth',
 'cookie','session','session_id','session_token','session_key','auth_key',
 'private_key','security_token','client_assertion','oauth_token','oauth_token_secret',
 'AWSAccessKeyId','X-Amz-Credential','X-Amz-Signature','X-Amz-Security-Token',
 'GoogleAccessId','X-Goog-Credential','X-Goog-Signature','X-Goog-Security-Token','signature','sig'
];
const credentialSuffixes=credentialNames.map(name=>'?'+name+'=SYNTHETIC_REVIEW_ONLY').concat([
 '?ACCESS-TOKEN=SYNTHETIC_REVIEW_ONLY','?%61ccess%5Ftoken=SYNTHETIC_REVIEW_ONLY',
 '?%2561ccess%255Ftoken=SYNTHETIC_REVIEW_ONLY','?%252561ccess%25255Ftoken%253DSYNTHETIC_REVIEW_ONLY',
 '?safe=1%26access%5Ftoken%3DSYNTHETIC_REVIEW_ONLY','?access+token=SYNTHETIC_REVIEW_ONLY',
 '?access%252Btoken=SYNTHETIC_REVIEW_ONLY','?safe=1;refresh_token=SYNTHETIC_REVIEW_ONLY',
 '?access_token=','?access_token','#access_token=SYNTHETIC_REVIEW_ONLY',
 '#%61ccess%5Ftoken%3DSYNTHETIC_REVIEW_ONLY','#/notice?access_token=SYNTHETIC_REVIEW_ONLY',
 '#state=notice&%2561ccess%255Ftoken=SYNTHETIC_REVIEW_ONLY'
]);
function nullTextURLData(url){
 const data=copy(fixture),s=data.sources[0];
 s.text=null;s.text_completeness='unavailable';s.verification=verification('published_at','text','text_completeness');
 s.versions=[{text:null,published_at:null,publication_basis:'unknown',text_completeness:'unavailable',verification:copy(s.verification)}];
 s.url=url;s.id='source-sha256:'+createHash('sha256').update('url:'+url).digest('hex');
 data.events=[];data.unlinked_sources=[{source_id:s.id,mentioned_at:null,display_date:null,display_basis:'mentioned'}];
 return data;
}
for(const suffix of credentialSuffixes)test('credential URL parameter fails closed '+suffix,()=>{
 const url='https://example.com/notice/1'+suffix,data=nullTextURLData(url),before=JSON.stringify(data);
 assert.equal(safeSourceURL(url),false);
 assert.throws(()=>validateCalendar(data),error=>!error.message.includes('SYNTHETIC_REVIEW_ONLY'));
 assert.equal(JSON.stringify(data),before);
});
for(const suffix of [
 '?s=20&t=notice#section-2','?literal=%31&q=access_token%3Ddocumentation#片段',
 '?tokenizer=public&session_count=2#access_token_help',
 '?utm_source=notice&sort=ascending#route?tab=updates','?q=%2525&literal=%FF#part%2D1','?#','#session','#access_token','#%73ession'
])test('ordinary query fragment is retained '+suffix,()=>{
 const url='https://example.com/notice/1'+suffix,data=nullTextURLData(url),before=JSON.stringify(data);
 assert.equal(safeSourceURL(url),true);assert.equal(validateCalendar(data),data);
 assert.equal(data.sources[0].url,url);assert.equal(JSON.stringify(data),before);
});
