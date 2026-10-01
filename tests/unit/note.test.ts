import { describe, test, expect } from 'bun:test';
import { NoteType } from '../../src/types-and-globals.js';
import { Note } from '../../src/note.js';
import { voiceToMusicalEvents } from '../../src/validation/timed-events.js';

test('default notes occupy one quarter each in stored events', () => {
	const events = voiceToMusicalEvents([new Note(39), new Note(41)]);
	expect(events.map(e => [e.pitch, e.onsetTicks, e.durationTicks, e.tiedToNext])).toEqual([
		[39, 0, 1024, false], [41, 1024, 1024, false],
	]);
});

test('editing one note leaves another note and an earlier stored snapshot unchanged', () => {
	const edited = new Note(39);
	const untouched = new Note(39);
	const snapshot = voiceToMusicalEvents([edited, untouched]);
	edited.setNote(41);
	edited.setLength(2);
	edited.setTied(true);
	expect(voiceToMusicalEvents([edited, untouched]).map(e => [e.pitch, e.onsetTicks, e.durationTicks, e.tiedToNext])).toEqual([
		[41, 0, 2048, true], [39, 2048, 1024, false],
	]);
	expect(snapshot.map(e => [e.pitch, e.onsetTicks, e.durationTicks, e.tiedToNext])).toEqual([
		[39, 0, 1024, false], [39, 1024, 1024, false],
	]);
});

describe('Piano pitch numbering', () => {
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

});
