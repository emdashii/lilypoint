import { test, expect } from 'bun:test';
import { CantusFirmus } from '../../src/cantus-firmus';
import { WritePhrase } from '../../src/write-phrase';
test('long cantus melodies vary across seeds', () => {
	for (const length of [32, 64]) {
		const melodies = new Set<string>();
		for (let seed = 1; seed <= 20; seed++) {
			WritePhrase.setSeed(seed);
			melodies.add(new CantusFirmus('C', length).generate().map(n => n.getNote()).join(','));
		}
		expect(melodies.size).toBeGreaterThanOrEqual(15);
	}
});

import { Note, TICKS_PER_WHOLE } from '../../src/note';
import { Phrase } from '../../src/phrase';
import { pitchInterval } from '../../src/pitch';
import { getKey } from '../../src/key';
import { FirstSpeciesValidator, SecondSpeciesValidator, ThirdSpeciesValidator, FourthSpeciesValidator, FifthSpeciesValidator } from '../../src/validation/species-validator';
import { alignToCantusFirmus, mergeTies } from '../../src/validation/species-rules';
import { checkStudentRules } from '../../src/validation/student-rules';
import { musicalEventsToVoice, voiceToMusicalEvents, phraseToTimedVoices } from '../../src/validation/timed-events';
import { parseMusicBlock } from '../helpers/ly-parser';
import { ExportToFile } from '../../src/export-to-file';
import { FirstSpecies } from '../../src/first-species';
import { SpeciesEngine, uniformSlots } from '../../src/species-engine';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const input = (cp: string, cf: string, species = 1) => ({ cp: parseMusicBlock(cp), cf: parseMusicBlock(cf), cfPosition: 'lower' as const, species });
const generate = (species: number, key = 'C', mode = 'major', seed = 42, measures = 2) => {
	const writer = new WritePhrase(key, measures, species, '4/4');
	writer.setSeed(seed);
	writer.setMode(mode);
	writer.writeThePhrase();
	return writer.getPhrase();
};

test('student generation validates across keys, modes, species, and lengths', () => {
	const validators = [FirstSpeciesValidator, SecondSpeciesValidator, ThirdSpeciesValidator, FourthSpeciesValidator, FifthSpeciesValidator];
	for (const key of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']) {
		for (const mode of ['major', 'minor']) for (let species = 1; species <= 5; species++) {
			for (const measures of [2, 4]) {
				const phrase = generate(species, key, mode, 42, measures);
				expect(new validators[species - 1]('student').validatePhrase(phrase)).toEqual([]);
				for (const voice of [phrase.getUpperVoice(), phrase.getLowerVoice()]) expect(voiceToMusicalEvents(musicalEventsToVoice(voiceToMusicalEvents(voice)))).toEqual(voiceToMusicalEvents(voice));
			}
		}
	}
});

test('fourth species requires the opening rest, every tie, and cadential suspension', () => {
	const phrase = generate(4);
	const validator = new FourthSpeciesValidator('student');
	expect(validator.validatePhrase(phrase)).toEqual([]);
	const voices = phraseToTimedVoices(phrase);
	const score = { cp: voices.upper, cf: voices.lower, cfPosition: 'lower' as const, species: 4 };
	const broken = structuredClone(score);
	broken.cp.find(e => e.tiedToNext)!.tiedToNext = false;
	expect(validator.validate(broken).map(v => v.rule)).toContain('syncopation');
	const opening = structuredClone(score);
	opening.cp[0].pitch = opening.cp[1].pitch;
	expect(validator.validate(opening).map(v => v.rule)).toContain('syncopation');
	const cadence = structuredClone(score);
	const index = cadence.cp.findIndex(e => e.start === cadence.cf.at(-2)!.start);
	cadence.cp[index].pitch = cadence.cp[index + 1].pitch;
	cadence.cp[index].spelling = cadence.cp[index + 1].spelling;
	cadence.cp[index - 1].pitch = cadence.cp[index].pitch;
	cadence.cp[index - 1].spelling = cadence.cp[index].spelling;
	expect(validator.validate(cadence).map(v => v.rule)).toContain('syncopation');
});

