// Run after bun run build. Generates exercises through the app's generation
// path, exports LilyPond and MIDI the way the Write room does, parses both
// exports back, and checks every note against an independent implementation
// of the rules in plans/counterpoint-profiles.md (profile tier) and the
// broader textbook rules in src/counterpoint-species-definitions.md
// (textbook tier). Profile violations fail the script; textbook findings are
// reported for classification.
//
//   bun test/exercise-audit.mjs [outputDir] [--count N] [--seed-base N] [--json]
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

globalThis.window ??= {}; // the exporter returns text instead of writing a file in a browser
const core = await import('../dist/proto/shared/core.js');
const { generatePhrase } = await import('../dist/proto/shared/studio.js');
const { midiBytes } = await import('../dist/proto/shared/midi.js');

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const VALUE_FLAGS = ['--count', '--seed-base'];
const outDir = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(args[i - 1])) || 'tests/temp/exercise-audit';
const count = Number(flag('--count', 40));
const seedBase = Number(flag('--seed-base', 1000));
const asJson = args.includes('--json');
mkdirSync(outDir, { recursive: true });

// --- exercise matrix: every species x every mode, cycling keys, meters, lengths
const VARIANTS = [
	{ time: '4/4', measures: 4 },
	{ time: '3/4', measures: 4 },
	{ time: '2/4', measures: 8 },
	{ time: '6/8', measures: 2 },
];
export function exerciseSpecs(n = 40, base = 1000) {
	const specs = [];
	let i = 0;
	while (specs.length < n) {
		for (const species of core.SPECIES.map(s => s.n)) for (const mode of core.MODES) for (const v of VARIANTS) {
			if (specs.length >= n) break;
			specs.push({ key: core.KEYS[i % core.KEYS.length], mode, species, seed: base + i, ...v });
			i++;
		}
	}
	return specs;
}

