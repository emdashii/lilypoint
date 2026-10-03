import { KEYS, MODES, SPECIES, defaultSpec, randomSeed, speciesInfo, downloadText } from './core.js';
import { $, el, setup, status, button, pills, draw, exportScore, downloadLilyPond, downloadMidi, generatePhrase as generate, Piano, transportOptions } from './studio.js';
import { parseScore, scoreQuery, CLEFS } from './collection.js';
import { mountCollection } from './collection-ui.js';
import { SessionStorage, sessionExercise, exerciseResult, exerciseBounds, advance, parseSession } from './practice-session.js';
setup();
const lessons=[
  {title:'Ten-minute warm-up',description:'Four short phrases. First and second species, major then minor, in one key.',species:[1,2],keys:['C'],modes:['major','minor'],time:'4/4',bars:4,pattern:[{species:1,mode:'major'},{species:2,mode:'major'},{species:1,mode:'minor'},{species:2,mode:'minor'}],guide:'First species, then second. Repeat in minor.'},
  {title:'Species ladder',description:'Work through all five species in order, keeping the same key.',species:[1,2,3,4,5],keys:['D'],modes:['minor'],time:'4/4',bars:4,pattern:[1,2,3,4,5].map(species=>({species})),guide:'First through fifth species in D minor, then the ladder starts again.'},
  {title:'Around the keys',description:'First species in six keys. Two bars in each, then another round.',species:[1],keys:['C','G','D','A','E','F'],modes:['major'],time:'4/4',bars:2,pattern:['C','G','D','A','E','F'].map(key=>({key})),guide:'C, G, D, A, E, then F major.'},
  {title:'Minor and syncopated',description:'Fourth species in four minor keys. Hold the ties through the barline.',species:[4],keys:['D','A','E','G'],modes:['minor'],time:'4/4',bars:4,pattern:['D','A','E','G'].map(key=>({key})),guide:'Practice suspensions in D, A, E, and G minor. Listen for the resolution after each tied note.'},
  {title:'In three',description:'Second and third species, alternating 3/4 and 6/8.',species:[2,3],keys:['F'],modes:['major'],time:'mix',bars:4,pattern:[{species:2,time:'3/4'},{species:3,time:'3/4'},{species:2,time:'6/8'},{species:3,time:'6/8'}],guide:'Two phrases in 3/4, then two in 6/8. Follow the beaming to feel the change in grouping.'},
  {title:'One long line',description:'Twelve bars of fifth species. Mixed rhythms, ties, and a longer arc.',species:[5],keys:['G'],modes:['major'],time:'4/4',bars:12,pattern:[{}],guide:'Play each voice alone before combining them.'},
];
const LENGTHS=[2,4,8,12,16];
let filter={species:new Set([1]),keys:new Set(['C']),modes:new Set(['major']),lengths:new Set([4])}, items=[],kept=[],finished=new Map(),focus=0,activeLesson=null,sequence=0,followLesson=true;
const piano=new Piano(active=>{ $('play').textContent=active?'■ Stop':'▶ Play';const pause=document.querySelector('.pause');if(pause)pause.textContent=active?'Pause':'Resume';document.querySelectorAll('.play-one').forEach(b=>b.textContent=active&&b.dataset.id===String(items[focus]?.result.id)?'■ Stop':'▶ Play'); });
let deliberate=false,lastPersist=0;
const sessionStore=new SessionStorage(()=>localStorage);let plan=sessionStore.value;
const sessionNotice=el('p',{role:'status'}),queue=el('div',{id:'session-queue'});
const sessionImport=el('input',{type:'file',accept:'.json,application/json',hidden:true,onchange:async()=>{
  if(!sessionImport.files[0])return;
  try{const imported=parseSession(await sessionImport.files[0].text());sessionStore.save(imported);piano.stop();plan=imported;sessionNotice.textContent='Session imported.';renderPlan();if(deliberate)startSession();}
  catch(e){sessionNotice.textContent=`Import failed: ${e.message}`;}sessionImport.value='';
}});
const sessionPanel=el('section',{class:'library','aria-label':'Practice session'},el('h2',{},'Practice session'),queue,
  el('div',{class:'library-tools'},button('Start session',()=>{piano.stop();resetProgress();persistSession();startSession();}),
    button('Resume session',()=>startSession()),button('Export session',()=>{persistSession();downloadText('lilypoint-session.json',sessionStore.export(),'application/json');sessionNotice.textContent='Session exported.';}),button('Import session',()=>sessionImport.click())),sessionImport,sessionNotice);
