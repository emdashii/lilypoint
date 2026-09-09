/**
 * Species counterpoint rules engine, operating on timed events so the two
 * voices are aligned by musical time (beat position) rather than array index.
 *
 * Works on both:
 *  - known-correct fixtures (tests/fixtures/examples/*.ly), where the cantus
 *    firmus is whole notes, and
 *  - generated Phrases (converted via phraseToTimedVoices), where the cantus
 *    firmus is one note per beat.
 *
 * Alignment is per CF note: each counterpoint event is assigned to the CF note
 * sounding at its onset, at a relative position 0..1 within that CF note
 * (0 = downbeat / strong position).
 *
 * Every rule returns Violation[] (empty = pass) so failures are debuggable.
 * Rule thresholds are calibrated so that all known-correct examples pass
 * ("examples win" — see tests/fixtures/examples/FORMAT.md).
 */

import { TimedEvent } from './timed-events.js';

export interface Violation {
	rule: string;
	/** Start time (whole-note units) in the counterpoint voice where it occurred */
	at: number;
	detail: string;
}

/** A counterpoint event annotated with its position relative to the CF. */
export interface AlignedEvent {
	event: TimedEvent;
	/** Index of the CF note sounding at this event's onset */
	cfIndex: number;
	/** The CF event itself */
	cf: TimedEvent;
	/** 0 = onset coincides with CF note start (strong); fraction of CF duration */
	beatPos: number;
	/** Vertical interval in semitones (absolute), null if either is a rest */
	interval: number | null;
	/** True if this event started as a tie continuation (previous event tied into it) */
	tiedFromPrevious: boolean;
}

export interface SpeciesInput {
	/** The counterpoint voice */
	cp: TimedEvent[];
	/** The cantus firmus voice */
	cf: TimedEvent[];
	/** Whether the CF is the lower or upper voice */
	cfPosition: 'lower' | 'upper';
	species: number;
}

// ---------------------------------------------------------------------------
// Interval helpers
// ---------------------------------------------------------------------------

export const CONSONANT_MOD12 = [0, 3, 4, 7, 8, 9];
export const PERFECT_MOD12 = [0, 7];

export function isConsonant(interval: number): boolean {
	return CONSONANT_MOD12.includes(interval % 12);
}

export function isPerfect(interval: number): boolean {
	return PERFECT_MOD12.includes(interval % 12);
}

export function isStep(semitones: number): boolean {
	return Math.abs(semitones) >= 1 && Math.abs(semitones) <= 2;
}

// ---------------------------------------------------------------------------
// Alignment
// ---------------------------------------------------------------------------

/** Assign each sounding CP event to the CF note sounding at its onset. */
export function alignToCantusFirmus(input: SpeciesInput): AlignedEvent[] {
	const { cp, cf } = input;
	const aligned: AlignedEvent[] = [];

	for (let i = 0; i < cp.length; i++) {
		const event = cp[i];
		if (event.pitch === null) continue; // rests carry no vertical interval

		const cfIndex = cf.findIndex(
			c => event.start >= c.start - 1e-9 && event.start < c.start + c.duration - 1e-9
		);
		if (cfIndex === -1) continue; // event past the end of the CF (shouldn't happen)
		const cfNote = cf[cfIndex];

		aligned.push({
			event,
			cfIndex,
			cf: cfNote,
			beatPos: (event.start - cfNote.start) / cfNote.duration,
			interval: cfNote.pitch === null ? null : Math.abs(event.pitch - cfNote.pitch),
			tiedFromPrevious: i > 0 && isTieContinuation(cp[i - 1], event),
		});
	}

	return aligned;
}

/** Merge tied notes into single sounding notes (for melodic-line analysis). */
export function isTieContinuation(previous: TimedEvent, next: TimedEvent): boolean {
	return previous.tiedToNext && previous.pitch !== null && previous.pitch === next.pitch &&
		Math.abs(previous.start + previous.duration - next.start) < 1e-9;
}

