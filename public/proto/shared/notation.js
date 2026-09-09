// Format conversion: phrase results -> measures, ABC, MusicXML, playback notes.
import { TICKS_PER_WHOLE } from './core.js';

const TYPE_BY_TICKS = { 4096: 'whole', 2048: 'half', 1024: 'quarter', 512: 'eighth', 256: '16th', 128: '32nd', 64: '64th', 32: '128th' };

/** Break a tick count into printable chunks: [{ticks, base (1,2,4...), dots}]. */
export function durationParts(ticks) {
	const parts = [];
	while (ticks > 0) {
		const size = Math.min(TICKS_PER_WHOLE, 2 ** Math.floor(Math.log2(ticks)));
		let used = size, dots = 0;
		if (size >= 2 && ticks >= size * 1.5) { used = size * 1.5; dots = 1; }
		ticks -= used;
		parts.push({ ticks: used, base: TICKS_PER_WHOLE / size, dots });
	}
	return parts;
}

/**
 * Split a voice into measures. Notes crossing a barline (or needing more than
 * one printable chunk) are split and tied, exactly like the LilyPond exporter.
 * Each chunk: { rest, pitch, midi, spelling, ticks, base, dots, tiedToNext, tieFromPrev, onset, srcIndex }
 */
export function splitIntoMeasures(events, barTicks) {
	const measures = [];
	let onset = 0;
	let carry = false; // previous event was tied into this one
	events.forEach((ev, srcIndex) => {
		let remaining = ev.ticks;
		let first = !carry;
		carry = !ev.rest && ev.tied;
		while (remaining > 0) {
			const room = barTicks - (onset % barTicks);
			const span = Math.min(remaining, room);
			remaining -= span;
			const parts = durationParts(span);
			parts.forEach((p, i) => {
				const m = Math.floor(onset / barTicks);
				while (measures.length <= m) measures.push([]);
				const last = i === parts.length - 1;
				measures[m].push({
					rest: ev.rest, pitch: ev.pitch, midi: ev.midi, spelling: ev.spelling,
					ticks: p.ticks, base: p.base, dots: p.dots,
					tiedToNext: !ev.rest && (!last || remaining > 0 || ev.tied),
					tieFromPrev: !ev.rest && !first,
					onset, srcIndex,
				});
				onset += p.ticks;
				first = false;
			});
		}
	});
	return measures;
}

/** Key signature as a map letter -> accidental, e.g. {f: 1, c: 1}. */
export function keySignatureMap(keyInfo) {
	const map = {};
	for (const token of keyInfo.notes) {
		const rest = token.slice(1);
		map[token[0]] = rest.startsWith('is') ? rest.length / 2 : -rest.length / 2;
	}
	return map;
}
export function keyFifths(keyInfo) {
	const map = keySignatureMap(keyInfo);
	const n = Object.values(map).reduce((sum, a) => sum + Math.abs(a), 0);
	return Math.max(-7, Math.min(7, keyInfo.type === 'es' ? -n : n));
}

/**
 * Decide which chunks show an accidental, following engraving convention:
 * the key signature holds until a bar changes it, a change lasts for the bar,
 * and a tie carries its accidental across the barline without restating it.
 * Mutates chunks: chunk.showAccidental = null | -2..2
 */
export function markAccidentals(measures, keyInfo) {
	const sig = keySignatureMap(keyInfo);
	for (const measure of measures) {
		const state = new Map();
		for (const c of measure) {
			c.showAccidental = null;
			if (c.rest) continue;
			const k = c.spelling.letter + c.spelling.octave;
			const current = state.has(k) ? state.get(k) : (sig[c.spelling.letter] ?? 0);
			if (c.tieFromPrev) continue;
			if (c.spelling.accidental !== current) {
				c.showAccidental = c.spelling.accidental;
				state.set(k, c.spelling.accidental);
			}
		}
	}
	return measures;
}

/** Ticks per beam group for a meter. Compound meters beam in threes. */
export function beamGroupTicks(beats, unit) {
	if (unit === 8 && beats % 3 === 0) return 3 * TICKS_PER_WHOLE / 8;
	return TICKS_PER_WHOLE / unit;
}

