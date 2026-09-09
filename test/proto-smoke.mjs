globalThis.window = {}; // make ExportToFile return text instead of writing a file
const core = await import('../dist/proto/shared/core.js');
const nt = await import('../dist/proto/shared/notation.js');
const specs = [
	core.defaultSpec({ key: 'D', mode: 'minor', species: 4, measures: 4, time: '4/4', seed: 7 }),
	core.defaultSpec({ key: 'Bb', mode: 'major', species: 3, measures: 2, time: '6/8', seed: 9 }),
	core.defaultSpec({ key: 'E', species: 5, measures: 3, time: '3/4', seed: 3 }),
];
const results = specs.map(core.generate);
console.log(nt.toABC(results, { title: 'Test', composer: 'me' }));
console.log(nt.toMusicXML(results).slice(0, 1200));
console.log((await core.toLilyPond(results, { title: 'Test', composer: 'me' })).slice(0, 900));
const pb = nt.toPlaybackNotes(results);
console.log('playback notes', pb.notes.length, 'total ticks', pb.totalTicks);
const enc = core.encodeSpecs(specs);
console.log(enc, JSON.stringify(core.decodeSpecs(enc)) === JSON.stringify(specs.map(s => ({ ...s }))));
// every printable chunk must be a multiple of 32 ticks
for (const r of results) for (const v of ['upper', 'lower']) for (const m of nt.layoutPhrase(r)[v]) for (const c of m) if (c.ticks % 32) throw new Error('bad chunk ' + c.ticks);
console.log('chunks ok');
