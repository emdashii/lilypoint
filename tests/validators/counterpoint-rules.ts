import { Phrase } from '../../src/phrase.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';

/**
 * Result of validating a rule - returns boolean indicating pass/fail
 */
export interface RuleValidationResult {
	[ruleName: string]: boolean;
}

/**
 * Base interface for all counterpoint validators
 */
export interface CounterpointValidator {
	validateAllRules(phrase: Phrase): RuleValidationResult;
}

/**
 * Common helper functions for counterpoint validation
 */
export class CounterpointRules {
	/**
	 * Calculate interval between two notes in semitones
	 */
	static calculateInterval(note1: NoteType, note2: NoteType): number {
		return Math.abs(note1 - note2);
	}

	/**
	 * Calculate interval modulo 12 (within one octave)
	 */
	static calculateIntervalMod12(note1: NoteType, note2: NoteType): number {
		return Math.abs(note1 - note2) % 12;
	}

	/**
	 * Check if an interval is consonant
	 * Consonant intervals (mod 12): unison(0), minor 3rd(3), major 3rd(4), perfect 5th(7), minor 6th(8), major 6th(9)
	 */
	static isConsonant(note1: NoteType, note2: NoteType): boolean {
		const interval = this.calculateIntervalMod12(note1, note2);
		return [0, 3, 4, 7, 8, 9].includes(interval);
	}

	/**
	 * Check if an interval is a perfect consonance (unison, fifth, or octave)
	 */
	static isPerfectConsonance(note1: NoteType, note2: NoteType): boolean {
		const interval = this.calculateIntervalMod12(note1, note2);
		return interval === 0 || interval === 7; // 0 = unison/octave, 7 = perfect fifth
	}

	/**
	 * Check if an interval is dissonant
	 */
	static isDissonant(note1: NoteType, note2: NoteType): boolean {
		return !this.isConsonant(note1, note2);
	}

	/**
	 * Get melodic motion type for a single voice
	 */
	static getMelodicMotion(note1: NoteType, note2: NoteType): 'ascending' | 'descending' | 'static' {
		if (note2 > note1) return 'ascending';
		if (note2 < note1) return 'descending';
		return 'static';
	}

	/**
	 * Get the type of two-voice motion
	 */
	static getMotionType(
		upperNote1: NoteType,
		upperNote2: NoteType,
		lowerNote1: NoteType,
		lowerNote2: NoteType
	): 'contrary' | 'similar' | 'oblique' | 'parallel' {
		const upperMotion = this.getMelodicMotion(upperNote1, upperNote2);
		const lowerMotion = this.getMelodicMotion(lowerNote1, lowerNote2);

		// Oblique: one voice stays, the other moves
		if (upperMotion === 'static' && lowerMotion !== 'static') return 'oblique';
		if (lowerMotion === 'static' && upperMotion !== 'static') return 'oblique';
		if (upperMotion === 'static' && lowerMotion === 'static') return 'oblique';

		// Contrary: voices move in opposite directions
		if (
			(upperMotion === 'ascending' && lowerMotion === 'descending') ||
			(upperMotion === 'descending' && lowerMotion === 'ascending')
		) {
			return 'contrary';
		}

		// Parallel: voices move in same direction by same interval
		const interval1 = this.calculateIntervalMod12(upperNote1, lowerNote1);
		const interval2 = this.calculateIntervalMod12(upperNote2, lowerNote2);

		if (upperMotion === lowerMotion && interval1 === interval2) {
			return 'parallel';
		}

		// Similar: voices move in same direction but by different intervals
		return 'similar';
	}

	/**
	 * Check if motion is stepwise (1 or 2 semitones)
	 */
	static isStepwiseMotion(note1: NoteType, note2: NoteType): boolean {
		const interval = this.calculateInterval(note1, note2);
		return interval >= 0 && interval <= 2;
	}

	/**
	 * Check if motion is a leap (more than 2 semitones)
	 */
	static isLeap(note1: NoteType, note2: NoteType): boolean {
		return this.calculateInterval(note1, note2) > 2;
	}

