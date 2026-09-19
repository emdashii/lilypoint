import { KEYS, MODES, SPECIES, TIME_SIGS, defaultSpec, randomSeed, speciesInfo, readUrlState, encodeSpecs, decodeSpecs } from './core.js';
import { $, el, setup, status, button, pills, draw, exportScore, downloadMidi, downloadLilyPond, generatePhrase as generate, Piano, transportOptions, wireTransport } from './studio.js';
setup();
const state=readUrlState();
const DRAFT_KEY='lilypoint-writing-room-draft-v1';
// A phrase URL is an intentional load. Plain navigation resumes this tab's draft.
if(!state.params.has('p')) {
  try {
    const saved=sessionStorage.getItem(DRAFT_KEY);
    if(saved){state.params=new URLSearchParams(saved);state.specs=decodeSpecs(state.params.get('p'));}
  } catch { /* Storage may be disabled; phrase URLs remain usable. */ }
}
let results=(state.params.has('p')?state.specs:[defaultSpec({key:'D',mode:'minor',species:1}),defaultSpec({key:'D',mode:'minor',species:2}),defaultSpec({key:'D',mode:'minor',species:3})]).map(s=>generate({tempo:80,...s}));
let selected=Math.max(0,Math.min(results.length-1,Number(state.params.get('selected'))||0)), visuals=[], dragged=null;
$('title').value=state.params.get('title')??'A little counterpoint';
$('composer').value=state.params.get('composer')??'Studies for two voices';
const piano=new Piano(active=>{ $('play').textContent=active?'■ Stop':'▶ Play phrase'; $('play-all').textContent=active?'■ Stop':'Play sheet'; });
wireTransport(piano);
$('toggle-editor').onclick=()=>{const expanded=document.querySelector('.editor').classList.toggle('expanded');$('toggle-editor').setAttribute('aria-expanded',expanded);};
function save() {
  const url=new URL(location.href);
  url.searchParams.set('p',encodeSpecs(results.map(r=>r.spec)));
  url.searchParams.set('title',$('title').value);
  url.searchParams.set('composer',$('composer').value);
  url.searchParams.set('selected',selected);
  history.replaceState(null,'',url);
  try { sessionStorage.setItem(DRAFT_KEY,url.search); } catch { /* Keep editing through URL state. */ }
}
function select(i) { piano.stop(); selected=i; list(); editor(); document.querySelectorAll('.sheet-phrase').forEach((n,k)=>n.classList.toggle('selected',k===i)); save(); }
function move(from,to) { if(to<0||to>=results.length)return; piano.stop(); const [r]=results.splice(from,1); results.splice(to,0,r); selected=to; render(); }
function list() {
  $('phrase-count').textContent=results.length;
  $('phrases').replaceChildren(...results.map((r,i)=>{
    const row=el('div',{class:'phrase-row'+(i===selected?' selected':''),draggable:true},
      el('button',{class:'select-phrase',onclick:()=>{ select(i); $('sheet').children[i].scrollIntoView({block:'center',behavior:'smooth'}); }},`${String(i+1).padStart(2,'0')}  ${speciesInfo(r.spec.species).name}`,el('small',{},`${r.spec.key} ${r.spec.mode} · ${r.spec.measures} bars · ${r.spec.time}`)),
      el('div',{class:'row-tools'},el('button',{'aria-label':`Reroll phrase ${i+1}`,onclick:()=>{ selected=i; update({seed:randomSeed()}); }},'↻'),el('button',{'aria-label':`Remove phrase ${i+1}`,onclick:()=>{ piano.stop(); results.splice(i,1); selected=Math.max(0,Math.min(selected,results.length-1)); render(); }},'×'),el('button',{'aria-label':`Move phrase ${i+1} up`,disabled:i===0,onclick:()=>move(i,i-1)},'↑')));
    row.ondragstart=()=>{dragged=i;}; row.ondragover=e=>e.preventDefault(); row.ondrop=e=>{e.preventDefault();if(dragged!==null)move(dragged,i);dragged=null;}; return row;
  }));
}
function update(change) {
  if(!results[selected])return;
  try { const next=generate({...results[selected].spec,...change}); piano.stop(); results[selected]=next; render(); } catch(e) {status(e.message);}
}
function changeTempo(tempo) {
  const r=results[selected];if(!r||r.spec.tempo===tempo)return;
  piano.stop();r.spec={...r.spec,tempo};$('tempo').value=tempo;
  // The following phrase may need to gain or lose a repeated marking. Notes keep their seeds.
  for(const i of [selected,selected+1])if(results[i]){
    const score=$('sheet').children[i].querySelector('.score');
    visuals[i]=draw(score,[results[i]],results[i].spec.tempo,undefined,false,{previous:results[i-1]?.spec});
  }
  save();status(`Phrase ${selected+1} · ♩ ${tempo}`);
}
function editor() {
  const s=results[selected]?.spec;
  $('editing').textContent=s?`Editing phrase ${String(selected+1).padStart(2,'0')}`:'Add a phrase to begin';
  for(const id of ['play','play-all','reroll','pdf','midi','ly','print'])$(id).disabled=!s;
  if(!s){for(const id of ['species','keys','modes','bars','meter'])$(id).replaceChildren();return;}
  $('tempo').value=s.tempo||80;
  $('tempo').setAttribute('aria-label',`Tempo for phrase ${selected+1}`);
  pills($('species'),'Species',SPECIES.map(s=>s.n),s.species,v=>update({species:v}),v=>`${speciesInfo(v).short} · ${speciesInfo(v).blurb}`);
  pills($('keys'),'Key',KEYS,s.key,v=>update({key:v}));
  pills($('modes'),'Mode',MODES,s.mode,v=>update({mode:v}));
  pills($('bars'),'Bars',[2,4,8,12,16],s.measures,v=>update({measures:v}));
  pills($('meter'),'Meter',TIME_SIGS,s.time,v=>update({time:v}));
}
function render() {
  list();editor();
  $('sheet').replaceChildren(); visuals=[];
  results.forEach((r,i)=>{
    const score=el('div',{class:'score',role:'img','aria-label':`Phrase ${i+1}, ${speciesInfo(r.spec.species).name}, ${r.spec.key} ${r.spec.mode}`});
    const wrap=el('section',{class:'sheet-phrase'+(i===selected?' selected':''),onclick:()=>select(i)},el('div',{class:'phrase-label'},`${String(i+1).padStart(2,'0')}`,`${r.spec.key} ${r.spec.mode}`),score);
    $('sheet').append(wrap);visuals.push(draw(score,[r],r.spec.tempo,undefined,false,{previous:results[i-1]?.spec}));
  });
  if(!results.length)$('sheet').append(el('p',{class:'muted'},'No phrases yet.'));
  $('summary').textContent=`${results.reduce((n,r)=>n+r.spec.measures,0)} bars`;
  save();
}
$('add').onclick=()=>{piano.stop();results.push(generate(defaultSpec({...results[selected]?.spec,tempo:results.at(-1)?.spec.tempo||80,seed:randomSeed()})));selected=results.length-1;render();$('sheet').lastElementChild.scrollIntoView({block:'center',behavior:'smooth'});};
$('reroll').onclick=()=>update({seed:randomSeed()});
$('tempo').oninput=()=>{const value=Number($('tempo').value);if(Number.isInteger(value)&&value>=30&&value<=200)changeTempo(value);};
$('tempo').onchange=()=>changeTempo(transportOptions().tempo);
$('play').onclick=()=>piano.active?piano.stop():piano.play(results[selected]?[{result:results[selected],visual:visuals[selected],tempo:results[selected].spec.tempo}]:[],transportOptions());
$('play-all').onclick=()=>piano.active?piano.stop():piano.play(results.map((r,i)=>({result:r,visual:visuals[i],tempo:r.spec.tempo})),transportOptions());
$('pdf').onclick=()=>exportScore(results,$('title').value,true,$('composer').value);
$('print').onclick=()=>exportScore(results,$('title').value,false,$('composer').value);
$('midi').onclick=()=>downloadMidi(results,transportOptions().tempo);
$('ly').onclick=()=>downloadLilyPond(results,$('title').value,$('composer').value);
$('title').oninput=save;$('composer').oninput=save;
addEventListener('keydown',e=>{if(e.target.closest('input,select,textarea,[contenteditable]'))return;if(e.target.closest('button')&&(e.code==='Space'||e.key==='Enter'))return;if(e.code==='Space'){e.preventDefault();$('play').click();}else if(e.key.toLowerCase()==='r')$('reroll').click();else if(e.key.toLowerCase()==='n')$('add').click();});
let resize;addEventListener('resize',()=>{clearTimeout(resize);resize=setTimeout(()=>{piano.stop();render();},200);});
render();