/** Everything a renderer needs for one phrase, both voices. */
export function layoutPhrase(result) {
	const upper = markAccidentals(splitIntoMeasures(result.upper, result.barTicks), result.keyInfo);
	const lower = markAccidentals(splitIntoMeasures(result.lower, result.barTicks), result.keyInfo);
	const count = Math.max(upper.length, lower.length);
	while (upper.length < count) upper.push([]);
	while (lower.length < count) lower.push([]);
	return { upper, lower, count, beamTicks: beamGroupTicks(result.beats, result.unit) };
}

// --- ABC -------------------------------------------------------------------
const ABC_UNIT = 32; // L:1/128 so every printable duration is an integer multiple
const APOSTROPHE = String.fromCharCode(39);

function abcPitch(c) {
	const a = c.showAccidental;
	const acc = a == null ? '' : a === 0 ? '=' : a > 0 ? '^'.repeat(a) : '_'.repeat(-a);
	const { letter, octave } = c.spelling;
	let name = octave >= 5 ? letter.toLowerCase() : letter.toUpperCase();
	if (octave >= 6) name += APOSTROPHE.repeat(octave - 5);
	if (octave <= 3) name += ','.repeat(4 - octave);
	return acc + name;
}
function abcMeasure(measure, beamTicks) {
	let out = '', lastGroup = -1;
	for (const c of measure) {
		const group = Math.floor(c.onset / beamTicks);
		if (group !== lastGroup && out) out += ' ';
		lastGroup = group;
		out += (c.rest ? 'z' : abcPitch(c)) + (c.ticks / ABC_UNIT) + (c.tiedToNext ? '-' : '');
	}
	return out;
}
export function abcKey(spec) { return spec.key + (spec.mode === 'minor' ? 'm' : ''); }

/**
 * ABC for abcjs (and Verovio's ABC importer). Both voices share the bar
 * structure so the engraver keeps them aligned; key and meter changes are
 * inlined at phrase boundaries.
 */
export function toABC(results, meta = {}) {
	if (!results.length) return '';
	const first = results[0].spec;
	const perLine = meta.measuresPerLine || 4;
	let head = 'X:1\n';
	if (meta.title) head += 'T:' + meta.title + '\n';
	if (meta.composer) head += 'C:' + meta.composer + '\n';
	head += 'M:' + first.time + '\nL:1/128\nQ:1/4=' + (first.tempo || meta.tempo || 80) + '\n%%score (1 2)\nK:' + abcKey(first) + '\n';
	const voices = { upper: '', lower: '' };
	let barCount = 0;
	results.forEach((r, ri) => {
		const layout = layoutPhrase(r);
		const previous = results[ri-1]?.spec;
		const change = previous ? (abcKey(previous)!==abcKey(r.spec) ? '[K:' + abcKey(r.spec) + ']' : '') + (previous.time!==r.spec.time ? '[M:' + r.spec.time + ']' : '') : '';
		const tempoChange = previous && (r.spec.tempo || meta.tempo || 80)!==(previous.tempo || meta.tempo || 80) ? '[Q:1/4='+(r.spec.tempo || meta.tempo || 80)+']' : '';
		for (const v of ['upper', 'lower']) {
			let line = change + (v==='upper' ? tempoChange : '');
			layout[v].forEach((m, mi) => {
				const lastOfPhrase = mi === layout.count - 1;
				const finalBar = ri === results.length - 1 && lastOfPhrase;
				const bar = finalBar ? ' |]' : lastOfPhrase ? ' ||' : ' |';
				line += abcMeasure(m, layout.beamTicks) + bar;
				if ((barCount + mi + 1) % perLine === 0 && !finalBar) line += '\n';
				else line += ' ';
			});
			voices[v] += line;
		}
		barCount += layout.count;
	});
	return head + 'V:1 clef=treble name="' + (meta.upperName || '') + '"\n' + voices.upper.trim() + '\nV:2 clef=treble name="' + (meta.lowerName || '') + '"\n' + voices.lower.trim() + '\n';
}

// --- MusicXML --------------------------------------------------------------
const XML_ACC = { '-2': 'flat-flat', '-1': 'flat', '0': 'natural', '1': 'sharp', '2': 'double-sharp' };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

