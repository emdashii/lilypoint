// Faults for plans/mutation-audit/run.mjs. Each edit is an exact find/replace that
// must match once (or every time with `all`). IDs match the tables in plans/test-quality.md.
// Each mutation: id, desc, edits [{file, find, replace, all?}]
const CF = 'src/cantus-firmus.ts', EN = 'src/species-engine.ts', WP = 'src/write-phrase.ts', CORE = 'public/proto/shared/core.js', ST = 'public/proto/shared/studio.js', AU = 'test/exercise-audit.mjs';
const m = (id, desc, ...edits) => ({ id, desc, edits: edits.map(([file, find, replace, all]) => ({ file, find, replace, all })) });
const GATE_OFF = [WP, "const violations = new Validator('student').validatePhrase(candidate);", "const violations = new Validator('student').validatePhrase(candidate).slice(0, 0);"];

export const generator = [
	m('C1', 'Cantus: drop the four-distinct-pitch minimum for long lines', [CF, 'const minimumPitches = this.length >= 8 ? 4 : 1;', 'const minimumPitches = 1;']),
	m('C2', 'Cantus: restore the pre-fix peak set (degrees 2-6, no tritone filter, no pitch minimum)',
		[CF, 'const minimumPitches = this.length >= 8 ? 4 : 1;', 'const minimumPitches = 1;'],
		[CF, "const peaks = this.scaleDegrees.slice(this.length >= 8 ? 3 : 1, 6)\n            .filter(peak => !this.isTritone(peak, this.scaleDegrees[1]));", 'const peaks = this.scaleDegrees.slice(1, 6);']),
	m('C3', 'Cantus: the climax pitch may recur away from the climax position', [CF, 'if ((i === peakIndex) !== (pitch === peak)) continue;', 'if (i === peakIndex && pitch !== peak) continue;'], [CF, 'shuffle(this.scaleDegrees.filter(p => p < peak))', 'shuffle(this.scaleDegrees.filter(p => p <= peak))'], [CF, 'return climaxCount === 1;', 'return climaxCount >= 1;']),
	m('C4', 'Cantus: allow melodic tritone leaps', [CF, 'Math.abs(pitch - previous) > 5', 'Math.abs(pitch - previous) > 6'], [CF, 'if (this.isTritone(prev, curr) || this.isSeventh(prev, curr)) {', 'if (this.isSeventh(prev, curr)) {']),
	m('C5', 'Cantus: approach the final from the subtonic below instead of degree 2', [CF, ': i === this.length - 2 ? [this.scaleDegrees[1]]', ': i === this.length - 2 ? [this.scaleDegrees[6] - 12]']),
	m('C6', 'Cantus: drop leap recovery from the search', [CF, 'if (Math.abs(leap) > 4 && (Math.abs(move) > 2', 'if (Math.abs(leap) > 99 && (Math.abs(move) > 2']),
	m('C7', 'Cantus: shuffle with Math.random instead of the request random', [CF, 'const j = Math.floor(this.random() * (i + 1));', 'const j = Math.floor(Math.random() * (i + 1));']),
	m('C8', 'Cantus: low-entropy shuffle (only the last two choices swap)', [CF, 'for (let i = items.length - 1; i > 0; i--) {', 'for (let i = items.length - 1; i > Math.max(0, items.length - 2); i--) {']),
	m('C9', 'Cantus: allow repeated adjacent pitches', [CF, 'if (pitch === previous || Math.abs(pitch - previous) > 5) continue;', 'if (Math.abs(pitch - previous) > 5) continue;']),
	m('C10', 'Cantus: start on the dominant instead of the tonic',
		[CF, 'const path = [new Note(this.tonic, 1)];', 'const path = [new Note(this.scaleDegrees[4], 1)];'],
		[CF, 'if (firstNote !== this.tonic || lastNote !== this.tonic) {', 'if (lastNote !== this.tonic) {']),

	m('C11', 'Cantus: three-note lines rejected', [CF, 'if (!Number.isSafeInteger(length) || length < 3)', 'if (!Number.isSafeInteger(length) || length < 4)']),
	m('C12', 'Cantus: lines over 16 notes skip the final tonic', [CF, 'const choices = i === this.length - 1 ? [this.tonic]', 'const choices = i === this.length - 1 && this.length <= 16 ? [this.tonic]'], [CF, 'if (firstNote !== this.tonic || lastNote !== this.tonic) {', 'if (firstNote !== this.tonic || (lastNote !== this.tonic && this.length <= 16)) {']),
	m('C13', 'Cantus: interior choices in a fixed order (seed only picks climax place and pitch)', [CF, ': shuffle(this.scaleDegrees.filter(p => p < peak));', ': this.scaleDegrees.filter(p => p < peak).reverse();']),

	m('E1', 'Engine: allow note-to-note parallel perfects', [EN, 'if (prevIntervalMod === intervalMod && (intervalMod === 0 || intervalMod === 7)) {', 'if (prevIntervalMod === intervalMod && intervalMod === 99) {']),
	m('E2', 'Engine: final may be any interval', [EN, 'if (intervalMod !== 0) return;', 'if (intervalMod === 99) return;']),
	m('E3', 'Engine: allow struck dissonance on strong beats', [EN, "if (strong) return;\n\t\t\t\t\tif (this.options.weakDissonance === 'none') return;", "if (this.options.weakDissonance === 'none') return;"]),
	m('E4', 'Engine: never raise the minor leading tone', [EN, 'if (index === slots.length - 2 && this.options.minor) {', 'if (index === slots.length - 2 && this.options.minor && index < 0) {']),
	m('E5', 'Engine: suspensions resolve upward', [EN, "nextObligation = { kind: 'step', dir: -1, consonant: true };", "nextObligation = { kind: 'step', dir: 1, consonant: true };"]),
	m('E6', 'Engine: chromatic pitches (scale filter disabled)', [EN, 'return this.scaleClasses.has(((pitch % 12) + 12) % 12);', 'return pitch >= 0;']),
	m('E7', 'Engine: drop the student direct-perfect check', [EN, 'if ([0,7].includes(intervalMod) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) return;', 'if ([99].includes(intervalMod) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) return;']),
	m('E8', 'Engine: allow crossing below the cantus', [EN, 'if (interval < 0) return;', 'if (interval < -5) return;']),
	m('E9', 'Engine: spacing up to two octaves', [EN, 'const MAX_SPACING = 16;', 'const MAX_SPACING = 24;']),
	m('E10', 'Engine: passing tones may turn back (neighbors in species 2)', [EN, "nextObligation = { kind: 'step', dir };", "nextObligation = { kind: 'step', dir: (-dir as 1 | -1) };"]),
	m('E11', 'Engine: drop the student leap-recovery check', [EN, 'if (Math.abs(leap) > 4 && (Math.abs(cpMove) < 1', 'if (Math.abs(leap) > 99 && (Math.abs(cpMove) < 1']),
	m('E12', 'Engine: mid-phrase unisons allowed', [EN, 'if (interval === 0 && !isFirst && !isFinal) return;', 'if (interval === 0 && isFirst && isFinal) return;']),

	m('R1', 'Rhythm: florid species uses only the half-note template', [EN, ': templates[Math.floor(random() * templates.length)];', ': templates[0];']),
	m('R2', 'Rhythm: fourth species without the cadential suspension', [EN, 'mustSuspend: i === cfLength - 2 });', 'mustSuspend: false });']),
	m('R3', 'Rhythm: fourth species ties optional', [EN, 'mayTieFromPrev: true, mustTieFromPrev: true,', 'mayTieFromPrev: true, mustTieFromPrev: false,']),
	m('R4', 'Rhythm: fourth species without the opening rest (first bar on the downbeat)', [EN, 'if (i > 0) slots.push({ cfIndex: i, beatPos: 0, relLyDur: 2, mayTieFromPrev', 'slots.push({ cfIndex: i, beatPos: 0, relLyDur: 2, mayTieFromPrev']),

	m('R5', 'Rhythm: florid quarter-note template written as eighths', [EN, '[{ beatPos: 0, relLyDur: 4 }, { beatPos: 0.25, relLyDur: 4 }, { beatPos: 0.5, relLyDur: 4 }, { beatPos: 0.75, relLyDur: 4 }],', '[{ beatPos: 0, relLyDur: 8 }, { beatPos: 0.125, relLyDur: 8 }, { beatPos: 0.25, relLyDur: 8 }, { beatPos: 0.375, relLyDur: 8 }, { beatPos: 0.5, relLyDur: 8 }, { beatPos: 0.625, relLyDur: 8 }, { beatPos: 0.75, relLyDur: 8 }, { beatPos: 0.875, relLyDur: 8 }],']),
	m('W1', 'Writer: validation gate disabled', GATE_OFF),
	m('W2', 'Writer: gate uses the historical profile', [WP, "const violations = new Validator('student').validatePhrase(candidate);", "const violations = new Validator('historical').validatePhrase(candidate);"]),
	m('W3', 'Writer: minor leading tone spelled from the key signature', [WP, "const isLeading = this.mode === 'minor' && i === voice.length - 2", "const isLeading = this.mode === 'major' && i === voice.length - 2"]),
	m('W4', 'Writer: durations always scaled to quarter-note beats', [WP, 'new Phrase(counterpoint.map(n => n.scaled(this.beatUnit)), cantus.map(n => n.scaled(this.beatUnit)), this.getKey())', 'new Phrase(counterpoint.map(n => n.scaled(4)), cantus.map(n => n.scaled(4)), this.getKey())']),
	m('W5', 'Writer: one generation attempt', [WP, 'const maxAttempts = 50;', 'const maxAttempts = 1;']),
	m('W6', 'Writer: species 3 request builds second species', [WP, 'case 3: return new ThirdSpecies();', 'case 3: return new SecondSpecies();']),
	m('W7', 'Writer: cantus length ignores the meter (always four per bar)', [WP, 'const totalBeats = this.phraseLength * this.beatsPerMeasure;\n\t\tverboseLog(`Time', 'const totalBeats = this.phraseLength * 4;\n\t\tverboseLog(`Time']),
	m('W8', 'Writer: instance seed ignored', [WP, 'this.random = createRandom(this.seed);', 'this.random = createRandom();']),
	m('W9b', 'Writer: key signature stays major when minor mode is requested', [WP, 'this.key = new Key(this.key.getKeyName(), mode);', "this.key = new Key(this.key.getKeyName(), 'major');"]),

	m('W10', 'Writer: phrase one bar longer than requested', [WP, 'const totalBeats = this.phraseLength * this.beatsPerMeasure;\n\t\tverboseLog(`Time', 'const totalBeats = (this.phraseLength + 1) * this.beatsPerMeasure;\n\t\tverboseLog(`Time']),
	m('W1+E1', 'Gate off and engine allows parallel perfects', GATE_OFF, [EN, 'if (prevIntervalMod === intervalMod && (intervalMod === 0 || intervalMod === 7)) {', 'if (prevIntervalMod === intervalMod && intervalMod === 99) {']),
	m('W1+E3', 'Gate off and engine allows strong struck dissonance', GATE_OFF, [EN, "if (strong) return;\n\t\t\t\t\tif (this.options.weakDissonance === 'none') return;", "if (this.options.weakDissonance === 'none') return;"]),
	m('W1+E7', 'Gate off and engine drops the direct-perfect check', GATE_OFF, [EN, 'if ([0,7].includes(intervalMod) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) return;', 'if ([99].includes(intervalMod) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) return;']),
	m('W1+E8', 'Gate off and engine allows crossing', GATE_OFF, [EN, 'if (interval < 0) return;', 'if (interval < -5) return;']),
	m('W1+E11', 'Gate off and engine drops leap recovery', GATE_OFF, [EN, 'if (Math.abs(leap) > 4 && (Math.abs(cpMove) < 1', 'if (Math.abs(leap) > 99 && (Math.abs(cpMove) < 1']),
	m('W1+C6', 'Gate off and cantus drops leap recovery', GATE_OFF, [CF, 'if (Math.abs(leap) > 4 && (Math.abs(move) > 2', 'if (Math.abs(leap) > 99 && (Math.abs(move) > 2']),
	m('W1+E6', 'Gate off and engine writes chromatic pitches', GATE_OFF, [EN, 'return this.scaleClasses.has(((pitch % 12) + 12) % 12);', 'return pitch >= 0;']),
	m('W1+R1', 'Gate off and florid rhythm uses only halves', GATE_OFF, [EN, ': templates[Math.floor(random() * templates.length)];', ': templates[0];']),
	m('W1+R2', 'Gate off and no fourth-species cadential suspension', GATE_OFF, [EN, 'mustSuspend: i === cfLength - 2 });', 'mustSuspend: false });']),
	m('W1+R3', 'Gate off and fourth-species ties optional', GATE_OFF, [EN, 'mayTieFromPrev: true, mustTieFromPrev: true,', 'mayTieFromPrev: true, mustTieFromPrev: false,']),
	m('W1+E10', 'Gate off and species-2 dissonances may turn back', GATE_OFF, [EN, "nextObligation = { kind: 'step', dir };", "nextObligation = { kind: 'step', dir: (-dir as 1 | -1) };"]),

	m('A1', 'App: MIDI number off by one semitone', [CORE, 'midi: rest ? null : pitch + 21', 'midi: rest ? null : pitch + 20']),
	m('A2', 'App: no retry after cantus search exhaustion', [ST, 'for(let attempt=0;attempt<6;attempt++,seed=seed%2147483646+1) {', 'for(let attempt=0;attempt<1;attempt++,seed=seed%2147483646+1) {']),
	m('A3', 'App: onsets not accumulated', [CORE, '\t\t\tonset += ev.ticks;\n', '\n']),
	m('A4', 'App: total ticks assume four bars', [CORE, 'totalTicks: barTicks * Number(spec.measures),', 'totalTicks: barTicks * 4,']),
	m('A5', 'App: retry reuses the same seed', [ST, 'attempt++,seed=seed%2147483646+1)', 'attempt++,seed=seed)']),
];

