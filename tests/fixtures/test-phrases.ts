import { Note } from '../../src/note.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';
import { KeyInfo } from '../../src/key.js';

/**
 * Pre-made test phrases for use in tests
 * These are known-good phrases that follow counterpoint rules
 */

/**
 * Simple 4-note First Species phrase in C major
 */
export const simpleFirstSpeciesC: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice (Cantus Firmus)
	const lower = [
		NoteType.Note_C4,  // C
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_C4,  // C
	];

	// Upper voice (Counterpoint)
	const upper = [
		NoteType.Note_C5,  // C (octave, perfect consonance)
		NoteType.Note_F4,  // F (minor 3rd above D)
		NoteType.Note_G4,  // G (minor 3rd above E)
		NoteType.Note_C5,  // C (octave, perfect consonance)
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();

/**
 * Longer 8-note First Species phrase in C major
 */
export const longerFirstSpeciesC: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice (Cantus Firmus)
	const lower = [
		NoteType.Note_C4,  // C
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_F4,  // F
		NoteType.Note_G4,  // G
		NoteType.Note_F4,  // F
		NoteType.Note_E4,  // E
		NoteType.Note_C4,  // C
	];

	// Upper voice (Counterpoint) - variety of consonant intervals
	const upper = [
		NoteType.Note_C5,  // C (octave)
		NoteType.Note_F4,  // F (minor 3rd above D)
		NoteType.Note_C5,  // C (minor 6th above E)
		NoteType.Note_A4,  // A (major 3rd above F)
		NoteType.Note_D5,  // D (perfect 5th above G)
		NoteType.Note_A4,  // A (major 3rd above F)
		NoteType.Note_G4,  // G (minor 3rd above E)
		NoteType.Note_C5,  // C (octave)
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();

/**
 * First Species phrase in D minor
 */
export const firstSpeciesDMinor: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice (Cantus Firmus) - D natural minor
	const lower = [
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_F4,  // F
		NoteType.Note_D4,  // D
	];

	// Upper voice (Counterpoint)
	const upper = [
		NoteType.Note_D5,  // D (octave)
		NoteType.Note_G4,  // G (minor 3rd above E)
		NoteType.Note_A4,  // A (major 3rd above F)
		NoteType.Note_D5,  // D (octave)
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'd', type: 'es', mode: 'minor', notes: ['bes'] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('minor');

	return phrase;
})();

/**
 * Invalid phrase with parallel fifths (for negative testing)
 */
export const invalidParallelFifths: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice
	const lower = [
		NoteType.Note_C4,  // C
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_F4,  // F
	];

	// Upper voice - creates parallel fifths
	const upper = [
		NoteType.Note_G4,  // G (P5 above C)
		NoteType.Note_A4,  // A (P5 above D) <- PARALLEL!
		NoteType.Note_B4,  // B (P5 above E) <- PARALLEL!
		NoteType.Note_C5,  // C (P5 above F) <- PARALLEL!
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();

/**
 * Invalid phrase with parallel octaves (for negative testing)
 */
export const invalidParallelOctaves: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice
	const lower = [
		NoteType.Note_C4,  // C
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_C4,  // C
	];

	// Upper voice - creates parallel octaves
	const upper = [
		NoteType.Note_C5,  // C (octave above)
		NoteType.Note_D5,  // D (octave above) <- PARALLEL OCTAVE!
		NoteType.Note_E5,  // E (octave above) <- PARALLEL OCTAVE!
		NoteType.Note_C5,  // C (octave above) <- PARALLEL OCTAVE!
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();

/**
 * Invalid phrase with voice crossing (for negative testing)
 */
export const invalidVoiceCrossing: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice
	const lower = [
		NoteType.Note_C4,  // C4
		NoteType.Note_D4,  // D4
		NoteType.Note_E4,  // E4
		NoteType.Note_C4,  // C4
	];

	// Upper voice - crosses below lower voice
	const upper = [
		NoteType.Note_C5,  // C5 (above)
		NoteType.Note_C4,  // C4 (same as lower - voice crossing!)
		NoteType.Note_B3,  // B3 (below lower voice!)
		NoteType.Note_C5,  // C5 (above again)
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();

/**
 * Invalid phrase with dissonant intervals (for negative testing)
 */
export const invalidDissonantIntervals: Phrase = (() => {
	const phrase = new Phrase();

	// Lower voice
	const lower = [
		NoteType.Note_C4,  // C
		NoteType.Note_D4,  // D
		NoteType.Note_E4,  // E
		NoteType.Note_C4,  // C
	];

	// Upper voice - creates dissonant intervals
	const upper = [
		NoteType.Note_C5,  // C (consonant - octave)
		NoteType.Note_E4,  // E (dissonant - major 2nd above D!)
		NoteType.Note_F4,  // F (dissonant - minor 2nd above E!)
		NoteType.Note_C5,  // C (consonant - octave)
	];

	for (const note of lower) {
		phrase.addNoteToLowerVoice(new Note(note, 4));
	}

	for (const note of upper) {
		phrase.addNoteToUpperVoice(new Note(note, 4));
	}

	const keyInfo: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	return phrase;
})();
