import { Note } from '../../src/note.js';
import { Phrase } from '../../src/phrase.js';
import { NoteType } from '../../src/types-and-globals.js';

/**
 * Calculate the interval between two notes in semitones
 */
export function calculateInterval(note1: NoteType, note2: NoteType): number {
	return Math.abs(note1 - note2);
}

/**
 * Calculate the interval modulo 12 (within one octave)
 */
export function calculateIntervalMod12(note1: NoteType, note2: NoteType): number {
	return Math.abs(note1 - note2) % 12;
}

/**
 * Check if an interval is consonant
 * Consonant intervals (mod 12): unison(0), minor 3rd(3), major 3rd(4), perfect 5th(7), minor 6th(8), major 6th(9)
 */
export function isConsonant(note1: NoteType, note2: NoteType): boolean {
	const interval = calculateIntervalMod12(note1, note2);
	return [0, 3, 4, 7, 8, 9].includes(interval);
}

/**
 * Check if an interval is a perfect consonance (unison, fifth, or octave)
 */
export function isPerfectConsonance(note1: NoteType, note2: NoteType): boolean {
	const interval = calculateIntervalMod12(note1, note2);
	return interval === 0 || interval === 7;
}

/**
 * Check if an interval is dissonant
 */
export function isDissonant(note1: NoteType, note2: NoteType): boolean {
	return !isConsonant(note1, note2);
}

/**
 * Get the melodic motion between consecutive notes
 * Returns: 'ascending', 'descending', or 'static'
 */
export function getMelodicMotion(note1: NoteType, note2: NoteType): 'ascending' | 'descending' | 'static' {
	if (note2 > note1) return 'ascending';
	if (note2 < note1) return 'descending';
	return 'static';
}

/**
 * Get the type of two-voice motion
 * Returns: 'contrary', 'similar', 'oblique', or 'parallel'
 */
export function getMotionType(
	upperNote1: NoteType,
	upperNote2: NoteType,
	lowerNote1: NoteType,
	lowerNote2: NoteType
): 'contrary' | 'similar' | 'oblique' | 'parallel' {
	const upperMotion = getMelodicMotion(upperNote1, upperNote2);
	const lowerMotion = getMelodicMotion(lowerNote1, lowerNote2);

	// Oblique: one voice stays, the other moves
	if (upperMotion === 'static' && lowerMotion !== 'static') return 'oblique';
	if (lowerMotion === 'static' && upperMotion !== 'static') return 'oblique';

	// Contrary: voices move in opposite directions
	if (
		(upperMotion === 'ascending' && lowerMotion === 'descending') ||
		(upperMotion === 'descending' && lowerMotion === 'ascending')
	) {
		return 'contrary';
	}

	// Parallel: voices move in same direction by same interval
	const interval1 = calculateIntervalMod12(upperNote1, lowerNote1);
	const interval2 = calculateIntervalMod12(upperNote2, lowerNote2);

	if (upperMotion === lowerMotion && interval1 === interval2) {
		return 'parallel';
	}

	// Similar: voices move in same direction but by different intervals
	return 'similar';
}

/**
 * Check if motion is stepwise (1 or 2 semitones)
 */
export function isStepwiseMotion(note1: NoteType, note2: NoteType): boolean {
	const interval = calculateInterval(note1, note2);
	return interval >= 0 && interval <= 2;
}

/**
 * Check if motion is a leap (more than 2 semitones)
 */
export function isLeap(note1: NoteType, note2: NoteType): boolean {
	return calculateInterval(note1, note2) > 2;
}

/**
 * Get the interval name (for debugging/display purposes)
 */
export function getIntervalName(semitones: number): string {
	const mod = semitones % 12;
	const octaves = Math.floor(semitones / 12);
	const names: { [key: number]: string } = {
		0: 'unison',
		1: 'minor 2nd',
		2: 'major 2nd',
		3: 'minor 3rd',
		4: 'major 3rd',
		5: 'perfect 4th',
		6: 'tritone',
		7: 'perfect 5th',
		8: 'minor 6th',
		9: 'major 6th',
		10: 'minor 7th',
		11: 'major 7th',
	};

	const baseName = names[mod] || 'unknown';
	return octaves > 0 ? `${baseName} + ${octaves} octave(s)` : baseName;
}

/**
 * Create a simple test phrase with upper and lower voices
 */
export function createTestPhrase(
	upperNotes: NoteType[],
	lowerNotes: NoteType[],
	noteLength: number = 4
): Phrase {
	const phrase = new Phrase();

	for (const noteValue of upperNotes) {
		phrase.addNoteToUpperVoice(new Note(noteValue, noteLength));
	}

	for (const noteValue of lowerNotes) {
		phrase.addNoteToLowerVoice(new Note(noteValue, noteLength));
	}

	return phrase;
}

/**
 * Extract note values from a Note array
 */
export function extractNoteValues(notes: Note[]): NoteType[] {
	return notes.map(n => n.getNote());
}

/**
 * Check if all notes in a voice are diatonic to a given scale
 */
export function areNotesDiatonic(notes: NoteType[], scaleDegrees: number[]): boolean {
	for (const note of notes) {
		const noteInScale = scaleDegrees.some(degree => note % 12 === degree % 12);
		if (!noteInScale) {
			return false;
		}
	}
	return true;
}

/**
 * Get C major scale degrees (starting from C4 = 39)
 */
export function getCMajorScale(): number[] {
	const tonic = NoteType.Note_C4; // 39
	return [
		tonic,         // C
		tonic + 2,     // D
		tonic + 4,     // E
		tonic + 5,     // F
		tonic + 7,     // G
		tonic + 9,     // A
		tonic + 11,    // B
	];
}

/**
 * Get D minor scale degrees (natural minor, starting from D4 = 41)
 */
export function getDMinorScale(): number[] {
	const tonic = NoteType.Note_D4; // 41
	return [
		tonic,         // D
		tonic + 2,     // E
		tonic + 3,     // F
		tonic + 5,     // G
		tonic + 7,     // A
		tonic + 8,     // Bb
		tonic + 10,    // C
	];
}