	/**
	 * Check for parallel perfect fifths
	 */
	static hasParallelFifths(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength - 1; i++) {
			const interval1 = this.calculateIntervalMod12(upper[i], lower[i]);
			const interval2 = this.calculateIntervalMod12(upper[i + 1], lower[i + 1]);

			// Both intervals are perfect fifths
			if (interval1 === 7 && interval2 === 7) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check for parallel octaves/unisons
	 */
	static hasParallelOctaves(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength - 1; i++) {
			const interval1 = this.calculateIntervalMod12(upper[i], lower[i]);
			const interval2 = this.calculateIntervalMod12(upper[i + 1], lower[i + 1]);

			// Both intervals are unisons or octaves (mod 12 = 0)
			if (interval1 === 0 && interval2 === 0) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check for voice crossing (upper voice goes below lower voice)
	 */
	static hasVoiceCrossing(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength; i++) {
			if (upper[i] < lower[i]) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if interval exceeds a tenth (16 semitones)
	 */
	static exceedsTenth(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength; i++) {
			const interval = this.calculateInterval(upper[i], lower[i]);
			if (interval > 16) { // Major tenth = 16 semitones
				return true;
			}
		}

		return false;
	}

	/**
	 * Check for large leaps in a voice (more than octave = 12 semitones)
	 */
	static hasLargeLeaps(notes: Note[]): boolean {
		const noteValues = notes.map(n => n.getNote());

		for (let i = 0; i < noteValues.length - 1; i++) {
			const interval = this.calculateInterval(noteValues[i], noteValues[i + 1]);
			if (interval > 12) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check for unison in the middle of the phrase (only allowed at beginning/end)
	 */
	static hasUnisonInMiddle(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 1; i < minLength - 1; i++) {
			// Check for exact unison (same pitch), not octave equivalents
			const interval = this.calculateInterval(upper[i], lower[i]);
			if (interval === 0) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Check if phrase begins on perfect consonance
	 */
	static beginsOnPerfectConsonance(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();

		if (upper.length === 0 || lower.length === 0) {
			return false;
		}

		return this.isPerfectConsonance(upper[0].getNote(), lower[0].getNote());
	}

	/**
	 * Check if phrase ends on perfect consonance
	 */
	static endsOnPerfectConsonance(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();

		if (upper.length === 0 || lower.length === 0) {
			return false;
		}

		const lastIndex = Math.min(upper.length, lower.length) - 1;
		return this.isPerfectConsonance(upper[lastIndex].getNote(), lower[lastIndex].getNote());
	}

	/**
	 * Check for hidden/direct parallels (both voices approach perfect consonance by similar motion)
	 */
	static hasHiddenParallels(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength - 1; i++) {
			const motionType = this.getMotionType(upper[i], upper[i + 1], lower[i], lower[i + 1]);
			const nextInterval = this.calculateIntervalMod12(upper[i + 1], lower[i + 1]);

			// If similar motion AND arriving at perfect consonance
			if (motionType === 'similar' && (nextInterval === 0 || nextInterval === 7)) {
				// Check if at least one voice moves by step
				const upperStepwise = this.isStepwiseMotion(upper[i], upper[i + 1]);
				const lowerStepwise = this.isStepwiseMotion(lower[i], lower[i + 1]);

				// If neither voice moves by step, it's a hidden parallel
				if (!upperStepwise && !lowerStepwise) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Check for more than 3 consecutive identical intervals.
	 * The counterpoint rule states "You cannot use any interval more than three times in a row",
	 * meaning 3 is the maximum allowed and 4+ is forbidden.
	 */
	static hasTooManyConsecutiveIntervals(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);
		if (minLength < 4) return false;

		for (let i = 0; i < minLength - 3; i++) {
			const interval1 = this.calculateIntervalMod12(upper[i], lower[i]);
			const interval2 = this.calculateIntervalMod12(upper[i + 1], lower[i + 1]);
			const interval3 = this.calculateIntervalMod12(upper[i + 2], lower[i + 2]);
			const interval4 = this.calculateIntervalMod12(upper[i + 3], lower[i + 3]);

			// Four consecutive identical intervals
			if (interval1 === interval2 && interval2 === interval3 && interval3 === interval4) {
				return true;
			}
		}

		return false;
	}
}