const off = rule => [AU, `P('${rule}'`, `void ('${rule}'`, true];
export const audit = [
	...['continuity', 'tie', 'equalDuration', 'cantusRhythm', 'subdivision', 'syncopation', 'floridDuration', 'beginsPerfect', 'endsPerfect', 'crossing', 'spacing', 'harmonicSpelling', 'directPerfect', 'parallelPerfect', 'allConsonant', 'strongDissonance', 'dissonanceTreatment', 'metric', 'afterbeatPerfects', 'cadentialSuspension', 'leapSize', 'dissonantLeap', 'melodicSpelling', 'leapRecovery', 'cadence', 'leadingTone', 'leadingToneSpelling']
		.map(rule => m(`X-${rule}`, `Audit checker: drop the ${rule} profile check`, off(rule))),
	m('XP1', 'Audit parser: unmarked LilyPond octave read as octave 4', [AU, 'let octave = 3;', 'let octave = 4;']),
	m('XP2', 'Audit parser: dots ignored', [AU, '(1 / Number(dur)) * (dot ? 1.5 : 1)', '(1 / Number(dur))']),
	m('XP3', 'Audit parser: ties ignored', [AU, 'events.push({ ...p, start, duration, tied: Boolean(tie) });', 'events.push({ ...p, start, duration, tied: false });']),
	m('XP4', 'Audit checker: suspensions never classified', [AU, "if (a.tiedFrom && isConsonant(prev.interval) && isConsonant(next.interval) && (leave === -1 || leave === -2)) return 'suspension';", '']),
	m('XP5', 'Audit runner: profile violations do not set the exit code', [AU, 'if (profile.length) { process.exitCode = 1; }', 'if (profile.length < 0) { process.exitCode = 1; }']),
	m('XP6', 'Audit checker: passing tones classified as neighbors', [AU, "return Math.sign(approach) === Math.sign(leave) ? 'passing' : 'neighbor';", "return 'neighbor';"]),
	m('XP7', 'Audit checker: intervals reduced to one octave (spacing blind)', [AU, 'interval: Math.abs(e.pitch - c.pitch) });', 'interval: Math.abs(e.pitch - c.pitch) % 12 });']),
	m('XP8', 'Audit checker: beat position measured from the bar start, not the cantus note', [AU, 'beatPos: (start - c.start) / c.duration,', 'beatPos: (start - e.start) / c.duration,']),
	m('XP9', 'Audit export check: LilyPond round-trip compares generator events to themselves', [AU, "assert.deepEqual(got.map(e => [e.pitch, +e.start.toFixed(6), +e.duration.toFixed(6)]), want.map(", "assert.deepEqual(want.map(e => [e.pitch, +e.start.toFixed(6), +e.duration.toFixed(6)]), want.map("]),
];
