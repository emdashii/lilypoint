/**
 * Per-species counterpoint validators built on the timed-event rules engine
 * (species-rules.ts). One shared base class; each species supplies its
 * configuration. Thresholds are calibrated so all known-correct examples in
 * tests/fixtures/examples/ pass ("examples win").
 *
 * Primary API: validate(input) -> Violation[] (empty = valid).
 * validateAllRules(phrase) is a convenience adapter for generated Phrases
 * (CF assumed in the lower voice, as WritePhrase produces).
 */

import { Phrase } from '../phrase.js';
import {
	SpeciesInput,
	Violation,
	AlignedEvent,
	alignToCantusFirmus,
	checkBeginsPerfect,
	checkEndsPerfect,
	checkNoVoiceCrossing,
	checkSpacing,
	checkNoParallelPerfects,
	checkMelodicLeaps,
	checkFinalApproachByStep,
	checkDissonanceTreatment,
	isConsonant,
	DissonanceKind,
} from './species-rules.js';
import { TimedEvent, phraseToTimedVoices } from './timed-events.js';

/** Shape of a parsed known-correct example (see tests/helpers/ly-parser.ts). */
export interface ExampleVoices {
	counterpoint: TimedEvent[];
	cantusFirmus: TimedEvent[];
	metadata: { cfPosition: 'lower' | 'upper' };
}

export interface RuleValidationResult {
	[ruleName: string]: boolean;
}

export interface SpeciesConfig {
	species: number;
	/** Expected CP onsets per CF note (null = don't check, e.g. florid) */
	notesPerCfNote: number | null;
	/** Whether the first CF note may carry fewer CP onsets (opening rest) */
	allowOpeningRest: boolean;
	/** Dissonance kinds permitted on weak positions */
	allowedDissonances: DissonanceKind[];
	/** Whether strong-beat dissonances are allowed as suspensions */
	allowSuspensionOnStrong: boolean;
	/** Whether every vertical interval must be consonant (species 1) */
	allConsonant: boolean;
	/** Whether mid-phrase exact unisons with the CF are forbidden on strong beats */
	noUnisonOnStrongBeats: boolean;
	/** Max distance between the voices in semitones */
	maxSpacing: number;
}

export class SpeciesValidator {
	constructor(protected config: SpeciesConfig) {}

	/** Validate a parsed known-correct example fixture. */
	validateExample(example: ExampleVoices): Violation[] {
		return this.validate({
			cp: example.counterpoint,
			cf: example.cantusFirmus,
			cfPosition: example.metadata.cfPosition,
			species: this.config.species,
		});
	}

	/** Validate a generated Phrase (CF in the lower voice, per WritePhrase). */
	validatePhrase(phrase: Phrase): Violation[] {
		const { upper, lower } = phraseToTimedVoices(phrase);
		return this.validate({
			cp: upper,
			cf: lower,
			cfPosition: 'lower',
			species: this.config.species,
		});
	}

	validate(input: SpeciesInput): Violation[] {
		const violations: Violation[] = [];

		violations.push(...this.checkRatio(input));
		violations.push(...checkBeginsPerfect(input));
		violations.push(...checkEndsPerfect(input));
		violations.push(...checkNoVoiceCrossing(input));
		violations.push(...checkSpacing(input, this.config.maxSpacing));
		violations.push(...checkNoParallelPerfects(input));
		violations.push(...checkMelodicLeaps(input.cp));
		violations.push(...checkFinalApproachByStep(input.cp));

		if (this.config.allConsonant) {
			violations.push(...this.checkAllConsonant(input));
		} else {
			violations.push(...checkDissonanceTreatment(input, {
				allowSuspensionOnStrong: this.config.allowSuspensionOnStrong,
				allowedKinds: this.config.allowedDissonances,
			}));
		}

		if (this.config.noUnisonOnStrongBeats) {
			violations.push(...this.checkNoMidPhraseUnison(input));
		}

		return violations;
	}

	/** Grouped boolean view (for readable test output / summaries). */
	validateAllRules(phrase: Phrase): RuleValidationResult {
		const violations = this.validatePhrase(phrase);
		const rules = new Set(violations.map(v => v.rule));
		const allRuleNames = [
			'ratio', 'beginsPerfect', 'endsPerfect', 'noVoiceCrossing', 'spacing',
			'noParallelPerfects', 'melodicLeaps', 'finalApproachByStep',
			this.config.allConsonant ? 'allConsonant' : 'dissonanceTreatment',
			...(this.config.noUnisonOnStrongBeats ? ['noMidPhraseUnison'] : []),
		];
		const result: RuleValidationResult = {};
		for (const name of allRuleNames) {
			result[name] = !rules.has(name);
		}
		return result;
	}

