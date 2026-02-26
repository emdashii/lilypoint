/**
 * Integration tests for FifthSpecies counterpoint generation
 */

import { describe, test, expect } from 'bun:test';
import { FifthSpecies } from '../../src/fifth-species.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('FifthSpecies Integration', () => {
	const cMajorScale = [
		NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
		NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4
	];

	describe('generateCounterpoint', () => {
		test('should generate counterpoint notes', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new FifthSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			expect(result.length).toBeGreaterThan(0);
		});

		test('should generate counterpoint for different lengths', () => {
			const lengths = [4, 6, 8];

			for (const length of lengths) {
				const cantusFirmus = Array.from({ length }, () =>
					new Note(NoteType.Note_C4, 4)
				);

				const species = new FifthSpecies();
				species.setScaleDegrees(cMajorScale);

				const result = species.generateCounterpoint(cantusFirmus);
				expect(result.length).toBeGreaterThan(0);
			}
		});

		test('should return Note objects', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new FifthSpecies();
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
				const species = new FifthSpecies();
				species.setScaleDegrees(scale);

				const result = species.generateCounterpoint(cantusFirmus);
				expect(result.length).toBeGreaterThan(0);
			}
		});

		test('should generate mixed note lengths (florid counterpoint)', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
				new Note(NoteType.Note_F4, 4),
				new Note(NoteType.Note_E4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new FifthSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			// Should have at least 2 different note lengths
			const lengths = new Set(result.map(n => n.getLength()));
			expect(lengths.size).toBeGreaterThanOrEqual(2);
		});

		test('should use valid note durations', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new FifthSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);

			// All note lengths should be valid: 1 (whole), 2 (half), 4 (quarter), 8 (eighth)
			for (const note of result) {
				expect([1, 2, 4, 8]).toContain(note.getLength());
			}
		});

		test('should handle short cantus firmus (3 notes)', () => {
			const cantusFirmus = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_C4, 4),
			];

			const species = new FifthSpecies();
			species.setScaleDegrees(cMajorScale);

			const result = species.generateCounterpoint(cantusFirmus);
			expect(result.length).toBeGreaterThan(0);
		});
	});
});
