import { soundingPitch } from '../pitch.js';
import { checkStudentRules } from './student-rules.js';
/** Independent score validation. Historical constructors preserve fixture
 * compatibility; generation explicitly selects the student profile.
 * See plans/counterpoint-profiles.md for the policy boundary.
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
	isTieContinuation,
	classifyDissonance,
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

export type RuleProfile = 'student' | 'historical';

export class SpeciesValidator {
	constructor(protected config: SpeciesConfig, protected profile: RuleProfile = 'historical') {}

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
		for (const [name, voice] of [['counterpoint', input.cp], ['cantus firmus', input.cf]] as const) {
			let end = 0;
			for (let i = 0; i < voice.length; i++) {
				const event = voice[i];
				if (event.spelling) {
					try {
						if (soundingPitch(event.spelling) !== event.pitch) throw new Error('mismatch');
					} catch {
						violations.push({ rule: 'structure', at: event.start, detail: 'spelling does not match pitch' });
					}
				}
				if (!Number.isFinite(event.start) || !Number.isFinite(event.duration) || event.duration <= 0 ||
					Math.abs(event.start - end) > 1e-9 ||
					(event.pitch !== null && (!Number.isInteger(event.pitch) || event.pitch < 0 || event.pitch > 87))) {
					violations.push({ rule: 'structure', at: event.start, detail: `${name}: invalid pitch, duration, gap, or overlap` });
				}
				if (event.tiedToNext && (!voice[i + 1] || !isTieContinuation(event, voice[i + 1]))) {
					violations.push({ rule: 'structure', at: event.start, detail: `${name}: tie must join adjacent notes of equal pitch` });
				}
				end = event.start + event.duration;
			}
		}
		const endOf = (voice: TimedEvent[]) => voice.length ? voice[voice.length - 1].start + voice[voice.length - 1].duration : 0;
		if (Math.abs(endOf(input.cp) - endOf(input.cf)) > 1e-9) {
			violations.push({ rule: 'structure', at: 0, detail: 'voices must have equal total duration' });
		}
		if (violations.length) return violations;

		violations.push(...this.checkRatio(input));
		if (this.profile === 'student' && input.species === 4) violations.push(...this.checkSyncopation(input));
		violations.push(...checkBeginsPerfect(input));
		violations.push(...checkEndsPerfect(input));
		violations.push(...checkNoVoiceCrossing(input, this.profile === 'student' ? 0 : 1 / 3));
		if (this.profile === 'student') violations.push(...checkStudentRules(input));
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
			'structure', 'ratio', 'syncopation', 'spelling', 'metric', 'directPerfect', 'melodicRecovery', 'cadence', 'afterbeatPerfects', 'beginsPerfect', 'endsPerfect', 'noVoiceCrossing', 'spacing',
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

	protected checkSyncopation(input: SpeciesInput): Violation[] {
		const violations: Violation[] = [];
		const fail = (at: number, detail: string) => violations.push({ rule: 'syncopation', at, detail });
		const opening = input.cp[0];
		if (!opening || opening.pitch !== null || opening.duration !== input.cf[0].duration / 2) fail(0, 'fourth species starts with a half-pulse rest');
		const aligned = alignToCantusFirmus(input);
		for (let i = 1; i < input.cf.length - 1; i++) {
			const index = aligned.findIndex(a => a.cfIndex === i && a.beatPos === 0);
			if (index < 0 || !aligned[index].tiedFromPrevious) fail(input.cf[i].start, 'student fourth species requires every interior downbeat to be held');
			if (i === input.cf.length - 2 && (index < 0 || aligned[index].interval === null || isConsonant(aligned[index].interval!) || classifyDissonance(aligned, index) !== 'suspension')) fail(input.cf[i].start, 'cadence requires a dissonant suspension');
		}
		return violations;
	}

	protected checkRatio(input: SpeciesInput): Violation[] {
		const { notesPerCfNote, allowOpeningRest } = this.config;
		if (notesPerCfNote === null) return [];

		const violations: Violation[] = [];
		for (let i = 0; i < input.cf.length; i++) {
			const cf = input.cf[i];
			const expected = i === input.cf.length - 1 ? 1 : notesPerCfNote;
			const subdivision = cf.duration / expected;
			const events = input.cp.filter(e => e.start >= cf.start - 1e-9 && e.start < cf.start + cf.duration - 1e-9);
			const valid = events.length === expected && events.every((e, j) =>
				Math.abs(e.start - cf.start - j * subdivision) < 1e-9 && Math.abs(e.duration - subdivision) < 1e-9 &&
				(e.pitch !== null || (i === 0 && j === 0 && allowOpeningRest)));
			if (!valid) violations.push({ rule: 'ratio', at: cf.start, detail: `CF note ${i} requires ${expected} equal subdivisions` });
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
	constructor(profile: RuleProfile = 'historical') {
		super({
			species: 1,
			notesPerCfNote: 1,
			allowOpeningRest: false,
			allowedDissonances: [],
			allowSuspensionOnStrong: false,
			allConsonant: true,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		}, profile);
	}
}

export class SecondSpeciesValidator extends SpeciesValidator {
	constructor(profile: RuleProfile = 'historical') {
		super({
			species: 2,
			notesPerCfNote: 2,
			allowOpeningRest: true,
			allowedDissonances: ['passing'],
			allowSuspensionOnStrong: false,
			allConsonant: false,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		}, profile);
	}
}

export class ThirdSpeciesValidator extends SpeciesValidator {
	constructor(profile: RuleProfile = 'historical') {
		super({
			species: 3,
			notesPerCfNote: 4,
			allowOpeningRest: true,
			allowedDissonances: ['passing', 'neighbor', 'cambiata'],
			allowSuspensionOnStrong: false,
			allConsonant: false,
			noUnisonOnStrongBeats: true,
			maxSpacing: 20,
		}, profile);
	}
}

export class FourthSpeciesValidator extends SpeciesValidator {
	constructor(profile: RuleProfile = 'historical') {
		super({
			species: 4,
			notesPerCfNote: 2,
			allowOpeningRest: true,
			allowedDissonances: ['suspension', 'passing'],
			allowSuspensionOnStrong: true,
			allConsonant: false,
			noUnisonOnStrongBeats: false, // suspensions may resolve near the CF
			maxSpacing: 20,
		}, profile);
	}
}

export class FifthSpeciesValidator extends SpeciesValidator {
	constructor(profile: RuleProfile = 'historical') {
		super({
			species: 5,
			notesPerCfNote: null, // florid: mixed rhythm
			allowOpeningRest: true,
			allowedDissonances: ['passing', 'neighbor', 'suspension', 'cambiata'],
			allowSuspensionOnStrong: true,
			allConsonant: false,
			noUnisonOnStrongBeats: false,
			maxSpacing: 20,
		}, profile);
	}
}
