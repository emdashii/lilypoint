/**
 * Second Species Counterpoint Validator
 *
 * Validates that a phrase follows second species counterpoint rules:
 * - 2:1 note ratio (counterpoint has 2x notes of cantus firmus)
 * - Downbeats consonant
 * - Passing tones allowed on upbeats (approached/left by step)
 * - No parallel fifths/octaves on downbeats
 * - No voice crossing
 * - Stay within a tenth
 * - Begins/ends on perfect consonance
 */

import { Phrase } from '../../src/phrase.js';
import { CounterpointValidator, RuleValidationResult } from './counterpoint-rules.js';
import { CounterpointRules } from './counterpoint-rules.js';

export class SecondSpeciesValidator implements CounterpointValidator {
	validateAllRules(phrase: Phrase): RuleValidationResult {
		return {
			twoToOneRatio: this.checkTwoToOneRatio(phrase),
			downbeatsConsonant: this.checkDownbeatsConsonant(phrase),
			passingTonesValid: this.checkPassingTones(phrase),
			noParallelFifthsOnDownbeats: this.checkNoParallelFifthsOnDownbeats(phrase),
			noParallelOctavesOnDownbeats: this.checkNoParallelOctavesOnDownbeats(phrase),
			noVoiceCrossing: this.checkNoVoiceCrossing(phrase),
			limitToTenth: this.checkLimitToTenth(phrase),
			beginsOnPerfectConsonance: this.checkBeginsOnPerfectConsonance(phrase),
			endsOnPerfectConsonance: this.checkEndsOnPerfectConsonance(phrase),
			noLargeLeaps: this.checkNoLargeLeaps(phrase),
		};
	}

	private checkTwoToOneRatio(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();
		if (upper.length === 0 || lower.length === 0) return false;
		return upper.length === lower.length * 2;
	}

	private checkDownbeatsConsonant(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			const upperIndex = i * 2; // downbeat
			if (upperIndex >= upper.length) break;
			if (!CounterpointRules.isConsonant(upper[upperIndex], lower[i])) {
				return false;
			}
		}
		return true;
	}

	private checkPassingTones(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			const upbeatIndex = i * 2 + 1;
			if (upbeatIndex >= upper.length) break;

			const upbeatNote = upper[upbeatIndex];
			const cfNote = lower[i];

			if (!CounterpointRules.isConsonant(upbeatNote, cfNote)) {
				// Dissonant upbeat must be approached by step
				const prevNote = upper[upbeatIndex - 1];
				if (!CounterpointRules.isStepwiseMotion(prevNote, upbeatNote)) {
					return false;
				}
			}
		}
		return true;
	}

	private checkNoParallelFifthsOnDownbeats(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length - 1; i++) {
			const upperIdx1 = i * 2;
			const upperIdx2 = (i + 1) * 2;
			if (upperIdx2 >= upper.length) break;

			const interval1 = CounterpointRules.calculateIntervalMod12(upper[upperIdx1], lower[i]);
			const interval2 = CounterpointRules.calculateIntervalMod12(upper[upperIdx2], lower[i + 1]);

			if (interval1 === 7 && interval2 === 7) return false;
		}
		return true;
	}

	private checkNoParallelOctavesOnDownbeats(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length - 1; i++) {
			const upperIdx1 = i * 2;
			const upperIdx2 = (i + 1) * 2;
			if (upperIdx2 >= upper.length) break;

			const interval1 = CounterpointRules.calculateIntervalMod12(upper[upperIdx1], lower[i]);
			const interval2 = CounterpointRules.calculateIntervalMod12(upper[upperIdx2], lower[i + 1]);

			if (interval1 === 0 && interval2 === 0) return false;
		}
		return true;
	}

	/**
	 * Voice crossing check using 2:1 alignment:
	 * upper[i*2] and upper[i*2+1] both sound against lower[i]
	 */
	private checkNoVoiceCrossing(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			for (let beat = 0; beat < 2; beat++) {
				const upperIdx = i * 2 + beat;
				if (upperIdx >= upper.length) break;
				if (upper[upperIdx] < lower[i]) return false;
			}
		}
		return true;
	}

	/**
	 * Tenth check using 2:1 alignment
	 */
	private checkLimitToTenth(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			for (let beat = 0; beat < 2; beat++) {
				const upperIdx = i * 2 + beat;
				if (upperIdx >= upper.length) break;
				if (CounterpointRules.calculateInterval(upper[upperIdx], lower[i]) > 16) return false;
			}
		}
		return true;
	}

	private checkBeginsOnPerfectConsonance(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();
		if (upper.length === 0 || lower.length === 0) return false;
		return CounterpointRules.isPerfectConsonance(upper[0].getNote(), lower[0].getNote());
	}

	private checkEndsOnPerfectConsonance(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();
		if (upper.length === 0 || lower.length === 0) return false;
		return CounterpointRules.isPerfectConsonance(
			upper[upper.length - 1].getNote(),
			lower[lower.length - 1].getNote()
		);
	}

	private checkNoLargeLeaps(phrase: Phrase): boolean {
		return !CounterpointRules.hasLargeLeaps(phrase.getUpperVoice()) &&
		       !CounterpointRules.hasLargeLeaps(phrase.getLowerVoice());
	}

	getSummary(phrase: Phrase): string {
		const results = this.validateAllRules(phrase);
		const passed = Object.values(results).filter(v => v).length;
		const total = Object.keys(results).length;

		let summary = `Second Species Validation: ${passed}/${total} rules passed\n\n`;
		for (const [rule, result] of Object.entries(results)) {
			summary += `${result ? 'PASS' : 'FAIL'} ${rule}\n`;
		}
		return summary;
	}

	isValid(phrase: Phrase): boolean {
		const results = this.validateAllRules(phrase);
		return Object.values(results).every(v => v === true);
	}
}