test('minor cadences retain the raised seventh letter, including E-sharp', () => {
	for (const key of ['C', 'D', 'F#', 'Gb', 'G']) for (let species = 1; species <= 5; species++) {
		const phrase = generate(species, key, 'minor');
		const cp = phrase.getUpperVoice();
		expect(cp.at(-1)!.getNote() - cp.at(-2)!.getNote()).toBe(1);
		expect(pitchInterval(cp.at(-2)!.getSpelling()!, cp.at(-1)!.getSpelling()!).diatonicSteps).toBe(1);
		if (key === 'F#') expect(cp.at(-2)!.getSpelling()).toMatchObject({ letter: 'e', accidental: 1 });
		cp.at(-2)!.setNote(cp.at(-2)!.getNote() - 1);
		const Validator = [FirstSpeciesValidator, SecondSpeciesValidator, ThirdSpeciesValidator, FourthSpeciesValidator, FifthSpeciesValidator][species - 1];
		expect(new Validator('student').validatePhrase(phrase).map(v => v.rule)).toContain('cadence');
	}
});

test('harmonic analysis sees a cantus change under a held counterpoint note', () => {
	const score = input("e'1 e'1", "c'2 d'2 c'1");
	const aligned = alignToCantusFirmus(score);
	expect(aligned.map(a => a.event.start)).toEqual([0, 0.5, 1]);
	expect(aligned[1].attack).toBe(false);
	expect(aligned[1].interval).toBe(2);
	expect(new FirstSpeciesValidator().validate(score).map(v => v.rule)).toContain('allConsonant');
});

test('the right event count cannot hide irregular subdivisions', () => {
	const score = input("g'2 e'2 b'2 a'2 c''1", "c'1 d'1 c'1", 2);
	expect(new SecondSpeciesValidator().validate(score).filter(v => v.rule === 'ratio')).toEqual([]);
	score.cp[0].duration = 0.75;
	score.cp[1].start = 0.75;
	score.cp[1].duration = 0.25;
	expect(new SecondSpeciesValidator().validate(score).map(v => v.rule)).toContain('ratio');
});

test('student policy distinguishes direct perfect approaches and melodic recovery', () => {
	expect(checkStudentRules(input("e'1 f'1", "c'1 d'1")).filter(v => v.rule === 'directPerfect')).toEqual([]);
	expect(checkStudentRules(input("e'1 a'1", "c'1 d'1")).map(v => v.rule)).toContain('directPerfect');
	expect(checkStudentRules(input("e'1 a'1 g'1", "c'1 c'1 c'1")).filter(v => v.rule === 'melodicRecovery')).toEqual([]);
	expect(checkStudentRules(input("e'1 a'1 b'1", "c'1 c'1 c'1")).map(v => v.rule)).toContain('melodicRecovery');
});

test('enharmonic intervals preserve diatonic distance', () => {
	const c = { letter: 'c' as const, accidental: 0, octave: 4 };
	expect(pitchInterval(c, { letter: 'd', accidental: 1, octave: 4 })).toEqual({ semitones: 3, diatonicSteps: 1 });
	expect(pitchInterval(c, { letter: 'e', accidental: -1, octave: 4 })).toEqual({ semitones: 3, diatonicSteps: 2 });
	const score = input("ees'1", "c'1");
	score.cp[0].spelling = { letter: 'e', accidental: -1, octave: 4 };
	score.cf[0].spelling = c;
	expect(checkStudentRules(score).filter(v => v.rule === 'spelling')).toEqual([]);
	score.cp[0].spelling = { letter: 'd', accidental: 1, octave: 4 };
	expect(checkStudentRules(score).map(v => v.rule)).toContain('spelling');
});

test('seeds do not change global randomness or another writer', () => {
	const original = Math.random;
	WritePhrase.setSeed(123);
	expect(Math.random).toBe(original);
	const a = new WritePhrase('C', 2, 1, '4/4');
	a.setSeed(7);
	a.writeThePhrase();
	const before = phraseToTimedVoices(a.getPhrase());
	generate(5, 'D', 'minor', 222);
	WritePhrase.setSeed(555);
	a.writeThePhrase();
	expect(phraseToTimedVoices(a.getPhrase())).toEqual(before);
	expect(Math.random).toBe(original);
});

