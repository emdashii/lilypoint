/**
 * Integration tests for ThirdSpecies counterpoint generation
 */

import { describe, test, expect } from 'bun:test';
import { ThirdSpecies } from '../../src/third-species.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('ThirdSpecies Integration', () => {
	const cMajorScale = [
		NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
		NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4
	];

	describe('generateCounterpoint', () => {
		test('should generate correct number of notes (4:1 ratio)', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new ThirdSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			expect(result.length).toBe(cantusFirmus.length * 4); // 4:1 ratio
		});

		test('should generate counterpoint for different lengths', () => {
			const lengths = [4, 6, 8];

			for (const length of lengths) {
				const cantusFirmus = Array.from({ length }, () =>
					new Note(NoteType.Note_C4, 4)
				);

				const species = new ThirdSpecies();
				species.setScaleDegrees(cMajorScale);

				const result = species.generateCounterpoint(cantusFirmus);
				expect(result.length).toBe(length * 4);
			}
		});

		test('should return Note objects', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new ThirdSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			for (const note of result) {
				expect(note).toBeInstanceOf(Note);
				expect(note.getNote()).toBeGreaterThanOrEqual(0);
				expect(note.getNote()).toBeLessThan(88);
			}
		});

		test('should work with different keys', () => {
			const keys = [
				{
					cf: [NoteType.Note_G3, NoteType.Note_A3, NoteType.Note_B3, NoteType.Note_G3],
					scale: [NoteType.Note_G3, NoteType.Note_A3, NoteType.Note_B3, NoteType.Note_C4,
					        NoteType.Note_D4, NoteType.Note_E4, NoteType.Note_F4_sharp]
				},
				{
					cf: [NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_F4],
					scale: [NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4_flat,
					        NoteType.Note_C5, NoteType.Note_D5, NoteType.Note_E5]
				},
			];

			for (const { cf, scale } of keys) {
				const cantusFirmus = cf.map(n => new Note(n, 4));
				const species = new ThirdSpecies();
				species.setScaleDegrees(scale);

				const result = species.generateCounterpoint(cantusFirmus);
				expect(result.length).toBe(cantusFirmus.length * 4);
			}
		});

		test('should generate notes with length 4 (quarter notes)', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new ThirdSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			for (const note of result) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('should handle short cantus firmus (3 notes)', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new ThirdSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);
			expect(result.length).toBe(12);
		});
	});
});
