import assert from 'node:assert/strict';
import { parseMusicBlock } from '../tests/helpers/ly-parser.ts';

const core = await import('../dist/proto/shared/core.js');
const nt = await import('../dist/proto/shared/notation.js');
const specs = [
	core.defaultSpec({ key: 'D', mode: 'minor', species: 4, measures: 4, time: '4/4', seed: 7 }),
	core.defaultSpec({ key: 'Bb', mode: 'major', species: 3, measures: 2, time: '6/8', seed: 9 }),
	core.defaultSpec({ key: 'E', species: 5, measures: 3, time: '3/4', seed: 3 }),
];
const results = specs.map(core.generate);
const expectedPhraseTicks = [16384, 6144, 9216];
const expectedTotalTicks = 31744;
const meta = { title: 'Test', composer: 'me' };

assert.deepEqual(core.decodeSpecs(core.encodeSpecs(specs)), specs, 'URL specs preserve every setting');
assert.equal(core.encodeSpecs(specs), 'D.minor.4.4.4-4.7_Bb.major.3.2.6-8.9_E.major.5.3.3-4.3');

const abc = nt.toABC(results, meta);
assert.match(abc, /^T:Test$/m);
assert.match(abc, /^C:me$/m);
assert.match(abc, /^K:Dm$/m);
assert.equal((abc.match(/\[K:Bb\]\[M:6\/8\]/g) || []).length, 2);
assert.equal((abc.match(/\[K:E\]\[M:3\/4\]/g) || []).length, 2);
const abcVoices = abc.split(/^V:[12].*\n/m).slice(1);
assert.equal(abcVoices.length, 2);
for (const voice of abcVoices) {
	// L:1/128 means one written duration unit equals 32 stored ticks.
	const music = voice.replace(/\[[^\]]*\]/g, '');
	const durations = [...music.matchAll(/[A-Ga-gz][,']*(\d+)/g)].map(m => Number(m[1]) * 32);
	assert.equal(durations.reduce((sum, ticks) => sum + ticks, 0), expectedTotalTicks, 'ABC voice spans the complete score');
}

const xml = nt.toMusicXML(results, meta);
assert.match(xml, /<work-title>Test<\/work-title>/);
assert.match(xml, /<creator type="composer">me<\/creator>/);
const parts = [...xml.matchAll(/<part id="(P[12])">([\s\S]*?)<\/part>/g)];
assert.equal(parts.length, 2);
for (const [, id, part] of parts) {
	assert.equal((part.match(/<measure number=/g) || []).length, 9, `${id} has all nine bars`);
	const durations = [...part.matchAll(/<duration>(\d+)<\/duration>/g)].map(m => Number(m[1]));
	assert.equal(durations.reduce((sum, ticks) => sum + ticks, 0), expectedTotalTicks);
	assert.deepEqual([...part.matchAll(/<fifths>(-?\d+)<\/fifths>/g)].map(m => Number(m[1])), [-1, -2, 4]);
	assert.deepEqual([...part.matchAll(/<beats>(\d+)<\/beats><beat-type>(\d+)<\/beat-type>/g)].map(m => `${m[1]}/${m[2]}`), ['4/4', '6/8', '3/4']);
}

const previousWindow = globalThis.window;
let lilypond;
try {
	globalThis.window = {}; // Exercise the browser exporter without writing a file.
	lilypond = await core.toLilyPond(results, meta);
} finally {
	if (previousWindow === undefined) delete globalThis.window;
	else globalThis.window = previousWindow;
}
assert.match(lilypond, /title = "Test"/);
assert.match(lilypond, /composer = "me"/);
for (const token of ['\\key d \\minor', '\\key bes \\major', '\\key e \\major', '\\time 4/4', '\\time 6/8', '\\time 3/4']) assert.ok(lilypond.includes(token), token);
for (const [prefix, voice] of [['top', 'upper'], ['bottom', 'lower']]) {
	const blocks = [...lilypond.matchAll(new RegExp(prefix + 'Phrase\\w+ = \\{[^\\n]*\\n([\\s\\S]*?)\\}', 'g'))];
	assert.equal(blocks.length, 3);
	blocks.forEach((block, index) => {
		const events = parseMusicBlock(block[1]);
		assert.deepEqual(events.map(e => e.pitch), results[index][voice].map(e => e.pitch), 'LilyPond preserves sounding pitches and rests');
		assert.equal(events.reduce((sum, e) => sum + e.duration * 4096, 0), expectedPhraseTicks[index]);
	});
}

const playback = nt.toPlaybackNotes(results);
assert.equal(playback.totalTicks, expectedTotalTicks);
let offset = 0;
results.forEach((result, index) => {
	for (const voice of ['upper', 'lower']) {
		const layout = nt.layoutPhrase(result)[voice];
		assert.equal(layout.length, specs[index].measures);
		const chunks = layout.flat();
		assert.ok(chunks.length > 0);
		assert.equal(chunks.reduce((sum, c) => sum + c.ticks, 0), expectedPhraseTicks[index]);
		for (const chunk of chunks) assert.equal(chunk.ticks % 32, 0, 'printable duration uses 32-tick units');
		const notes = playback.notes.filter(n => n.phraseId === result.id && n.voice === voice);
		assert.ok(notes.length > 0);
		const soundingTicks = result[voice].filter(e => !e.rest).reduce((sum, e) => sum + e.ticks, 0);
		assert.equal(notes.reduce((sum, n) => sum + n.ticks, 0), soundingTicks, 'playback keeps all sounding time');
		for (const note of notes) {
			assert.ok(note.startTicks >= offset);
			assert.ok(note.startTicks + note.ticks <= offset + expectedPhraseTicks[index]);
		}
	}
	offset += expectedPhraseTicks[index];
});
console.log('URL round-trip, ABC, MusicXML, LilyPond, layout, and playback contracts passed.');
