import { SCHEMA_VERSION, envelope, integer, text, snapshot, restore } from './collection.js';

export const SESSION_KEY='lilypoint-practice-session-v1';
export function emptySession(){return {kind:'session',schemaVersion:SCHEMA_VERSION,exercises:[],progress:{index:0,repetition:0,ticks:0,complete:false},settings:{hands:'both',countin:true,loop:false}};}
export function sessionExercise(result,name){
  return {id:crypto.randomUUID(),name,score:snapshot(result),tempo:result.spec.tempo||80,repetitions:1,notes:'',range:{start:1,end:result.spec.measures}};
}
export function parseSession(raw){
  const value=typeof raw==='string'?JSON.parse(raw):raw;envelope(value,'session');
  if(!Array.isArray(value.exercises)||value.exercises.length>100)throw new Error('Invalid session exercises.');
  const ids=new Set();
  const results=value.exercises.map(ex=>{
    text(ex.id,100,'exercise ID');if(!ex.id||ids.has(ex.id))throw new Error('Duplicate exercise ID.');ids.add(ex.id);
    text(ex.name,100,'exercise name');text(ex.notes,500,'practice notes');
    integer(ex.tempo,30,200,'target tempo');integer(ex.repetitions,1,99,'repetitions');
    const r=restore(ex.score);integer(ex.range?.start,1,r.spec.measures,'first measure');integer(ex.range?.end,ex.range.start,r.spec.measures,'last measure');
    return r;
  });
  const p=value.progress,s=value.settings;
  if(!p||typeof p.complete!=='boolean'||!s||!['both','upper','lower'].includes(s.hands)||typeof s.countin!=='boolean'||typeof s.loop!=='boolean')throw new Error('Invalid session progress or settings.');
  integer(p.index,0,Math.max(0,results.length-1),'exercise position');
  integer(p.repetition,0,(value.exercises[p.index]?.repetitions||1)-1,'repetition position');
  const ex=value.exercises[p.index],r=results[p.index];
  integer(p.ticks,r?(ex.range.start-1)*r.barTicks:0,r?ex.range.end*r.barTicks:0,'playback position');
  return JSON.parse(JSON.stringify(value));
}
export function exerciseResult(ex){const r=restore(ex.score);r.spec.tempo=ex.tempo;return r;}
/** Range endpoints are inclusive measure numbers; transport uses a half-open tick interval. */
export function exerciseBounds(ex){const r=exerciseResult(ex);return {startTicks:(ex.range.start-1)*r.barTicks,endTicks:ex.range.end*r.barTicks};}
export function advance(session){
  const p=session.progress,ex=session.exercises[p.index];
  if(p.repetition+1<ex.repetitions)p.repetition++;
  else if(p.index+1<session.exercises.length){p.index++;p.repetition=0;}
  else if(session.settings.loop){p.index=0;p.repetition=0;}
  else {p.complete=true;p.ticks=exerciseBounds(ex).endTicks;return false;}
  p.ticks=exerciseBounds(session.exercises[p.index]).startTicks;return true;
}
export class SessionStorage {
  constructor(storage){
    this.storage=storage;this.value=emptySession();this.error='';this.raw=null;
    try{this.raw=storage().getItem(SESSION_KEY);if(this.raw)this.value=parseSession(this.raw);}
    catch(e){this.locked=true;this.error=`Session could not load: ${e.message} Export the stored file for recovery.`;}
  }
  save(value){
    const raw=JSON.stringify(value);this.pending=raw;
    if(this.locked)throw new Error(this.error);
    try{this.storage().setItem(SESSION_KEY,raw);}catch{throw new Error('Session progress could not save on this device. Export the session to keep it.');}
    this.value=JSON.parse(raw);this.raw=raw;this.pending=null;
  }
  import(raw){const value=parseSession(raw);this.save(value);return value;}
  export(){return this.locked&&this.raw?this.raw:this.pending||JSON.stringify(this.value,null,2);}
}
