/**
 * Negative tests for the species validators: deliberately broken counterpoint
 * must be flagged. (The positive direction — known-correct examples pass — is
 * covered by tests/e2e/known-examples.test.ts.)
 */

import { describe, test, expect } from 'bun:test';
import { parseMusicBlock } from '../helpers/ly-parser.js';
import {
	FirstSpeciesValidator,
	SecondSpeciesValidator,
	FourthSpeciesValidator,
} from '../../src/validation/species-validator.js';
import { SpeciesInput } from '../../src/validation/species-rules.js';

function input(species: number, cf: string, cp: string): SpeciesInput {
	return {
		cf: parseMusicBlock(cf),
		cp: parseMusicBlock(cp),
		cfPosition: 'lower',
		species,
	};
}

function rulesFlagged(violations: { rule: string }[]): string[] {
	return [...new Set(violations.map(v => v.rule))];
}

describe('FirstSpeciesValidator catches violations', () => {
	const v = new FirstSpeciesValidator();

	test('parallel fifths', () => {
		// c-g then d-a: consecutive perfect fifths
		const result = v.validate(input(1,
			"c'1 d'1 e'1 d'1 c'1",
			"g'1 a'1 g'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('noParallelPerfects');
	});

	test('parallel octaves', () => {
		const result = v.validate(input(1,
			"c'1 d'1 e'1 d'1 c'1",
			"c''1 d''1 g'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('noParallelPerfects');
	});

	test('dissonant vertical interval', () => {
		// f' against c' below... e'1 vs f'' = m9 -> dissonant? use d'' over e' (m7)
		const result = v.validate(input(1,
			"c'1 e'1 d'1 c'1",
			"g'1 d''1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('allConsonant');
	});

	// Mid-phrase crossing is calibrated-legal (Fux does it); what must still be
	// flagged is pervasive crossing or crossing at the ends.
	test('pervasive voice crossing', () => {
		const result = v.validate(input(1,
			"c''1 d''1 e''1 d''1 c''1",
			"g'1 a'1 g'1 f'1 c''1"));
		// counterpoint declared above the CF but sits below it almost throughout
		expect(rulesFlagged(result)).toContain('noVoiceCrossing');
	});

	test('crossed final note', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c''1",
			"g'1 a'1 c'1"));
		expect(rulesFlagged(result)).toContain('noVoiceCrossing');
	});

	test('begins on imperfect consonance', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c'1",
			"e'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('beginsPerfect');
	});

	test('ends on a fifth instead of unison/octave', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c'1",
			"c''1 a'1 g'1"));
		expect(rulesFlagged(result)).toContain('endsPerfect');
	});

	test('melodic leap larger than an octave', () => {
		const result = v.validate(input(1,
			"c'1 d'1 e'1 c'1",
			"g'1 b''1 g'1 c''1"));
		expect(rulesFlagged(result)).toContain('melodicLeaps');
	});

	test('dissonant melodic leap (tritone)', () => {
		const result = v.validate(input(1,
			"c'1 d'1 e'1 c'1",
			"g'1 cis''1 g'1 c''1"));
		expect(rulesFlagged(result)).toContain('melodicLeaps');
	});

	test('mid-phrase unison', () => {
		const result = v.validate(input(1,
			"c'1 d'1 e'1 d'1 c'1",
			"g'1 d'1 g'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('noMidPhraseUnison');
	});

	test('wrong ratio (2 notes against one CF note)', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c'1",
			"g'2 a'2 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('ratio');
	});

	test('voices further apart than the calibrated limit (20 semitones)', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c'1",
			"c'''1 b''1 c'''1"));
		expect(rulesFlagged(result)).toContain('spacing');
	});

	test('final note approached by leap', () => {
		const result = v.validate(input(1,
			"c'1 d'1 c'1",
			"g'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('finalApproachByStep');
	});
});

describe('SecondSpeciesValidator catches violations', () => {
	const v = new SecondSpeciesValidator();

	test('dissonance on the downbeat', () => {
		// downbeat d'' over c' CF... use f' over c' (P4 = dissonant in two voices)
		const result = v.validate(input(2,
			"c'1 d'1 c'1",
			"r2 g'2 g'2 a'2 c''1"));
		// g'2 over d'1 downbeat = P4 (5 semitones) -> dissonant strong beat
		expect(rulesFlagged(result)).toContain('dissonanceTreatment');
	});

	test('weak-beat dissonance left by leap (not passing)', () => {
		// b'2 over c' = M7 dissonant, then leaps to e''
		const result = v.validate(input(2,
			"c'1 d'1 c'1",
			"g'2 b'2 f'2 d''2 c''1"));
		expect(rulesFlagged(result)).toContain('dissonanceTreatment');
	});

	test('note-to-note parallel fifths across the barline', () => {
		// last note of measure 1 (a' over c' would be 6th)... use e''2 over c'
		// moving to f''? Simpler: weak-beat g' over c' (P5) -> downbeat a' over d' (P5)
		const result = v.validate(input(2,
			"c'1 d'1 c'1",
			"e'2 g'2 a'2 b'2 c''1"));
		expect(rulesFlagged(result)).toContain('noParallelPerfects');
	});

	// NOTE (calibration): perfect intervals on consecutive DOWNBEATS with an
	// intervening weak-beat note are NOT flagged — Fux writes them (Gradus
	// Figs. 36, 57, 77). Only note-to-note parallels are errors.

	test('wrong ratio (whole notes in counterpoint)', () => {
		const result = v.validate(input(2,
			"c'1 d'1 c'1",
			"g'1 f'1 c''1"));
		expect(rulesFlagged(result)).toContain('ratio');
	});
});

describe('FourthSpeciesValidator catches violations', () => {
	const v = new FourthSpeciesValidator();

	test('strong-beat dissonance not prepared by tie (not a suspension)', () => {
		// f' over c'? use d''2 struck fresh on downbeat over c'1: M9 dissonant, no tie
		const result = v.validate(input(4,
			"c'1 d'1 c'1",
			"r2 g'2 e'2 a'2 c''1"));
		// e'2 on downbeat of measure 2 over d'1 = M2 dissonant, not tied
		expect(rulesFlagged(result)).toContain('dissonanceTreatment');
	});

	test('suspension resolving upward is flagged', () => {
		// g'~ g' over a': g'-a' = M2 dissonance tied, but resolves UP to a'
		const result = v.validate(input(4,
			"c'1 a'1 c''1",
			"r2 g'2~ g'2 a'2 c''1"));
		expect(rulesFlagged(result)).toContain('dissonanceTreatment');
	});
});
