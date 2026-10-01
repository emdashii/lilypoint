import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WritePhrase } from '../../src/write-phrase.js';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { Note } from '../../src/note.js';
import { Phrase } from '../../src/phrase.js';
import { getKey } from '../../src/key.js';
import { ExportToFile } from '../../src/export-to-file.js';
import { phraseToTimedVoices } from '../../src/validation/timed-events.js';
import { FirstSpeciesValidator, SecondSpeciesValidator, ThirdSpeciesValidator, FourthSpeciesValidator, FifthSpeciesValidator } from '../../src/validation/species-validator.js';
import { alignToCantusFirmus, classifyDissonance, mergeTies } from '../../src/validation/species-rules.js';
import { parseMusicBlock } from '../helpers/ly-parser.js';

const originalRandom = Math.random;
const keys = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
afterEach(() => { Math.random = originalRandom; });

describe('audit regressions', () => {
	test('all 88 pitches survive LilyPond spelling in every supported key and mode', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'lilypoint-pitches-'));
		try {
			for (const key of keys) for (const mode of ['major', 'minor']) {
				const pitches = Array.from({ length: 88 }, (_, pitch) => pitch);
				const exporter = new ExportToFile();
				await exporter.setFileName(join(directory, `${key}-${mode}`));
				exporter.addPhrase(new Phrase(pitches.map(p => new Note(p)), [], getKey(key, mode)));
				const output = await exporter.writeOutput();
				const block = output.match(/topPhraseOne = \{[^\n]*\n([\s\S]*?)\\bar/)![1];
				expect(parseMusicBlock(block).map(e => e.pitch)).toEqual(pitches);
			}
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	test.each(keys)('every species validates in %s major and minor for two seeds', key => {
		const validators = [new FirstSpeciesValidator(), new SecondSpeciesValidator(), new ThirdSpeciesValidator(), new FourthSpeciesValidator(), new FifthSpeciesValidator()];
		for (const mode of ['major', 'minor']) for (let species = 1; species <= 5; species++) for (const seed of [1, 42]) {
			WritePhrase.setSeed(seed);
			const writer = new WritePhrase(key, 2, species, '4/4');
			writer.setMode(mode);
			writer.writeThePhrase();
			expect(validators[species - 1].validatePhrase(writer.getPhrase())).toEqual([]);
		}
	});

	test('minor signatures match their relative majors', () => {
		for (const [minor, major] of [['C', 'Eb'], ['G', 'Bb'], ['F', 'Ab'], ['Bb', 'Db'], ['Eb', 'Gb']]) {
			expect(getKey(minor, 'minor').notes).toEqual(getKey(major).notes);
		}
		expect(getKey('Ab', 'minor').notes).toEqual(['bes', 'ees', 'aes', 'des', 'ges', 'ces', 'fes']);
		expect(getKey('Db', 'minor').notes[0]).toBe('beses');
		expect(getKey('Gb', 'minor').notes.slice(0, 2)).toEqual(['beses', 'eeses']);
	});


	test('export preserves mode, diatonic spelling, and sounding octave', async () => {
		const directory = await mkdtemp(join(tmpdir(), 'lilypoint-audit-'));
		try {
			const exporter = new ExportToFile();
			await exporter.setFileName(join(directory, 'score'));
			for (const [key, mode, pitch] of [
				['C', 'minor', 42], ['F#', 'major', 44], ['Gb', 'major', 38],
				['Db', 'minor', 48], ['Gb', 'minor', 41],
			] as const) {
				exporter.addPhrase(new Phrase([new Note(pitch)], [new Note(pitch)], getKey(key, mode)));
			}
			const output = await exporter.writeOutput();
			expect(output).toContain('\\key c \\minor');
			for (const token of ["ees'4", "eis'4", "ces'4", "beses'4", "eeses'4"]) expect(output).toContain(token);
		} finally {
			await rm(directory, { recursive: true, force: true });
		}
	});

	test('regenerating replaces the phrase without changing the previous result', () => {
		const writer = new WritePhrase('C', 2, 3, '4/4');
		WritePhrase.setSeed(7);
		writer.writeThePhrase();
		const previous = writer.getPhrase();
		const snapshot = JSON.stringify(phraseToTimedVoices(previous));
		WritePhrase.setSeed(7);
		writer.writeThePhrase();
		expect(JSON.stringify(phraseToTimedVoices(writer.getPhrase()))).toBe(snapshot);
		expect(JSON.stringify(phraseToTimedVoices(previous))).toBe(snapshot);
	});

	test('rejects invalid pitches, durations, meters, and phrase lengths', () => {
		for (const pitch of [-1, 88, 1.5, NaN, Infinity]) expect(() => new Note(pitch)).toThrow();
		for (const duration of [0, -2, 3, NaN, Infinity]) expect(() => new Note(39, duration)).toThrow();
		for (const meter of ['0/4', '4/0', '4/3', 'x/4', '4/4junk']) expect(() => new WritePhrase('C', 2, 1, meter)).toThrow();
		for (const length of [0, -1, 1.5, NaN, Infinity]) expect(() => new WritePhrase('C', length).writeThePhrase()).toThrow();
	});

	test('validator rejects a truncated or extended counterpoint', () => {
		const writer = new WritePhrase('C', 2, 1, '4/4');
		WritePhrase.setSeed(9);
		writer.writeThePhrase();
		const phrase = writer.getPhrase();
		const last = phrase.getUpperVoice().at(-1)!;
		last.setLength(8);
		expect(new FirstSpeciesValidator().validatePhrase(phrase).map(v => v.rule)).toContain('structure');
		last.setLength(2);
		expect(new FirstSpeciesValidator().validatePhrase(phrase).map(v => v.rule)).toContain('structure');
	});

	test('a tie cannot connect different pitches or cross a gap', () => {
		const cp = parseMusicBlock("g'2 a'2~ b'2 a'2 g'1");
		const input = { cp, cf: parseMusicBlock("c'1 d'1 c'1"), cfPosition: 'lower' as const, species: 4 };
		expect(new FourthSpeciesValidator().validate(input).map(v => v.rule)).toContain('structure');
		expect(alignToCantusFirmus(input)[2].tiedFromPrevious).toBe(false);
		const gap = parseMusicBlock("c'2~ c'2");
		gap[1].start += 0.5;
		expect(mergeTies(gap)).toHaveLength(2);
	});

	test('suspensions require consonant preparation and resolution', () => {
		const classify = (cp: string, cf: string) => classifyDissonance(alignToCantusFirmus({
			cp: parseMusicBlock(cp), cf: parseMusicBlock(cf), cfPosition: 'lower', species: 4,
		}), 2);
		expect(classify("g'2 c''2~ c''2 b'2", "c'1 d'1")).toBe('suspension');
		expect(classify("g'2 c''2~ c''2 b'2", "b'1 d'1")).not.toBe('suspension');
		expect(classify("g'2 b'2~ b'2 bes'2", "g'1 c'1")).not.toBe('suspension');
	});

	test('generated cantus cadences satisfy the melodic checks after finalization', () => {
		for (const length of [3, 4, 8, 16, 32, 64]) {
			for (const seed of [1, 7, 42]) {
				WritePhrase.setSeed(seed);
				const pitches = new CantusFirmus('C', length).generate().map(n => n.getNote());
				expect(pitches).toHaveLength(length);
				expect(pitches[0]).toBe(39);
				expect(pitches.at(-1)).toBe(39);
				expect(pitches.at(-2)).toBe(41);
				expect(pitches.filter(p => p === Math.max(...pitches))).toHaveLength(1);
				for (let i = 1; i < pitches.length; i++) {
					const leap = Math.abs(pitches[i] - pitches[i - 1]);
					expect(leap).toBeLessThanOrEqual(12);
					expect([6, 10, 11]).not.toContain(leap);
				}
			}
		}
	});
});
