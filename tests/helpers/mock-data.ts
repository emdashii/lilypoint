import { Note } from '../../src/note.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';
import { KeyInfo } from '../../src/key.js';

/**
 * Generate a simple cantus firmus for testing
 * Returns an array of Note objects
 */
export function generateMockCantusFirmus(length: number = 4): Note[] {
	// Simple C major cantus firmus pattern
	const pattern = [
		NoteType.Note_C4,  // 39
		NoteType.Note_D4,  // 41
		NoteType.Note_E4,  // 43
		NoteType.Note_F4,  // 44
		NoteType.Note_E4,  // 43
		NoteType.Note_D4,  // 41
		NoteType.Note_C4,  // 39
	];

	const notes: Note[] = [];
	for (let i = 0; i < length; i++) {
		notes.push(new Note(pattern[i % pattern.length], 4));
	}

	return notes;
}

/**
 * Generate a simple counterpoint line for testing
 */
export function generateMockCounterpoint(length: number = 4): Note[] {
	// Simple counterpoint in C major (mostly thirds and sixths above)
	const pattern = [
		NoteType.Note_E4,  // 43 (third above C)
		NoteType.Note_F4,  // 44 (third above D)
		NoteType.Note_G4,  // 46 (third above E)
		NoteType.Note_A4,  // 48 (third above F)
		NoteType.Note_G4,  // 46 (third above E)
		NoteType.Note_F4,  // 44 (third above D)
		NoteType.Note_E4,  // 43 (third above C)
	];

	const notes: Note[] = [];
	for (let i = 0; i < length; i++) {
		notes.push(new Note(pattern[i % pattern.length], 4));
	}

	return notes;
}

/**
 * Create a mock phrase with valid first species counterpoint
 */
export function createMockFirstSpeciesPhrase(): Phrase {
	const phrase = new Phrase();

	// Cantus firmus (lower voice) - simple C major melody
	const cantusFirmus = [
		NoteType.Note_C4,  // 39
		NoteType.Note_D4,  // 41
		NoteType.Note_E4,  // 43
		NoteType.Note_D4,  // 41
		NoteType.Note_C4,  // 39
	];

	// Counterpoint (upper voice) - consonant intervals only
	const counterpoint = [
		NoteType.Note_C5,  // 51 (octave above - perfect consonance)
		NoteType.Note_B4,  // 50 (minor 7th -> actually 9 semitones = major 6th, consonant)
		NoteType.Note_C5,  // 51 (minor 6th above E)
		NoteType.Note_F4,  // 44 (perfect 5th above D)
		NoteType.Note_E4,  // 43 (major 3rd above C -> actually same octave, so unison)
	];

	// Let me fix this - ensure proper consonant intervals
	const correctCounterpoint = [
		NoteType.Note_C5,  // 51 (octave above C4=39, interval = 12, mod 12 = 0, unison/octave)
		NoteType.Note_F4,  // 44 (above D4=41, interval = 3, minor 3rd, consonant)
		NoteType.Note_G4,  // 46 (above E4=43, interval = 3, minor 3rd, consonant)
		NoteType.Note_F4,  // 44 (above D4=41, interval = 3, minor 3rd, consonant)
		NoteType.Note_C5,  // 51 (above C4=39, interval = 12, octave, perfect consonance)
	];

	for (const note of cantusFirmus) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of correctCounterpoint) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	phrase.setKey({ key: 'c', type: 'natural', mode: 'major', notes: [] });
	phrase.setTimeSignature('4/4');

	return phrase;
}

/**
 * Create a mock phrase that VIOLATES first species rules (for negative testing)
 */
export function createInvalidFirstSpeciesPhrase(): Phrase {
	const phrase = new Phrase();

	// Cantus firmus
	const cantusFirmus = [
		NoteType.Note_C4,  // 39
		NoteType.Note_D4,  // 41
		NoteType.Note_E4,  // 43
		NoteType.Note_D4,  // 41
	];

	// Invalid counterpoint with parallel fifths
	const counterpoint = [
		NoteType.Note_G4,  // 46 (perfect 5th above C4=39, interval=7)
		NoteType.Note_A4,  // 48 (perfect 5th above D4=41, interval=7) <- PARALLEL FIFTH!
		NoteType.Note_B4,  // 50 (major 7th above E4=43, interval=7) <- PARALLEL FIFTH!
		NoteType.Note_A4,  // 48 (perfect 5th above D4=41, interval=7) <- PARALLEL FIFTH!
	];

	for (const note of cantusFirmus) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of counterpoint) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	phrase.setKey({ key: 'c', type: 'natural', mode: 'major', notes: [] });
	phrase.setTimeSignature('4/4');

	return phrase;
}

/**
 * Create a mock KeyInfo object for testing
 */
export function createMockKeyInfo(
	key: string = 'c',
	mode: 'major' | 'minor' = 'major'
): KeyInfo {
	return {
		key,
		type: 'natural',
		mode,
		notes: []
	};
}

/**
 * Generate scale degrees for testing
 */
export function generateMockScaleDegrees(tonic: NoteType = NoteType.Note_C4, mode: 'major' | 'minor' = 'major'): number[] {
	const scalePattern = mode === 'major'
		? [0, 2, 4, 5, 7, 9, 11]  // Major scale intervals
		: [0, 2, 3, 5, 7, 8, 10]; // Natural minor scale intervals

	return scalePattern.map(interval => tonic + interval);
}

/**
 * Create an array of Note objects from NoteType values
 */
export function createNotesFromValues(values: NoteType[], length: number = 4): Note[] {
	return values.map(v => new Note(v, length));
}

/**
 * Generate a random valid cantus firmus
 * (Uses basic counterpoint rules: stepwise motion, ends on tonic)
 */
export function generateRandomCantusFirmus(length: number, tonic: NoteType, scaleDegrees: number[]): Note[] {
	const notes: Note[] = [];

	// Start on tonic
	notes.push(new Note(tonic, 4));

	// Middle notes - stepwise motion within scale
	for (let i = 1; i < length - 1; i++) {
		const previousNote = notes[i - 1].getNote();

		// Find scale degrees near the previous note
		const nearbyDegrees = scaleDegrees.filter(degree =>
			Math.abs(degree - previousNote) <= 4 && degree !== previousNote
		);

		if (nearbyDegrees.length > 0) {
			const randomIndex = Math.floor(Math.random() * nearbyDegrees.length);
			notes.push(new Note(nearbyDegrees[randomIndex] as NoteType, 4));
		} else {
			// Fallback: move by step
			notes.push(new Note(previousNote + 2 as NoteType, 4));
		}
	}

	// End on tonic
	notes.push(new Note(tonic, 4));

	return notes;
}
