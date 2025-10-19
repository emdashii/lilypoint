import { describe, test, expect } from 'bun:test';
import { Phrase } from '../../src/phrase.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';
import { KeyInfo } from '../../src/key.js';

describe('Phrase', () => {
	describe('constructor', () => {
		test('should create empty phrase with default values', () => {
			const phrase = new Phrase();

			expect(phrase.getUpperVoice()).toEqual([]);
			expect(phrase.getLowerVoice()).toEqual([]);
			expect(phrase.getTimeSig()).toBe('4/4');
			expect(phrase.getMode()).toBe('major');
		});

		test('should create phrase with provided voices and metadata', () => {
			const upperVoice = [new Note(NoteType.Note_C5, 4), new Note(NoteType.Note_D5, 4)];
			const lowerVoice = [new Note(NoteType.Note_C4, 4), new Note(NoteType.Note_D4, 4)];
			const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
			const timeSignature = '3/4';

			const phrase = new Phrase(upperVoice, lowerVoice, keyInfo, timeSignature);

			expect(phrase.getUpperVoice()).toEqual(upperVoice);
			expect(phrase.getLowerVoice()).toEqual(lowerVoice);
			expect(phrase.getKey()).toEqual(keyInfo);
			expect(phrase.getTimeSig()).toBe(timeSignature);
		});
	});

	describe('addNoteToUpperVoice', () => {
		test('should add a note to upper voice', () => {
			const phrase = new Phrase();
			const note = new Note(NoteType.Note_C5, 4);

			phrase.addNoteToUpperVoice(note);

			expect(phrase.getUpperVoice()).toHaveLength(1);
			expect(phrase.getUpperVoice()[0]).toBe(note);
		});

		test('should add multiple notes in order', () => {
			const phrase = new Phrase();
			const notes = [
				new Note(NoteType.Note_C5, 4),
				new Note(NoteType.Note_D5, 4),
				new Note(NoteType.Note_E5, 4),
			];

			for (const note of notes) {
				phrase.addNoteToUpperVoice(note);
			}

			expect(phrase.getUpperVoice()).toHaveLength(3);
			expect(phrase.getUpperVoice()).toEqual(notes);
		});
	});

	describe('addNoteToLowerVoice', () => {
		test('should add a note to lower voice', () => {
			const phrase = new Phrase();
			const note = new Note(NoteType.Note_C4, 4);

			phrase.addNoteToLowerVoice(note);

			expect(phrase.getLowerVoice()).toHaveLength(1);
			expect(phrase.getLowerVoice()[0]).toBe(note);
		});

		test('should add multiple notes in order', () => {
			const phrase = new Phrase();
			const notes = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
			];

			for (const note of notes) {
				phrase.addNoteToLowerVoice(note);
			}

			expect(phrase.getLowerVoice()).toHaveLength(3);
			expect(phrase.getLowerVoice()).toEqual(notes);
		});
	});

	describe('setKey', () => {
		test('should update the key information', () => {
			const phrase = new Phrase();
			const newKey: KeyInfo = { key: 'g', type: 'is', mode: 'major', notes: ['fis'] };

			phrase.setKey(newKey);

			expect(phrase.getKey()).toEqual(newKey);
		});

		test('should handle different keys', () => {
			const phrase = new Phrase();
			const keys: KeyInfo[] = [
				{ key: 'c', type: 'natural', mode: 'major', notes: [] },
				{ key: 'd', type: 'is', mode: 'major', notes: ['fis', 'cis'] },
				{ key: 'bes', type: 'es', mode: 'major', notes: ['bes', 'ees'] },
			];

			for (const key of keys) {
				phrase.setKey(key);
				expect(phrase.getKey()).toEqual(key);
			}
		});
	});

	describe('setTimeSignature', () => {
		test('should update the time signature', () => {
			const phrase = new Phrase();

			phrase.setTimeSignature('3/4');
			expect(phrase.getTimeSig()).toBe('3/4');
		});

		test('should handle different time signatures', () => {
			const phrase = new Phrase();
			const timeSigs = ['2/4', '3/4', '4/4', '6/8', '12/8'];

			for (const timeSig of timeSigs) {
				phrase.setTimeSignature(timeSig);
				expect(phrase.getTimeSig()).toBe(timeSig);
			}
		});
	});

	describe('setMode', () => {
		test('should update the mode', () => {
			const phrase = new Phrase();

			phrase.setMode('minor');
			expect(phrase.getMode()).toBe('minor');
		});

		test('should handle major and minor modes', () => {
			const phrase = new Phrase();

			phrase.setMode('major');
			expect(phrase.getMode()).toBe('major');

			phrase.setMode('minor');
			expect(phrase.getMode()).toBe('minor');
		});
	});

	describe('getUpperVoice', () => {
		test('should return empty array for new phrase', () => {
			const phrase = new Phrase();
			expect(phrase.getUpperVoice()).toEqual([]);
		});

		test('should return array of added notes', () => {
			const phrase = new Phrase();
			const notes = [
				new Note(NoteType.Note_C5, 4),
				new Note(NoteType.Note_D5, 4),
			];

			for (const note of notes) {
				phrase.addNoteToUpperVoice(note);
			}

			expect(phrase.getUpperVoice()).toEqual(notes);
		});
	});

	describe('getLowerVoice', () => {
		test('should return empty array for new phrase', () => {
			const phrase = new Phrase();
			expect(phrase.getLowerVoice()).toEqual([]);
		});

		test('should return array of added notes', () => {
			const phrase = new Phrase();
			const notes = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
			];

			for (const note of notes) {
				phrase.addNoteToLowerVoice(note);
			}

			expect(phrase.getLowerVoice()).toEqual(notes);
		});
	});

	describe('getTimeSig', () => {
		test('should return default time signature', () => {
			const phrase = new Phrase();
			expect(phrase.getTimeSig()).toBe('4/4');
		});

		test('should return set time signature', () => {
			const phrase = new Phrase();
			phrase.setTimeSignature('3/4');
			expect(phrase.getTimeSig()).toBe('3/4');
		});
	});

	describe('getKey', () => {
		test('should return default key', () => {
			const phrase = new Phrase();
			const defaultKey = phrase.getKey();

			expect(defaultKey.key).toBe('c');
			expect(defaultKey.mode).toBe('major');
		});

		test('should return set key', () => {
			const phrase = new Phrase();
			const newKey: KeyInfo = { key: 'g', type: 'is', mode: 'major', notes: ['fis'] };

			phrase.setKey(newKey);
			expect(phrase.getKey()).toEqual(newKey);
		});
	});

	describe('getKeyString', () => {
		test('should return key as string', () => {
			const phrase = new Phrase();
			expect(phrase.getKeyString()).toBe('c');
		});

		test('should return updated key string', () => {
			const phrase = new Phrase();
			const newKey: KeyInfo = { key: 'g', type: 'is', mode: 'major', notes: ['fis'] };

			phrase.setKey(newKey);
			expect(phrase.getKeyString()).toBe('g');
		});
	});

	describe('getMode', () => {
		test('should return default mode', () => {
			const phrase = new Phrase();
			expect(phrase.getMode()).toBe('major');
		});

		test('should return set mode', () => {
			const phrase = new Phrase();
			phrase.setMode('minor');
			expect(phrase.getMode()).toBe('minor');
		});
	});

	describe('two-voice phrase', () => {
		test('should handle both voices independently', () => {
			const phrase = new Phrase();

			const upperNotes = [
				new Note(NoteType.Note_C5, 4),
				new Note(NoteType.Note_D5, 4),
			];

			const lowerNotes = [
				new Note(NoteType.Note_C4, 4),
				new Note(NoteType.Note_D4, 4),
				new Note(NoteType.Note_E4, 4),
			];

			for (const note of upperNotes) {
				phrase.addNoteToUpperVoice(note);
			}

			for (const note of lowerNotes) {
				phrase.addNoteToLowerVoice(note);
			}

			expect(phrase.getUpperVoice()).toHaveLength(2);
			expect(phrase.getLowerVoice()).toHaveLength(3);
			expect(phrase.getUpperVoice()).toEqual(upperNotes);
			expect(phrase.getLowerVoice()).toEqual(lowerNotes);
		});
	});
});
