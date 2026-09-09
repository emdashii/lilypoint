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
    try { return generate({...spec,seed}); }
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
    responsive:'resize', staffwidth:available, foregroundColor:'#171714', add_classes:true,
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
export class Piano {
  constructor(onState) { this.onState=onState; this.epoch=0; this.active=false; this.timers=[]; }
  stop() {
    this.epoch++; this.active=false;
    this.timers.forEach(clearTimeout); this.timers=[];
    this.timing?.stop(); this.synth?.stop(); this.synth=null;
    this.clicks?.forEach(o => { try { o.stop(); } catch {} }); this.clicks=[];
    document.querySelectorAll('.highlight').forEach(n=>n.classList.remove('highlight'));
    this.onState(false); status('Ready');
  }
  async play(entries, options, onDone) {
    this.stop();
    if (!entries.length) return;
    this.ctx ||= new AudioContext();
    await this.ctx.resume();
    const epoch=++this.epoch; this.active=true; this.onState(true); status('Loading piano…');
    const run = async index => {
      if(epoch!==this.epoch) return;
      const { result:r, visual } = entries[index];
      const synth = new ABCJS.synth.CreateSynth(); this.synth=synth;
      const tempo = entries[index].tempo ?? options.tempo;
      const ms = 60000/tempo * r.beats * 4/r.unit;
      try {
        const loaded = await synth.init({ audioContext:this.ctx, visualObj:visual, millisecondsPerMeasure:ms, options:{ voicesOff:options.hands==='upper'?[1]:options.hands==='lower'?[0]:[] } });
        if(epoch!==this.epoch) return;
        if(loaded?.error?.length) throw new Error('Piano samples could not load. Check your connection and try Play again.');
        await synth.prime(); if(epoch!==this.epoch) return;
        let delay=0;
        if(options.countin && index===0) {
          const beats=r.unit===8&&r.beats%3===0?r.beats/3:r.beats;
          const beatMs=ms/beats; delay=ms;
          for(let i=0;i<beats;i++) {
            const o=this.ctx.createOscillator(), g=this.ctx.createGain(), at=this.ctx.currentTime+i*beatMs/1000;
            o.frequency.value=i===0?1400:1000; g.gain.setValueAtTime(.12,at); g.gain.exponentialRampToValueAtTime(.001,at+.06); o.connect(g); g.connect(this.ctx.destination); o.start(at); o.stop(at+.07); this.clicks.push(o);
            this.timers.push(setTimeout(()=>status(`Count in · ${i+1} / ${beats}`),i*beatMs));
          }
        }
        this.timers.push(setTimeout(()=>{
          if(epoch!==this.epoch) return;
          this.timing=new ABCJS.TimingCallbacks(visual,{qpm:tempo,eventCallback:ev=>{
            document.querySelectorAll('.highlight').forEach(n=>n.classList.remove('highlight'));
            for(const group of ev?.elements||[]) for(const n of group) n.classList.add('highlight');
          }});
          synth.start(); this.timing.start(); status(`Playing · ${r.spec.key} ${r.spec.mode} · ♩ ${tempo}`);
          this.timers.push(setTimeout(()=>{
            if(epoch!==this.epoch) return;
            this.timing.stop(); synth.stop();
            if(index+1<entries.length) run(index+1);
            else if(options.loop) run(0);
            else { this.stop(); status('Finished'); onDone?.(); }
          },ms*r.spec.measures+120));
        },delay));
      } catch(e) { if(epoch===this.epoch) { this.stop(); status(e.message); } }
    };
    run(0);
  }
}
export function transportOptions() { return {tempo:Math.max(30,Math.min(200,Number($('tempo').value)||80)),hands:$('hands').value,countin:$('countin').checked,loop:$('loop').checked}; }
export function wireTransport(piano) { for(const id of ['tempo','hands','countin','loop']) $(id).addEventListener('change',()=>{ piano.stop(); status('Ready'); }); addEventListener('pagehide',()=>piano.stop()); }