	isValid(phrase: Phrase): boolean {
		return this.validatePhrase(phrase).length === 0;
	}

	/** Human-readable summary of violations for debugging. */
	getSummary(phrase: Phrase): string {
		const violations = this.validatePhrase(phrase);
		if (violations.length === 0) return `Species ${this.config.species}: all rules passed`;
		return [
			`Species ${this.config.species}: ${violations.length} violation(s)`,
			...violations.map(v => `  [${v.rule}] at ${v.at}: ${v.detail}`),
		].join('\n');
	}

	// -----------------------------------------------------------------------

	protected checkRatio(input: SpeciesInput): Violation[] {
		const { notesPerCfNote, allowOpeningRest } = this.config;
		if (notesPerCfNote === null) return [];

		const aligned = alignToCantusFirmus(input);
		const violations: Violation[] = [];
		const counts = new Map<number, number>();
		for (const a of aligned) {
			counts.set(a.cfIndex, (counts.get(a.cfIndex) ?? 0) + 1);
		}

		const lastCf = input.cf.length - 1;
		for (let i = 0; i < input.cf.length; i++) {
			const count = counts.get(i) ?? 0;
			// Final CF note carries a single held note in all species
			const expected = i === lastCf ? 1 : notesPerCfNote;
			if (count === expected) continue;
			// Opening rest: first CF note may have one fewer onset
			if (i === 0 && allowOpeningRest && count === expected - 1) continue;
			// Penultimate measure in species 3+ sometimes reduces activity at the
			// cadence; treated during calibration if fixtures require it.
			violations.push({
				rule: 'ratio', at: input.cf[i].start,
				detail: `CF note ${i} has ${count} counterpoint onsets, expected ${expected}`,
			});
		}
		return violations;
	}

	protected checkAllConsonant(input: SpeciesInput): Violation[] {
		const violations: Violation[] = [];
		for (const a of alignToCantusFirmus(input)) {
			if (a.interval !== null && !isConsonant(a.interval)) {
				violations.push({
					rule: 'allConsonant', at: a.event.start,
					detail: `dissonant interval of ${a.interval} semitones (${a.interval % 12} mod 12)`,
				});
			}
		}
		return violations;
	}

	protected checkNoMidPhraseUnison(input: SpeciesInput): Violation[] {
		const aligned = alignToCantusFirmus(input);
		const violations: Violation[] = [];
		for (let i = 1; i < aligned.length - 1; i++) {
			const a = aligned[i];
			// Exact unison (same pitch), on a strong position only
			if (a.interval === 0 && a.beatPos < 1e-9) {
				violations.push({
					rule: 'noMidPhraseUnison', at: a.event.start,
					detail: 'unison with cantus firmus mid-phrase on a strong beat',
				});
			}
		}
		return violations;
	}
}

// ---------------------------------------------------------------------------
// Per-species configurations
// ---------------------------------------------------------------------------

export class FirstSpeciesValidator extends SpeciesValidator {
	constructor() {
		super({
			species: 1,
			notesPerCfNote: 1,
			allowOpeningRest: false,
			allowedDissonances: [],
			allowSuspensionOnStrong: false,
			allConsonant: true,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		});
	}
}

export class SecondSpeciesValidator extends SpeciesValidator {
	constructor() {
		super({
			species: 2,
			notesPerCfNote: 2,
			allowOpeningRest: true,
			allowedDissonances: ['passing'],
			allowSuspensionOnStrong: false,
			allConsonant: false,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		});
	}
}

export class ThirdSpeciesValidator extends SpeciesValidator {
	constructor() {
		super({
			species: 3,
			notesPerCfNote: 4,
			allowOpeningRest: true,
			allowedDissonances: ['passing', 'neighbor', 'cambiata'],
			allowSuspensionOnStrong: false,
			allConsonant: false,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		});
	}
}

export class FourthSpeciesValidator extends SpeciesValidator {
	constructor() {
		super({
			species: 4,
			notesPerCfNote: 2,
			allowOpeningRest: true,
			allowedDissonances: ['suspension', 'passing'],
			allowSuspensionOnStrong: true,
			allConsonant: false,
			noUnisonOnStrongBeats: false, // suspensions may resolve near the CF
			maxSpacing: 20,
		});
	}
}

export class FifthSpeciesValidator extends SpeciesValidator {
	constructor() {
		super({
			species: 5,
			notesPerCfNote: null, // florid: mixed rhythm
			allowOpeningRest: true,
			allowedDissonances: ['passing', 'neighbor', 'suspension', 'cambiata'],
			allowSuspensionOnStrong: true,
			allConsonant: false,
			noUnisonOnStrongBeats: false,
			maxSpacing: 20,
		});
	}
}