// --- LilyPond re-parse (absolute pitches, Dutch names, unmarked c = c3 = 27)
const LETTERS = 'cdefgab';
const LETTER_SEMIS = [0, 2, 4, 5, 7, 9, 11];
function parseLyPitch(token) {
	const m = token.match(/^([a-g])(isis|eses|is|es)?([',]*)$/);
	if (!m) throw new Error(`bad pitch ${token}`);
	const [, letter, acc = '', marks] = m;
	const accidental = { '': 0, is: 1, es: -1, isis: 2, eses: -2 }[acc];
	let octave = 3;
	for (const c of marks) octave += c === "'" ? 1 : -1;
	const pitch = 27 + LETTER_SEMIS[LETTERS.indexOf(letter)] + accidental + (octave - 3) * 12;
	return { pitch, spelling: { letter, accidental, octave }, diatonic: octave * 7 + LETTERS.indexOf(letter) };
}
export function parseLyBlock(block) {
	const cleaned = block.replace(/\\(clef|key)\s+\S+(\s+\\(major|minor))?/g, ' ').replace(/\\time\s+\d+\/\d+/g, ' ').replace(/\\bar\s+"[^"]*"/g, ' ').replace(/\\tempo[^\n]*/g, ' ').replace(/\|/g, ' ');
	const re = /([a-g](?:isis|eses|is|es)?[',]*|r)(\d+)(\.?)(\s*~)?/g;
	assert.equal(cleaned.replace(re, ' ').trim(), '', `unexpected LilyPond content: ${cleaned}`);
	const events = []; let start = 0;
	for (const m of cleaned.matchAll(re)) {
		const [, tok, dur, dot, tie] = m;
		const duration = (1 / Number(dur)) * (dot ? 1.5 : 1);
		const p = tok === 'r' ? { pitch: null } : parseLyPitch(tok);
		events.push({ ...p, start, duration, tied: Boolean(tie) });
		start += duration;
	}
	return events;
}
function lyVariable(source, name) {
	const m = source.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`));
	assert.ok(m, `missing ${name}`);
	return m[1];
}

// --- MIDI parse (format 1, no running status needed but supported)
function parseMidi(bytes) {
	let p = 0;
	const u32 = () => (bytes[p++] << 24 | bytes[p++] << 16 | bytes[p++] << 8 | bytes[p++]) >>> 0;
	const u16 = () => bytes[p++] << 8 | bytes[p++];
	const vlq = () => { let v = 0, b; do { b = bytes[p++]; v = (v << 7) | (b & 127); } while (b & 128); return v; };
	assert.equal(String.fromCharCode(...bytes.slice(0, 4)), 'MThd'); p = 4;
	assert.equal(u32(), 6);
	const format = u16(), ntracks = u16(), ppq = u16();
	const tracks = [];
	for (let t = 0; t < ntracks; t++) {
		assert.equal(String.fromCharCode(...bytes.slice(p, p + 4)), 'MTrk'); p += 4;
		const len = u32(), end = p + len, events = []; let at = 0, status = 0;
		while (p < end) {
			at += vlq();
			let b = bytes[p];
			if (b & 128) { status = b; p++; } else { assert.ok(status, 'data byte without running status'); b = status; }
			if (status === 255) { const type = bytes[p++], l = vlq(), data = [...bytes.slice(p, p + l)]; p += l; events.push({ at, meta: type, data }); status = 0; }
			else if (status === 240 || status === 247) { const l = vlq(); p += l; status = 0; }
			else {
				const kind = status & 240, channel = status & 15;
				const d1 = bytes[p++], d2 = (kind === 192 || kind === 208) ? null : bytes[p++];
				events.push({ at, kind, channel, d1, d2 });
			}
		}
		assert.equal(p, end, 'track length mismatch');
		tracks.push(events);
	}
	return { format, ppq, tracks };
}

// --- music helpers
const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);
const isConsonant = i => CONSONANT.has(i % 12);
const isPerfect = i => i % 12 === 0 || i % 12 === 7;
const isStep = d => Math.abs(d) === 1 || Math.abs(d) === 2;
const intervalName = i => ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7'][i % 12] + (i >= 12 ? `+${Math.floor(i / 12)}oct` : '');
function spelledInterval(a, b) { return { semitones: b.pitch - a.pitch, steps: b.diatonic - a.diatonic }; }
/** Interval quality from diatonic steps and semitones: perfect/major/minor are regular. */
function regularSpelling(a, b) {
	const { semitones, steps } = spelledInterval(a, b);
	const s = Math.abs(steps), st = Math.abs(semitones);
	const base = [0, 2, 4, 5, 7, 9, 11][s % 7] + 12 * Math.floor(s / 7);
	return [0, 3, 4].includes(s % 7) ? st === base : st === base || st === base - 1;
}
function sounding(voice) {
	// merge ties into melodic notes
	const out = [];
	for (const e of voice) {
		if (e.pitch === null) continue;
		const prev = out.at(-1);
		if (prev && prev.tied && prev.pitch === e.pitch && Math.abs(prev.start + prev.duration - e.start) < 1e-9) { prev.duration += e.duration; prev.tied = e.tied; continue; }
		out.push({ ...e });
	}
	return out;
}
function align(cp, cf) {
	const segs = [];
	cp.forEach((e, i) => {
		if (e.pitch === null) return;
		cf.forEach((c, ci) => {
			const start = Math.max(e.start, c.start), end = Math.min(e.start + e.duration, c.start + c.duration);
			if (end <= start + 1e-9) return;
			const held = start > e.start + 1e-9;
			const prev = cp[i - 1];
			const tied = Boolean(prev && prev.tied && prev.pitch === e.pitch && Math.abs(prev.start + prev.duration - e.start) < 1e-9);
			segs.push({ cpIndex: i, event: e, cf: c, cfIndex: ci, start, end, held, tiedFrom: held || tied, attack: !held && !tied, beatPos: (start - c.start) / c.duration, interval: Math.abs(e.pitch - c.pitch) });
		});
	});
	return segs;
}
function classify(segs, k) {
	const a = segs[k], prev = segs[k - 1], next = segs[k + 1];
	if (!prev || !next) return 'unclassified';
	if (Math.abs(prev.end - a.start) > 1e-9 || Math.abs(a.end - next.start) > 1e-9) return 'unclassified';
	const approach = a.event.pitch - prev.event.pitch, leave = next.event.pitch - a.event.pitch;
	if (a.tiedFrom && isConsonant(prev.interval) && isConsonant(next.interval) && (leave === -1 || leave === -2)) return 'suspension';
	if (isStep(approach) && isStep(leave)) return Math.sign(approach) === Math.sign(leave) ? 'passing' : 'neighbor';
	if (isStep(approach) && Math.abs(leave) >= 3 && Math.abs(leave) <= 4) {
		const after = segs[k + 2];
		if (after && isStep(after.event.pitch - next.event.pitch) && Math.sign(after.event.pitch - next.event.pitch) !== Math.sign(leave)) return 'cambiata';
	}
	return 'unclassified';
}

// --- the independent checker
const ALLOWED = { 2: ['passing'], 3: ['passing', 'neighbor', 'cambiata'], 4: ['suspension', 'passing'], 5: ['passing', 'neighbor', 'suspension', 'cambiata'] };
export function checkExercise({ species, mode, time, upper, lower }) {
	const out = [];
	const [beats, unit] = time.split('/').map(Number);
	const barLen = beats / unit;
	const bar = t => Math.floor(t / barLen + 1e-9) + 1;
	const add = (tier, rule, at, expected, actual) => out.push({ tier, rule, bar: bar(at), at, expected, actual });
	const P = (...a) => add('profile', ...a), T = (...a) => add('textbook', ...a);
	const cp = upper, cf = lower;

	// structure
	for (const [name, v] of [['upper', cp], ['lower', cf]]) {
		let end = 0;
		v.forEach((e, i) => {
			if (Math.abs(e.start - end) > 1e-9) P('continuity', e.start, `${name} continuous`, `gap or overlap at ${e.start}`);
			if (e.tied && !(v[i + 1] && v[i + 1].pitch === e.pitch)) P('tie', e.start, `${name} tie joins equal pitches`, 'tie to different pitch or nothing');
			end = e.start + e.duration;
		});
	}
	const total = v => v.at(-1).start + v.at(-1).duration;
	if (Math.abs(total(cp) - total(cf)) > 1e-9) P('equalDuration', 0, 'equal voice duration', `${total(cp)} vs ${total(cf)}`);
	const cfDur = cf[0].duration;
	cf.forEach(c => { if (c.pitch === null || Math.abs(c.duration - cfDur) > 1e-9) P('cantusRhythm', c.start, `cantus note of ${cfDur}`, c.pitch === null ? 'rest' : String(c.duration)); });

	// rhythm per species
	const cpIn = c => cp.filter(e => e.start >= c.start - 1e-9 && e.start < c.start + c.duration - 1e-9);
	if (species <= 4) {
		const n = { 1: 1, 2: 2, 3: 4, 4: 2 }[species];
		cf.forEach((c, i) => {
			const events = cpIn(c), expected = i === cf.length - 1 ? 1 : n, sub = cfDur / expected;
			const ok = events.length === expected && events.every((e, j) => Math.abs(e.start - c.start - j * sub) < 1e-9 && Math.abs(e.duration - sub) < 1e-9 && (e.pitch !== null || (species >= 2 && i === 0 && j === 0)));
			if (!ok) P('subdivision', c.start, `${expected} note(s) of ${sub}`, events.map(e => `${e.pitch === null ? 'r' : e.pitch}:${e.duration}`).join(' '));
		});
	}
	if (species === 4) {
		if (!(cp[0].pitch === null && Math.abs(cp[0].duration - cfDur / 2) < 1e-9)) P('syncopation', 0, 'opening half-pulse rest', `${cp[0].pitch}:${cp[0].duration}`);
	}
	if (species === 5) {
		cp.forEach(e => { if (![cfDur, cfDur / 2, cfDur / 4].some(d => Math.abs(e.duration - d) < 1e-9)) P('floridDuration', e.start, 'whole, half, or quarter pulse', String(e.duration)); });
	}

	const segs = align(cp, cf);
	// opening and closing
	const first = segs[0], last = segs.at(-1);
	if (!isPerfect(first.interval)) P('beginsPerfect', first.start, 'unison, fifth, or octave', intervalName(first.interval));
	if (last.interval % 12 !== 0) P('endsPerfect', last.start, 'unison or octave', intervalName(last.interval));

	// vertical rules
	segs.forEach((a, k) => {
		if (a.event.pitch < a.cf.pitch) P('crossing', a.start, 'counterpoint above cantus', `${a.event.pitch} below ${a.cf.pitch}`);
		if (a.interval > 16) P('spacing', a.start, 'at most 16 semitones', `${a.interval}`);
		if (isConsonant(a.interval) && a.event.spelling && a.cf.spelling) {
			const { steps } = spelledInterval(a.cf, a.event);
			if (![0, 2, 4, 5].includes(Math.abs(steps) % 7) || !regularSpelling(a.cf, a.event)) P('harmonicSpelling', a.start, 'consonant spelling', `${a.cf.spelling.letter}${a.cf.spelling.accidental}-${a.event.spelling.letter}${a.event.spelling.accidental} (${steps} steps, ${a.interval} st)`);
		}
		const prev = segs[k - 1];
		if (prev && prev.cfIndex !== a.cfIndex) {
			const cpMove = a.event.pitch - prev.event.pitch, cfMove = a.cf.pitch - prev.cf.pitch;
			if (isPerfect(a.interval) && cpMove !== 0 && cfMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) P('directPerfect', a.start, 'contrary or oblique motion into perfect interval', `similar motion into ${intervalName(a.interval)}`);
			if (prev.interval % 12 === a.interval % 12 && isPerfect(a.interval) && cpMove !== 0 && cfMove !== 0) P('parallelPerfect', a.start, 'no consecutive perfect intervals', `${intervalName(prev.interval)} to ${intervalName(a.interval)}`);
			if (Math.abs(cpMove) > 2 && Math.abs(cfMove) > 2 && Math.sign(cpMove) === Math.sign(cfMove)) T('skipsSameDirection', a.start, 'not both voices skipping the same way', `cp ${cpMove}, cf ${cfMove}`);
			if (a.interval % 12 === 0 && Math.abs(cpMove) > 2) T('leapIntoOctave', a.start, 'step into unison or octave', `leap of ${cpMove} into ${intervalName(a.interval)}`);
		}
		// dissonance
		if (!isConsonant(a.interval)) {
			const kind = classify(segs, k);
			const strong = a.beatPos < 1e-9;
			if (species === 1) P('allConsonant', a.start, 'consonance', intervalName(a.interval));
			else if (strong && !((species === 4 || species === 5) && kind === 'suspension')) P('strongDissonance', a.start, species >= 4 ? 'consonance or suspension on downbeat' : 'consonance on downbeat', `${intervalName(a.interval)} (${kind})`);
			else if (!strong && !ALLOWED[species].includes(kind)) P('dissonanceTreatment', a.start, `one of ${ALLOWED[species].join('/')}`, `${intervalName(a.interval)} is ${kind}`);
			if ((species === 3 || species === 5) && Math.abs(a.beatPos - 0.5) < 1e-9 && !(species === 5 && kind === 'suspension')) P('metric', a.start, 'consonance on third subdivision', intervalName(a.interval));
		}
		// unisons
		if (a.interval === 0 && k !== 0 && k !== segs.length - 1) {
			if (species === 1 || (species <= 3 && a.beatPos < 1e-9)) T('midUnison', a.start, 'unison only at the ends', 'unison');
		}
	});
	// repeated interval classes (first species textbook rule: no interval more than three times in a row)
	if (species === 1) {
		let run = 1;
		for (let k = 1; k < segs.length; k++) {
			run = segs[k].interval % 12 === segs[k - 1].interval % 12 ? run + 1 : 1;
			if (run === 4) T('intervalRun', segs[k].start, 'at most three equal intervals in a row', `${intervalName(segs[k].interval)} x4`);
		}
	}
	// successive accented perfects (species 2 textbook)
	if (species === 2 || species === 3) {
		const down = segs.filter(s => s.beatPos < 1e-9);
		for (let k = 1; k < down.length - 1; k++) if (isPerfect(down[k].interval) && down[k].interval % 12 === down[k - 1].interval % 12 && down[k].event.pitch !== down[k - 1].event.pitch) T('accentedPerfects', down[k].start, 'no successive accented fifths or octaves', `${intervalName(down[k - 1].interval)} then ${intervalName(down[k].interval)}`);
	}
	if (species === 4) {
		const weak = segs.filter(s => Math.abs(s.beatPos - 0.5) < 1e-9);
		for (let k = 1; k < weak.length; k++) if (isPerfect(weak[k].interval) && weak[k].interval % 12 === weak[k - 1].interval % 12) P('afterbeatPerfects', weak[k].start, 'no consecutive weak-beat perfect intervals', intervalName(weak[k].interval));
		for (let i = 1; i < cf.length - 1; i++) {
			const d = segs.find(s => s.cfIndex === i && s.beatPos < 1e-9);
			if (!d || !d.tiedFrom) P('syncopation', cf[i].start, 'interior downbeat held over the bar', d ? 'attacked' : 'missing');
			if (i === cf.length - 2 && (!d || isConsonant(d.interval) || classify(segs, segs.indexOf(d)) !== 'suspension')) P('cadentialSuspension', cf[i].start, 'dissonant suspension before the final', d ? `${intervalName(d.interval)} ${classify(segs, segs.indexOf(d))}` : 'missing');
		}
	}

	// melodic rules on both voices
	for (const [name, v] of [['upper', cp], ['lower', cf]]) {
		const n = sounding(v);
		for (let i = 1; i < n.length; i++) {
			const a = n[i - 1], b = n[i], d = b.pitch - a.pitch, ad = Math.abs(d);
			if (ad > 12) P('leapSize', b.start, `${name}: leap at most an octave`, `${d}`);
			if ([6, 10, 11].includes(ad)) P('dissonantLeap', b.start, `${name}: no tritone or seventh`, intervalName(ad));
			if (a.spelling && b.spelling && !regularSpelling(a, b)) P('melodicSpelling', b.start, `${name}: no augmented or diminished interval`, `${a.spelling.letter}${a.spelling.accidental}->${b.spelling.letter}${b.spelling.accidental} (${spelledInterval(a, b).steps} steps, ${d} st)`);
			if (ad === 9) T('majorSixthLeap', b.start, `${name}: no major sixth leap`, `${d}`);
			if (ad === 8 && d < 0) T('descendingMinorSixth', b.start, `${name}: minor sixth only ascending`, `${d}`);
			if (ad === 0) T('repeatedNote', b.start, `${name}: no immediate repetition`, `${b.pitch} repeated`);
			if (i < n.length - 1) {
				const next = n[i + 1].pitch - b.pitch;
				if (ad > 4 && (!isStep(next) || Math.sign(next) === Math.sign(d))) P('leapRecovery', b.start, `${name}: leap larger than a third then contrary step`, `leap ${d} then ${next}`);
				if (ad > 2 && Math.abs(next) > 2 && Math.sign(next) === Math.sign(d) && Math.abs(next) >= ad) T('consecutiveSkips', b.start, `${name}: second skip smaller than the first`, `${d} then ${next}`);
				if (ad > 2 && Math.abs(next) > 2 && Math.sign(next) === Math.sign(d) && !isConsonant(Math.abs(n[i + 1].pitch - a.pitch))) T('skipOutline', b.start, `${name}: consecutive skips outline a consonance`, intervalName(Math.abs(n[i + 1].pitch - a.pitch)));
			}
		}
		// climax
		const max = Math.max(...n.map(e => e.pitch)), peaks = n.filter(e => e.pitch === max);
		if (peaks.length > 1) T('singleClimax', peaks[1].start, `${name}: one highest note`, `${peaks.length} notes at ${max}`);
		else if (name === 'lower' && (n.indexOf(peaks[0]) === 0 || n.indexOf(peaks[0]) === n.length - 1)) T('climaxPlacement', peaks[0].start, 'climax away from the ends', 'climax at an end');
		if (name === 'lower' && max - Math.min(...n.map(e => e.pitch)) > 12) T('cantusRange', 0, 'cantus within an octave', `${max - Math.min(...n.map(e => e.pitch))} semitones`);
		// direction runs: more than four consecutive moves one way
		let run = 0, dir = 0;
		for (let i = 1; i < n.length; i++) {
			const s = Math.sign(n[i].pitch - n[i - 1].pitch);
			run = s !== 0 && s === dir ? run + 1 : 1; dir = s;
			if (run === 5 && name === 'lower') T('directionRun', n[i].start, 'at most four cantus notes in one direction', 'five or more');
		}
		// tritone outline between turning points
		for (let i = 1; i < n.length - 1; i++) for (let j = i + 2; j < n.length - 1; j++) {
			const turn = k => (n[k].pitch - n[k - 1].pitch) * (n[k + 1].pitch - n[k].pitch) < 0;
			if (turn(i) && turn(j) && Math.abs(n[j].pitch - n[i].pitch) === 6 && n.slice(i, j + 1).every((e, m, arr) => m === 0 || Math.sign(e.pitch - arr[m - 1].pitch) === Math.sign(n[j].pitch - n[i].pitch))) T('tritoneOutline', n[i].start, `${name}: no outlined tritone`, `${n[i].pitch} to ${n[j].pitch}`);
		}
	}
	// cadence
	const cpN = sounding(cp), cfN = sounding(cf);
	const cpMove = cpN.at(-1).pitch - cpN.at(-2).pitch, cfMove = cfN.at(-1).pitch - cfN.at(-2).pitch;
	if (!isStep(cpMove) || !isStep(cfMove) || Math.sign(cpMove) === Math.sign(cfMove)) P('cadence', cpN.at(-1).start, 'contrary steps into the final', `cp ${cpMove}, cf ${cfMove}`);
	if (cpMove === 2) P('leadingTone', cpN.at(-1).start, 'ascending final approach by semitone', 'whole tone');
	if (cfMove === 2) P('leadingTone', cfN.at(-1).start, 'cantus ascending final approach by semitone', 'whole tone');
	if (mode === 'minor' && cpMove === 1 && cpN.at(-2).spelling) {
		const tonicLetter = cpN.at(-1).spelling.letter, lead = cpN.at(-2).spelling.letter;
		if (LETTERS[(LETTERS.indexOf(tonicLetter) + 6) % 7] !== lead) P('leadingToneSpelling', cpN.at(-2).start, 'raised seventh degree letter', lead);
	}
	// species-specific cadence formulas from the definitions document (cf lower)
	const pen = segs.filter(s => s.cfIndex === cf.length - 2);
	if (species === 2 || species === 3) {
		const lastPen = pen.at(-1);
		if (lastPen && lastPen.interval % 12 !== 9) T('cadenceFormula', lastPen.start, 'major sixth before the octave', intervalName(lastPen.interval));
	}
	if (species === 4 && pen.length === 2 && !(pen[0].interval % 12 === 10 && pen[1].interval % 12 === 9)) T('cadenceFormula', pen[0].start, 'seventh resolving to sixth', `${intervalName(pen[0].interval)} to ${intervalName(pen[1].interval)}`);
	// contrary-motion share (informational)
	let contrary = 0, moves = 0;
	segs.forEach((a, k) => { const p = segs[k - 1]; if (p && p.cfIndex !== a.cfIndex) { moves++; const x = a.event.pitch - p.event.pitch, y = a.cf.pitch - p.cf.pitch; if (x * y < 0) contrary++; } });
	return { violations: out, stats: { contrary, moves, segments: segs.length } };
}

// --- sensitivity check against the historical Fux fixtures: the D-dorian first-species
// model satisfies the student profile; the E-phrygian one ends with a whole-tone ascent.
import { readFileSync } from 'node:fs';
function fixtureVoices(file) {
	const src = readFileSync(join('tests/fixtures/examples', file), 'utf8');
	const block = n => parseLyBlock(src.match(new RegExp(`${n}\\s*=\\s*\\{([^}]*)\\}`))[1]);
	return { species: 1, mode: 'major', time: '4/1', upper: block('counterpoint'), lower: block('cantusFirmus') };
}
export function selfCheck() {
	const clean = checkExercise(fixtureVoices('species1-fux-d-dorian.ly')).violations.filter(v => v.tier === 'profile');
	assert.deepEqual(clean, [], 'Fux D dorian model must pass the profile tier');
	const rules = new Set(checkExercise(fixtureVoices('species1-fux-e-phrygian.ly')).violations.filter(v => v.tier === 'profile').map(v => v.rule));
	assert.ok(rules.has('leadingTone'), 'checker must report the Phrygian whole-tone cadence');
}

// --- run
if (import.meta.main) { selfCheck(); await run(); }
async function run() {
const results = [];
const table = [];
for (const spec of exerciseSpecs(count, seedBase)) {
	const r = generatePhrase(spec);
	const name = `${String(results.length + 1).padStart(2, '0')}-s${spec.species}-${spec.key.replace('#', 's')}-${spec.mode}-${spec.time.replace('/', '-')}-${spec.measures}bars`;
	const log = console.log; console.log = () => {}; // the exporter logs to stdout, which would corrupt --json output
	const ly = await core.toLilyPond([r], { title: name, composer: 'lilypoint' }).finally(() => { console.log = log; });
	const midi = midiBytes([r], 80);
	writeFileSync(join(outDir, `${name}.ly`), ly);
	writeFileSync(join(outDir, `${name}.mid`), midi);

	// exports must round-trip to the generated events
	const upper = parseLyBlock(lyVariable(ly, 'topPhraseOne')), lower = parseLyBlock(lyVariable(ly, 'bottomPhraseOne'));
	const keyMatch = ly.match(/\\key\s+(\S+)\s+\\(major|minor)/);
	assert.equal(keyMatch?.[2], spec.mode, `${name}: LilyPond mode`);
	assert.ok(ly.includes(`\\time ${spec.time}`), `${name}: LilyPond time signature`);
	const expectEvents = (parsed, voice) => {
		// LilyPond splits at barlines, so compare merged sounding notes and total duration
		const want = sounding(voice.map(e => ({ pitch: e.pitch, start: e.onset / core.TICKS_PER_WHOLE, duration: e.ticks / core.TICKS_PER_WHOLE, tied: e.tied })));
		const got = sounding(parsed);
		assert.deepEqual(got.map(e => [e.pitch, +e.start.toFixed(6), +e.duration.toFixed(6)]), want.map(e => [e.pitch, +e.start.toFixed(6), +e.duration.toFixed(6)]), `${name}: LilyPond notes round-trip`);
		assert.equal(parsed.at(-1).start + parsed.at(-1).duration, r.totalTicks / core.TICKS_PER_WHOLE, `${name}: LilyPond total duration`);
		parsed.forEach(e => { if (e.pitch !== null) assert.ok(e.spelling, 'spelling'); });
		// spelling matches the generator's spelling
		const gen = voice.filter(e => !e.rest);
		for (const e of got) { const g = gen.find(x => Math.abs(x.onset / core.TICKS_PER_WHOLE - e.start) < 1e-9); assert.deepEqual([e.spelling.letter, e.spelling.accidental, e.spelling.octave], [g.spelling.letter, g.spelling.accidental, g.spelling.octave], `${name}: spelling at ${e.start}`); }
	};
	expectEvents(upper, r.upper); expectEvents(lower, r.lower);
	const m = parseMidi(midi);
	assert.equal(m.format, 1); assert.equal(m.tracks.length, 3, `${name}: MIDI tracks`);
	const meta = m.tracks[0];
	assert.deepEqual(meta.find(e => e.meta === 88)?.data.slice(0, 2), [r.beats, Math.log2(r.unit)], `${name}: MIDI time signature`);
	assert.equal(meta.find(e => e.meta === 89)?.data[1], spec.mode === 'minor' ? 1 : 0, `${name}: MIDI mode`);
	assert.equal(meta.find(e => e.meta === 81)?.data.reduce((a, b) => a * 256 + b, 0), 750000, `${name}: MIDI tempo`);
	const midiNotes = track => {
		const open = new Map(), notes = [];
		for (const e of track) {
			if (e.kind === 144 && e.d2 > 0) open.set(e.d1, e.at);
			else if (e.kind === 128 || (e.kind === 144 && e.d2 === 0)) { notes.push({ midi: e.d1, start: open.get(e.d1) / (m.ppq * 4), duration: (e.at - open.get(e.d1)) / (m.ppq * 4) }); open.delete(e.d1); }
		}
		return notes.sort((a, b) => a.start - b.start);
	};
	for (const [ti, parsed] of [[1, upper], [2, lower]]) {
		const want = sounding(parsed).map(e => [e.pitch + 21, +e.start.toFixed(6), +e.duration.toFixed(6)]);
		assert.deepEqual(midiNotes(m.tracks[ti]).map(n => [n.midi, +n.start.toFixed(6), +n.duration.toFixed(6)]), want, `${name}: MIDI notes match LilyPond`);
	}

	const { violations, stats } = checkExercise({ species: spec.species, mode: spec.mode, time: spec.time, upper, lower });
	results.push({ name, spec: r.spec, requestedSeed: spec.seed, violations, stats, upper: upper.map(e => e.pitch === null ? 'r' : `${e.spelling.letter}${e.spelling.accidental}${e.spelling.octave}`).join(' '), lower: lower.map(e => `${e.spelling.letter}${e.spelling.accidental}${e.spelling.octave}`).join(' ') });
	for (const v of violations) table.push({ exercise: name, ...v });
}

writeFileSync(join(outDir, 'report.json'), JSON.stringify(results, null, 1));
const profile = table.filter(v => v.tier === 'profile');
if (asJson) console.log(JSON.stringify(table));
else {
	console.log(`| exercise | bar | tier | rule | expected | actual |\n|---|---|---|---|---|---|`);
	for (const v of table) console.log(`| ${v.exercise} | ${v.bar} | ${v.tier} | ${v.rule} | ${v.expected} | ${v.actual} |`);
	console.log(`\n${results.length} exercises in ${outDir}; ${profile.length} profile violations, ${table.length - profile.length} textbook findings.`);
}
if (profile.length) { process.exitCode = 1; }
}
