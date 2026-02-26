/**
 * End-to-End tests for Fourth Species Counterpoint with Rule Validation
 * Uses property-based testing (multiple attempts with 80% threshold)
 */

import { describe, test, expect } from 'bun:test';
import { FourthSpeciesValidator } from '../validators/fourth-species-validator.js';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { FourthSpecies } from '../../src/fourth-species.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';

function generateFourthSpeciesPhrase(key: string, length: number, mode: string, scaleDegrees: NoteType[]): Phrase {
	const cf = new CantusFirmus(key, length, mode);
	const cantusFirmusNotes = cf.generate();

	const species = new FourthSpecies();
	species.setScaleDegrees(scaleDegrees);
	const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);

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

function propertyBasedValidation(
	key: string, length: number, mode: string, scaleDegrees: NoteType[],
	attempts: number = 10, threshold: number = 0.8
): { successCount: number; attempts: number } {
	const validator = new FourthSpeciesValidator();
	let successCount = 0;

	for (let i = 0; i < attempts; i++) {
		const phrase = generateFourthSpeciesPhrase(key, length, mode, scaleDegrees);
		if (validator.isValid(phrase)) {
			successCount++;
		}
	}

	return { successCount, attempts };
}

describe('Fourth Species E2E - Rule Validation', () => {
	const cMajorScale = [
		NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
		NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
		NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
	];

	describe('Generated Fourth Species Counterpoint', () => {
		test('should generate valid C major fourth species counterpoint', () => {
			const { successCount, attempts } = propertyBasedValidation(
				'C', 6, 'major', cMajorScale
			);
			console.log(`Fourth Species C major: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});

		test('should generate valid G major fourth species counterpoint', () => {
			const scaleDegrees = [
				NoteType.Note_G3, NoteType.Note_A3, NoteType.Note_B3,
				NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
				NoteType.Note_F4_sharp, NoteType.Note_G4, NoteType.Note_A4
			];
			const { successCount, attempts } = propertyBasedValidation(
				'G', 6, 'major', scaleDegrees
			);
			console.log(`Fourth Species G major: ${successCount}/${attempts} passed`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});
	});

	describe('Individual Rule Validation', () => {
		test('generated counterpoint should produce half notes', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const species = new FourthSpecies();
			species.setScaleDegrees(cMajorScale);

			const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);

			for (const note of counterpointNotes) {
				expect(note.getLength()).toBe(2);
			}
		});

		test('generated counterpoint should begin on perfect consonance', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const species = new FourthSpecies();
			species.setScaleDegrees(cMajorScale);
			const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			for (const note of counterpointNotes) phrase.addNoteToUpperVoice(note);
			for (const note of cantusFirmusNotes) phrase.addNoteToLowerVoice(note);

			const validator = new FourthSpeciesValidator();
			const results = validator.validateAllRules(phrase);
			expect(results.beginsOnPerfectConsonance).toBe(true);
		});

		test('generated counterpoint should end on perfect consonance', () => {
			const cf = new CantusFirmus('C', 6, 'major');
			const cantusFirmusNotes = cf.generate();

			const species = new FourthSpecies();
			species.setScaleDegrees(cMajorScale);
			const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);

			const phrase = new Phrase();
			phrase.setKey(cf.getKeyInfo());
			for (const note of counterpointNotes) phrase.addNoteToUpperVoice(note);
			for (const note of cantusFirmusNotes) phrase.addNoteToLowerVoice(note);

			const validator = new FourthSpeciesValidator();
			const results = validator.validateAllRules(phrase);
			expect(results.endsOnPerfectConsonance).toBe(true);
		});
	});

	describe('Multiple Generations (Property-Based)', () => {
		test('should generate valid counterpoint across multiple attempts', () => {
			const { successCount, attempts } = propertyBasedValidation(
				'C', 6, 'major', cMajorScale, 20
			);
			console.log(`Fourth Species: ${successCount}/${attempts} attempts passed all rules`);
			expect(successCount).toBeGreaterThanOrEqual(attempts * 0.8);
		});
	});
});
