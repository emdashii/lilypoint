// VexFlow 5 renderer: draws phrases straight from note data, no text format
// in between. Returns SVG elements plus a map from notes to their SVG groups
// so playback can highlight them.
import { layoutPhrase } from './notation.js';
import { loadScript, inheritColor } from './ui.js';
import { TICKS_PER_WHOLE } from './core.js';

const VEXFLOW_URL = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.js';
const FONT_CSS = `@font-face{font-family:'Bravura';src:url(https://cdn.jsdelivr.net/npm/@vexflow-fonts/bravura/bravura.woff2) format('woff2')}
@font-face{font-family:'Academico';src:url(https://cdn.jsdelivr.net/npm/@vexflow-fonts/academico/academico.woff2) format('woff2')}`;

let ready;
export function ensureVexFlow() {
	if (!ready) {
		ready = (async () => {
			const style = document.createElement('style');
			style.textContent = FONT_CSS;
			document.head.append(style);
			// Touch both faces so the browser actually fetches them.
			const probe = document.createElement('span');
			probe.style.cssText = 'position:absolute;left:-9999px;font-family:Bravura';
			probe.textContent = '';
			const probe2 = probe.cloneNode(); probe2.style.fontFamily = 'Academico'; probe2.textContent = 'a';
			document.body.append(probe, probe2);
			await loadScript(VEXFLOW_URL);
			await Promise.all([document.fonts.load("20px 'Bravura'"), document.fonts.load("20px 'Academico'")]).catch(() => {});
			await document.fonts.ready;
			window.VexFlow.setFonts('Bravura', 'Academico');
			probe.remove(); probe2.remove();
			return window.VexFlow;
		})();
	}
	return ready;
}

const DUR = { 1: 'w', 2: 'h', 4: 'q', 8: '8', 16: '16', 32: '32', 64: '64', 128: '128' };
const ACC = { '-2': 'bb', '-1': 'b', '0': 'n', '1': '#', '2': '##' };

export function vexKeySpec(spec) { return spec.key + (spec.mode === 'minor' ? 'm' : ''); }

function makeNote(VF, chunk, clef) {
	const dur = DUR[chunk.base] + (chunk.dots ? 'd' : '') + (chunk.rest ? 'r' : '');
	const keys = chunk.rest ? ['b/4'] : [chunk.spelling.letter + (chunk.spelling.accidental ? ACC[chunk.spelling.accidental] : '') + '/' + chunk.spelling.octave];
	const note = new VF.StaveNote({ keys, duration: dur, clef, autoStem: true });
	if (chunk.showAccidental != null) note.addModifier(new VF.Accidental(ACC[chunk.showAccidental]), 0);
	if (chunk.dots) VF.Dot.buildAndAttach([note], { all: true });
	return note;
}

/**
 * Render a list of phrase results as continuous systems into `container`.
 * opts: width (px), measuresPerLine, staffGap, systemGap, scale, showSignaturesEveryLine
 * Returns { svg, noteMap } where noteMap.get(`${phraseId}:${voice}:${srcIndex}`) -> [SVGElement]
 */
