import assert from 'node:assert/strict';
import { defaultSpec, encodeSpecs, decodeSpecs, toLilyPond } from '../dist/proto/shared/core.js';
import { abc, generatePhrase } from '../dist/proto/shared/studio.js';
import { midiBytes } from '../dist/proto/shared/midi.js';

const specs=[defaultSpec({key:'C',seed:42,tempo:80}),defaultSpec({key:'C',seed:43,tempo:110}),defaultSpec({key:'C',seed:44,tempo:110,time:'3/4'})];
assert.deepEqual(decodeSpecs(encodeSpecs(specs)),specs);
const legacy=defaultSpec({seed:42});
assert.deepEqual(decodeSpecs(encodeSpecs([legacy])),[legacy]);
const results=specs.map(generatePhrase);
const score=abc(results);
assert.equal((score.match(/^Q:/gm)||[]).length,1);
assert.equal((score.match(/\[Q:1\/4=110\]/g)||[]).length,1,'Only the changed tempo is printed');
assert.equal((score.match(/\[M:3\/4\]/g)||[]).length,2,'Meter change appears in both voices');
assert.equal((score.match(/\[M:4\/4\]/g)||[]).length,0,'An unchanged meter is not repeated');
assert.equal((score.match(/\[K:C\]/g)||[]).length,0,'An unchanged key is not repeated');
globalThis.window={}; // Use the browser exporter without writing a CLI output file.
const ly=await toLilyPond(results);
delete globalThis.window;
assert.equal((ly.match(/\\tempo 4 = /g)||[]).length,2);
const midi=midiBytes(results);
assert.equal(new TextDecoder().decode(midi.slice(0,4)),'MThd');
const midiTempos=[];
for(let i=0;i<midi.length-5;i++)if(midi[i]===255&&midi[i+1]===81&&midi[i+2]===3)midiTempos.push((midi[i+3]<<16)|(midi[i+4]<<8)|midi[i+5]);
assert.deepEqual(midiTempos,[750000,Math.round(60000000/110)]);
let pos=22,at=0;
const readVariable=()=>{let n=0,b;do{b=midi[pos++];n=(n<<7)|(b&127);}while(b&128);return n;};
const timedTempos=[],timedMeters=[];
while(pos<midi.length){
  at+=readVariable();assert.equal(midi[pos++],255);
  const type=midi[pos++],length=readVariable(),data=midi.slice(pos,pos+length);pos+=length;
  if(type===81)timedTempos.push([at,(data[0]<<16)|(data[1]<<8)|data[2]]);
  if(type===88)timedMeters.push([at,data[0],data[1]]);
  if(type===47)break;
}
assert.deepEqual(timedTempos,[[0,750000],[7680,Math.round(60000000/110)]]);
assert.deepEqual(timedMeters,[[0,4,2],[15360,3,2]]);
assert.equal(at,21120,'The conductor track spans every phrase');
for(const [key,mode,tonic,accidentals] of [['C','major',0,0],['C','minor',0,3],['Eb','major',3,3]]) {
  const r=generatePhrase(defaultSpec({key,mode,seed:42}));
  assert.equal(r.lower[0].midi%12,tonic);
  assert.equal(r.lower.at(-1).midi%12,tonic);
  assert.equal(r.keyInfo.notes.length,accidentals);
}
console.log('Phrase tempos round-trip; repeated markings are omitted; C minor stays on C.');
