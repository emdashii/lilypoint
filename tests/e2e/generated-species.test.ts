/**
 * End-to-end tests for generated counterpoint: every phrase the generator
 * produces must pass the same calibrated validators that the known-correct
 * examples (tests/e2e/known-examples.test.ts) pass.
 *
 * No pass-rate thresholds: generation is seeded and every seed must produce
 * valid counterpoint. If a seed fails, the generator is wrong.
 */

import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../../src/write-phrase.js';
import {
	FirstSpeciesValidator,
	SecondSpeciesValidator,
	ThirdSpeciesValidator,
	FourthSpeciesValidator,
	FifthSpeciesValidator,
	SpeciesValidator,
} from '../../src/validation/species-validator.js';

const VALIDATORS: Record<number, () => SpeciesValidator> = {
	1: () => new FirstSpeciesValidator(),
	2: () => new SecondSpeciesValidator(),
	3: () => new ThirdSpeciesValidator(),
	4: () => new FourthSpeciesValidator(),
	5: () => new FifthSpeciesValidator(),
};

const SPECIES_NAMES: Record<number, string> = {
	1: 'first (1:1)',
	2: 'second (2:1)',
	3: 'third (4:1)',
	4: 'fourth (syncopated)',
	5: 'fifth (florid)',
};

const SEEDS = [1, 2, 3, 42, 12345, 99999, 314159, 271828];
const KEYS = ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'];

function generate(species: number, seed: number, key: string, mode: string, measures: number) {
	WritePhrase.setSeed(seed);
	const writePhrase = new WritePhrase(key, measures, species, '4/4');
	writePhrase.setMode(mode);
	writePhrase.writeThePhrase();
	return writePhrase.getPhrase();
}

for (let species = 1; species <= 5; species++) {
	describe(`generated ${SPECIES_NAMES[species]} species counterpoint`, () => {
		test.each(SEEDS)('C major, 4 measures, seed %i', seed => {
			const phrase = generate(species, seed, 'C', 'major', 4);
			const validator = VALIDATORS[species]();
			const violations = validator.validatePhrase(phrase);
			if (violations.length > 0) {
				throw new Error(validator.getSummary(phrase));
			}
			expect(violations).toEqual([]);
		});

		test.each(KEYS)('key %s major, seed 7', key => {
			const phrase = generate(species, 7, key, 'major', 4);
			const validator = VALIDATORS[species]();
			const violations = validator.validatePhrase(phrase);
			if (violations.length > 0) {
				throw new Error(validator.getSummary(phrase));
			}
			expect(violations).toEqual([]);
		});

		test.each(['A', 'D', 'E'])('key %s minor, seed 11', key => {
			const phrase = generate(species, 11, key, 'minor', 4);
			const validator = VALIDATORS[species]();
			const violations = validator.validatePhrase(phrase);
			if (violations.length > 0) {
				throw new Error(validator.getSummary(phrase));
			}
			expect(violations).toEqual([]);
		});

		test.each([2, 6, 8])('%i measures, C major, seed 13', measures => {
			const phrase = generate(species, 13, 'C', 'major', measures);
			const validator = VALIDATORS[species]();
			const violations = validator.validatePhrase(phrase);
			if (violations.length > 0) {
				throw new Error(validator.getSummary(phrase));
			}
			expect(violations).toEqual([]);
		});
	});
}
