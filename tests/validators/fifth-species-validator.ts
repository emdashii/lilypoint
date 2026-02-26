/**
 * Fifth Species Counterpoint Validator (Florid)
 *
 * Validates that a phrase follows fifth species counterpoint rules:
 * - Mixed rhythm (variable note durations)
 * - No voice crossing (each upper note must be above its aligned CF note)
 * - Stay within a tenth
 * - Begins/ends on perfect consonance
 *
 * Since fifth species has variable note counts per CF note,
 * we use duration-based alignment to map upper notes to CF notes.
 */

import { Phrase } from '../../src/phrase.js';
import { CounterpointValidator, RuleValidationResult } from './counterpoint-rules.js';
import { CounterpointRules } from './counterpoint-rules.js';

export class FifthSpeciesValidator implements CounterpointValidator {
	validateAllRules(phrase: Phrase): RuleValidationResult {
		return {
			hasMixedRhythm: this.checkMixedRhythm(phrase),
			hasValidNoteLengths: this.checkValidNoteLengths(phrase),
			noVoiceCrossing: this.checkNoVoiceCrossing(phrase),
			limitToTenth: this.checkLimitToTenth(phrase),
			beginsOnPerfectConsonance: this.checkBeginsOnPerfectConsonance(phrase),
			endsOnPerfectConsonance: this.checkEndsOnPerfectConsonance(phrase),
			noLargeLeaps: this.checkNoLargeLeaps(phrase),
		};
	}

	/**
	 * Build alignment: map each upper note to its corresponding CF note index
	 * based on cumulative beat durations.
	 */
	private buildAlignment(phrase: Phrase): number[] {
		const upper = phrase.getUpperVoice();
		const lower = phrase.getLowerVoice();
		if (upper.length === 0 || lower.length === 0) return [];

		// Build CF beat boundaries
		const cfBeats: number[] = [0]; // Start beats for each CF note
		let cfBeat = 0;
		for (const note of lower) {
			cfBeat += 4 / note.getLength(); // Convert duration to beats
			cfBeats.push(cfBeat);
		}

		// Map each upper note to a CF index based on when it sounds
		const alignment: number[] = [];
		let upperBeat = 0;
		for (const note of upper) {
			// Find which CF note is sounding at this beat
			let cfIdx = 0;
			for (let i = 0; i < cfBeats.length - 1; i++) {
				if (upperBeat >= cfBeats[i] && upperBeat < cfBeats[i + 1]) {
					cfIdx = i;
					break;
				}
				cfIdx = i; // In case we're at or past the last boundary
			}
			cfIdx = Math.min(cfIdx, lower.length - 1);
			alignment.push(cfIdx);
			upperBeat += 4 / note.getLength();
		}

		return alignment;
	}

	private checkMixedRhythm(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		if (upper.length < 2) return false;

		const lengths = new Set(upper.map(n => n.getLength()));
		return lengths.size >= 2;
	}

	private checkValidNoteLengths(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice();
		return upper.every(n => [1, 2, 4, 8].includes(n.getLength()));
	}

	private checkNoVoiceCrossing(phrase: Phrase): boolean {
		const upper = phrase.getUpperVoice().map(n => n.getNote());
		const lower = phrase.getLowerVoice().map(n => n.getNote());
		const alignment = this.buildAlignment(phrase);

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
		const alignment = this.buildAlignment(phrase);

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

		let summary = `Fifth Species Validation: ${passed}/${total} rules passed\n\n`;
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
