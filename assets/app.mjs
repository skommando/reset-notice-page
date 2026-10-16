import {validateCalendar,parseCalendarJSON,browseRecords,initialBrowseDate,monthStats,filterRecords,dayDetails,safeSourceURL} from './model.mjs';

const $=id=>document.getElementById(id);
const labels={forced:'Forced',banked:'Banked',unknown:'Unknown',confirmed:'已确认',announced:'已预告',delayed:'已延期',cancelled:'已取消'};
const fields={association:'来源关联',reset_kind:'重置类型',status:'状态',executed_at:'执行时间',planned_at:'新计划时间',previous_planned_at:'原计划时间',eligibility_summary:'资格说明',revision:'来源版本',text:'公开原文',published_at:'发布时间',text_completeness:'原文完整性'};
const pad=n=>String(n).padStart(2,'0');
const utc8Today=()=>new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
const currentDate=utc8Today();
let year=Number(currentDate.slice(0,4)),month=Number(currentDate.slice(5,7))-1,selected=currentDate,view='month',pendingId=null,data,records=[];
const key=(y,m,d)=>`${String(y).padStart(4,'0')}-${pad(m+1)}-${pad(d)}`;
const filters=()=>({kind:$('type').value,status:$('status').value});
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function button(text,className,attributes={}){const el=node('button',className,text);el.type='button';for(const [key,value]of Object.entries(attributes))el.setAttribute(key,String(value));return el;}
function temporalText(value){
 if(value===null)return '未知';
 if(value.precision==='date')return value.value+'（仅日期，具体时刻未知） UTC+8';
 return value.value.replace('T',' ').replace('+08:00','')+' UTC+8';
}
function verificationText(v){return v.state==='verified'?'已核实':(v.state==='conflict'?'证据冲突：':'待核实：')+v.fields.map(f=>fields[f]).join('、');}
function pick(date){selected=date;pendingId=null;view='month';year=Number(date.slice(0,4));month=Number(date.slice(5,7))-1;render();}
function stats(){
 const values=monthStats(data,key(year,month,1).slice(0,7));
 const cards=[
  [values.confirmed_resets,'已确认 Reset','次','当前月 · 按已核实执行事件去重'],
  [values.confirmed_dates,'发生日期','天','当前月 · 唯一已核实执行日期'],
  [values.associated_sources,'关联来源帖','篇','当前月 · 执行 / 计划 / 来源所述日期的唯一来源'],
  [values.unlinked_sources+values.pending_events,'全局待核实','条',`${values.unlinked_sources} 篇未关联来源 · ${values.pending_events} 个事件缺项`],
 ];
 $('stats').replaceChildren(...cards.map(([value,label,unit,note])=>{const card=node('div','stat');card.append(node('label','',label),node('strong','',String(value)),node('small','',unit),node('div','minor',note));return card;}));
}
function datesInMonth(y,m){const d=new Date(0);d.setUTCFullYear(y,m+1,0);return d.getUTCDate();}
function startOfMonth(y,m){const d=new Date(0);d.setUTCFullYear(y,m,1);return(d.getUTCDay()+6)%7;}
function calendar(){
 const visible=filterRecords(records,filters()),items=[],start=startOfMonth(year,month),total=datesInMonth(year,month);
 for(let i=0;i<start;i++)items.push(node('div','day blank'));
 for(let d=1;d<=total;d++){
  const date=key(year,month,d),entries=visible.filter(r=>r.date===date),confirmed=entries.filter(r=>r.countable).length,other=entries.length-confirmed,isSelected=date===selected&&!pendingId;
  const day=button('',`day${entries.length?' has-events':''}${isSelected?' selected':''}`,{'data-date':date,'aria-pressed':isSelected,'aria-label':`${date}，${confirmed} 次已确认，${other} 条其他信息`});
  day.append(node('span','num',String(d)));if(confirmed)day.append(node('span','count',`${confirmed} 次确认`));if(other)day.append(node('span','planlabel',`${other} 条信息`));
  const markers=node('span','markers');markers.setAttribute('aria-hidden','true');entries.forEach(r=>markers.append(node('i',`marker ${r.kind}${r.countable?'':' planned'}`)));day.append(markers);items.push(day);
 }
 for(let i=0;i<(7-(start+total)%7)%7;i++)items.push(node('div','day blank'));
 $('days').replaceChildren(...items);
}
function yearCalendar(){
 const visible=filterRecords(records,filters()),sections=[];
 for(let m=0;m<12;m++){
  const section=node('section','minimonth'),grid=node('div','minidays'),heading=node('h3','');
  heading.append(button(`${pad(m+1)} 月 ↗`,'monthdrill',{'data-date':key(year,m,1),'aria-label':`打开 ${year} 年 ${pad(m+1)} 月月历`}));section.append(heading);
  for(let i=0;i<startOfMonth(year,m);i++)grid.append(node('span','heatblank'));
  for(let d=1;d<=datesInMonth(year,m);d++){
   const date=key(year,m,d),entries=visible.filter(r=>r.date===date),count=entries.filter(r=>r.countable).length,other=entries.length-count;
   const label=`${date}，${count} 次已确认，${other} 条其他信息，查看详情`;
   grid.append(button('',`heat${count>1?' many':count?' one':''}${other?' information':''}${date===selected&&!pendingId?' selected':''}`,{'data-date':date,title:label,'aria-label':label}));
  }
  section.append(grid);sections.push(section);
 }
 $('yeargrid').replaceChildren(...sections);
}
function publicationBasisText(basis){
 return basis==='verified'?'已核实':basis==='id_inferred'?'根据状态 ID 推断，待核实':basis==='mirror_reported'?'第三方镜像报告，非 X 核实；待核实':'';
}
function sourcePost(source){
 const details=node('details','post'),summary=node('summary','');
 const title=source.text_completeness==='complete'?'展开来源原文':source.text===null?'原文未收录':'展开来源文本（完整性待核实）';
 summary.append(node('span','posticon','文'),node('span','',title));details.append(summary);
 const publication=source.published_at===null?'发布时间：未知':`发布时间：${temporalText(source.published_at)}`;
 const basis=publicationBasisText(source.publication_basis)?' · '+publicationBasisText(source.publication_basis):'';
 const time=node('p','posttime',publication+basis);
 details.append(node('p','posttext',source.text??'原文未收录，请查看原帖。'));
 if(safeSourceURL(source.url)){const link=node('a','sourcelink','查看原帖 ↗');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';details.append(link);}
 else details.append(node('span','minor','来源链接不可用'));
 details.append(node('p','postfooter',verificationText(source.verification)));
 const historical=source.versions.filter(v=>v.text!==source.text||JSON.stringify(v.published_at)!==JSON.stringify(source.published_at)||v.publication_basis!==source.publication_basis||v.text_completeness!==source.text_completeness);
 if(historical.length){const history=node('details','sourcehistory'),heading=node('summary','',source.verification.fields.includes('revision')?'并列来源版本（尚无唯一当前版本）':`其他公开版本（${historical.length}）`);history.append(heading);historical.forEach((v,i)=>{const section=node('section','post');section.append(node('p','posthead',`版本 ${i+1}`),node('p','posttime',`发布时间：${temporalText(v.published_at)}${publicationBasisText(v.publication_basis)?' · '+publicationBasisText(v.publication_basis):''}`),node('p','posttext',v.text??'此版本公开原文暂不可用。'),node('p','postfooter',verificationText(v.verification)));history.append(section);});details.append(history);}
 const sourceBlock=node('section','source');sourceBlock.append(time);
 if(source.summary_zh!==undefined)sourceBlock.append(node('p','posthead',source.text===null?'摘要（原文未收录）':'摘要'),node('p','posttext',source.summary_zh));
 sourceBlock.append(details);return sourceBlock;
}
function detailRecord(record){
 const article=node('article','event');
 if(record.type==='event'){
  const e=record.event;article.append(node('div','eventid',e.id),node('h3','',`${labels[e.reset_kind]} Reset`));
  const badges=node('div','badges');badges.append(node('span',`badge ${e.reset_kind}`,labels[e.reset_kind]),node('span','badge state',e.status==='unknown'?'状态待核实':labels[e.status]));article.append(badges);
  const times=[['executed_at','执行时间'],['planned_at','当前计划'],['previous_planned_at','原计划']];
  times.filter(([f])=>e[f]!==null).forEach(([f,label])=>article.append(node('p','eventtime',`${label}：${temporalText(e[f])}`)));
  if(e.status==='confirmed'&&e.executed_at===null)article.append(node('p','eventtime','执行时间：未知'));
  if(record.basis==='source_stated')article.append(node('p','eventtime',`来源所述时间，性质待核实：${record.date} UTC+8`));
  article.append(node('p','eventnote',record.countable?'按独立核实的执行日期计为 1 次 Reset。':'仅作信息记录，不计入已确认次数。'));
  if(e.eligibility_summary!==null){const extra=node('details','eventextra');extra.append(node('summary','','资格说明'),node('p','eventnote',e.eligibility_summary));article.append(extra);}
  if(e.verification.state!=='verified')article.append(node('p','eventnote',verificationText(e.verification)));
 }else if(record.type==='announcement'){
  const source=record.sources[0];
  article.append(node('h3','','公告发布时间'),node('p','eventtime',temporalText(source.published_at)),node('p','eventnote','公告日期不代表执行日期，不计入已确认 Reset 次数。'));
  article.append(node('p','eventnote',publicationBasisText(source.publication_basis)));
  if(record.related_events.length)record.related_events.forEach(e=>{
   article.append(node('p','eventnote',`${labels[e.reset_kind]} Reset · ${e.status==='unknown'?'状态待核实':labels[e.status]} · 执行时间：${temporalText(e.executed_at)}`));
   if(e.planned_at!==null)article.append(node('p','eventnote',`计划时间：${temporalText(e.planned_at)}`));
   if(e.verification.state!=='verified')article.append(node('p','eventnote',verificationText(e.verification)));
  });
  else article.append(node('p','eventnote','尚未关联核实事件；执行时间未知。'));
 }else{
  article.append(node('h3','','未关联来源'),node('div','badges','Unknown · 状态待核实'),node('p','eventtime',`来源所述时间，性质待核实：${record.mentioned_at?temporalText(record.mentioned_at):record.date?record.date+'（仅日期，具体时刻待核实） UTC+8':'未知'}`),node('p','eventnote','尚未关联核实事件，不计入已确认次数。'));
 }
 if(record.sources.length)record.sources.forEach(s=>article.append(sourcePost(s)));
 else article.append(node('p','eventnote','当前没有可公开的来源链接，关联待核实。'));
 return article;
}
function details(){
 const entries=pendingId?filterRecords(records,filters()).filter(r=>r.id===pendingId):dayDetails(data,selected,filters());
 $('detailtitle').textContent=pendingId?'待核实记录':selected.replace(/^(\d+)-(\d+)-(\d+)$/,'$1 年 $2 月 $3 日');
 $('detailcaption').textContent=`${entries.filter(r=>r.type==='event').length} 个事件 · ${entries.filter(r=>r.type==='announcement').length} 条公告 · ${new Set(entries.flatMap(r=>r.source_ids)).size} 篇来源`;
 if(entries.length)$('detail').replaceChildren(...entries.map(detailRecord));
 else {const empty=node('div','empty');empty.append(node('span','','○'),node('b','','这一天，暂时留白。'),node('p','','当前筛选下没有记录。可重置筛选或选择其他日期。'));$('detail').replaceChildren(empty);}
}
function pending(){
 const list=filterRecords(records,filters()).filter(r=>r.type!=='announcement'&&(r.pending||r.date===null));
 $('pendingcount').textContent=`${list.length} 条`;
 $('pending').replaceChildren(...list.map(r=>{const row=node('div','pendingrow'),control=button(r.type==='source'?'未关联来源':`${labels[r.kind]} · ${r.status==='unknown'?'状态待核实':labels[r.status]}`,'',{'data-pending':r.id,'aria-pressed':r.id===pendingId});control.append(node('span','',`${r.date?r.date+' · ':''}${r.sources.length} 篇来源 · 点击查看 →`));row.append(control);return row;}));
 if(!list.length)$('pending').append(node('p','eventnote','当前筛选下没有待核实记录。'));
}
function render(){
 const focusedDate=document.activeElement?.dataset.date,focusedPending=document.activeElement?.dataset.pending;
 $('period').textContent=view==='month'?`${year} 年 ${pad(month+1)} 月`:`${year} 年 · 全年概览`;
 $('currentmonth').textContent=`统计月份 · ${year} 年 ${pad(month+1)} 月`;
 $('monthview').setAttribute('aria-pressed',String(view==='month'));$('yearview').setAttribute('aria-pressed',String(view==='year'));
 $('month').hidden=view!=='month';$('year').hidden=view!=='year';
 $('prev').setAttribute('aria-label',view==='month'?'上一月':'上一年');$('next').setAttribute('aria-label',view==='month'?'下一月':'下一年');
 $('navhint').textContent=view==='year'?'全年仅按已核实执行次数着色':'执行 / 计划 / 公告发布时间 / 来源所述日期';
 $('prev').disabled=year===1&&(view==='year'||month===0);$('next').disabled=year===9999&&(view==='year'||month===11);
 stats();calendar();if(view==='year')yearCalendar();details();pending();
 // 更新日期或待核实记录后保留键盘焦点，避免重绘把焦点送回页面起点。
 if(focusedDate){const container=view==='year'?$('yeargrid'):$('days');Array.from(container.querySelectorAll('[data-date]')).find(el=>el.dataset.date===focusedDate)?.focus({preventScroll:true});}
 else if(focusedPending)Array.from($('pending').querySelectorAll('[data-pending]')).find(el=>el.dataset.pending===focusedPending)?.focus({preventScroll:true});
}
function setup(){
 for(const id of ['days','yeargrid'])$(id).addEventListener('click',event=>{const control=event.target.closest('[data-date]');if(control)pick(control.dataset.date);});
 $('pending').addEventListener('click',event=>{const control=event.target.closest('[data-pending]');if(control){pendingId=control.dataset.pending;render();}});
 for(const id of ['type','status'])$(id).addEventListener('change',()=>{pendingId=null;render();});
 $('clear').addEventListener('click',()=>{$('type').value='all';$('status').value='all';pendingId=null;render();});
 for(const [id,delta]of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{if(view==='year')year+=delta;else{month+=delta;if(month<0){month=11;year--;}if(month>11){month=0;year++;}}selected=key(year,month,1);pendingId=null;render();});
 $('monthview').addEventListener('click',()=>{view='month';render();});$('yearview').addEventListener('click',()=>{view='year';render();});
 $('today').addEventListener('click',()=>pick(utc8Today()));
}
async function load(){
 try{
  const response=await fetch('./data/calendar.json',{cache:'no-cache'});if(!response.ok)throw new Error('unavailable');
  data=validateCalendar(parseCalendarJSON(await response.text()));records=browseRecords(data);
  selected=initialBrowseDate(data,currentDate);year=Number(selected.slice(0,4));month=Number(selected.slice(5,7))-1;
  $('loadstatus').textContent=records.length?'公开记录已载入。原文仅来自获准公开的来源，时间与状态保留核实边界。':'暂无已纳入的公开来源与事件。空记录不代表历史上没有发生重置。';
  $('generated').textContent=`公开数据生成时间：${data.generated_at.replace('T',' ').replace('+08:00','')} UTC+8`;
  $('checkedrange').textContent=data.checked_at_range.min===null?'来源记录核对范围：未知（无已纳入来源）':`来源记录核对范围：${data.checked_at_range.min} 至 ${data.checked_at_range.max}；这是记录核对时间，不是监控最新运行时间。`;
  $('protocols').textContent=`已纳入协议版本：${data.coverage.protocol_versions.length?data.coverage.protocol_versions.map(v=>'V'+v).join('、'):'无'}`;
  $('coveragenotes').replaceChildren(...data.coverage.notes.map(note=>node('li','',note)));
  setup();render();$('dashboard').hidden=false;
 }catch{
  $('dashboard').hidden=true;$('loadstatus').classList.add('error');$('loadstatus').textContent='数据暂不可用。读取或校验未通过，请稍后刷新。';
 }
}
load();