function xmlNote(c, voice) {
	let n = '<note>';
	if (c.rest) n += '<rest/>';
	else n += '<pitch><step>' + c.spelling.letter.toUpperCase() + '</step>' + (c.spelling.accidental ? '<alter>' + c.spelling.accidental + '</alter>' : '') + '<octave>' + c.spelling.octave + '</octave></pitch>';
	n += '<duration>' + c.ticks + '</duration>';
	if (c.tieFromPrev) n += '<tie type="stop"/>';
	if (c.tiedToNext) n += '<tie type="start"/>';
	n += '<voice>' + voice + '</voice><type>' + TYPE_BY_TICKS[TICKS_PER_WHOLE / c.base] + '</type>' + '<dot/>'.repeat(c.dots);
	if (c.showAccidental != null) n += '<accidental>' + XML_ACC[c.showAccidental] + '</accidental>';
	if (c.tieFromPrev || c.tiedToNext) n += '<notations>' + (c.tieFromPrev ? '<tied type="stop"/>' : '') + (c.tiedToNext ? '<tied type="start"/>' : '') + '</notations>';
	return n + '</note>';
}

/** MusicXML (partwise) for Verovio, OpenSheetMusicDisplay, MuseScore, Dorico. */
export function toMusicXML(results, meta = {}) {
	const parts = { upper: '', lower: '' };
	let number = 1;
	results.forEach((r, ri) => {
		const layout = layoutPhrase(r);
		for (const v of ['upper', 'lower']) {
			layout[v].forEach((m, mi) => {
				let x = '<measure number="' + (number + mi) + '">';
				if (mi === 0) {
					x += '<attributes><divisions>' + (TICKS_PER_WHOLE / 4) + '</divisions><key><fifths>' + keyFifths(r.keyInfo) + '</fifths><mode>' + r.spec.mode + '</mode></key><time><beats>' + r.beats + '</beats><beat-type>' + r.unit + '</beat-type></time>' + (ri === 0 ? '<clef><sign>G</sign><line>2</line></clef>' : '') + '</attributes>';
				}
				x += m.map(c => xmlNote(c, 1)).join('');
				if (mi === layout.count - 1) x += '<barline location="right"><bar-style>' + (ri === results.length - 1 ? 'light-heavy' : 'light-light') + '</bar-style></barline>';
				parts[v] += x + '</measure>';
			});
		}
		number += layout.count;
	});
	return '<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">\n' +
		'<score-partwise version="4.0">\n' +
		'<work><work-title>' + esc(meta.title || 'lilypoint') + '</work-title></work>\n' +
		'<identification><creator type="composer">' + esc(meta.composer || 'lilypoint') + '</creator><encoding><software>lilypoint</software></encoding></identification>\n' +
		'<part-list><score-part id="P1"><part-name>' + esc(meta.upperName ?? 'Counterpoint') + '</part-name><part-abbreviation>' + esc(meta.upperAbbr ?? 'Cpt.') + '</part-abbreviation></score-part>' +
		'<score-part id="P2"><part-name>' + esc(meta.lowerName ?? 'Cantus firmus') + '</part-name><part-abbreviation>' + esc(meta.lowerAbbr ?? 'C.F.') + '</part-abbreviation></score-part></part-list>\n' +
		'<part id="P1">' + parts.upper + '</part>\n' +
		'<part id="P2">' + parts.lower + '</part>\n' +
		'</score-partwise>';
}

/** Flat list of {midi, startTicks, ticks, voice, phraseId, indices} for playback. Ties are merged. */
export function toPlaybackNotes(results) {
	const notes = [];
	let offset = 0;
	for (const r of results) {
		for (const voice of ['upper', 'lower']) {
			let open = null;
			r[voice].forEach((ev, i) => {
				if (ev.rest) { open = null; return; }
				if (open && open.midi === ev.midi && open.tiedInto) { open.ticks += ev.ticks; open.tiedInto = ev.tied; open.indices.push(i); return; }
				open = { midi: ev.midi, startTicks: offset + ev.onset, ticks: ev.ticks, voice, phraseId: r.id, indices: [i], tiedInto: ev.tied };
				notes.push(open);
			});
		}
		offset += r.totalTicks;
	}
	return { notes, totalTicks: offset };
}
