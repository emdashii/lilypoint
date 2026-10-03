import { toABC, layoutPhrase } from './notation.js';
import { toLilyPond, downloadText, safeFilename, generate } from './core.js';
import { downloadPdf, printSvgs } from './pdf.js';
import { midiBytes } from './midi.js';
import { el, initTheme, themeButton } from './ui.js';
export { el };
export const $ = id => document.getElementById(id);
export function generatePhrase(spec) {
  let seed=Number(spec.seed);
  for(let attempt=0;attempt<6;attempt++,seed=seed%2147483646+1) {
    try { const result=generate({...spec,seed}); result.requestedSeed=Number(spec.seed); return result; }
    catch(e) { if(attempt===5||!e.message.includes('Cantus firmus search exhausted'))throw e; }
  }
}
export function setup() { initTheme(); $('theme').replaceWith(themeButton()); }
export function status(text) { $('status').textContent = text; }
export function button(text, action, cls = '') { return el('button', { type:'button', class:cls, onclick:action }, text); }
export function pills(node, label, values, selected, onPick, name = String) {
  node.replaceChildren(el('span', { class:'label' }, label), ...values.map(v => el('button', { type:'button', class:'pill', 'aria-pressed': String(typeof selected === 'function' ? selected(v) : v === selected), onclick:() => onPick(v) }, name(v))));
}
export function abc(results, tempo = 80, perLine = 4) {
  // Curly braces put the voices on separate, joined staves. Parentheses merge them.
  return toABC(results, { tempo, measuresPerLine:perLine }).replace('%%score (1 2)', '%%score {1 2}');
}
export function draw(node, results, tempo = 80, width, forPrint = false, context = {}) {
  const available = width || Math.max(280, node.clientWidth - 20);
  const density = Math.max(...results.map(r => Math.max(...layoutPhrase(r).upper.map(m => m.length))));
  const perLine = Math.max(1, Math.min(4, Math.floor((available - 90) / Math.max(125, density * 16))));
  const source = abc(results, tempo, perLine);
  const visual = ABCJS.renderAbc(node, forPrint && !results.some(r=>r.spec.tempo!=null) ? source.replace(/^Q:.*\n/m,'') : source, {
    responsive:'resize', staffwidth:available, foregroundColor:'#100f0f', add_classes:true,
    oneSvgPerLine:true, paddingtop:18, paddingbottom:28, paddingleft:8, paddingright:8,
    staffsep:65, stretchlast:true,
  })[0];
  // Keep the actual meter and tempo in the parsed tune for audio; suppress only repeated ink.
  if(context.previous?.time===results[0].spec.time)node.querySelectorAll('.abcjs-time-signature').forEach(n=>n.remove());
  if(context.previous && (context.previous.tempo||80)===(results[0].spec.tempo||tempo))node.querySelectorAll('.abcjs-tempo').forEach(n=>n.remove());
  return visual;
}
export async function exportScore(results, title, pdf = true, composer = '') {
  if (!results.length) return;
  const holder = el('div', { style:{ position:'absolute', left:'-10000px', top:'0', width:'780px', color:'#000', background:'#fff' } });
  document.body.append(holder);
  try {
    // Render afresh without selection/highlight. Every SVG is a complete two-staff system.
    draw(holder, results, 80, 760, true);
    const svgs = [...holder.querySelectorAll('svg')];
    for (const svg of svgs) {
      const bounds = svg.getBBox();
      const vb = svg.viewBox.baseVal;
      const x = Math.min(vb.x,bounds.x-12), y = Math.min(vb.y,bounds.y-12);
      const w = Math.max(vb.x+vb.width,bounds.x+bounds.width+12)-x;
      const h = Math.max(vb.y+vb.height,bounds.y+bounds.height+20)-y;
      svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
      svg.setAttribute('width', w); svg.setAttribute('height', h);
      svg.style.cssText = 'display:block;color:#000;width:100%;height:auto';
    }
    if (pdf) {
      const heading = document.createElementNS('http://www.w3.org/2000/svg','svg');
      heading.setAttribute('viewBox','0 0 760 85');
      for (const [text,y,size] of [[title,32,26],[composer,58,12]]) {
        const t = document.createElementNS(heading.namespaceURI,'text');
        t.setAttribute('x','380'); t.setAttribute('y',y); t.setAttribute('text-anchor','middle'); t.setAttribute('font-family','Times'); t.setAttribute('font-size',size); t.textContent=text; heading.append(t);
      }
      await downloadPdf([heading,...svgs], { filename:'lilypoint.pdf', title, onePerPage:false });
    } else printSvgs(svgs, { title, subtitle:composer });
    status(pdf ? 'PDF downloaded' : 'Print preview opened');
  } catch(e) { status('Export failed: '+e.message); } finally { holder.remove(); }
}
export function downloadMidi(results, tempo) {
  if (!results.length) return;
  const url=URL.createObjectURL(new Blob([midiBytes(results,tempo)],{type:'audio/midi'}));
  const a=document.createElement('a');a.href=url;a.download='lilypoint.mid';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status('MIDI downloaded');
}
export async function downloadLilyPond(results,title,composer='lilypoint') {
  if(!results.length)return;
  try { downloadText(safeFilename(title)+'.ly',await toLilyPond(results,{title,composer}));status('LilyPond downloaded'); }
  catch(e){status('LilyPond export failed: '+e.message);}
}
// One audio-clock position governs range boundaries, progress and notation highlighting.
export class Piano {
  constructor(onState) {this.onState=onState;this.epoch=0;this.active=false;this.paused=false;this.timers=[];this.clicks=[];this.ticks=0;}
  release() {
    this.epoch++;this.timers.forEach(clearTimeout);this.timers=[];clearInterval(this.clock);
    this.synth?.stop();this.synth=null;
    this.clicks.forEach(o=>{try{o.stop();}catch{}});this.clicks=[];
  }
  clearHighlight(){document.querySelectorAll('.highlight').forEach(n=>n.classList.remove('highlight'));}
  position(){
    if(this.stage==='playing')this.ticks=Math.min(this.endTicks,this.originTicks+(this.ctx.currentTime-this.startedAt)*this.ticksPerSecond);
    return {index:this.index||0,ticks:Math.round(this.ticks)};
  }
  stop(){this.release();this.active=false;this.paused=false;this.stage='ready';this.current=null;this.timing=null;this.entries=null;this.options=null;this.clearHighlight();this.onState(false);status('Ready');}
  pause(){
    if(!this.active)return;const pos=this.position();this.highlight(pos.ticks);this.options.onProgress?.(pos);
    this.release();this.active=false;this.paused=true;this.stage='paused';this.onState(false);status('Paused');
  }
  resume(){return this.play(this.entries,{...this.options,countin:false,startIndex:this.index,startTicks:this.ticks},this.onDone);}
  highlight(ticks=this.ticks){
    this.clearHighlight();
    if(!this.timing)return;
    const ms=ticks/this.current.result.totalTicks*this.timing.lastMoment;
    let event;
    for(const ev of this.timing.noteTimings){if(ev.milliseconds>ms+.1)break;if(ev.type==='event')event=ev;}
    for(const group of event?.elements||[])for(const node of group)node.classList.add('highlight');
  }
  seek(ticks){
    const wasActive=this.active;if(wasActive)this.pause();
    this.ticks=Math.max(this.startTicks,Math.min(this.endTicks-1,ticks));this.options?.onProgress?.(this.position());this.highlight();
    if(wasActive)return this.resume();
  }
  async play(entries,options,onDone){
    this.stop();if(!entries.length)return;
    this.entries=entries;this.options=options;this.onDone=onDone;this.index=options.startIndex||0;
    this.ticks=options.startTicks??entries[this.index].startTicks??0;
    const epoch=++this.epoch;this.active=true;this.stage='loading';this.onState(true);status('Loading piano…');
    try {
      this.stage='starting';this.ctx ||= new AudioContext();
      await this.ctx.resume();if(epoch!==this.epoch)return;
      if(this.ctx.state!=='running')throw new Error('Audio did not start. Allow audio in your browser, then try Play again.');
      await this.run(epoch,true);
    }catch(e){if(epoch===this.epoch){const pos=this.position(),message=this.stage==='starting'?'Audio could not start. Allow audio in your browser.':e.message;this.stop();this.ticks=pos.ticks;this.paused=true;options.onProgress?.(pos);status(message+' Try Play again.');}}
  }
  async run(epoch,first=false){
    if(epoch!==this.epoch)return;
    const entry=this.entries[this.index],r=entry.result;this.current=entry;
    this.startTicks=entry.startTicks??0;this.endTicks=entry.endTicks??r.totalTicks;
    this.ticks=Math.max(this.startTicks,Math.min(this.endTicks-1,this.ticks));
    this.options.onEntry?.(this.index);this.options.onProgress?.(this.position());
    this.stage='loading';status('Loading piano…');
    const tempo=entry.tempo??this.options.tempo,ms=60000/tempo*r.beats*4/r.unit;
    const synth=new ABCJS.synth.CreateSynth();this.synth=synth;
    const load=async()=>{
      let response;
      try {response=await synth.init({audioContext:this.ctx,visualObj:entry.visual,millisecondsPerMeasure:ms,
        options:{voicesOff:this.options.hands==='upper'?[1]:this.options.hands==='lower'?[0]:[],fadeLength:0}});}
      catch {throw new Error('Piano samples could not load. Check your connection.');}
      if(response?.error?.length)throw new Error('Piano samples could not load. Check your connection.');
      const primed=await synth.prime();
      if(primed?.status&&primed.status!=='running')throw new Error('Allow audio in your browser.');
    };
    let timeout;
    try{await Promise.race([load(),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Piano samples timed out. Check your connection.')),15000);})]);}
    finally{clearTimeout(timeout);}
    if(epoch!==this.epoch){synth.stop();return;}
    this.timing=new ABCJS.TimingCallbacks(entry.visual,{qpm:tempo});this.highlight();
    const begin=()=>{
      if(epoch!==this.epoch)return;
      this.ticksPerSecond=4096/4*tempo/60;this.originTicks=this.ticks;this.startedAt=this.ctx.currentTime;
      synth.seek(this.ticks/this.ticksPerSecond,'seconds');synth.start();this.stage='playing';
      status(`Playing · ${r.spec.key} ${r.spec.mode} · ♩ ${tempo}`);
      this.clock=setInterval(()=>{
        if(epoch!==this.epoch)return;
        if(this.ctx.state!=='running'){this.pause();status('Audio interrupted. Try Play again.');return;}
        this.position();this.highlight();this.options.onProgress?.(this.position());
        if(this.ticks>=this.endTicks){
          clearInterval(this.clock);synth.stop();this.clearHighlight();this.stage='loading';
          if(this.index+1<this.entries.length){this.index++;this.ticks=this.entries[this.index].startTicks??0;this.run(epoch).catch(e=>this.failRun(epoch,e));}
          else if(this.options.loop){this.index=0;this.ticks=this.entries[0].startTicks??0;this.run(epoch).catch(e=>this.failRun(epoch,e));}
          else {const done=this.onDone;this.stop();status('Finished');done?.();}
        }
      },40);
    };
    if(first&&this.options.countin&&this.ticks===this.startTicks){
      this.stage='countin';const beats=r.unit===8&&r.beats%3===0?r.beats/3:r.beats;
      for(let i=0;i<beats;i++){
        const o=this.ctx.createOscillator(),g=this.ctx.createGain(),at=this.ctx.currentTime+i*ms/beats/1000;
        o.frequency.value=i===0?1400:1000;g.gain.setValueAtTime(.12,at);g.gain.exponentialRampToValueAtTime(.001,at+.06);
        o.connect(g);g.connect(this.ctx.destination);o.start(at);o.stop(at+.07);this.clicks.push(o);
        this.timers.push(setTimeout(()=>{if(epoch===this.epoch)status(`Count in · ${i+1} / ${beats}`);},i*ms/beats));
      }
      this.timers.push(setTimeout(begin,ms));
    }else begin();
  }
  failRun(epoch,e){if(epoch===this.epoch){this.pause();status('Audio unavailable: '+e.message+' Try Play again.');}}
}
export function transportOptions() { return {tempo:Math.max(30,Math.min(200,Number($('tempo').value)||80)),hands:$('hands').value,countin:$('countin').checked,loop:$('loop').checked}; }
export function wireTransport(piano) { for(const id of ['tempo','hands','countin','loop']) $(id).addEventListener('change',()=>{ piano.stop(); status('Ready'); }); addEventListener('pagehide',()=>piano.stop()); }
