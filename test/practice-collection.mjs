import assert from 'node:assert/strict';
import { generatePhrase } from '../dist/proto/shared/studio.js';
import { snapshot, restore, Collection, COLLECTION_KEY, parseCollection } from '../dist/proto/shared/collection.js';
import { toPlaybackNotes } from '../dist/proto/shared/notation.js';
import { midiBytes } from '../dist/proto/shared/midi.js';
import { toLilyPond } from '../dist/proto/shared/core.js';

const result=generatePhrase({key:'D',mode:'minor',species:4,measures:4,time:'4/4',seed:42,tempo:93,upperClef:'alto',lowerClef:'bass'});
const saved=snapshot(result),reopened=restore(JSON.parse(JSON.stringify(saved)));
const zero=generatePhrase({key:'C',mode:'major',species:1,measures:4,time:'4/4',seed:0,tempo:80});
assert.equal(snapshot(restore(snapshot(zero))).effectiveSeed,zero.spec.seed,'existing safe-integer URL seeds remain savable');
assert.deepEqual(snapshot(reopened),saved);
const musicalPlayback=r=>toPlaybackNotes([r]).notes.map(({phraseId,...note})=>note);
assert.deepEqual(musicalPlayback(reopened),musicalPlayback(result));
assert.deepEqual(midiBytes([reopened]),midiBytes([result]));
globalThis.window={};assert.equal(await toLilyPond([reopened]),await toLilyPond([result]));delete globalThis.window;
let raw=null,deny=false;
const storage={getItem:()=>raw,setItem:(key,value)=>{assert.equal(key,COLLECTION_KEY);if(deny)throw new Error('quota');raw=value;}};
const collection=new Collection(()=>storage);collection.add([result],{name:'Suspensions'});
const original=raw,entries=structuredClone(collection.data.entries);
deny=true;assert.throws(()=>collection.remove(entries[0].id),/Export a backup/);
assert.equal(raw,original);assert.deepEqual(collection.data.entries,entries);
assert.equal(JSON.parse(collection.export()).entries.length,0,'failed deletion can be exported without changing stored data');
assert.throws(()=>collection.add([result],{name:'Second'}),/Export a backup/);
assert.equal(JSON.parse(collection.export()).entries.length,2,'quota failure offers the proposed save in a backup');
deny=false;
for(const mutate of [file=>file.schemaVersion++,file=>file.entries[0].scores[0].upper[0].ticks++,file=>file.entries[0].scores[0].lower[0].midi++,file=>file.entries.push(file.entries[0])]){
  const broken=JSON.parse(original);mutate(broken);assert.throws(()=>collection.import(JSON.stringify(broken)));assert.equal(raw,original);assert.deepEqual(collection.data.entries,entries);
}
const other=new Collection(()=>({getItem:()=>null,setItem:(key,value)=>{raw=value;}}));other.import(original);
assert.deepEqual(other.data,parseCollection(original));other.import(original);assert.equal(other.data.entries.length,1);
const corrupt=new Collection(()=>({getItem:()=>'{broken',setItem:()=>assert.fail('must not overwrite corrupt storage')}));
assert.throws(()=>corrupt.add([result],{name:'New'}));assert.equal(corrupt.export(),'{broken');
const denied=new Collection(()=>{throw new Error('denied');});assert.throws(()=>denied.add([result],{name:'Offline'}));assert.ok(denied.export());
console.log('Exact collection snapshots, exports, atomic imports, quota and corrupt-storage recovery passed.');
