/**
 * Fourth Species Counterpoint Validator
 *
 * Validates that a phrase follows fourth species counterpoint rules:
 * - Syncopated pattern (half notes)
 * - Consonant intervals present
 * - Dissonances resolve down by step
 * - No voice crossing, limit to tenth
 * - Begins/ends on perfect consonance
 *
 * Fourth species has a variable number of upper notes per CF note:
 * - First CF note: 1 upper note
 * - Middle CF notes: 2 upper notes each
 * - Last CF note: 2 upper notes
 * We check each upper note against its aligned CF note.
 */

import { Phrase } from '../../src/phrase.js';
import { CounterpointValidator, RuleValidationResult } from './counterpoint-rules.js';
import { CounterpointRules } from './counterpoint-rules.js';

export class FourthSpeciesValidator implements CounterpointValidator {
	validateAllRules(phrase: Phrase): RuleValidationResult {
		return {
			hasHalfNotes: this.checkHalfNotes(phrase),
			dissonancesResolveDown: this.checkDissonanceResolution(phrase),
			noVoiceCrossing: this.checkNoVoiceCrossing(phrase),
			limitToTenth: this.checkLimitToTenth(phrase),
			beginsOnPerfectConsonance: this.checkBeginsOnPerfectConsonance(phrase),
			endsOnPerfectConsonance: this.checkEndsOnPerfectConsonance(phrase),
			noLargeLeaps: this.checkNoLargeLeaps(phrase),
		};
	}

	/**
	 * Build alignment map: for each upper note index, what CF note index it sounds against.
	 * Fourth species pattern: 1 note for first CF, 2 for each middle/last CF.
	 */
	private buildAlignment(upperLen: number, lowerLen: number): number[] {
		const alignment: number[] = [];
		// First CF note: 1 upper note
		alignment.push(0);
		// Middle and last CF notes: 2 upper notes each
		for (let cf = 1; cf < lowerLen; cf++) {
			alignment.push(cf);
			alignment.push(cf);
		}
		// Trim to actual upper length
		return alignment.slice(0, upperLen);
	}

	private checkHalfNotes(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		if (upper.length === 0) return false;
		return upper.every(n => n.getLength() === 2);
	}

	private checkDissonanceResolution(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());
		const alignment = this.buildAlignment(upper.length, lower.length);

		for (let i = 0; i < upper.length; i++) {
			const cfIdx = alignment[i];
			if (cfIdx === undefined || cfIdx >= lower.length) continue;

			if (CounterpointRules.isDissonant(upper[i], lower[cfIdx])) {
				// Next upper note should resolve down by step
				if (i + 1 < upper.length) {
					const resolution = upper[i] - upper[i + 1];
					if (resolution < 1 || resolution > 2) {
						return false;
					}
				}
			}
		}
		return true;
	}

	private checkNoVoiceCrossing(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());
		const alignment = this.buildAlignment(upper.length, lower.length);

		for (let i = 0; i < upper.length; i++) {
			const cfIdx = alignment[i];
			if (cfIdx === undefined || cfIdx >= lower.length) continue;
			if (upper[i] < lower[cfIdx]) return false;
		}
		return true;
	}

	private checkLimitToTenth(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());
		const alignment = this.buildAlignment(upper.length, lower.length);

		for (let i = 0; i < upper.length; i++) {
			const cfIdx = alignment[i];
			if (cfIdx === undefined || cfIdx >= lower.length) continue;
			if (CounterpointRules.calculateInterval(upper[i], lower[cfIdx]) > 16) return false;
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

		let summary = `Fourth Species Validation: ${passed}/${total} rules passed\n\n`;
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
