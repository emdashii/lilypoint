/**
 * Third Species Counterpoint Validator
 *
 * Validates that a phrase follows third species counterpoint rules:
 * - 4:1 note ratio
 * - First beat of each group consonant
 * - Passing tones and neighbor tones allowed on other beats
 * - No voice crossing, limit to tenth
 * - Begins/ends on perfect consonance
 */

import { Phrase } from '../../src/phrase.js';
import { CounterpointValidator, RuleValidationResult } from './counterpoint-rules.js';
import { CounterpointRules } from './counterpoint-rules.js';

export class ThirdSpeciesValidator implements CounterpointValidator {
	validateAllRules(phrase: Phrase): RuleValidationResult {
		return {
			fourToOneRatio: this.checkFourToOneRatio(phrase),
			firstBeatConsonant: this.checkFirstBeatConsonant(phrase),
			passingTonesValid: this.checkPassingTones(phrase),
			noVoiceCrossing: this.checkNoVoiceCrossing(phrase),
			limitToTenth: this.checkLimitToTenth(phrase),
			beginsOnPerfectConsonance: this.checkBeginsOnPerfectConsonance(phrase),
			endsOnPerfectConsonance: this.checkEndsOnPerfectConsonance(phrase),
			noLargeLeaps: this.checkNoLargeLeaps(phrase),
		};
	}

	private checkFourToOneRatio(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();
		if (upper.length === 0 || lower.length === 0) return false;
		return upper.length === lower.length * 4;
	}

	private checkFirstBeatConsonant(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			const upperIndex = i * 4; // first beat of each group
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
			for (let beat = 1; beat < 4; beat++) {
				const upperIndex = i * 4 + beat;
				if (upperIndex >= upper.length || upperIndex < 1) continue;

				const note = upper[upperIndex];
				const cfNote = lower[i];

				if (!CounterpointRules.isConsonant(note, cfNote)) {
					// Dissonant non-first-beat must be approached by step
					const prevNote = upper[upperIndex - 1];
					if (!CounterpointRules.isStepwiseMotion(prevNote, note)) {
						return false;
					}
				}
			}
		}
		return true;
	}

	/**
	 * Voice crossing check using 4:1 alignment:
	 * upper[i*4..i*4+3] all sound against lower[i]
	 */
	private checkNoVoiceCrossing(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			for (let beat = 0; beat < 4; beat++) {
				const upperIdx = i * 4 + beat;
				if (upperIdx >= upper.length) break;
				if (upper[upperIdx] < lower[i]) return false;
			}
		}
		return true;
	}

	/**
	 * Tenth check using 4:1 alignment
	 */
	private checkLimitToTenth(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());

		for (let i = 0; i < lower.length; i++) {
			for (let beat = 0; beat < 4; beat++) {
				const upperIdx = i * 4 + beat;
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

		let summary = `Third Species Validation: ${passed}/${total} rules passed\n\n`;
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
