/**
 * End-to-End tests for First Species Counterpoint with Rule Validation
 *
 * These tests generate complete first species counterpoint and validate
 * that ALL counterpoint rules are followed.
 * Uses property-based testing (multiple attempts with 80% threshold)
 * to account for non-deterministic generation.
 */

import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../../src/write-phrase.js';
import { FirstSpeciesValidator } from '../validators/first-species-validator.js';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { FirstSpecies } from '../../src/first-species.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';

/**
 * Helper: generate a first species phrase for a given key, length, and mode.
 */
function generateFirstSpeciesPhrase(key: string, length: number, mode: string, scaleDegrees: NoteType[]): Phrase {
	const cf = new CantusFirmus(key, length, mode);
	const cantusFirmusNotes = cf.generate();

	const firstSpecies = new FirstSpecies();
	firstSpecies.setScaleDegrees(scaleDegrees);
	const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

	const phrase = new Phrase();
	phrase.setKey(cf.getKeyInfo());
	phrase.setTimeSignature('4/4');
	phrase.setMode(mode);

	for (const note of counterpointNotes) {
		phrase.addNoteToUpperVoice(note);
	}
	for (const note of cantusFirmusNotes) {
		phrase.addNoteToLowerVoice(note);
	}

	return phrase;
}

/**
 * Property-based test helper: run multiple attempts and check pass rate.
 */
function propertyBasedValidation(
	key: string,
	length: number,
	mode: string,
	scaleDegrees: NoteType[],
	attempts: number = 10,
	threshold: number = 0.8
): { successCount: number; attempts: number } {
	const validator = new FirstSpeciesValidator();
	let successCount = 0;

	for (let i = 0; i < attempts; i++) {
		const phrase = generateFirstSpeciesPhrase(key, length, mode, scaleDegrees);
		if (validator.isValid(phrase)) {
			successCount++;
		}
	}

	return { successCount, attempts };
}

describe('First Species E2E - Rule Validation', () => {
	const cMajorScale = [
		NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
		NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
		NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5,
		NoteType.Note_E5
	];

	describe('Generated First Species Counterpoint (Property-Based)', () => {
		test('should generate valid C major first species counterpoint', () => {
			const { successCount, attempts } = propertyBasedValidation(
				'C', 8, 'major', cMajorScale, 20
			);
			console.log(`C major: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});

		test('should generate valid G major first species counterpoint', () => {
			const scaleDegrees = [
				NoteType.Note_G3, NoteType.Note_A3, NoteType.Note_B3,
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4_sharp, NoteType.Note_G4, NoteType.Note_A4
			];
			const { successCount, attempts } = propertyBasedValidation(
				'G', 6, 'major', scaleDegrees
			);
			console.log(`G major: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});

		test('should generate valid F major first species counterpoint', () => {
			const scaleDegrees = [
				NoteType.Note_F3, NoteType.Note_G3, NoteType.Note_A3,
				NoteType.Note_B3_flat, NoteType.Note_C4, NoteType.Note_D4,
				NoteType.Note_E4, NoteType.Note_F4, NoteType.Note_G4
			];
			const { successCount, attempts } = propertyBasedValidation(
				'F', 6, 'major', scaleDegrees
			);
			console.log(`F major: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});

		test('should generate valid first species for different lengths', () => {
			const lengths = [4, 6, 8, 10];

			for (const length of lengths) {
				const { successCount, attempts } = propertyBasedValidation(
					'C', length, 'major', cMajorScale, 20
				);
				console.log(`C major length ${length}: ${successCount}/${attempts} passed`);
				expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
			}
		});

		test('should handle A minor first species counterpoint', () => {
			const scaleDegrees = [
				NoteType.Note_A3, NoteType.Note_B3, NoteType.Note_C4,
				NoteType.Note_D4, NoteType.Note_E4, NoteType.Note_F4,
				NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4
			];
			const { successCount, attempts } = propertyBasedValidation(
				'A', 6, 'minor', scaleDegrees
			);
			console.log(`A minor: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});
	});

	describe('Multiple Generations (Property-Based)', () => {
		test('should generate valid counterpoint across multiple attempts', () => {
			const { successCount, attempts } = propertyBasedValidation(
				'C', 6, 'major', cMajorScale, 20
			);
			console.log(`${successCount}/${attempts} attempts passed all validation rules`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});
	});

	describe('Individual Rule Validation', () => {
		test('generated counterpoint should have 1:1 ratio', () => {
			const cf = new CantusFirmus('C', 8, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			firstSpecies.setScaleDegrees(cMajorScale);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			expect(counterpointNotes.length).toBe(cantusFirmusNotes.length);
		});

		test('generated counterpoint should begin on perfect consonance', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			firstSpecies.setScaleDegrees(cMajorScale);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());

			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			const validator = new FirstSpeciesValidator();
			const results = validator.validateAllRules(phrase);

			expect(results.beginsOnPerfectConsonance).toBe(true);
		});

		test('generated counterpoint should end on perfect consonance', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			firstSpecies.setScaleDegrees(cMajorScale);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());

			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			const validator = new FirstSpeciesValidator();
			const results = validator.validateAllRules(phrase);

			expect(results.endsOnPerfectConsonance).toBe(true);
		});
	});
});
