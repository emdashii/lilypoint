/**
 * Ground-truth tests: every known-correct example in tests/fixtures/examples/
 * must pass its species validator with zero violations.
 *
 * These fixtures are transcriptions of published, verified species counterpoint
 * (see each file's % source metadata). If a validator flags one of them, the
 * validator is wrong ("examples win") — unless the transcription itself is
 * shown to differ from its source.
 */

import { describe, test, expect } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseExample, ParsedExample } from '../helpers/ly-parser.js';
import {
	FirstSpeciesValidator,
	SecondSpeciesValidator,
	ThirdSpeciesValidator,
	FourthSpeciesValidator,
	FifthSpeciesValidator,
	SpeciesValidator,
} from '../../src/validation/species-validator.js';

const EXAMPLES_DIR = join(import.meta.dir, '../fixtures/examples');

const VALIDATORS: Record<number, () => SpeciesValidator> = {
	1: () => new FirstSpeciesValidator(),
	2: () => new SecondSpeciesValidator(),
	3: () => new ThirdSpeciesValidator(),
	4: () => new FourthSpeciesValidator(),
	5: () => new FifthSpeciesValidator(),
};

const examples: { file: string; parsed: ParsedExample }[] = readdirSync(EXAMPLES_DIR)
	.filter(f => f.endsWith('.ly'))
	.map(file => ({
		file,
		parsed: parseExample(readFileSync(join(EXAMPLES_DIR, file), 'utf-8')),
	}));

test('example collection is present', () => {
	expect(examples.length).toBeGreaterThan(0);
});

for (let species = 1; species <= 5; species++) {
	const ofSpecies = examples.filter(e => e.parsed.metadata.species === species);

	describe(`species ${species} known-correct examples`, () => {
		for (const { file, parsed } of ofSpecies) {
			test(file, () => {
				const validator = VALIDATORS[species]();
				const violations = validator.validateExample(parsed);
				if (violations.length > 0) {
					const report = violations.map(v => `[${v.rule}] at ${v.at}: ${v.detail}`).join('\n');
					throw new Error(`${file} (${parsed.metadata.source}) flagged:\n${report}`);
				}
				expect(violations).toEqual([]);
			});
		}
	});
}
