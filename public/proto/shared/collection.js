import { Phrase } from '../../phrase.js';
import { getKey } from '../../key.js';
import { musicalEventsToVoice } from '../../validation/timed-events.js';
import { KEYS, MODES, TIME_SIGS, TICKS_PER_WHOLE } from './core.js';

export const SCHEMA_VERSION=1;
export const GENERATOR_VERSION='student-2026-09-09';
export const COLLECTION_KEY='lilypoint-collection-v1';
export const CLEFS=['treble','bass','alto','tenor'];
const clone=value=>JSON.parse(JSON.stringify(value));
const fail=message=>{throw new Error(message);};
export function integer(value,min,max,label) {
  if(!Number.isSafeInteger(value)||value<min||value>max)fail(`Invalid ${label}.`);
  return value;
}
export function text(value,max,label) {
  if(typeof value!=='string'||value.length>max)fail(`Invalid ${label}.`);
  return value;
}
export function envelope(value,kind) {
  if(!value||value.kind!==kind)fail(`This is not a lilypoint ${kind} file.`);
  if(value.schemaVersion!==SCHEMA_VERSION)fail('Unsupported file version. Keep the file for a compatible version of lilypoint.');
}
export function snapshot(result) {
  return clone({schemaVersion:SCHEMA_VERSION,generatorVersion:result.generatorVersion||GENERATOR_VERSION,
    requestedSeed:result.requestedSeed??result.spec.seed,effectiveSeed:result.spec.seed,
    spec:{tempo:80,upperClef:'treble',lowerClef:'treble',...result.spec},keyInfo:result.keyInfo,upper:result.upper,lower:result.lower});
}
let restoredId=-1;
/** Parse stored notes, never regenerate them. The existing event adapter validates pitches, spelling and ties. */
export function restore(score) {
  if(!score||score.schemaVersion!==SCHEMA_VERSION)fail('Unsupported score version.');
  text(score.generatorVersion,100,'generator version');
  integer(score.requestedSeed,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,'requested seed');
  integer(score.effectiveSeed,Number.MIN_SAFE_INTEGER,Number.MAX_SAFE_INTEGER,'effective seed');
  const s=score.spec;
  if(!s||!KEYS.includes(s.key)||!MODES.includes(s.mode)||!TIME_SIGS.includes(s.time))fail('Invalid score settings.');
  integer(s.species,1,5,'species');integer(s.measures,1,64,'measures');integer(s.tempo,30,200,'tempo');
  if(s.seed!==score.effectiveSeed||!CLEFS.includes(s.upperClef)||!CLEFS.includes(s.lowerClef))fail('Invalid score seed or clef.');
  const [beats,unit]=s.time.split('/').map(Number),barTicks=beats*TICKS_PER_WHOLE/unit,totalTicks=barTicks*s.measures;
  const parseVoice=events=>{
    if(!Array.isArray(events)||!events.length||events.length>8192)fail('Invalid stored voice.');
    const canonical=events.map(e=>{
      if(!e||typeof e.rest!=='boolean'||typeof e.tied!=='boolean')fail('Invalid stored event.');
      integer(e.onset,0,totalTicks,'onset');integer(e.ticks,1,totalTicks,'duration');
      if(e.rest ? e.pitch!==null||e.midi!==null||e.spelling!==null : !Number.isInteger(e.pitch)||e.midi!==e.pitch+21||!e.spelling)fail('Invalid stored pitch.');
      return {pitch:e.pitch,spelling:e.spelling||undefined,onsetTicks:e.onset,durationTicks:e.ticks,tiedToNext:e.tied};
    });
    const notes=musicalEventsToVoice(canonical);
    if(events.at(-1).onset+events.at(-1).ticks!==totalTicks)fail('Stored voice length does not match the score.');
    return notes;
  };
  const upper=parseVoice(score.upper),lower=parseVoice(score.lower),expectedKey=getKey(s.key,s.mode);
  // Early schema-1 files omitted the signature; newer saves retain the exact metadata too.
  const keyInfo=score.keyInfo?clone(score.keyInfo):expectedKey;
  if(keyInfo.key!==expectedKey.key||keyInfo.mode!==s.mode||!['natural','is','es'].includes(keyInfo.type)||!Array.isArray(keyInfo.notes)||keyInfo.notes.length>7||keyInfo.notes.some(n=>typeof n!=='string'||!/^[a-g](?:(?:is){1,2}|(?:es){1,2})$/.test(n)))fail('Invalid stored key signature.');
  return {id:restoredId--,spec:clone(s),requestedSeed:score.requestedSeed,generatorVersion:score.generatorVersion,
    phrase:new Phrase(upper,lower,keyInfo,s.time),keyInfo,beats,unit,barTicks,totalTicks,upper:clone(score.upper),lower:clone(score.lower)};
}
export function scoreFile(results,meta={}) {
  return {kind:'score',schemaVersion:SCHEMA_VERSION,name:meta.name||'Untitled score',composer:meta.composer||'',scores:results.map(snapshot)};
}
export function parseScore(value) {
  envelope(value,'score');text(value.name,100,'score name');text(value.composer,100,'composer');
  if(!Array.isArray(value.scores)||!value.scores.length||value.scores.length>100)fail('Invalid score collection.');
  return {...value,results:value.scores.map(restore)};
}
export function scoreQuery(results,meta={}) {return encodeURIComponent(JSON.stringify(scoreFile(results,meta)));}
export function parseCollection(raw) {
  const value=typeof raw==='string'?JSON.parse(raw):raw;envelope(value,'collection');
  if(!Array.isArray(value.entries)||value.entries.length>1000)fail('Invalid collection.');
  const ids=new Set();
  for(const entry of value.entries){
    text(entry.id,100,'score ID');if(!entry.id||ids.has(entry.id))fail('Duplicate or empty score ID.');ids.add(entry.id);
    text(entry.savedAt,100,'save date');parseScore(entry);
  }
  return clone(value);
}
export class Collection {
  constructor(storage) {
    this.storage=storage;this.data={kind:'collection',schemaVersion:SCHEMA_VERSION,entries:[]};this.error='';this.backup=null;
    try {this.raw=storage().getItem(COLLECTION_KEY);if(this.raw)this.data=parseCollection(this.raw);}
    catch(e){this.error=`Collection could not load: ${e.message} Export a backup before recovering it.`;this.locked=true;this.backup=this.raw;}
  }
  write(next) {
    if(next.entries.length>1000)throw new Error('The collection is full. Export a backup, then delete a score to make room.');
    const raw=JSON.stringify(next);
    if(this.locked){this.backup=this.raw||raw;throw new Error(this.error);}
    try {this.storage().setItem(COLLECTION_KEY,raw);}
    catch {this.backup=raw;throw new Error('Could not save on this device. Export a backup to keep this change.');}
    this.data=next;this.raw=raw;this.backup=null;this.error='';
  }
  add(results,meta) {
    const entry={...scoreFile(results,meta),id:crypto.randomUUID(),savedAt:new Date().toISOString()};
    parseScore(entry);this.write({...this.data,entries:[...this.data.entries,entry]});return entry;
  }
  remove(id) {this.write({...this.data,entries:this.data.entries.filter(e=>e.id!==id)});}
  import(raw) {
    const incoming=parseCollection(raw),entries=[...this.data.entries];
    for(const entry of incoming.entries){
      const existing=entries.find(e=>e.id===entry.id);
      if(existing&&JSON.stringify(existing)===JSON.stringify(entry))continue;
      entries.push(existing?{...entry,id:crypto.randomUUID()}:entry);
    }
    this.write({...this.data,entries});
  }
  export() {return this.backup||JSON.stringify(this.data,null,2);}
}
