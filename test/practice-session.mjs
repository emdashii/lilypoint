import assert from 'node:assert/strict';
import { generatePhrase, abc } from '../dist/proto/shared/studio.js';
import { snapshot } from '../dist/proto/shared/collection.js';
import { emptySession, sessionExercise, parseSession, exerciseBounds, exerciseResult, advance, PracticeSessionStore } from '../dist/proto/shared/practice-session.js';
import { midiBytes } from '../dist/proto/shared/midi.js';
import { toPlaybackNotes } from '../dist/proto/shared/notation.js';

const first=generatePhrase({key:'D',mode:'minor',species:4,measures:4,time:'4/4',seed:42,tempo:93,upperClef:'alto',lowerClef:'bass'});
const second=generatePhrase({key:'F',mode:'major',species:2,measures:4,time:'6/8',seed:42,tempo:127});
const plan=emptySession();plan.exercises=[sessionExercise(first,'Suspensions'),sessionExercise(second,'Compound meter')];
plan.exercises[0].repetitions=2;plan.exercises[0].notes='Hold the tie';plan.exercises[0].range={start:2,end:3};plan.exercises[0].tempo=110;
plan.progress.ticks=4096+512;plan.settings={hands:'lower',countin:false,loop:false};
const resumed=parseSession(JSON.stringify(plan));assert.deepEqual(resumed,plan);
assert.deepEqual(exerciseBounds(plan.exercises[0]),{startTicks:4096,endTicks:12288});
assert.deepEqual(snapshot(exerciseResult(plan.exercises[0])).upper,snapshot(first).upper);
assert.equal(exerciseResult(plan.exercises[0]).spec.tempo,110);
assert.match(abc([exerciseResult(plan.exercises[0])]),/V:1 clef=alto/);assert.match(abc([exerciseResult(plan.exercises[0])]),/V:2 clef=bass/);
assert.equal(advance(resumed),true);assert.deepEqual(resumed.progress,{index:0,repetition:1,ticks:4096,complete:false});
assert.equal(advance(resumed),true);assert.deepEqual(resumed.progress,{index:1,repetition:0,ticks:0,complete:false});
assert.equal(advance(resumed),false);assert.equal(resumed.progress.complete,true);
resumed.settings.loop=true;assert.equal(advance(resumed),true);assert.equal(resumed.progress.index,0);
// MIDI note-on/off pairs independently match canonical pitches, merged ties and timing.
function midiNotes(bytes){
  const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),notes=[];let pos=14;
  const variable=()=>{let n=0,b;do{b=bytes[pos++];n=n*128+(b&127);}while(b&128);return n;};
  while(pos<bytes.length){assert.equal(new TextDecoder().decode(bytes.slice(pos,pos+4)),'MTrk');const length=data.getUint32(pos+4);pos+=8;const end=pos+length;let at=0;const open=new Map();
    while(pos<end){at+=variable();const type=bytes[pos++];if(type===255){pos++;const len=variable();pos+=len;continue;}
      const channel=type&15,kind=type&240;if(kind===192){pos++;continue;}
      const pitch=bytes[pos++],velocity=bytes[pos++],id=channel+':'+pitch;
      if(kind===144&&velocity)open.set(id,at);
      else if(kind===128||kind===144){assert.ok(open.has(id));notes.push({channel,pitch,onset:open.get(id),duration:at-open.get(id)});open.delete(id);}
      else assert.fail('Unexpected MIDI event');
    }assert.equal(open.size,0);
  }return notes.sort((a,b)=>a.channel-b.channel||a.onset-b.onset||a.pitch-b.pitch);
}
const results=plan.exercises.map(exerciseResult),expected=toPlaybackNotes(results).notes.map(n=>({channel:n.voice==='upper'?0:1,pitch:n.midi,onset:Math.round(n.startTicks*480/1024),duration:Math.round((n.startTicks+n.ticks)*480/1024)-Math.round(n.startTicks*480/1024)})).sort((a,b)=>a.channel-b.channel||a.onset-b.onset||a.pitch-b.pitch);
assert.deepEqual(midiNotes(midiBytes(results)),expected);
let raw=JSON.stringify(plan),deny=false;
const storage={getItem:()=>raw,setItem:(_,value)=>{if(deny)throw new Error('quota');raw=value;}};
const saved=new PracticeSessionStore(()=>storage),before=raw;
for(const mutate of [s=>s.schemaVersion++,s=>s.exercises[0].score.upper[1].tied='yes',s=>s.exercises[0].range.end=99,s=>s.progress.ticks=0,s=>s.settings.hands='none',s=>s.exercises[0].repetitions=0]){
  const broken=JSON.parse(before);mutate(broken);assert.throws(()=>saved.import(JSON.stringify(broken)));assert.equal(raw,before);
}
deny=true;const changed=structuredClone(plan);changed.exercises[0].notes='Export this change';
assert.throws(()=>saved.save(changed),/Export/);assert.equal(raw,before);assert.deepEqual(saved.value,plan);assert.deepEqual(JSON.parse(saved.export()),changed);
const corrupt=new PracticeSessionStore(()=>({getItem:()=>'{broken',setItem:()=>assert.fail('corrupt storage stays intact')}));assert.throws(()=>corrupt.save(plan));assert.equal(corrupt.export(),'{broken');
console.log('Session snapshots, measure ranges, progress, repetitions, MIDI notes/ties/timing and atomic recovery passed.');
