import { KEYS, MODES, SPECIES, defaultSpec, randomSeed, speciesInfo, encodeSpecs } from './core.js';
import { $, el, setup, status, button, pills, draw, exportScore, downloadLilyPond, generatePhrase as generate, Piano, transportOptions, wireTransport } from './studio.js';
setup();
const lessons=[
  {title:'Ten-minute warm-up',description:'Four short phrases. First and second species, major then minor, in one key.',species:[1,2],keys:['C'],modes:['major','minor'],time:'4/4',bars:4,pattern:[{species:1,mode:'major'},{species:2,mode:'major'},{species:1,mode:'minor'},{species:2,mode:'minor'}],guide:'First species, then second. Repeat in minor. The four-phrase sequence continues with fresh music as you scroll.'},
  {title:'Species ladder',description:'Work through all five species in order, keeping the same key.',species:[1,2,3,4,5],keys:['D'],modes:['minor'],time:'4/4',bars:4,pattern:[1,2,3,4,5].map(species=>({species})),guide:'Move from first through fifth species in D minor. After fifth species, the ladder starts again with new phrases.'},
  {title:'Around the keys',description:'First species in six keys. Two bars in each, then another round.',species:[1],keys:['C','G','D','A','E','F'],modes:['major'],time:'4/4',bars:2,pattern:['C','G','D','A','E','F'].map(key=>({key})),guide:'C, G, D, A, E, then F major. Read each key signature before you play.'},
  {title:'Minor and syncopated',description:'Fourth species in four minor keys. Hold the ties through the barline.',species:[4],keys:['D','A','E','G'],modes:['minor'],time:'4/4',bars:4,pattern:['D','A','E','G'].map(key=>({key})),guide:'Practice suspensions in D, A, E, and G minor. Listen for the resolution after each tied note.'},
  {title:'In three',description:'Second and third species, alternating 3/4 and 6/8.',species:[2,3],keys:['F'],modes:['major'],time:'mix',bars:4,pattern:[{species:2,time:'3/4'},{species:3,time:'3/4'},{species:2,time:'6/8'},{species:3,time:'6/8'}],guide:'Two phrases in 3/4, then two in 6/8. Follow the beaming to feel the change in grouping.'},
  {title:'One long line',description:'Twelve bars of fifth species. Mixed rhythms, ties, and a longer arc.',species:[5],keys:['G'],modes:['major'],time:'4/4',bars:12,pattern:[{}],guide:'Play each voice alone before combining them. Choose lengths below to vary the next exercises.'},
];
const LENGTHS=[2,4,8,12,16];
let filter={species:new Set([1]),keys:new Set(['C']),modes:new Set(['major']),lengths:new Set([4])}, items=[],kept=[],finished=new Map(),focus=0,activeLesson=null,sequence=0,followLesson=true;
const piano=new Piano(active=>{ $('play').textContent=active?'■ Stop':'▶ Play'; document.querySelectorAll('.play-one').forEach(b=>b.textContent=active&&b.dataset.id===String(items[focus]?.result.id)?'■ Stop':'▶ Play'); });
wireTransport(piano);
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
function select(index,scroll=false){
  if(index<0)return;if(index>=items.length)more(2);
  if(index>=items.length)return;
  if(index!==focus)piano.stop(); focus=index;
  items.forEach((it,i)=>it.node.classList.toggle('selected',i===focus));
  if(scroll)items[focus].node.scrollIntoView({block:'center',behavior:'smooth'});
}
function play(it=items[focus]){
  if(!it)return;
  if(piano.active&&it===items[focus]){piano.stop();return;}
  select(items.indexOf(it));
  piano.play([{result:it.result,visual:it.visual}],transportOptions(),()=>{finished.set(it.result.id,it.result);$('finished').textContent=finished.size;collection();});
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
  it.result=replacement;it.visual=draw(it.score,[it.result],80,undefined,true);it.playButton.dataset.id=String(it.result.id);describeItem(it);collection();status('Exercise updated');
}
function reroll(it){revise(it,{seed:randomSeed()});}
function describeItem(it){const s=it.result.spec;it.info.textContent=`${s.key} ${s.mode} · ${speciesInfo(s.species).short} · ${s.measures} bars · ${s.time}`;it.score.setAttribute('aria-label',`${speciesInfo(s.species).name}, ${s.key} ${s.mode}, ${s.measures} bars in ${s.time}`);}
function more(n=2){
  if(activeLesson===null)return;
  for(let i=0;i<n;i++){
    let result;
    try { result=generate(nextSpec()); } catch(e) { status('Could not write this exercise. Try More exercises again.');continue; }
    const s=result.spec;
    const it={result,number:sequence};
    it.keepButton=button('+ Keep',()=>keep(it),'primary');
    it.playButton=button('▶ Play',()=>play(it),'play-one');it.playButton.dataset.id=String(result.id);
    it.score=el('div',{class:'score',role:'img','aria-label':`${speciesInfo(s.species).name}, ${s.key} ${s.mode}, ${s.measures} bars in ${s.time}`});
    it.info=el('div',{class:'exercise-info'});
    it.node=el('article',{class:'exercise',tabindex:0,onfocusin:()=>select(items.indexOf(it)),onclick:()=>select(items.indexOf(it))},
      el('aside',{class:'exercise-margin'},el('div',{class:'eyebrow'},`Exercise ${it.number}`),it.info,
        el('div',{class:'exercise-tools'},it.playButton,it.keepButton,button('↻ Reroll',()=>reroll(it)),button('Skip →',()=>{piano.stop();const index=items.indexOf(it);items.splice(index,1);it.node.remove();if(items.length<3)more(2);select(Math.min(index,items.length-1),true);},'skip'))),it.score);
    describeItem(it);
    items.push(it);$('feed').append(it.node);it.visual=draw(it.score,[result],80,undefined,true);
  }
  collection();
}
function reset(custom=true){
  if(custom===true)followLesson=false;
  const lesson=lessons[activeLesson];
  $('lesson-name').textContent=lesson.title+(followLesson?'':' · customized');
  $('guidance').textContent=followLesson?lesson.guide:'Fresh exercises use your selected species, keys, modes, and lengths.';
  piano.stop();items=[];focus=0;sequence=0;$('feed').replaceChildren();refreshFilters();status('Fresh exercises · collection saved');more(3);select(0);
}
function start(index){
  const l=lessons[index];activeLesson=index;
  filter={species:new Set(l.species),keys:new Set(l.keys),modes:new Set(l.modes),lengths:new Set([l.bars])};followLesson=true;
  $('length').value=l.bars;$('time').value=l.time;$('lesson-name').textContent=l.title;$('guidance').textContent=l.guide;
  $('home').hidden=true;$('session').hidden=false;reset(false);window.scrollTo(0,0);
}
$('lessons').replaceChildren(...lessons.map((l,i)=>el('button',{class:'lesson',onclick:()=>start(i)},el('span',{class:'number'},String(i+1).padStart(2,'0')),el('span',{class:'arrow'},'↗'),el('h2',{},l.title),el('p',{},l.description))));
$('back').onclick=()=>{piano.stop();activeLesson=null;$('home').hidden=false;$('session').hidden=true;window.scrollTo(0,0);};
$('length').onchange=()=>{filter.lengths=new Set($('length').value==='mix'?LENGTHS:[Number($('length').value)]);reset(false);};$('time').onchange=()=>reset();
$('sentence-species').onchange=()=>{filter.species=new Set($('sentence-species').value==='mix'?SPECIES.map(s=>s.n):[Number($('sentence-species').value)]);reset();};
$('sentence-key').onchange=()=>{filter.keys=new Set($('sentence-key').value==='mix'?KEYS:[$('sentence-key').value]);reset();};
$('more').onclick=()=>more(3);$('next').onclick=()=>{piano.stop();select(focus+1,true);};$('play').onclick=()=>play();
$('pdf').onclick=()=>exportScore(kept,'Practice session');$('print').onclick=()=>exportScore([...new Map([...finished,...kept.map(r=>[r.id,r])]).values()],'Practice session',false);
$('ly').onclick=()=>downloadLilyPond(kept,'Practice session');
$('open-sheet').onclick=()=>{location.href=(document.body.dataset.writeUrl || '07-studio.html')+'?p='+encodeURIComponent(encodeSpecs(kept.map(r=>r.spec)))+'&title=Practice+session';};
new IntersectionObserver(entries=>{if(activeLesson!==null&&entries.some(e=>e.isIntersecting))more(2);},{rootMargin:'200px'}).observe($('sentinel'));
addEventListener('keydown',e=>{
  if(activeLesson===null||e.target.closest('input,select,textarea,[contenteditable]'))return;
  if(e.target.closest('button')&&(e.code==='Space'||e.key==='Enter'))return;
  if(e.code==='Space'){e.preventDefault();play();}
  else if(e.key.toLowerCase()==='j'||e.key.toLowerCase()==='n')$('next').click();
  else if(e.key.toLowerCase()==='k')select(focus-1,true);
  else if(e.key==='Enter'){e.preventDefault();if(items[focus])keep(items[focus]);}
  else if(e.key.toLowerCase()==='r'&&items[focus])reroll(items[focus]);
});
let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{piano.stop();for(const it of items)it.visual=draw(it.score,[it.result],80,undefined,true);},200);});
collection();