export function mergeTies(voice: TimedEvent[]): TimedEvent[] {
	const merged: TimedEvent[] = [];
	for (const event of voice) {
		const prev = merged[merged.length - 1];
		if (prev && isTieContinuation(prev, event)) {
			merged[merged.length - 1] = { ...prev, duration: prev.duration + event.duration, tiedToNext: event.tiedToNext };
		} else {
			merged.push({ ...event });
		}
	}
	return merged;
}

/** Sounding pitches of a voice (rests dropped, ties merged). */
export function soundingPitches(voice: TimedEvent[]): number[] {
	return mergeTies(voice).filter(e => e.pitch !== null).map(e => e.pitch as number);
}

// ---------------------------------------------------------------------------
// Shared vertical rules
// ---------------------------------------------------------------------------

/** First sounding simultaneity must be a perfect consonance (unison/5th/8ve). */
export function checkBeginsPerfect(input: SpeciesInput): Violation[] {
	const aligned = alignToCantusFirmus(input);
	if (aligned.length === 0) return [{ rule: 'beginsPerfect', at: 0, detail: 'no sounding notes' }];
	const first = aligned[0];
	if (first.interval === null || !isPerfect(first.interval)) {
		return [{
			rule: 'beginsPerfect', at: first.event.start,
			detail: `first interval is ${first.interval} semitones`,
		}];
	}
	return [];
}

/** Last simultaneity must be a unison or octave (perfect, and not a 5th). */
export function checkEndsPerfect(input: SpeciesInput): Violation[] {
	const aligned = alignToCantusFirmus(input);
	if (aligned.length === 0) return [{ rule: 'endsPerfect', at: 0, detail: 'no sounding notes' }];
	const last = aligned[aligned.length - 1];
	if (last.interval === null || last.interval % 12 !== 0) {
		return [{
			rule: 'endsPerfect', at: last.event.start,
			detail: `final interval is ${last.interval} semitones (must be unison/octave)`,
		}];
	}
	return [];
}

/**
 * Voice crossing. CALIBRATED against the known-correct examples: Fux crosses
 * voices mid-phrase routinely (Gradus Figs. 14, 39, 59, 75 — see
 * tests/fixtures/examples/), so individual crossings are legal. What remains
 * checked:
 *  - the first and last simultaneities must be uncrossed, and
 *  - crossing must stay episodic: at most maxCrossedFraction of onsets
 *    (the worst known-correct example, Fig. 59 below-CF, crosses ~18%).
 */
export function checkNoVoiceCrossing(input: SpeciesInput, maxCrossedFraction = 1 / 3): Violation[] {
	const aligned = alignToCantusFirmus(input);
	const violations: Violation[] = [];

	const isCrossed = (a: AlignedEvent): boolean => {
		if (a.cf.pitch === null || a.event.pitch === null) return false;
		return input.cfPosition === 'lower'
			? a.event.pitch < a.cf.pitch
			: a.event.pitch > a.cf.pitch;
	};

	if (aligned.length > 0 && isCrossed(aligned[0])) {
		violations.push({
			rule: 'noVoiceCrossing', at: aligned[0].event.start,
			detail: 'voices are crossed at the opening',
		});
	}
	if (aligned.length > 1 && isCrossed(aligned[aligned.length - 1])) {
		violations.push({
			rule: 'noVoiceCrossing', at: aligned[aligned.length - 1].event.start,
			detail: 'voices are crossed at the final note',
		});
	}

	const crossedCount = aligned.filter(isCrossed).length;
	if (aligned.length > 0 && crossedCount / aligned.length > maxCrossedFraction) {
		violations.push({
			rule: 'noVoiceCrossing', at: 0,
			detail: `voices crossed on ${crossedCount}/${aligned.length} onsets (max ${Math.round(maxCrossedFraction * 100)}%)`,
		});
	}

	return violations;
}

