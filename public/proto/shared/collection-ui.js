import { Collection, parseScore, scoreQuery } from './collection.js';
import { el } from './ui.js';
import { downloadText } from './core.js';

export function mountCollection(parent,{onPractice,onWrite}={}) {
  const store=new Collection(()=>localStorage);
  const notice=el('p',{role:'status',class:'muted'}),rows=el('div',{class:'saved-scores'});
  const run=action=>{try{action();}catch(e){notice.textContent=e.message;}render();};
  const importInput=el('input',{type:'file',accept:'.json,application/json',hidden:true,onchange:async()=>{
    const file=importInput.files[0];if(!file)return;
    try {store.import(await file.text());notice.textContent='Collection imported.';}catch(e){notice.textContent=`Import failed: ${e.message}`;}
    importInput.value='';render();
  }});
  const section=el('section',{class:'library','aria-label':'Saved scores'},el('h2',{},'Saved scores'),rows,
    el('div',{class:'library-tools'},el('button',{onclick:()=>{downloadText('lilypoint-collection.json',store.export(),'application/json');notice.textContent='Collection backup exported.';}},'Export collection'),
      el('button',{onclick:()=>importInput.click()},'Import collection')),importInput,notice);
  parent.append(section);
  function render(){
    rows.replaceChildren(...store.data.entries.map(entry=>el('div',{class:'saved-score'},el('strong',{},entry.name),
      el('div',{class:'library-tools'},el('button',{onclick:()=>onWrite?onWrite(parseScore(entry)):location.assign((document.body.dataset.writeUrl||'/')+'?score='+scoreQuery(parseScore(entry).results,entry))},'Open in Write'),
        el('button',{onclick:()=>onPractice?onPractice(parseScore(entry)):location.assign((document.body.dataset.practiceUrl||'/practice.html')+'?saved='+encodeURIComponent(entry.id))},'Practice'),
        el('button',{'aria-label':`Delete ${entry.name}`,onclick:()=>run(()=>{store.remove(entry.id);notice.textContent=`Deleted “${entry.name}”.`;})},'Delete')))));
    if(!store.data.entries.length)rows.append(el('p',{},'No saved scores. Save an exercise or a sheet to return to it here.'));
  }
  notice.textContent=store.error;render();
  return {store,save(results,meta){run(()=>{store.add(results,meta);notice.textContent=`Saved “${meta.name}”.`;});},render};
}
