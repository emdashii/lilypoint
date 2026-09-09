import { toPlaybackNotes, keyFifths } from './notation.js';
import { TICKS_PER_WHOLE } from './core.js';
const PPQ=480;
const ticks=value=>Math.round(value*PPQ/(TICKS_PER_WHOLE/4));
function variable(value){const bytes=[value&127];while((value>>>=7)>0)bytes.unshift((value&127)|128);return bytes;}
const word=n=>[(n>>>8)&255,n&255];
const long=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function track(events,end){
  events.sort((a,b)=>a.at-b.at||(a.order||0)-(b.order||0));
  const data=[];let previous=0;
  for(const ev of events){data.push(...variable(ev.at-previous),...ev.bytes);previous=ev.at;}
  data.push(...variable(Math.max(0,end-previous)),255,47,0);
  return [77,84,114,107,...long(data.length),...data];
}
/** Standard MIDI with a conductor track. abcjs's MIDI writer drops mid-score tempo changes. */
export function midiBytes(results,fallbackTempo=80){
  const conductor=[];let offset=0,previous={};
  for(const r of results){
    const tempo=r.spec.tempo||fallbackTempo,at=ticks(offset);
    if(tempo!==previous.tempo){const us=Math.round(60000000/tempo);conductor.push({at,bytes:[255,81,3,(us>>>16)&255,(us>>>8)&255,us&255]});}
    if(r.spec.time!==previous.time)conductor.push({at,bytes:[255,88,4,r.beats,Math.log2(r.unit),r.unit===8&&r.beats%3===0?36:24,8]});
    if(r.spec.key!==previous.key||r.spec.mode!==previous.mode)conductor.push({at,bytes:[255,89,2,keyFifths(r.keyInfo)&255,r.spec.mode==='minor'?1:0]});
    previous={...r.spec,tempo};offset+=r.totalTicks;
  }
  const end=ticks(offset),notes=toPlaybackNotes(results).notes;
  const tracks=[track(conductor,end)];
  for(const [channel,voice] of ['upper','lower'].entries()){
    const events=[{at:0,order:-2,bytes:[192+channel,0]}];
    for(const n of notes.filter(n=>n.voice===voice)){
      events.push({at:ticks(n.startTicks),order:1,bytes:[144+channel,n.midi,voice==='upper'?84:72]});
      events.push({at:ticks(n.startTicks+n.ticks),order:-1,bytes:[128+channel,n.midi,0]});
    }
    tracks.push(track(events,end));
  }
  return new Uint8Array([77,84,104,100,0,0,0,6,...word(1),...word(tracks.length),...word(PPQ),...tracks.flat()]);
}
