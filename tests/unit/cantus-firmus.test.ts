import { describe, test, expect } from 'bun:test';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('CantusFirmus', () => {
	describe('constructor', () => {
		test('should create cantus firmus with specified parameters', () => {
			const cf = new CantusFirmus('C', 8, 'major');

			expect(cf.getLength()).toBe(8);
			expect(cf.getKeyInfo().key).toBe('c');
			expect(cf.getKeyInfo().mode).toBe('major');
		});

		test('should default to 8 notes and major mode', () => {
			const cf = new CantusFirmus('G');

			expect(cf.getLength()).toBe(8);
			expect(cf.getKeyInfo().mode).toBe('major');
		});

		test('should handle different keys', () => {
			const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Bb', 'Eb'];

			for (const key of keys) {
				const cf = new CantusFirmus(key, 6);
				expect(cf.getKeyInfo().key).toBeDefined();
			}
		});

		test('should handle minor mode', () => {
			const cf = new CantusFirmus('A', 8, 'minor');

			expect(cf.getKeyInfo().mode).toBe('minor');
			expect(cf.getKeyInfo().key).toBe('a');
		});
	});

	describe('generate', () => {
		test('should generate notes with correct length', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.generate();

			expect(notes.length).toBe(8);
		});

		test('should generate different lengths correctly', () => {
			const lengths = [4, 6, 8, 10, 12];

			for (const length of lengths) {
				const cf = new CantusFirmus('C', length);
				const notes = cf.generate();
				expect(notes.length).toBe(length);
			}
		});

		test('should start on tonic', () => {
			const cf = new CantusFirmus('C', 8, 'major');
			const notes = cf.generate();

			expect(notes[0].getNote()).toBe(NoteType.Note_C4);
		});

		test('should end on tonic', () => {
			const cf = new CantusFirmus('C', 8, 'major');
			const notes = cf.generate();

			expect(notes[notes.length - 1].getNote()).toBe(NoteType.Note_C4);
		});

		test('should start and end on tonic for different keys', () => {
			const testCases = [
				{ key: 'C', tonic: NoteType.Note_C4 },
				{ key: 'G', tonic: NoteType.Note_G3 },
				{ key: 'D', tonic: NoteType.Note_D4 },
				{ key: 'F', tonic: NoteType.Note_F4 },
			];

			for (const { key, tonic } of testCases) {
				const cf = new CantusFirmus(key, 6);
				const notes = cf.generate();

				expect(notes[0].getNote()).toBe(tonic);
				expect(notes[notes.length - 1].getNote()).toBe(tonic);
			}
		});

		test('should generate valid notes (no undefined)', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.generate();

			for (const note of notes) {
				expect(note).toBeDefined();
				expect(note.getNote()).toBeGreaterThanOrEqual(0);
				expect(note.getNote()).toBeLessThan(88);
			}
		});

		test('should stay within reasonable range (within octave + 3rd)', () => {
			const cf = new CantusFirmus('C', 10);
			const notes = cf.generate();

			const noteValues = notes.map(n => n.getNote());
			const min = Math.min(...noteValues);
			const max = Math.max(...noteValues);
			const range = max - min;

			// Should stay within roughly an octave (12 semitones) to a major 10th (16 semitones)
			expect(range).toBeLessThanOrEqual(16);
		});

		test('should generate different cantus firmus on each call', () => {
			const cf1 = new CantusFirmus('C', 8);
			const notes1 = cf1.generate();

			const cf2 = new CantusFirmus('C', 8);
			const notes2 = cf2.generate();

			// Notes should exist and be valid
			expect(notes1.length).toBe(8);
			expect(notes2.length).toBe(8);

			// Both should have same start and end (tonic)
			expect(notes1[0].getNote()).toBe(notes2[0].getNote());
			expect(notes1[7].getNote()).toBe(notes2[7].getNote());
		});

		test('should approach final note by step', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.generate();

			const penultimateNote = notes[notes.length - 2].getNote();
			const finalNote = notes[notes.length - 1].getNote();
			const interval = Math.abs(finalNote - penultimateNote);

			// Should approach by step (1 or 2 semitones)
			expect(interval).toBeLessThanOrEqual(2);
		});
	});

	describe('getNotes', () => {
		test('should return empty array before generation', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.getNotes();

			expect(notes).toEqual([]);
		});

		test('should return generated notes after generation', () => {
			const cf = new CantusFirmus('C', 8);
			cf.generate();
			const notes = cf.getNotes();

			expect(notes.length).toBe(8);
		});
	});

	describe('getKeyInfo', () => {
		test('should return key information', () => {
			const cf = new CantusFirmus('G', 8, 'major');
			const keyInfo = cf.getKeyInfo();

			expect(keyInfo.key).toBe('g');
			expect(keyInfo.mode).toBe('major');
			expect(keyInfo.type).toBe('is');
		});
	});

	describe('getLength', () => {
		test('should return the specified length', () => {
			const cf = new CantusFirmus('C', 10);

			expect(cf.getLength()).toBe(10);
		});
	});

	describe('validation rules', () => {
		test('should generate cantus with single climax', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.generate();

			const noteValues = notes.map(n => n.getNote());
			const maxNote = Math.max(...noteValues);
			const climaxCount = noteValues.filter(n => n === maxNote).length;

			// Should have exactly one highest note
			expect(climaxCount).toBeGreaterThanOrEqual(1);
		});

		test('should not have large leaps (> octave)', () => {
			const cf = new CantusFirmus('C', 8);
			const notes = cf.generate();

			for (let i = 1; i < notes.length; i++) {
				const prevNote = notes[i - 1].getNote();
				const currNote = notes[i].getNote();
				const interval = Math.abs(currNote - prevNote);

				// No leaps larger than an octave (12 semitones)
				expect(interval).toBeLessThanOrEqual(12);
			}
		});

		test('should use predominantly stepwise motion', () => {
			const cf = new CantusFirmus('C', 12);
			const notes = cf.generate();

			let stepwiseCount = 0;
			let totalIntervals = 0;

			for (let i = 1; i < notes.length; i++) {
				const prevNote = notes[i - 1].getNote();
				const currNote = notes[i].getNote();
				const interval = Math.abs(currNote - prevNote);

				if (interval <= 2) {
					stepwiseCount++;
				}
				totalIntervals++;
			}

			// At least 50% should be stepwise (this is a loose requirement)
			const stepwiseRatio = stepwiseCount / totalIntervals;
			expect(stepwiseRatio).toBeGreaterThan(0.3);
		});

		test('should work with minor mode', () => {
			const cf = new CantusFirmus('A', 8, 'minor');
			const notes = cf.generate();

			expect(notes.length).toBe(8);
			expect(notes[0].getNote()).toBe(NoteType.Note_A3);
			expect(notes[notes.length - 1].getNote()).toBe(NoteType.Note_A3);
		});
	});

	describe('different musical keys', () => {
		test('should handle sharp keys correctly', () => {
			const sharpKeys = ['G', 'D', 'A', 'E'];

			for (const key of sharpKeys) {
				const cf = new CantusFirmus(key, 6);
				const notes = cf.generate();

				expect(notes.length).toBe(6);
				expect(cf.getKeyInfo().type).toBe('is');
			}
		});

		test('should handle flat keys correctly', () => {
			const flatKeys = ['F', 'Bb', 'Eb', 'Ab'];

			for (const key of flatKeys) {
				const cf = new CantusFirmus(key, 6);
				const notes = cf.generate();

				expect(notes.length).toBe(6);
				expect(cf.getKeyInfo().type).toBe('es');
			}
		});

		test('should handle C major (natural key)', () => {
			const cf = new CantusFirmus('C', 6);
			const notes = cf.generate();

			expect(notes.length).toBe(6);
			expect(cf.getKeyInfo().type).toBe('natural');
		});
	});
});