test('independent validation rejects solver drift before publishing a phrase', () => {
	const original = FirstSpecies.prototype.generateCounterpoint;
	try {
		FirstSpecies.prototype.generateCounterpoint = cf => cf.map(n => new Note(n.getNote() + 1, 1));
		const writer = new WritePhrase('C', 2, 1, '4/4');
		writer.setSeed(9);
		expect(() => writer.writeThePhrase()).toThrow('failed validation');
		expect(writer.getPhrase().getUpperVoice()).toHaveLength(0);
	} finally { FirstSpecies.prototype.generateCounterpoint = original; }
});

test('search failure is explicit and respects a zero node budget', () => {
	expect(new SpeciesEngine([39,41,39], [39,41,43,44,46,48,50], { weakDissonance: 'none', nodeBudget: 0 }).solve(uniformSlots(3,1))).toBeNull();
});

test('stored events reject gaps, fractional ticks, mismatched spelling, and invalid ties', () => {
	const events = voiceToMusicalEvents([new Note(39), new Note(41)]);
	for (const mutate of [
		(e: typeof events) => { e[1].onsetTicks++; },
		(e: typeof events) => { e[0].durationTicks = 0.5; },
		(e: typeof events) => { e[0].spelling = { letter: 'd', accidental: 0, octave: 4 }; },
		(e: typeof events) => { e[0].tiedToNext = true; },
	]) {
		const invalid = structuredClone(events);
		mutate(invalid);
		expect(() => musicalEventsToVoice(invalid)).toThrow();
	}
});

test('export preserves rests, dotted spans, spelling, and ties across barlines', async () => {
	const note = new Note(42);
	note.setSpelling({ letter: 'd', accidental: 1, octave: 4 });
	note.setDurationTicks(TICKS_PER_WHOLE * 1.5);
	const voice = [Note.rest(TICKS_PER_WHOLE / 4), note];
	const snapshot = voiceToMusicalEvents(voice);
	const directory = await mkdtemp(join(tmpdir(), 'lilypoint-time-'));
	try {
		const exporter = new ExportToFile();
		await exporter.setFileName(join(directory, 'score'));
		exporter.addPhrase(new Phrase(voice, voice, getKey('Eb')));
		const output = await exporter.writeOutput();
		expect(output).toContain("r4 dis'2.~ dis'2.");
		const parsed = parseMusicBlock(output.match(/topPhraseOne = \{[^\n]*\n([\s\S]*?)\\bar/)![1]);
		expect(mergeTies(parsed).map(e => [e.pitch, e.start, e.duration])).toEqual([[null,0,0.25],[42,0.25,1.5]]);
		expect(voiceToMusicalEvents(voice)).toEqual(snapshot);
	} finally { await rm(directory, { recursive: true, force: true }); }
});

	test('student metric restrictions remain separate from historical dissonance policy', () => {
		const score = input("g'4 a'4 b'4 c''4 c''1", "c'1 c'1", 3);
		expect(new ThirdSpeciesValidator('historical').validate(score).filter(v => v.rule === 'metric')).toEqual([]);
		expect(new ThirdSpeciesValidator('student').validate(score).map(v => v.rule)).toContain('metric');
		score.cp[2].pitch = 48;
		expect(new ThirdSpeciesValidator('student').validate(score).filter(v => v.rule === 'metric')).toEqual([]);
	});

	test('fourth species detects weak-beat fifths independently of tied downbeats', () => {
		const score = input("r2 g'2~ g'2 a'2 b'1", "c'1 d'1 e'1", 4);
		expect(checkStudentRules(score).map(v => v.rule)).toContain('afterbeatPerfects');
		score.cp[3].pitch = 46;
		expect(checkStudentRules(score).filter(v => v.rule === 'afterbeatPerfects')).toEqual([]);
	});

	test('a suspension cannot resolve across a rest', () => {
		const score = input("g'2 c''2~ c''2 r4 b'4 c''1", "c'1 d'1 c'1", 5);
		expect(new FifthSpeciesValidator().validate(score).map(v => v.rule)).toContain('dissonanceTreatment');
	});