export async function renderSystems(container, results, opts = {}) {
	const VF = await ensureVexFlow();
	const width = opts.width || container.clientWidth || 800;
	const perLine = opts.measuresPerLine || 4;
	const staffGap = opts.staffGap ?? 90;
	const systemGap = opts.systemGap ?? 70;
	const leftPad = 12, rightPad = 12;

	// Flatten to measures with context.
	const items = [];
	results.forEach((r, ri) => {
		const layout = layoutPhrase(r);
		for (let mi = 0; mi < layout.count; mi++) {
			items.push({
				r, ri, mi, upper: layout.upper[mi], lower: layout.lower[mi], beamTicks: layout.beamTicks,
				phraseStart: mi === 0, phraseEnd: mi === layout.count - 1, final: ri === results.length - 1 && mi === layout.count - 1,
				signatureChange: mi === 0 && (ri === 0 || results[ri - 1].spec.key !== r.spec.key || results[ri - 1].spec.mode !== r.spec.mode),
				timeChange: mi === 0 && (ri === 0 || results[ri - 1].spec.time !== r.spec.time),
			});
		}
	});

	const lines = [];
	for (let i = 0; i < items.length; i += perLine) lines.push(items.slice(i, i + perLine));

	const systemHeight = staffGap + 60 + systemGap;
	const height = 40 + lines.length * systemHeight;
	container.replaceChildren();
	const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
	renderer.resize(width, height);
	const ctx = renderer.getContext();
	const noteMap = new Map();
	let prev = { upper: null, lower: null }; // for ties across measures/lines
	let prevLine = { upper: -1, lower: -1 };

	lines.forEach((line, li) => {
		const top = 20 + li * systemHeight;
		// Build notes and voices first to measure minimum widths.
		const built = line.map(item => {
			const voices = {};
			for (const v of ['upper', 'lower']) {
				const notes = item[v].map(c => makeNote(VF, c, 'treble'));
				const voice = new VF.Voice({ numBeats: item.r.beats, beatValue: item.r.unit }).setMode(VF.Voice.Mode.SOFT);
				voice.addTickables(notes);
				voices[v] = { notes, voice, chunks: item[v] };
			}
			const f = new VF.Formatter();
			f.joinVoices([voices.upper.voice]).joinVoices([voices.lower.voice]);
			const min = f.preCalculateMinTotalWidth([voices.upper.voice, voices.lower.voice]);
			return { item, voices, min };
		});
		let modifierWidth = 0;
		const staves = built.map((b, i) => {
			const s = new VF.Stave(0, 0, 100);
			if (i === 0) { s.addClef('treble'); s.addKeySignature(vexKeySpec(b.item.r.spec)); }
			else if (b.item.signatureChange) s.addKeySignature(vexKeySpec(b.item.r.spec));
			if (b.item.timeChange || (i === 0 && li === 0)) s.addTimeSignature(b.item.r.spec.time);
			return s;
		});
		// Distribute width: fixed modifier space + proportional note space.
		const mods = staves.map(s => { s.setContext(ctx); s.format?.(); return s.getNoteStartX() - s.getX(); });
		modifierWidth = mods.reduce((a, b) => a + b, 0);
		const totalMin = built.reduce((a, b) => a + b.min, 0);
		const free = Math.max(0, width - leftPad - rightPad - modifierWidth - built.length * 30);
		let x = leftPad;
		built.forEach((b, i) => {
			const w = mods[i] + 30 + free * (b.min / totalMin);
			const su = staves[i], sl = new VF.Stave(0, 0, 100);
			su.setX(x); su.setY(top); su.setWidth(w);
			sl.setX(x); sl.setY(top + staffGap); sl.setWidth(w);
			if (i === 0) { sl.addClef('treble'); sl.addKeySignature(vexKeySpec(b.item.r.spec)); }
			else if (b.item.signatureChange) sl.addKeySignature(vexKeySpec(b.item.r.spec));
			if (b.item.timeChange || (i === 0 && li === 0)) sl.addTimeSignature(b.item.r.spec.time);
			if (i > 0) { su.setBegBarType(VF.Barline.type.NONE); sl.setBegBarType(VF.Barline.type.NONE); }
			const endType = b.item.final ? VF.Barline.type.END : b.item.phraseEnd ? VF.Barline.type.DOUBLE : VF.Barline.type.SINGLE;
			su.setEndBarType(endType); sl.setEndBarType(endType);
			su.setContext(ctx).draw(); sl.setContext(ctx).draw();
			new VF.StaveConnector(su, sl).setType(i === 0 ? VF.StaveConnector.type.SINGLE_LEFT : VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();
			if (i === 0) new VF.StaveConnector(su, sl).setType(VF.StaveConnector.type.SINGLE_RIGHT).setContext(ctx).draw();

			const f = new VF.Formatter();
			f.joinVoices([b.voices.upper.voice]).joinVoices([b.voices.lower.voice]);
			const noteWidth = su.getNoteEndX() - su.getNoteStartX() - 10;
			f.format([b.voices.upper.voice, b.voices.lower.voice], noteWidth);
			for (const v of ['upper', 'lower']) {
				const stave = v === 'upper' ? su : sl;
				const { notes, voice, chunks } = b.voices[v];
				const beams = VF.Beam.generateBeams(notes, { groups: [new VF.Fraction(b.item.beamTicks / (TICKS_PER_WHOLE / 8), 8)], maintainStemDirections: false });
				voice.draw(ctx, stave);
				beams.forEach(bm => bm.setContext(ctx).draw());
				chunks.forEach((c, k) => {
					const note = notes[k];
					if (c.tieFromPrev && prev[v]) {
						if (prevLine[v] === li) new VF.StaveTie({ firstNote: prev[v], lastNote: note, firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw();
						else {
							new VF.StaveTie({ firstNote: prev[v], lastNote: null, firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw();
							new VF.StaveTie({ firstNote: null, lastNote: note, firstIndexes: [0], lastIndexes: [0] }).setContext(ctx).draw();
						}
					}
					prev[v] = c.tiedToNext ? note : null;
					prevLine[v] = li;
					const key = b.item.r.id + ':' + v + ':' + c.srcIndex;
					const g = note.getSVGElement ? note.getSVGElement() : null;
					if (g) { g.classList.add('note'); g.dataset.key = key; if (!noteMap.has(key)) noteMap.set(key, []); noteMap.get(key).push(g); }
				});
			}
			x += w;
		});
	});

	const svg = container.querySelector('svg');
	svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
	svg.removeAttribute('width'); svg.removeAttribute('height');
	svg.style.width = '100%'; svg.style.height = 'auto';
	inheritColor(svg);
	return { svg, noteMap, height, width };
}

/** Convenience for a single phrase in its own container. */
export function renderPhrase(container, result, opts = {}) {
	return renderSystems(container, [result], opts);
}