/**
 * Voices no further apart than maxSemitones. CALIBRATED: the textbook
 * guideline is a tenth (16), but Fux himself reaches a compound fifth
 * (19 semitones, Gradus Figs. 57 and 77), so the hard limit is 20.
 */
export function checkSpacing(input: SpeciesInput, maxSemitones = 20): Violation[] {
	const violations: Violation[] = [];
	for (const a of alignToCantusFirmus(input)) {
		if (a.interval !== null && a.interval > maxSemitones) {
			violations.push({
				rule: 'spacing', at: a.event.start,
				detail: `voices ${a.interval} semitones apart (max ${maxSemitones})`,
			});
		}
	}
	return violations;
}

/**
 * No parallel perfect fifths or octaves between consecutive aligned events.
 *
 * CALIBRATED: only note-to-note successions are checked. The textbook rule
 * against perfect intervals on consecutive DOWNBEATS is one Fux himself
 * breaks when a weak-beat note intervenes (accented octaves in Gradus
 * Figs. 36 and 57, accented fifths in Fig. 77), so it is not enforced.
 */
export function checkNoParallelPerfects(input: SpeciesInput): Violation[] {
	const aligned = alignToCantusFirmus(input);
	const violations: Violation[] = [];

	const scan = (events: AlignedEvent[], label: string) => {
		for (let i = 0; i < events.length - 1; i++) {
			const a = events[i];
			const b = events[i + 1];
			if (a.interval === null || b.interval === null) continue;
			if (a.cfIndex === b.cfIndex) continue; // CF hasn't moved: oblique, not parallel
			if (a.event.pitch === b.event.pitch) continue; // CP repeats/ties: oblique
			const ia = a.interval % 12;
			const ib = b.interval % 12;
			if (ia === ib && (ia === 0 || ia === 7)) {
				violations.push({
					rule: 'noParallelPerfects', at: b.event.start,
					detail: `${label}: consecutive ${ia === 0 ? 'octaves/unisons' : 'fifths'}`,
				});
			}
		}
	};

	scan(aligned, 'note-to-note');

	return violations;
}

// ---------------------------------------------------------------------------
// Shared melodic rules (applied to the counterpoint line)
// ---------------------------------------------------------------------------

const MELODIC_DISSONANT_LEAPS = new Set([6, 10, 11]); // tritone, minor 7th, major 7th

/** Melodic motion: no leaps larger than an octave, no dissonant leaps. */
export function checkMelodicLeaps(voice: TimedEvent[]): Violation[] {
	const violations: Violation[] = [];
	const merged = mergeTies(voice).filter(e => e.pitch !== null);
	for (let i = 0; i < merged.length - 1; i++) {
		const leap = Math.abs((merged[i + 1].pitch as number) - (merged[i].pitch as number));
		if (leap > 12) {
			violations.push({
				rule: 'melodicLeaps', at: merged[i + 1].start,
				detail: `melodic leap of ${leap} semitones exceeds an octave`,
			});
		} else if (MELODIC_DISSONANT_LEAPS.has(leap)) {
			violations.push({
				rule: 'melodicLeaps', at: merged[i + 1].start,
				detail: `dissonant melodic leap of ${leap} semitones`,
			});
		}
	}
	return violations;
}

/** The final melodic move in the counterpoint must be by step. */
export function checkFinalApproachByStep(voice: TimedEvent[]): Violation[] {
	const merged = mergeTies(voice).filter(e => e.pitch !== null);
	if (merged.length < 2) return [];
	const last = merged[merged.length - 1].pitch as number;
	const prev = merged[merged.length - 2].pitch as number;
	if (!isStep(last - prev)) {
		return [{
			rule: 'finalApproachByStep', at: merged[merged.length - 1].start,
			detail: `final note approached by ${Math.abs(last - prev)} semitones (must be step)`,
		}];
	}
	return [];
}