$('home').append(sessionPanel);
const library=mountCollection($('home'),{onPractice:openSaved,onAddToSession:score=>{
  if(plan.exercises.length+score.results.length>100){sessionNotice.textContent='A session can contain up to 100 exercises.';return;}
  captureProgress();piano.stop();plan.exercises.push(...score.results.map((r,i)=>sessionExercise(r,(score.results.length>1?`${score.name} · ${i+1}`:score.name).slice(0,100))));
  persistSession();renderPlan();if(deliberate)startSession();status(`Added “${score.name}” to the session.`);
}});
function persistSession(){try{sessionStore.save(plan);sessionNotice.textContent='Session saved on this device.';}catch(e){sessionNotice.textContent=e.message;}}
function resetProgress(){plan.progress={index:0,repetition:0,ticks:plan.exercises[0]?exerciseBounds(plan.exercises[0]).startTicks:0,complete:false};}
function renderPlan(){
  queue.replaceChildren(...plan.exercises.map((ex,i)=>{
    const edit=(field,value)=>{captureProgress();piano.pause();ex[field]=value;if(field==='repetitions'&&i===plan.progress.index)plan.progress.repetition=Math.min(plan.progress.repetition,value-1);persistSession();if(deliberate)startSession();};
    const move=delta=>{captureProgress();piano.stop();const current=plan.exercises[plan.progress.index]?.id;const [entry]=plan.exercises.splice(i,1);plan.exercises.splice(i+delta,0,entry);plan.progress.index=plan.exercises.findIndex(e=>e.id===current);persistSession();renderPlan();if(deliberate)startSession();};
    return el('div',{class:'session-entry',dataset:{id:ex.id}},el('strong',{},`${i+1}. ${ex.name}`),
      el('label',{},'Target tempo ',el('input',{type:'number',min:30,max:200,value:ex.tempo,'aria-label':`Target tempo ${i+1}`,onchange:e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=30&&n<=200)edit('tempo',n);else e.target.value=ex.tempo;}})),
      el('label',{},'Repetitions ',el('input',{type:'number',min:1,max:99,value:ex.repetitions,'aria-label':`Repetitions ${i+1}`,onchange:e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=99)edit('repetitions',n);else e.target.value=ex.repetitions;}})),
      el('label',{},'Notes ',el('textarea',{maxlength:500,value:ex.notes,'aria-label':`Practice notes ${i+1}`,onchange:e=>edit('notes',e.target.value)})),
      el('div',{class:'library-tools'},el('button',{'aria-label':`Move exercise ${i+1} up`,disabled:i===0,onclick:()=>move(-1)},'↑'),
        el('button',{'aria-label':`Move exercise ${i+1} down`,disabled:i===plan.exercises.length-1,onclick:()=>move(1)},'↓'),
        button('Remove',()=>{captureProgress();piano.stop();plan.exercises.splice(i,1);resetProgress();persistSession();renderPlan();if(deliberate)startSession();})),
      el('small',{},i===plan.progress.index?(plan.progress.complete?'Session complete':`Repetition ${plan.progress.repetition+1} / ${ex.repetitions}`):''));
  }));
  if(!plan.exercises.length)queue.append(el('p',{},'Add saved scores to build a session.'));
  for(const b of sessionPanel.querySelectorAll('button'))if(['Start session','Resume session'].includes(b.textContent))b.disabled=!plan.exercises.length;
}
function captureProgress(){if(deliberate&&piano.active){const pos=piano.position();plan.progress.ticks=pos.ticks;}}
function startSession(){
  if(!plan.exercises.length){if(deliberate){$('back').click();}return;}
  openSaved({name:'Practice session',results:plan.exercises.map(exerciseResult)});deliberate=true;
  document.querySelector('.collection').prepend(sessionPanel);
  for(const it of items){for(const b of it.node.querySelectorAll('.exercise-tools button'))if(['↻ Reroll','Skip →','Save exercise'].includes(b.textContent))b.hidden=true;it.node.querySelector('.exercise-tools input').hidden=true;}
  focus=plan.progress.index;select(focus);restoreControls();renderPlan();status(plan.progress.complete?'Session complete. Start session to play again.':'Session ready. Press Play to resume.');
}
function restoreControls(){
  const it=items[focus];if(!it)return;
  $('tempo').value=deliberate?plan.exercises[focus].tempo:it.result.spec.tempo||80;
  for(const voice of ['upper','lower'])$(voice+'-clef').value=it.result.spec[voice+'Clef']||'treble';
  const range=deliberate?plan.exercises[focus].range:it.range;
  $('loop-start').max=$('loop-end').max=it.result.spec.measures;$('loop-start').value=range.start;$('loop-end').value=range.end;
  $('seek').max=it.result.totalTicks;$('seek').value=deliberate&&focus===plan.progress.index?plan.progress.ticks:it.positionTicks;
  if(deliberate){$('hands').value=plan.settings.hands;$('countin').checked=plan.settings.countin;$('loop').checked=plan.settings.loop;}
  $('progress').textContent=deliberate?`Exercise ${focus+1} / ${items.length} · repetition ${plan.progress.repetition+1} / ${plan.exercises[focus].repetitions}`:`Measure ${Math.floor(Number($('seek').value)/it.result.barTicks)+1}`;
}
function playSession(countin=true){
  if(plan.progress.complete){status('Session complete. Choose Start session to play again.');return;}
  const p=plan.progress,ex=plan.exercises[p.index],it=items[p.index],bounds=exerciseBounds(ex);
  piano.play([{result:it.result,visual:it.visual,tempo:ex.tempo,...bounds}],{...plan.settings,tempo:ex.tempo,loop:false,countin:countin&&plan.settings.countin,startTicks:p.ticks,
    onProgress:pos=>{p.ticks=pos.ticks;$('seek').value=pos.ticks;$('progress').textContent=`Exercise ${p.index+1} / ${items.length} · repetition ${p.repetition+1} / ${ex.repetitions} · measure ${Math.min(it.result.spec.measures,Math.floor(pos.ticks/it.result.barTicks)+1)}`;if(Date.now()-lastPersist>1000){lastPersist=Date.now();persistSession();}}
  },()=>{advance(plan);persistSession();renderPlan();if(plan.progress.complete){restoreControls();status('Session complete.');}else{focus=plan.progress.index;select(focus,false,true);restoreControls();playSession(false);}});
}
// Shared controls apply to the focused exercise; notes are never regenerated here.
const transport=document.querySelector('.practice-transport .transport');
transport.insertBefore(button('Pause',()=>{if(piano.active)piano.pause();else if(deliberate)playSession(false);else if(piano.paused)piano.resume();if(deliberate)persistSession();},'pause'),$('next'));
const seek=el('input',{id:'seek',type:'range',min:0,max:1,step:1,value:0,'aria-label':'Playback position'});
transport.append(el('label',{},'Position ',seek),el('span',{id:'progress',role:'status'}));
const extra=el('div',{class:'transport-settings'});
for(const voice of ['upper','lower'])extra.append(el('label',{},`${voice==='upper'?'Upper':'Lower'} clef `,el('select',{id:voice+'-clef','aria-label':`${voice==='upper'?'Upper':'Lower'} clef`},...CLEFS.map(c=>el('option',{value:c},c)))));
extra.append(el('label',{},'First measure ',el('input',{id:'loop-start',type:'number',min:1,value:1,'aria-label':'First loop measure'})),el('label',{},'Last measure ',el('input',{id:'loop-end',type:'number',min:1,value:4,'aria-label':'Last loop measure'})),button('Exercise MIDI',()=>downloadMidi([items[focus]?.result].filter(Boolean),transportOptions().tempo)));
transport.parentNode.append(extra);
function changeFocused(action){
  const it=items[focus];if(!it)return;const wasActive=piano.active;captureProgress();if(!deliberate)it.positionTicks=piano.active?piano.position().ticks:Number($('seek').value);piano.pause();action(it);
  if(deliberate){const ex=plan.exercises[focus];ex.score={...ex.score,spec:{...ex.score.spec,...it.result.spec}};ex.tempo=it.result.spec.tempo;persistSession();}
  it.visual=draw(it.score,[it.result],it.result.spec.tempo);restoreControls();renderPlan();
  if(wasActive){if(deliberate)playSession(false);else piano.play([{result:it.result,visual:it.visual,tempo:it.result.spec.tempo,startTicks:(Number($('loop-start').value)-1)*it.result.barTicks,endTicks:Number($('loop-end').value)*it.result.barTicks}],{...transportOptions(),countin:false,startTicks:Number($('seek').value),onProgress:pos=>{it.positionTicks=pos.ticks;$('seek').value=pos.ticks;}});}
}
for(const voice of ['upper','lower'])$(voice+'-clef').onchange=()=>changeFocused(it=>{it.result.spec[voice+'Clef']=$(voice+'-clef').value;});
$('tempo').onchange=()=>changeFocused(it=>{it.result.spec.tempo=transportOptions().tempo;});
for(const id of ['hands','countin','loop'])$(id).onchange=()=>changeFocused(()=>{if(deliberate)plan.settings={hands:$('hands').value,countin:$('countin').checked,loop:$('loop').checked};});
for(const id of ['loop-start','loop-end'])$(id).onchange=()=>{
  const it=items[focus];if(!it)return;const start=Number($('loop-start').value),end=Number($('loop-end').value);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>it.result.spec.measures){restoreControls();status('Choose a valid measure range.');return;}
  captureProgress();piano.pause();it.range={start,end};it.positionTicks=(start-1)*it.result.barTicks;if(deliberate){plan.exercises[focus].range={start,end};plan.progress.ticks=it.positionTicks;persistSession();}
  $('seek').value=it.positionTicks;status('Measure range updated. Press Play to resume.');
};
seek.oninput=()=>{
  const it=items[focus];if(!it)return;const bounds=deliberate?exerciseBounds(plan.exercises[focus]):{startTicks:(Number($('loop-start').value)-1)*it.result.barTicks,endTicks:Number($('loop-end').value)*it.result.barTicks};
  const ticks=Math.max(bounds.startTicks,Math.min(bounds.endTicks-1,Number(seek.value)));seek.value=ticks;
  it.positionTicks=ticks;
  if(deliberate){const wasActive=piano.active;captureProgress();piano.pause();plan.progress.ticks=ticks;persistSession();if(wasActive)playSession(false);else if(piano.current)piano.seek(ticks);}
  else if(piano.current)piano.seek(ticks);
};
addEventListener('pagehide',()=>{captureProgress();if(deliberate)persistSession();piano.stop();});
sessionNotice.textContent=sessionStore.error;renderPlan();
function openSaved(score){
  captureProgress();if(deliberate)persistSession();deliberate=false;
  document.querySelector('.collection').append(document.querySelector('section[aria-label="Saved scores"]'));
  piano.stop();activeLesson=null;items=[];focus=0;$('feed').replaceChildren();
  $('home').hidden=true;$('session').hidden=false;$('lesson-name').textContent=score.name;
  document.querySelector('.sentence').hidden=true;document.querySelector('.filters').hidden=true;$('guidance').hidden=true;$('more').hidden=true;
  score.results.forEach(result=>appendExercise(result));select(0);
}
const pick=set=>[...set][Math.floor(Math.random()*set.size)];
function nextSpec(){
  const pattern=followLesson?lessons[activeLesson].pattern[sequence%lessons[activeLesson].pattern.length]:{};sequence++;
  return defaultSpec({key:pick(filter.keys),mode:pick(filter.modes),species:pick(filter.species),...pattern,measures:pick(filter.lengths),time:$('time').value==='mix'?(pattern.time||pick(new Set(['3/4','6/8']))):$('time').value});
}
function toggle(set,v){if(set.has(v)){if(set.size>1)set.delete(v);}else set.add(v);}
function refreshFilters(){
  pills($('filter-species'),'Species',SPECIES.map(s=>s.n),v=>filter.species.has(v),v=>{toggle(filter.species,v);reset();},v=>speciesInfo(v).short);
  $('filter-species').append(button('Random species',()=>{filter.species=new Set(SPECIES.map(s=>s.n));reset();},'pill'));
  pills($('filter-keys'),'Key',KEYS,v=>filter.keys.has(v),v=>{toggle(filter.keys,v);reset();});
  $('filter-keys').append(button('Random key',()=>{filter.keys=new Set(KEYS);reset();},'pill'));
  pills($('filter-modes'),'Mode',MODES,v=>filter.modes.has(v),v=>{toggle(filter.modes,v);reset();});
  $('filter-modes').append(button('Random mode',()=>{filter.modes=new Set(MODES);reset();},'pill'));
  pills($('filter-lengths'),'Length',LENGTHS,v=>filter.lengths.has(v),v=>{toggle(filter.lengths,v);reset(false);});
  $('filter-lengths').append(button('Random length',()=>{filter.lengths=new Set(LENGTHS);reset(false);},'pill'));
  $('length').value=filter.lengths.size===1?String(pick(filter.lengths)):'mix';
  $('sentence-species').replaceChildren(...SPECIES.map(s=>el('option',{value:s.n},s.name.toLowerCase())),el('option',{value:'mix'},'a mix of species'));
  $('sentence-species').value=filter.species.size===1?String(pick(filter.species)):'mix';
  $('sentence-key').replaceChildren(...KEYS.map(k=>el('option',{value:k},k)),el('option',{value:'mix'},'different keys'));
  $('sentence-key').value=filter.keys.size===1?pick(filter.keys):'mix';
}
function select(index,scroll=false,preserveTransport=false){
  if(index<0)return;if(index>=items.length)more(2);
  if(index>=items.length)return;
  if(index!==focus&&!preserveTransport){captureProgress();piano.stop();if(deliberate){plan.progress={index,repetition:0,ticks:exerciseBounds(plan.exercises[index]).startTicks,complete:false};persistSession();}}
  const changed=index!==focus;focus=index;if(changed||!piano.active)restoreControls();
  items.forEach((it,i)=>it.node.classList.toggle('selected',i===focus));
  if(scroll)items[focus].node.scrollIntoView({block:'center',behavior:'smooth'});
}
function play(it=items[focus]){
  if(!it)return;
  if(piano.active&&it===items[focus]){captureProgress();piano.stop();if(deliberate)persistSession();return;}
  select(items.indexOf(it));
  if(deliberate){playSession();return;}
  piano.play([{result:it.result,visual:it.visual,tempo:transportOptions().tempo,startTicks:(Number($('loop-start').value)-1)*it.result.barTicks,endTicks:Number($('loop-end').value)*it.result.barTicks}],{...transportOptions(),startTicks:Number($('seek').value),onProgress:pos=>{it.positionTicks=pos.ticks;$('seek').value=pos.ticks;}},()=>{finished.set(it.result.id,it.result);$('finished').textContent=finished.size;collection();it.positionTicks=(it.range.start-1)*it.result.barTicks;$('seek').value=it.positionTicks;});
}
function keep(it){
  const index=kept.findIndex(r=>r.id===it.result.id);if(index>=0)kept.splice(index,1);else kept.push({...it.result,spec:{...it.result.spec,tempo:transportOptions().tempo}});
  collection();
}
function collection(){
  $('kept').replaceChildren(...kept.map((r,i)=>el('li',{},el('span',{},`${i+1}. ${r.spec.key} ${r.spec.mode} · ${speciesInfo(r.spec.species).short}`),el('button',{'aria-label':`Remove kept phrase ${i+1}`,onclick:()=>{kept.splice(i,1);collection();}},'×'))));
  $('empty').hidden=kept.length>0;
  for(const id of ['open-sheet','pdf','ly'])$(id).disabled=!kept.length;
  $('print').disabled=!kept.length&&!finished.size;
  items.forEach(it=>{const on=kept.some(r=>r.id===it.result.id);it.keepButton.textContent=on?'✓ Kept':'+ Keep';it.keepButton.setAttribute('aria-pressed',on);});
}
function revise(it,change){
  piano.stop();const old=it.result, replacement=generate({...old.spec,...change});
  // A kept phrase is a snapshot; rerolling the exercise never overwrites the collection.
  it.result=replacement;it.visual=draw(it.score,[it.result],80,undefined,true);it.playButton.dataset.id=String(it.result.id);describeItem(it);collection();
}
function reroll(it){revise(it,{seed:randomSeed()});}
function describeItem(it){const s=it.result.spec;it.info.textContent=`${s.key} ${s.mode} · ${speciesInfo(s.species).short} · ${s.measures} bars · ${s.time}`;it.score.setAttribute('aria-label',`${speciesInfo(s.species).name}, ${s.key} ${s.mode}, ${s.measures} bars in ${s.time}`);}
function more(n=2){
  if(activeLesson===null)return;
  for(let i=0;i<n;i++){
    let result;
    try { result=generate(nextSpec()); } catch(e) { status('Could not write this exercise.');continue; }
    appendExercise(result);
  }
  collection();
}
function appendExercise(result){
    const s=result.spec;
    const it={result,number:sequence||items.length+1,range:{start:1,end:result.spec.measures},positionTicks:0};
    it.keepButton=button('+ Keep',()=>keep(it),'primary');
    const name=el('input',{'aria-label':'Exercise name',maxlength:100,value:`${s.key} ${s.mode} · ${speciesInfo(s.species).short}`});
    it.playButton=button('▶ Play',()=>play(it),'play-one');it.playButton.dataset.id=String(result.id);
    it.score=el('div',{class:'score',role:'img','aria-label':`${speciesInfo(s.species).name}, ${s.key} ${s.mode}, ${s.measures} bars in ${s.time}`});
    it.info=el('div',{class:'exercise-info'});
    it.node=el('article',{class:'exercise',tabindex:0,onfocusin:()=>select(items.indexOf(it)),onclick:()=>select(items.indexOf(it))},
      el('aside',{class:'exercise-margin'},el('div',{class:'eyebrow'},`Exercise ${it.number}`),it.info,
        el('div',{class:'exercise-tools'},it.playButton,it.keepButton,name,button('Save exercise',()=>library.save([{...it.result,spec:{...it.result.spec,tempo:transportOptions().tempo}}],{name:name.value.trim()||'Untitled exercise'})),button('↻ Reroll',()=>reroll(it)),button('Skip →',()=>{piano.stop();const index=items.indexOf(it);items.splice(index,1);it.node.remove();if(items.length<3)more(2);select(Math.min(index,items.length-1),true);},'skip'))),it.score);
    describeItem(it);
    items.push(it);$('feed').append(it.node);it.visual=draw(it.score,[result],80,undefined,true);
}
function reset(custom=true){
  if(custom===true)followLesson=false;
  const lesson=lessons[activeLesson];
  $('lesson-name').textContent=lesson.title+(followLesson?'':' · customized');
  const guide=followLesson?lesson.guide:'';
  $('guidance').textContent=guide;$('guidance').hidden=!guide;
  piano.stop();items=[];focus=0;sequence=0;$('feed').replaceChildren();refreshFilters();more(3);select(0);
}
function start(index){
  captureProgress();if(deliberate)persistSession();deliberate=false;
  document.querySelector('.collection').append(document.querySelector('section[aria-label="Saved scores"]'));
  document.querySelector('.sentence').hidden=false;document.querySelector('.filters').hidden=false;$('more').hidden=false;
  const l=lessons[index];activeLesson=index;
  filter={species:new Set(l.species),keys:new Set(l.keys),modes:new Set(l.modes),lengths:new Set([l.bars])};followLesson=true;
  $('length').value=l.bars;$('time').value=l.time;$('lesson-name').textContent=l.title;
  $('home').hidden=true;$('session').hidden=false;reset(false);window.scrollTo(0,0);
}
$('lessons').replaceChildren(...lessons.map((l,i)=>el('button',{class:'lesson',onclick:()=>start(i)},el('span',{class:'number'},String(i+1).padStart(2,'0')),el('span',{class:'arrow'},'↗'),el('h2',{},l.title),el('p',{},l.description))));
$('back').onclick=()=>{captureProgress();if(deliberate)persistSession();piano.stop();deliberate=false;activeLesson=null;$('home').append(sessionPanel,document.querySelector('section[aria-label="Saved scores"]'));$('home').hidden=false;$('session').hidden=true;renderPlan();window.scrollTo(0,0);};
$('length').onchange=()=>{filter.lengths=new Set($('length').value==='mix'?LENGTHS:[Number($('length').value)]);reset(false);};$('time').onchange=()=>reset();
$('sentence-species').onchange=()=>{filter.species=new Set($('sentence-species').value==='mix'?SPECIES.map(s=>s.n):[Number($('sentence-species').value)]);reset();};
$('sentence-key').onchange=()=>{filter.keys=new Set($('sentence-key').value==='mix'?KEYS:[$('sentence-key').value]);reset();};
$('more').onclick=()=>more(3);$('next').onclick=()=>select(focus+1,true);$('play').onclick=()=>play();
$('pdf').onclick=()=>exportScore(kept,'Practice session');$('print').onclick=()=>exportScore([...new Map([...finished,...kept.map(r=>[r.id,r])]).values()],'Practice session',false);
$('ly').onclick=()=>downloadLilyPond(kept,'Practice session');
$('open-sheet').onclick=()=>{location.href=(document.body.dataset.writeUrl || '07-studio.html')+'?score='+scoreQuery(kept,{name:'Practice session'});};
new IntersectionObserver(entries=>{if(activeLesson!==null&&entries.some(e=>e.isIntersecting))more(2);},{rootMargin:'200px'}).observe($('sentinel'));
addEventListener('keydown',e=>{
  if($('session').hidden||e.target.closest('input,select,textarea,[contenteditable]'))return;
  if(e.target.closest('button')&&(e.code==='Space'||e.key==='Enter'))return;
  if(e.code==='Space'){e.preventDefault();play();}
  else if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='n')$('next').click();
  else if(e.key.toLowerCase()==='k')select(focus-1,true);
  else if(e.key==='Enter'){e.preventDefault();if(items[focus])keep(items[focus]);}
  else if(e.key.toLowerCase()==='r'&&!deliberate&&items[focus])reroll(items[focus]);
});
let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{captureProgress();piano.pause();if(deliberate)persistSession();for(const it of items)it.visual=draw(it.score,[it.result],it.result.spec.tempo,undefined,true);},200);});
collection();
try {
  const params=new URLSearchParams(location.search);
  if(params.has('score'))openSaved(parseScore(JSON.parse(params.get('score'))));
  else if(params.has('saved')){const entry=library.store.data.entries.find(e=>e.id===params.get('saved'));if(entry)openSaved(parseScore(entry));else status('Saved score could not be found.');}
}catch(e){status(`Score could not load: ${e.message}`);}
