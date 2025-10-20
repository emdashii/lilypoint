/**
 * First Species Counterpoint Validator
 *
 * Validates that a phrase follows all first species counterpoint rules:
 * - 1:1 note ratio (same number of notes in both voices)
 * - All intervals consonant
 * - No parallel perfect 5ths or octaves
 * - No hidden parallels
 * - Prefer contrary motion
 * - No voice crossing
 * - Stay within a tenth
 * - No large leaps (> octave)
 * - No unison except at beginning/end
 * - Begins on perfect consonance
 * - Ends on perfect consonance
 * - Limit consecutive identical intervals
 */

import { Phrase } from '../../src/phrase.js';
import { Note } from '../../src/note.js';
import { CounterpointValidator, RuleValidationResult } from './counterpoint-rules.js';
import { CounterpointRules } from './counterpoint-rules.js';

export class FirstSpeciesValidator implements CounterpointValidator {
	/**
	 * Validate all first species rules
	 */
	validateAllRules(phrase: Phrase): RuleValidationResult {
		return {
			oneToOneRatio: this.checkOneToOneRatio(phrase),
			allConsonant: this.checkAllConsonant(phrase),
			noParallelFifths: this.checkNoParallelFifths(phrase),
			noParallelOctaves: this.checkNoParallelOctaves(phrase),
			noHiddenParallels: this.checkNoHiddenParallels(phrase),
			noVoiceCrossing: this.checkNoVoiceCrossing(phrase),
			limitToTenth: this.checkLimitToTenth(phrase),
			noLargeLeaps: this.checkNoLargeLeaps(phrase),
			noUnisonExceptEnds: this.checkNoUnisonExceptEnds(phrase),
			beginsOnPerfectConsonance: this.checkBeginsOnPerfectConsonance(phrase),
			endsOnPerfectConsonance: this.checkEndsOnPerfectConsonance(phrase),
			limitConsecutiveIntervals: this.checkLimitConsecutiveIntervals(phrase),
		};
	}

	/**
	 * Check if both voices have the same number of notes (1:1 ratio)
	 */
	private checkOneToOneRatio(phrase: Phrase): boolean {
		const upperVoice = phrase.getUpperVoice();
		const lowerVoice = phrase.getLowerVoice();

		return upperVoice.length === lowerVoice.length && upperVoice.length > 0;
	}

	/**
	 * Check if all vertical intervals are consonant
	 */
	private checkAllConsonant(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		const minLength = Math.min(upper.length, lower.length);

		for (let i = 0; i < minLength; i++) {
			if (!CounterpointRules.isConsonant(upper[i], lower[i])) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Check for no parallel perfect fifths
	 */
	private checkNoParallelFifths(phrase: Phrase): boolean {
		return !CounterpointRules.hasParallelFifths(phrase);
	}

	/**
	 * Check for no parallel octaves/unisons
	 */
	private checkNoParallelOctaves(phrase: Phrase): boolean {
		return !CounterpointRules.hasParallelOctaves(phrase);
	}

	/**
	 * Check for no hidden parallels (similar motion to perfect consonance without stepwise motion)
	 */
	private checkNoHiddenParallels(phrase: Phrase): boolean {
		return !CounterpointRules.hasHiddenParallels(phrase);
	}

	/**
	 * Check for no voice crossing
	 */
	private checkNoVoiceCrossing(phrase: Phrase): boolean {
		return !CounterpointRules.hasVoiceCrossing(phrase);
	}

	/**
	 * Check that interval between voices doesn't exceed a tenth (16 semitones)
	 */
	private checkLimitToTenth(phrase: Phrase): boolean {
		return !CounterpointRules.exceedsTenth(phrase);
	}

	/**
	 * Check for no large leaps (> octave = 12 semitones) in either voice
	 */
	private checkNoLargeLeaps(phrase: Phrase): boolean {
		const upperVoice = phrase.getUpperVoice();
		const lowerVoice = phrase.getLowerVoice();

		return !CounterpointRules.hasLargeLeaps(upperVoice) &&
		       !CounterpointRules.hasLargeLeaps(lowerVoice);
	}

	/**
	 * Check for no unison except at beginning or end
	 */
	private checkNoUnisonExceptEnds(phrase: Phrase): boolean {
		return !CounterpointRules.hasUnisonInMiddle(phrase);
	}

	/**
	 * Check that phrase begins on perfect consonance (unison, 5th, or octave)
	 */
	private checkBeginsOnPerfectConsonance(phrase: Phrase): boolean {
		return CounterpointRules.beginsOnPerfectConsonance(phrase);
	}

	/**
	 * Check that phrase ends on perfect consonance (unison, 5th, or octave)
	 */
	private checkEndsOnPerfectConsonance(phrase: Phrase): boolean {
		return CounterpointRules.endsOnPerfectConsonance(phrase);
	}

	/**
	 * Check that there are no more than 2 consecutive identical intervals
	 */
	private checkLimitConsecutiveIntervals(phrase: Phrase): boolean {
		return !CounterpointRules.hasTooManyConsecutiveIntervals(phrase);
	}

	/**
	 * Get a summary of all rule validation results
	 */
	getSummary(phrase: Phrase): string {
		const results = this.validateAllRules(phrase);
		const passed = Object.values(results).filter(v => v).length;
		const total = Object.keys(results).length;

		let summary = `First Species Validation: ${passed}/${total} rules passed\n\n`;

		for (const [rule, result] of Object.entries(results)) {
			summary += `${result ? '✓' : '✗'} ${this.getRuleName(rule)}\n`;
		}

		return summary;
	}

	/**
	 * Get human-readable rule name
	 */
	private getRuleName(ruleKey: string): string {
		const names: Record<string, string> = {
			oneToOneRatio: '1:1 note ratio',
			allConsonant: 'All intervals consonant',
			noParallelFifths: 'No parallel perfect fifths',
			noParallelOctaves: 'No parallel octaves/unisons',
			noHiddenParallels: 'No hidden parallels',
			noVoiceCrossing: 'No voice crossing',
			limitToTenth: 'Interval stays within a tenth',
			noLargeLeaps: 'No melodic leaps larger than octave',
			noUnisonExceptEnds: 'No unison except at beginning/end',
			beginsOnPerfectConsonance: 'Begins on perfect consonance',
			endsOnPerfectConsonance: 'Ends on perfect consonance',
			limitConsecutiveIntervals: 'No more than 2 consecutive identical intervals',
		};

		return names[ruleKey] || ruleKey;
	}

	/**
	 * Quick check if phrase passes all rules
	 */
	isValid(phrase: Phrase): boolean {
		const results = this.validateAllRules(phrase);
		return Object.values(results).every(v => v === true);
	}
}
