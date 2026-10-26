import {validateCalendar,parseCalendarJSON,announcementRecords,safeSourceURL,validateChallenge,CHALLENGE_FALLBACK,loadChallenge,challengeDayOrder,challengeResetView,createChallengeRefresh} from './model.mjs';

const $=id=>document.getElementById(id);
const pad=n=>String(n).padStart(2,'0');
const today=()=>new Date(Date.now()+8*60*60*1000).toISOString().slice(0,10);
let selected=today(),year=Number(selected.slice(0,4)),month=Number(selected.slice(5,7))-1,view='month',records=[];
const key=(y,m,d)=>`${String(y).padStart(4,'0')}-${pad(m+1)}-${pad(d)}`;
function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;}
function button(text,className,attributes={}){const el=node('button',className,text);el.type='button';for(const [key,value]of Object.entries(attributes))el.setAttribute(key,String(value));return el;}
function temporalText(value){return value.precision==='date'?value.value+' UTC+8':value.value.replace('T',' ').replace('+08:00','')+' UTC+8';}
function pick(date){selected=date;view='month';year=Number(date.slice(0,4));month=Number(date.slice(5,7))-1;render();}
function datesInMonth(y,m){const d=new Date(0);d.setUTCFullYear(y,m+1,0);return d.getUTCDate();}
function startOfMonth(y,m){const d=new Date(0);d.setUTCFullYear(y,m,1);return(d.getUTCDay()+6)%7;}
const entriesFor=date=>records.filter(r=>r.date===date);
function calendar(){
 const items=[],start=startOfMonth(year,month),total=datesInMonth(year,month);
 for(let i=0;i<start;i++)items.push(node('div','day blank'));
 for(let d=1;d<=total;d++){
  const date=key(year,month,d),count=entriesFor(date).length;
  const day=button('',`day${count?' has-events':''}${date===selected?' selected':''}`,{'data-date':date,'aria-pressed':date===selected,'aria-label':`${date}，${count} 篇推文`});
  day.append(node('span','num',String(d)));if(count)day.append(node('span','planlabel',`${count} 篇推文`));items.push(day);
 }
 for(let i=0;i<(7-(start+total)%7)%7;i++)items.push(node('div','day blank'));
 $('days').replaceChildren(...items);
}
function yearCalendar(){
 const sections=[];
 for(let m=0;m<12;m++){
  const section=node('section','minimonth'),grid=node('div','minidays'),heading=node('h3','');
  heading.append(button(`${pad(m+1)} 月 ↗`,'monthdrill',{'data-date':key(year,m,1),'aria-label':`打开 ${year} 年 ${pad(m+1)} 月月历`}));section.append(heading);
  for(let i=0;i<startOfMonth(year,m);i++)grid.append(node('span','heatblank'));
  for(let d=1;d<=datesInMonth(year,m);d++){
   const date=key(year,m,d),count=entriesFor(date).length,label=`${date}，${count} 篇推文，查看原文`;
   grid.append(button('',`heat${count?' information':''}${date===selected?' selected':''}`,{'data-date':date,title:label,'aria-label':label}));
  }
  section.append(grid);sections.push(section);
 }
 $('yeargrid').replaceChildren(...sections);
}
function sourcePost(source){
 const article=node('article','event');
 if(source.published_at!==null)article.append(node('p','posttime',temporalText(source.published_at)));
 if(source.text!==null)article.append(node('p','posttext',source.text));
 else if(source.summary_zh!==undefined)article.append(node('p','posthead','摘要'),node('p','posttext',source.summary_zh));
 else article.append(node('p','posttext','原文请查看原帖。'));
 if(safeSourceURL(source.url)){const link=node('a','sourcelink','查看原帖 ↗');link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';article.append(link);}
 return article;
}
function details(){
 const entries=entriesFor(selected).sort((a,b)=>a.sources[0].published_at.value.localeCompare(b.sources[0].published_at.value)||a.id.localeCompare(b.id));
 $('detailtitle').textContent=selected.replace(/^(\d+)-(\d+)-(\d+)$/,'$1 年 $2 月 $3 日');
 $('detailcaption').textContent=`${entries.length} 篇推文`;
 if(entries.length)$('detail').replaceChildren(...entries.map(r=>sourcePost(r.sources[0])));
 else {const empty=node('div','empty');empty.append(node('span','','○'),node('b','','这一天，暂时留白。'),node('p','','选择有标记的日期查看推文。'));$('detail').replaceChildren(empty);}
}
function render(){
 const focusedDate=document.activeElement?.dataset.date;
 $('period').textContent=view==='month'?`${year} 年 ${pad(month+1)} 月`:`${year} 年 · 全年概览`;
 $('currentmonth').textContent=`${year} 年 ${pad(month+1)} 月`;
 $('monthview').setAttribute('aria-pressed',String(view==='month'));$('yearview').setAttribute('aria-pressed',String(view==='year'));
 $('month').hidden=view!=='month';$('year').hidden=view!=='year';
 $('prev').setAttribute('aria-label',view==='month'?'上一月':'上一年');$('next').setAttribute('aria-label',view==='month'?'下一月':'下一年');
 $('prev').disabled=year===1&&(view==='year'||month===0);$('next').disabled=year===9999&&(view==='year'||month===11);
 calendar();if(view==='year')yearCalendar();details();
 if(focusedDate){const container=view==='year'?$('yeargrid'):$('days');Array.from(container.querySelectorAll('[data-date]')).find(el=>el.dataset.date===focusedDate)?.focus({preventScroll:true});}
}
function setup(){
 for(const id of ['days','yeargrid'])$(id).addEventListener('click',event=>{const control=event.target.closest('[data-date]');if(control)pick(control.dataset.date);});
 for(const [id,delta]of [['prev',-1],['next',1]])$(id).addEventListener('click',()=>{if(view==='year')year+=delta;else{month+=delta;if(month<0){month=11;year--;}if(month>11){month=0;year++;}}selected=key(year,month,1);render();});
 $('monthview').addEventListener('click',()=>{view='month';render();});$('yearview').addEventListener('click',()=>{view='year';render();});
 $('today').addEventListener('click',()=>pick(today()));
}
async function load(){
 try{
  const response=await fetch('./data/calendar.json',{cache:'no-cache'});if(!response.ok)throw new Error('unavailable');
  const data=validateCalendar(parseCalendarJSON(await response.text()));records=announcementRecords(data);
  const dates=[...new Set(records.map(r=>r.date))].sort(),current=today();selected=dates.filter(d=>d<=current).at(-1)??dates[0]??current;
  year=Number(selected.slice(0,4));month=Number(selected.slice(5,7))-1;
  $('loadstatus').textContent=records.length?'':'暂无收录推文。';
  $('loadstatus').hidden=records.length>0;
  setup();render();$('dashboard').hidden=false;
 }catch{
  $('dashboard').hidden=true;$('loadstatus').hidden=false;$('loadstatus').classList.add('error');$('loadstatus').textContent='数据暂不可用，请稍后刷新。';
 }
}
load();

// Challenge is deliberately independent of the email-driven calendar load.
let challenge=validateChallenge(CHALLENGE_FALLBACK),renderedDays=null,renderedBasis=null;
function refreshElapsed(){
 const {anchor,hours,pending}=challengeResetView(challenge);
 $('elapsed').textContent=hours===null?'暂不可计算':`${hours} h`;
 const basis=JSON.stringify({anchor,pending:pending?.day??null,calculable:hours!==null});
 if(basis===renderedBasis)return;
 renderedBasis=basis;
 $('elapsedbasis').replaceChildren();
 if(anchor&&hours!==null){
  const manual=anchor.basis==='manual_estimate';
  const estimatedAt=manual?new Date(Date.parse(anchor.at)+8*3600000).toISOString().slice(0,16).replace('T',' '):null;
  $('elapsedbasis').append(node('span','',manual?`手动估算、非官方确认：Day ${anchor.day} · ${estimatedAt} UTC+8 · `:anchor.basis==='announcement_deadline'?`推定已执行：Day ${anchor.day} · `:`最近完成：Day ${anchor.day} · `));
  const link=node('a','',manual?'预告原帖（不含估算时间）':anchor.basis==='announcement_deadline'?'按预告截止时间推定，未经执行确认':anchor.basis==='completion_post'?'按完成公告计算':'按实际执行时间计算');
  link.href=anchor.url;link.target='_blank';link.rel='noopener noreferrer';$('elapsedbasis').append(link);
 }
 if(pending)$('elapsedbasis').append(node('br'),node('span','',`Day ${pending.day} 已预告，待完成确认；有明确截止时间时，到期自动按预告推定。`));
}
function challengeCard(day,number){
 const reset=day?.reset,completed=reset?.status==='completed',banked=reset?.kind==='banked_reset_grant';
 const card=node('article',`challengecard${completed?' resetday':''}${day?'':' upcoming'}`),top=node('div','challengetop');
 top.append(node('span','daynumber',`DAY ${number}`));
 if(reset)top.append(node('span','resetbadge',banked?'预存重置':completed?'RESET · 已完成':'RESET · 已公布'));
 card.append(top,node('h3','',day?.title_zh??'待发布'));
 if(!day)return card;
 card.append(node('p','challengesummary',day.summary_zh));
 if(day.improvements.length){const list=node('ul','improvements');for(const item of day.improvements)list.append(node('li','',item.text_zh));card.append(list);}
 if(banked)card.append(node('p','bankednote',completed?'预存重置已发放，不表示已兑换或即时刷新用量。':'预存重置已公布，发放待确认。'));
 const links=node('div','challengelinks');
 day.sources.forEach((source,index)=>{const link=node('a','',source.role==='completion'?'完成公告 ↗':`原帖 ${index+1} ↗`);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';links.append(link);});card.append(links);
 return card;
}
function renderChallenge(fallback,stale=false){
 const currentDay=Math.max(0,...challenge.days.map(day=>day.day));
 $('challengeprogress').textContent=currentDay?`已更新至第 ${currentDay} / 28 天`:'尚未开始 / 28 天';
 const days=JSON.stringify(challenge.days);
 if(days!==renderedDays){
  const grid=$('challengegrid'),focusedURL=grid.contains(document.activeElement)?document.activeElement?.href:null;
  const byDay=new Map(challenge.days.map(day=>[day.day,day]));
  $('challengegrid').replaceChildren(...challengeDayOrder(challenge).map(number=>challengeCard(byDay.get(number),number)));
  renderedDays=days;
  if(focusedURL)Array.from(grid.querySelectorAll('a')).find(link=>link.href===focusedURL)?.focus({preventScroll:true});
 }
 const date=new Date(Date.parse(challenge.updated_at)+8*3600000).toISOString().slice(0,16).replace('T',' ');
 $('challengestatus').textContent=`截至 ${date} UTC+8${fallback?' · 离线快照':''}${stale?' · 更新暂不可用，保留上次资料':''}`;
 refreshElapsed();
}
renderChallenge(true);
const challengeRefresh=createChallengeRefresh({initial:challenge,load:loadChallenge,onChange:result=>{challenge=result.data;renderChallenge(result.fallback,result.stale);}});
challengeRefresh.refresh();
setInterval(()=>{refreshElapsed();if(!document.hidden)challengeRefresh.refresh();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshElapsed();challengeRefresh.refresh();}});
