/**
 * End-to-End tests for First Species Counterpoint with Rule Validation
 *
 * These tests generate complete first species counterpoint and validate
 * that ALL counterpoint rules are followed.
 */

import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../../src/write-phrase.js';
import { FirstSpeciesValidator } from '../validators/first-species-validator.js';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { FirstSpecies } from '../../src/first-species.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('First Species E2E - Rule Validation', () => {
	describe('Generated First Species Counterpoint', () => {
		test('should generate valid C major first species counterpoint', () => {
			// Generate cantus firmus
			const cf = new CantusFirmus('C', 8, 'major');
			const cantusFirmusNotes = cf.generate();

			// Generate counterpoint
			const firstSpecies = new FirstSpecies();
			const scaleDegrees = [
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
				NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5,
				NoteType.Note_E5
			];
			firstSpecies.setScaleDegrees(scaleDegrees);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			// Create phrase
			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			phrase.setTimeSignature('4/4');
			phrase.setMode('major');

			// Add notes to phrase (counterpoint as upper voice, cantus firmus as lower)
			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			// Validate with FirstSpeciesValidator
			const validator = new FirstSpeciesValidator();
			const results = validator.validateAllRules(phrase);

			// Log results for debugging
			console.log('\nFirst Species Validation Results (C major):');
			console.log(validator.getSummary(phrase));

			// Check each rule
			expect(results.oneToOneRatio).toBe(true);
			expect(results.allConsonant).toBe(true);
			expect(results.noParallelFifths).toBe(true);
			expect(results.noParallelOctaves).toBe(true);
			expect(results.noHiddenParallels).toBe(true);
			expect(results.noVoiceCrossing).toBe(true);
			expect(results.limitToTenth).toBe(true);
			expect(results.noLargeLeaps).toBe(true);
			expect(results.noUnisonExceptEnds).toBe(true);
			expect(results.beginsOnPerfectConsonance).toBe(true);
			expect(results.endsOnPerfectConsonance).toBe(true);
			expect(results.limitConsecutiveIntervals).toBe(true);

			// Overall validity check
			expect(validator.isValid(phrase)).toBe(true);
		});

		test('should generate valid G major first species counterpoint', () => {
			const cf = new CantusFirmus('G', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			const scaleDegrees = [
				NoteType.Note_G3, NoteType.Note_A3, NoteType.Note_B3,
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4_sharp, NoteType.Note_G4, NoteType.Note_A4
			];
			firstSpecies.setScaleDegrees(scaleDegrees);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			phrase.setTimeSignature('4/4');
			phrase.setMode('major');

			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			const validator = new FirstSpeciesValidator();
			const results = validator.validateAllRules(phrase);

			console.log('\nFirst Species Validation Results (G major):');
			console.log(validator.getSummary(phrase));

			// All rules should pass
			expect(validator.isValid(phrase)).toBe(true);
		});

		test('should generate valid F major first species counterpoint', () => {
			const cf = new CantusFirmus('F', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			const scaleDegrees = [
				NoteType.Note_F3, NoteType.Note_G3, NoteType.Note_A3,
				NoteType.Note_B3_flat, NoteType.Note_C4, NoteType.Note_D4,
				NoteType.Note_E4, NoteType.Note_F4, NoteType.Note_G4
			];
			firstSpecies.setScaleDegrees(scaleDegrees);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			phrase.setTimeSignature('4/4');
			phrase.setMode('major');

			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			const validator = new FirstSpeciesValidator();
			console.log('\nFirst Species Validation Results (F major):');
			console.log(validator.getSummary(phrase));

			expect(validator.isValid(phrase)).toBe(true);
		});

		test('should generate valid first species for different lengths', () => {
			const lengths = [4, 6, 8, 10];

			for (const length of lengths) {
				const cf = new CantusFirmus('C', length, 'major');
				const cantusFirmusNotes = cf.generate();

				const firstSpecies = new FirstSpecies();
				const scaleDegrees = [
					NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
					NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
					NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
				];
				firstSpecies.setScaleDegrees(scaleDegrees);

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
				console.log(`\nFirst Species Validation (length ${length}):`);
				console.log(validator.getSummary(phrase));

				expect(validator.isValid(phrase)).toBe(true);
			}
		});

		test('should handle A minor first species counterpoint', () => {
			const cf = new CantusFirmus('A', 6, 'minor');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			const scaleDegrees = [
				NoteType.Note_A3, NoteType.Note_B3, NoteType.Note_C4,
				NoteType.Note_D4, NoteType.Note_E4, NoteType.Note_F4,
				NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4
			];
			firstSpecies.setScaleDegrees(scaleDegrees);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			phrase.setTimeSignature('4/4');
			phrase.setMode('minor');

			for (const note of counterpointNotes) {
				phrase.addNoteToUpperVoice(note);
			}
			for (const note of cantusFirmusNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			const validator = new FirstSpeciesValidator();
			console.log('\nFirst Species Validation Results (A minor):');
			console.log(validator.getSummary(phrase));

			expect(validator.isValid(phrase)).toBe(true);
		});
	});

	describe('Multiple Generations (Property-Based)', () => {
		test('should generate valid counterpoint across multiple attempts', () => {
			let successCount = 0;
			const attempts = 10;

			for (let i = 0; i < attempts; i++) {
				const cf = new CantusFirmus('C', 6, 'major');
				const cantusFirmusNotes = cf.generate();

				const firstSpecies = new FirstSpecies();
				const scaleDegrees = [
					NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
					NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
					NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
				];
				firstSpecies.setScaleDegrees(scaleDegrees);

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
				if (validator.isValid(phrase)) {
					successCount++;
				} else {
					console.log(`\nAttempt ${i + 1} failed validation:`);
					console.log(validator.getSummary(phrase));
				}
			}

			console.log(`\n${successCount}/${attempts} attempts passed all validation rules`);

			// At least 80% should pass (allows for some randomization issues)
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});
	});

	describe('Individual Rule Validation', () => {
		test('generated counterpoint should have 1:1 ratio', () => {
			const cf = new CantusFirmus('C', 8, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			firstSpecies.setScaleDegrees([
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
				NoteType.Note_B4, NoteType.Note_C5
			]);

			const counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);

			expect(counterpointNotes.length).toBe(cantusFirmusNotes.length);
		});

		test('generated counterpoint should begin on perfect consonance', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const firstSpecies = new FirstSpecies();
			firstSpecies.setScaleDegrees([
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
				NoteType.Note_B4, NoteType.Note_C5
			]);

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
			firstSpecies.setScaleDegrees([
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
				NoteType.Note_B4, NoteType.Note_C5
			]);

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
