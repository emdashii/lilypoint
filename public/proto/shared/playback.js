// Tiny Web Audio player. No samples to download: two detuned oscillators,
// a low-pass filter, and a plucked envelope give a soft piano-ish tone.
import { TICKS_PER_WHOLE } from './core.js';

export class Player {
	constructor() { this.ctx = null; this.master = null; this.timer = null; this.raf = null; this.playing = false; }

	ensure() {
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.35;
			this.master.connect(this.ctx.destination);
		}
		if (this.ctx.state === 'suspended') this.ctx.resume();
		return this.ctx;
	}

	/** Schedule one tone. */
	tone(midi, at, seconds, gain = 1) {
		const ctx = this.ensure();
		const freq = 440 * 2 ** ((midi - 69) / 12);
		const out = ctx.createGain();
		out.gain.setValueAtTime(0, at);
		out.gain.linearRampToValueAtTime(gain, at + 0.008);
		out.gain.exponentialRampToValueAtTime(gain * 0.35, at + Math.min(0.5, seconds * 0.6));
		out.gain.exponentialRampToValueAtTime(0.0005, at + seconds + 0.12);
		const filter = ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.frequency.setValueAtTime(Math.min(6000, freq * 6), at);
		filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.5), at + seconds);
		filter.connect(out); out.connect(this.master);
		const a = ctx.createOscillator(); a.type = 'triangle'; a.frequency.value = freq; a.detune.value = -3;
		const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = freq * 2; b.detune.value = 3;
		const bg = ctx.createGain(); bg.gain.value = 0.18;
		a.connect(filter); b.connect(bg); bg.connect(filter);
		a.start(at); b.start(at);
		a.stop(at + seconds + 0.2); b.stop(at + seconds + 0.2);
	}

	click(at, accent = false) {
		const ctx = this.ensure();
		const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = accent ? 1800 : 1200;
		const g = ctx.createGain(); g.gain.setValueAtTime(accent ? 0.25 : 0.15, at); g.gain.exponentialRampToValueAtTime(0.0005, at + 0.05);
		o.connect(g); g.connect(this.master); o.start(at); o.stop(at + 0.06);
	}

	/**
	 * Play notes from toPlaybackNotes(). Options: bpm, unit (beat denominator),
	 * countIn (beats), beatsPerBar, voices ('both'|'upper'|'lower'), loop,
	 * onNote(note, on:boolean), onBeat(index), onEnd().
	 */
	play(notes, totalTicks, opts = {}) {
		this.stop();
		const ctx = this.ensure();
		const { bpm = 80, unit = 4, countIn = 0, beatsPerBar = 4, voices = 'both', loop = false } = opts;
		const beatTicks = TICKS_PER_WHOLE / unit;
		const secPerTick = 60 / bpm / beatTicks;
		const start = ctx.currentTime + 0.1 + countIn * 60 / bpm;
		for (let i = 0; i < countIn; i++) this.click(ctx.currentTime + 0.1 + i * 60 / bpm, i % beatsPerBar === 0);
		const events = [];
		for (const n of notes) {
			if (voices !== 'both' && n.voice !== voices) continue;
			const at = start + n.startTicks * secPerTick;
			const dur = n.ticks * secPerTick;
			this.tone(n.midi, at, dur, n.voice === 'lower' ? 0.8 : 1);
			events.push({ note: n, at, end: at + dur });
		}
		if (opts.metronome) {
			for (let t = 0; t < totalTicks; t += beatTicks) this.click(start + t * secPerTick, (t / beatTicks) % beatsPerBar === 0);
		}
		const end = start + totalTicks * secPerTick;
		this.playing = true;
		const seen = new Set(), done = new Set();
		const tick = () => {
			if (!this.playing) return;
			const now = ctx.currentTime;
			for (const e of events) {
				if (!seen.has(e) && now >= e.at) { seen.add(e); opts.onNote && opts.onNote(e.note, true); }
				if (!done.has(e) && now >= e.end) { done.add(e); opts.onNote && opts.onNote(e.note, false); }
			}
			if (opts.onProgress) opts.onProgress(Math.min(1, Math.max(0, (now - start) / (end - start))));
			if (now >= end + 0.15) {
				this.playing = false;
				if (loop) { this.play(notes, totalTicks, opts); return; }
				opts.onEnd && opts.onEnd();
				return;
			}
			this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
		return end - ctx.currentTime;
	}

	stop() {
		this.playing = false;
		if (this.raf) cancelAnimationFrame(this.raf);
		if (this.ctx) {
			// Fastest way to silence scheduled oscillators: swap the master gain.
			const old = this.master;
			old.gain.setTargetAtTime(0, this.ctx.currentTime, 0.02);
			setTimeout(() => old.disconnect(), 200);
			this.master = this.ctx.createGain();
			this.master.gain.value = 0.35;
			this.master.connect(this.ctx.destination);
		}
	}
}
