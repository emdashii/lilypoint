import { describe, test, expect } from 'bun:test';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('Note', () => {
	describe('constructor', () => {
		test('should create note with specified value and length', () => {
			const note = new Note(NoteType.Note_C4, 4);
			expect(note.getNote()).toBe(NoteType.Note_C4);
			expect(note.getLength()).toBe(4);
		});

		test('should use default length of 4 when not specified', () => {
			const note = new Note(NoteType.Note_D4);
			expect(note.getNote()).toBe(NoteType.Note_D4);
			expect(note.getLength()).toBe(4);
		});

		test('should handle different note values', () => {
			const notes = [
				NoteType.Note_A0,
				NoteType.Note_C4,
				NoteType.Note_A4,
				NoteType.Note_C8,
			];

			for (const noteValue of notes) {
				const note = new Note(noteValue, 2);
				expect(note.getNote()).toBe(noteValue);
				expect(note.getLength()).toBe(2);
			}
		});

		test('should handle different note lengths', () => {
			const lengths = [1, 2, 4, 8, 16];

			for (const length of lengths) {
				const note = new Note(NoteType.Note_C4, length);
				expect(note.getLength()).toBe(length);
			}
		});
	});

	describe('getNote', () => {
		test('should return the note value', () => {
			const note = new Note(NoteType.Note_E4, 4);
			expect(note.getNote()).toBe(NoteType.Note_E4);
			expect(note.getNote()).toBe(43);
		});

		test('should return sharp/flat note values correctly', () => {
			const sharpNote = new Note(NoteType.Note_C4_sharp, 4);
			expect(sharpNote.getNote()).toBe(NoteType.Note_C4_sharp);
			expect(sharpNote.getNote()).toBe(40);

			const flatNote = new Note(NoteType.Note_B4_flat, 4);
			expect(flatNote.getNote()).toBe(NoteType.Note_B4_flat);
			expect(flatNote.getNote()).toBe(49);
		});
	});

	describe('getLength', () => {
		test('should return the note length', () => {
			const note = new Note(NoteType.Note_G4, 8);
			expect(note.getLength()).toBe(8);
		});

		test('should return updated length after setLength', () => {
			const note = new Note(NoteType.Note_C4, 4);
			expect(note.getLength()).toBe(4);

			note.setLength(2);
			expect(note.getLength()).toBe(2);
		});
	});

	describe('setNote', () => {
		test('should update the note value', () => {
			const note = new Note(NoteType.Note_C4, 4);
			expect(note.getNote()).toBe(NoteType.Note_C4);

			note.setNote(NoteType.Note_D4);
			expect(note.getNote()).toBe(NoteType.Note_D4);
		});

		test('should allow setting to any valid NoteType', () => {
			const note = new Note(NoteType.Note_C4, 4);

			const newValues = [
				NoteType.Note_A0,
				NoteType.Note_F4_sharp,
				NoteType.Note_B4_flat,
				NoteType.Note_C8,
			];

			for (const newValue of newValues) {
				note.setNote(newValue);
				expect(note.getNote()).toBe(newValue);
			}
		});
	});

	describe('setLength', () => {
		test('should update the note length', () => {
			const note = new Note(NoteType.Note_C4, 4);
			expect(note.getLength()).toBe(4);

			note.setLength(8);
			expect(note.getLength()).toBe(8);
		});

		test('should allow setting various lengths', () => {
			const note = new Note(NoteType.Note_C4, 4);

			const newLengths = [1, 2, 4, 8, 16];

			for (const newLength of newLengths) {
				note.setLength(newLength);
				expect(note.getLength()).toBe(newLength);
			}
		});
	});

	describe('NoteType enum', () => {
		test('should have correct values for common notes', () => {
			expect(NoteType.Note_A0).toBe(0);
			expect(NoteType.Note_C4).toBe(39); // Middle C
			expect(NoteType.Note_A4).toBe(48); // A440
			expect(NoteType.Note_C8).toBe(87); // Highest note
		});

		test('should have correct values for chromatic notes', () => {
			// C4 = 39, C#4/Db4 should be 40
			expect(NoteType.Note_C4_sharp).toBe(40);
			expect(NoteType.Note_D4_flat).toBe(40);

			// F4 = 44, F#4/Gb4 should be 45
			expect(NoteType.Note_F4_sharp).toBe(45);
			expect(NoteType.Note_G4_flat).toBe(45);
		});

		test('should have semitone distances between notes', () => {
			// C to C# is 1 semitone
			expect(NoteType.Note_C4_sharp - NoteType.Note_C4).toBe(1);

			// C to D is 2 semitones
			expect(NoteType.Note_D4 - NoteType.Note_C4).toBe(2);

			// C to E is 4 semitones
			expect(NoteType.Note_E4 - NoteType.Note_C4).toBe(4);

			// C to G is 7 semitones (perfect 5th)
			expect(NoteType.Note_G4 - NoteType.Note_C4).toBe(7);

			// C4 to C5 is 12 semitones (octave)
			expect(NoteType.Note_C5 - NoteType.Note_C4).toBe(12);
		});
	});

	describe('Note immutability behavior', () => {
		test('should create independent note instances', () => {
			const note1 = new Note(NoteType.Note_C4, 4);
			const note2 = new Note(NoteType.Note_C4, 4);

			expect(note1.getNote()).toBe(note2.getNote());
			expect(note1.getLength()).toBe(note2.getLength());

			// Modifying one should not affect the other
			note1.setNote(NoteType.Note_D4);
			note1.setLength(8);

			expect(note1.getNote()).toBe(NoteType.Note_D4);
			expect(note2.getNote()).toBe(NoteType.Note_C4);
			expect(note1.getLength()).toBe(8);
			expect(note2.getLength()).toBe(4);
		});
	});
});
