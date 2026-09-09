// Shared adapter between the compiled lilypoint modules and the UI prototypes.
// Every prototype imports this; nothing here touches the DOM except downloadText.
import { WritePhrase } from '../../write-phrase.js';
import { ExportToFile } from '../../export-to-file.js';
import { spellPitch } from '../../pitch.js';
import { TICKS_PER_WHOLE } from '../../note.js';

export { TICKS_PER_WHOLE };

export const KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const MODES = ['major', 'minor'];
export const TIME_SIGS = ['2/4', '3/4', '4/4', '6/8'];
export const SPECIES = [
	{ n: 1, name: 'First species', short: '1st', ratio: '1:1', blurb: 'note against note' },
	{ n: 2, name: 'Second species', short: '2nd', ratio: '2:1', blurb: 'two notes against one' },
	{ n: 3, name: 'Third species', short: '3rd', ratio: '4:1', blurb: 'four notes against one' },
	{ n: 4, name: 'Fourth species', short: '4th', ratio: 'tied', blurb: 'suspensions over the bar' },
	{ n: 5, name: 'Fifth species', short: '5th', ratio: 'florid', blurb: 'mixed rhythms and ties' },
];

export function speciesInfo(n) { return SPECIES.find(s => s.n === Number(n)) || SPECIES[0]; }
export function keyLabel(spec) { return `${spec.key} ${spec.mode}`; }
export function describe(spec) {
	return `${keyLabel(spec)}, ${speciesInfo(spec.species).name.toLowerCase()}, ${spec.measures} bars of ${spec.time}`;
}

export function randomSeed() {
	const buf = new Uint32Array(1);
	crypto.getRandomValues(buf);
	return (buf[0] % 2147483646) + 1; // 1 .. 2^31-1, always a safe positive integer
}

export function defaultSpec(over = {}) {
	return { key: 'C', mode: 'major', species: 1, measures: 4, time: '4/4', seed: randomSeed(), ...over };
}

let nextId = 1;

/**
 * Generate one phrase. Returns plain data the renderers understand plus the
 * underlying Phrase instance for the LilyPond exporter.
 */
export function generate(spec) {
	const writer = new WritePhrase(spec.key, Number(spec.measures), Number(spec.species), spec.time);
	writer.setMode(spec.mode);
	writer.setSeed(Number(spec.seed));
	writer.writeThePhrase();
	const phrase = writer.getPhrase();
	const keyInfo = phrase.getKey();
	const [beats, unit] = spec.time.split('/').map(Number);
	const barTicks = beats * TICKS_PER_WHOLE / unit;
	const toEvents = voice => {
		let onset = 0;
		return voice.map(note => {
			const rest = note.isRest();
			const pitch = rest ? null : note.getNote();
			const spelling = rest ? null : (note.getSpelling() ?? spellPitch(pitch, keyInfo));
			const ev = { rest, pitch, midi: rest ? null : pitch + 21, spelling, ticks: note.getDurationTicks(), tied: note.getTied(), onset };
			onset += ev.ticks;
			return ev;
		});
	};
	return {
		id: nextId++,
		spec: { ...spec, measures: Number(spec.measures), species: Number(spec.species), seed: Number(spec.seed) },
		phrase,
		keyInfo,
		beats, unit, barTicks,
		totalTicks: barTicks * Number(spec.measures),
		upper: toEvents(phrase.getUpperVoice()),
		lower: toEvents(phrase.getLowerVoice()),
	};
}

/** Same settings, fresh seed. */
export function reroll(result) { return generate({ ...result.spec, seed: randomSeed() }); }

export async function toLilyPond(results, meta = {}) {
	const exporter = new ExportToFile('lilypoint', meta.title || 'lilypoint', meta.composer || 'lilypoint');
	for (const r of results) exporter.addPhrase(r.phrase);
	let output = await exporter.writeOutput();
	let index=0;
	output=output.replace(/(topPhrase\w+\s*=\s*\{[^\n]*\n)/g, head=>{
		const current=results[index], previous=results[index-1]; index++;
		return head+(current.spec.tempo!=null && current.spec.tempo!==previous?.spec.tempo ? `\\tempo 4 = ${current.spec.tempo}\n` : '');
	});
	return output;
}

// --- URL state -------------------------------------------------------------
const FIELDS = ['key', 'mode', 'species', 'measures', 'time', 'seed'];
export function encodeSpecs(specs) {
	return specs.map(s => [...FIELDS.map(f => String(s[f])), ...(s.tempo == null ? [] : [String(s.tempo)])].join('.')).join('_').replace(/#/g, 's').replace(/\//g, '-');
}
export function decodeSpecs(text) {
	if (!text) return [];
	return text.split('_').map(part => {
		const v = part.split('.');
		if (v.length !== 6 && v.length !== 7) return null;
		return { key: v[0].replace('s', '#'), mode: v[1], species: Number(v[2]), measures: Number(v[3]), time: v[4].replace('-', '/'), seed: Number(v[5]), ...(v[6] == null ? {} : {tempo:Math.max(30,Math.min(200,Number(v[6])||80))}) };
	}).filter(Boolean);
}
export function writeUrlState(specs, extra = {}) {
	const url = new URL(location.href);
	url.searchParams.set('p', encodeSpecs(specs));
	for (const [k, v] of Object.entries(extra)) { if (v == null || v === '') url.searchParams.delete(k); else url.searchParams.set(k, v); }
	history.replaceState(null, '', url);
}
export function readUrlState() {
	const url = new URL(location.href);
	return { specs: decodeSpecs(url.searchParams.get('p')), params: url.searchParams };
}

// --- files -----------------------------------------------------------------
export function downloadText(filename, text, mime = 'text/plain') {
	const blob = new Blob([text], { type: mime });
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function safeFilename(text) { return (text || 'lilypoint').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'lilypoint'; }