// ---------------------------------------------------------------------------
// Dissonance classification (species 2-5)
// ---------------------------------------------------------------------------

export type DissonanceKind =
	| 'passing'        // approached and left by step, same direction
	| 'neighbor'       // approached and left by step, opposite direction (returns)
	| 'suspension'     // tied from a consonance, resolves down by step
	| 'cambiata'       // left by leap of a third downward then resolves by step
	| 'unclassified';

/**
 * Classify each dissonant CP event by how it is treated melodically.
 * Works on the aligned events plus the merged CP line for approach/leave context.
 */
export function classifyDissonance(
	aligned: AlignedEvent[],
	index: number
): DissonanceKind {
	const a = aligned[index];
	const prev = index > 0 ? aligned[index - 1] : null;
	const next = index < aligned.length - 1 ? aligned[index + 1] : null;
	if (a.event.pitch === null) return 'unclassified';

	const pitch = a.event.pitch;
	const approach = prev?.event.pitch != null ? pitch - prev.event.pitch : null;
	const leave = next?.event.pitch != null ? (next.event.pitch as number) - pitch : null;

	// Suspension: tied into this (dissonant) event, resolving down by step
	if (a.tiedFromPrevious && prev?.interval != null && isConsonant(prev.interval) &&
		next?.interval != null && isConsonant(next.interval) &&
		leave !== null && (leave === -1 || leave === -2)) {
		return 'suspension';
	}

	if (approach !== null && leave !== null) {
		if (isStep(approach) && isStep(leave)) {
			if (Math.sign(approach) === Math.sign(leave)) return 'passing';
			return 'neighbor';
		}
		// Cambiata: enter by step, leave by leap of a third in the same direction,
		// with the note after resolving by step in the opposite direction
		if (isStep(approach) && Math.abs(leave) >= 3 && Math.abs(leave) <= 4) {
			const after = index < aligned.length - 2 ? aligned[index + 2] : null;
			if (after?.event.pitch != null && next?.event.pitch != null) {
				const resolve = (after.event.pitch as number) - (next.event.pitch as number);
				if (isStep(resolve) && Math.sign(resolve) !== Math.sign(leave)) return 'cambiata';
			}
		}
	}

	return 'unclassified';
}

/**
 * Check dissonance treatment:
 *  - events at strong positions (beatPos < strongThreshold) must be consonant,
 *    unless they are suspensions (species 4/5).
 *  - dissonant events anywhere must be classified (passing/neighbor/suspension/cambiata).
 */
export function checkDissonanceTreatment(
	input: SpeciesInput,
	options: {
		allowSuspensionOnStrong?: boolean;
		allowedKinds?: DissonanceKind[];
	} = {}
): Violation[] {
	const {
		allowSuspensionOnStrong = false,
		allowedKinds = ['passing'],
	} = options;

	const aligned = alignToCantusFirmus(input);
	const violations: Violation[] = [];

	for (let i = 0; i < aligned.length; i++) {
		const a = aligned[i];
		if (a.interval === null) continue;
		if (isConsonant(a.interval)) continue;

		const kind = classifyDissonance(aligned, i);
		const onStrong = a.beatPos < 1e-9;

		if (onStrong) {
			if (allowSuspensionOnStrong && kind === 'suspension') continue;
			violations.push({
				rule: 'dissonanceTreatment', at: a.event.start,
				detail: `dissonance (${a.interval % 12} mod 12) on strong beat${allowSuspensionOnStrong ? ' that is not a proper suspension' : ''}`,
			});
			continue;
		}

		if (!allowedKinds.includes(kind) && !(allowSuspensionOnStrong && kind === 'suspension')) {
			violations.push({
				rule: 'dissonanceTreatment', at: a.event.start,
				detail: `weak-beat dissonance is ${kind}; allowed: ${allowedKinds.join(', ')}`,
			});
		}
	}

	return violations;
}
