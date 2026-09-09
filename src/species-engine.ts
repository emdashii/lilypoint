import { createRandom, RandomSource } from './random.js';
import { KeyInfo } from './key.js';
import { spellPitch } from './pitch.js';
import { regularMelodicInterval, spelledConsonance } from './validation/student-rules.js';
/** Shared bounded pitch search. Species supply rhythm slots and rule options.
 * Randomness belongs to a generation request. The assembled score is validated
 * independently by WritePhrase before it becomes the returned phrase.
 */

import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export interface CpSlot {
	/** Index of the CF note this slot sounds against */
	cfIndex: number;
	/** Position within the CF note: 0 = downbeat (strong), fractions = weak */
	beatPos: number;
	/** Duration relative to one CF note (1 = whole CF note, 2 = half, 4 = quarter) */
	relLyDur: number;
	/** This slot may tie from the previous slot (fourth/fifth species suspensions) */
	mayTieFromPrev?: boolean;
	mustTieFromPrev?: boolean;
	mustSuspend?: boolean;
}

export interface SolvedNote {
	pitch: number;
	relLyDur: number;
	/** True when tied to the NEXT note (LilyPond `~`) */
	tiedToNext: boolean;
}

/** Thrown when no counterpoint satisfies the rules for the given CF. */
export class CounterpointUnsolvableError extends Error {
	constructor(species: string, cf: number[]) {
		super(`No valid ${species} counterpoint found for cantus firmus [${cf.join(', ')}]`);
		this.name = 'CounterpointUnsolvableError';
	}
}

/**
 * Convert solved pitches to Note objects. Note lengths hold the duration
 * RELATIVE to one CF note (1, 2, 4); WritePhrase scales them by the beat
 * unit when assembling the phrase.
 */
export function solvedToNotes(solved: SolvedNote[]): Note[] {
	return solved.map(s => {
		const note = new Note(s.pitch as NoteType, s.relLyDur);
		note.setTied(s.tiedToNext);
		return note;
	});
}

export interface EngineOptions {
	/** Allow repeating the previous pitch (first species only) */
	allowRepeat?: boolean;
	minor?: boolean;
	student?: boolean;
	key?: KeyInfo;
	random?: RandomSource;
	/** Weak-beat dissonance policy */
	weakDissonance: 'none' | 'passing' | 'passing+neighbor';
	/** Node budget before giving up (search is usually far cheaper) */
	nodeBudget?: number;
}

const CONSONANT = new Set([0, 3, 4, 7, 8, 9]);
/** Melodic intervals the generator may write (semitones; sign = direction). */
const MELODIC_DELTAS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 7, -7, 8, 12, -12];
const MAX_SPACING = 16; // generator keeps to the textbook tenth

type Obligation =
	| { kind: 'none' }
	/** next pitch must move by step in this direction (passing/neighbor/suspension) */
	| { kind: 'step'; dir: 1 | -1; consonant?: boolean };

export class SpeciesEngine {
	private scaleClasses: Set<number>;
	private nodesVisited = 0;
	private random: RandomSource;

	constructor(
		private cf: number[],
		scaleDegrees: number[],
		private options: EngineOptions
	) {
		this.random = options.random ?? createRandom();
		this.scaleClasses = new Set(scaleDegrees.map(d => ((d % 12) + 12) % 12));
	}

	private inScale(pitch: number): boolean {
		return this.scaleClasses.has(((pitch % 12) + 12) % 12);
	}

	/**
	 * Solve pitches for the slot sequence. Returns null if the search space is
	 * exhausted (caller should retry with a different cantus firmus).
	 */
	solve(slots: CpSlot[]): SolvedNote[] | null {
		this.nodesVisited = 0;
		const assignment: SolvedNote[] = [];
		if (this.search(slots, 0, assignment, { kind: 'none' })) {
			return assignment;
		}
		return null;
	}

	private search(
		slots: CpSlot[],
		index: number,
		assignment: SolvedNote[],
		obligation: Obligation
	): boolean {
		if (index === slots.length) return true;
		if (++this.nodesVisited > (this.options.nodeBudget ?? 200000)) return false;

		for (const candidate of this.candidatesFor(slots, index, assignment, obligation)) {
			assignment.push(candidate.note);
			if (candidate.tiesPrev && index > 0) {
				assignment[index - 1] = { ...assignment[index - 1], tiedToNext: true };
			}
			if (this.search(slots, index + 1, assignment, candidate.obligation)) {
				return true;
			}
			assignment.pop();
			if (candidate.tiesPrev && index > 0) {
				assignment[index - 1] = { ...assignment[index - 1], tiedToNext: false };
			}
		}
		return false;
	}

	private candidatesFor(
		slots: CpSlot[],
		index: number,
		assignment: SolvedNote[],
		obligation: Obligation
	): { note: SolvedNote; obligation: Obligation; tiesPrev: boolean; weight: number }[] {
		const slot = slots[index];
		const cfPitch = this.cf[slot.cfIndex];
		const isFirst = index === 0;
		const isFinal = index === slots.length - 1;
		const prev = index > 0 ? assignment[index - 1] : null;
		const prevSlot = index > 0 ? slots[index - 1] : null;

		// Base pitch set
		let pitches: number[];
		if (isFirst) {
			// Perfect consonance above (or at) the opening CF note
			pitches = [cfPitch, cfPitch + 7, cfPitch + 12].filter(p => this.inScale(p));
		} else if (obligation.kind === 'step') {
			pitches = [prev!.pitch + obligation.dir, prev!.pitch + 2 * obligation.dir]
				.filter(p => this.inScale(p));
		} else {
			pitches = MELODIC_DELTAS.map(d => prev!.pitch + d).filter(p => this.inScale(p));
			if (this.options.allowRepeat) pitches.push(prev!.pitch);
		}


		// Alter degree seven only at the final approach. Natural minor remains
		// available elsewhere, so an augmented second is not added to the scale.
		if (index === slots.length - 2 && this.options.minor) {
			const tonicClass = ((this.cf.at(-1)! % 12) + 12) % 12;
			for (let p = 0; p <= 87; p++) if ((p + 1) % 12 === tonicClass &&
				prev && MELODIC_DELTAS.includes(p - prev.pitch) &&
				(obligation.kind === 'none' || (Math.sign(p - prev.pitch) === obligation.dir && Math.abs(p - prev.pitch) <= 2))) pitches.push(p);
		}

		const tieCandidate = Boolean(slot.mayTieFromPrev) && prev !== null &&
			obligation.kind === 'none';

		const results: { note: SolvedNote; obligation: Obligation; tiesPrev: boolean; weight: number }[] = [];

		const consider = (pitch: number, tiesPrev: boolean): void => {
			if (!Number.isInteger(pitch) || pitch < 0 || pitch > 87) return;
			const interval = pitch - cfPitch;
			const intervalMod = ((interval % 12) + 12) % 12;
			const strong = slot.beatPos === 0;

			// Range: never cross below the CF; unison only at the very ends
			if (interval < 0) return;
			if (slot.mustTieFromPrev && !tiesPrev) return;
			if (slot.mustSuspend && CONSONANT.has(intervalMod)) return;
			if (interval === 0 && !isFirst && !isFinal) return;
			if (interval > MAX_SPACING) return;

			// Final note: octave or unison with the final CF note, approached by step
			if (isFinal) {
				if (intervalMod !== 0) return;
				if (prev !== null) {
					const step = Math.abs(pitch - prev.pitch);
					if (step < 1 || step > 2) return;
					if (pitch > prev.pitch && step !== 1) return;
				}
			}

			const consonant = CONSONANT.has(intervalMod);
			if (this.options.student) {
				const key = this.options.key;
				const spelling = key ? spellPitch(pitch, key, this.options.minor && index === slots.length - 2 ? 'cdefgab'[('cdefgab'.indexOf(key.key[0]) + 6) % 7] : undefined) : undefined;
				if (key && spelling && consonant && !spelledConsonance(spelling, spellPitch(cfPitch, key))) return;
				if (key && spelling && prev && !regularMelodicInterval(spellPitch(prev.pitch, key, this.options.minor && isFinal ? 'cdefgab'[('cdefgab'.indexOf(key.key[0]) + 6) % 7] : undefined), spelling)) return;
				if (prev && prevSlot) {
					const cpMove = pitch - prev.pitch;
					const cfMove = cfPitch - this.cf[prevSlot.cfIndex];
					if ([0,7].includes(intervalMod) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) return;
					if (isFinal && Math.sign(cpMove) === Math.sign(this.cf.at(-1)! - this.cf.at(-2)!)) return;
					const attacks = assignment.filter((_, i) => i === 0 || !assignment[i - 1].tiedToNext);
					if (!tiesPrev && attacks.length >= 2) {
						const leap = attacks.at(-1)!.pitch - attacks.at(-2)!.pitch;
						if (Math.abs(leap) > 4 && (Math.abs(cpMove) < 1 || Math.abs(cpMove) > 2 || Math.sign(cpMove) === Math.sign(leap))) return;
					}
				}
				if (this.options.weakDissonance === 'passing+neighbor' && slot.beatPos === 0.5 && !consonant) return;
				if (slot.mustTieFromPrev && slot.mustSuspend && intervalMod !== 10) return;
				if (slots.some(s => s.mustTieFromPrev) && slot.beatPos === 0.5 && [0,7].includes(intervalMod)) {
					const before = slots.slice(0,index).findLastIndex(s => s.beatPos === 0.5);
					if (before >= 0 && Math.abs(assignment[before].pitch - this.cf[slots[before].cfIndex]) % 12 === intervalMod) return;
				}
			}
			if (obligation.kind === 'step' && obligation.consonant && !consonant) return;
			let nextObligation: Obligation = { kind: 'none' };

			if (!consonant) {
				if (isFirst || isFinal) return;
				if (tiesPrev) {
					// Suspension: tied dissonance on the downbeat resolves down by step
					if (!strong) return;
					if (!prev || !prevSlot || !CONSONANT.has(Math.abs(prev.pitch - this.cf[prevSlot.cfIndex]) % 12)) return;
					nextObligation = { kind: 'step', dir: -1, consonant: true };
				} else {
					// Struck dissonance: weak beats only, entered by step
					if (strong) return;
					if (this.options.weakDissonance === 'none') return;
					if (prev === null) return;
					const approach = pitch - prev.pitch;
					if (Math.abs(approach) < 1 || Math.abs(approach) > 2) return;
					const dir = Math.sign(approach) as 1 | -1;
					if (this.options.weakDissonance === 'passing') {
						nextObligation = { kind: 'step', dir };
					} else {
						// passing or neighbor: continue by step either way; pick now so
						// the obligation is well-defined
						nextObligation = { kind: 'step', dir: this.random() < 0.7 ? dir : (-dir as 1 | -1) };
					}
				}
			}

			// Note-to-note parallel perfect intervals (mirrors the validator)
			if (prev !== null && prevSlot !== null &&
				prevSlot.cfIndex !== slot.cfIndex && prev.pitch !== pitch) {
				const prevIntervalMod = ((Math.abs(prev.pitch - this.cf[prevSlot.cfIndex]) % 12) + 12) % 12;
				if (prevIntervalMod === intervalMod && (intervalMod === 0 || intervalMod === 7)) {
					return;
				}
			}

			// Weight: prefer imperfect consonance, stepwise motion, contrary motion
			let weight = 1;
			if (tiesPrev) {
				// Ligatures ARE the point of the syncopated species; dissonant
				// ones (true suspensions) are the ideal. Melodic-motion weights
				// don't apply to a held note.
				weight = consonant ? 20 : 40;
			} else {
				if ([3, 4, 8, 9].includes(intervalMod)) weight *= 3;
				if (prev !== null) {
					const move = Math.abs(pitch - prev.pitch);
					if (move >= 1 && move <= 2) weight *= 3;
					else if (move > 5) weight *= 0.4;
					if (pitch === prev.pitch) weight *= 0.3;
					// contrary motion against the CF when the CF moves
					if (prevSlot !== null && prevSlot.cfIndex !== slot.cfIndex) {
						const cfMove = cfPitch - this.cf[prevSlot.cfIndex];
						const cpMove = pitch - prev.pitch;
						if (cfMove !== 0 && Math.sign(cfMove) !== Math.sign(cpMove) && cpMove !== 0) {
							weight *= 2;
						}
					}
				}
			}

			// Lookahead: if the NEXT slot may tie from this one (this is a
			// suspension preparation), prefer pitches that can actually be held
			// over the barline — above the next CF note, ideally dissonant
			// against it so a genuine suspension results.
			const next = index + 1 < slots.length ? slots[index + 1] : null;
			if (next?.mayTieFromPrev) {
				const nextInterval = pitch - this.cf[next.cfIndex];
				if (nextInterval > 0 && nextInterval <= MAX_SPACING) {
					weight *= 2;
					const nextMod = ((nextInterval % 12) + 12) % 12;
					// 2nds, 4ths, 7ths above resolve down by step onto consonances
					if ([1, 2, 5, 10, 11].includes(nextMod)) weight *= 2;
				}
			}

			results.push({
				note: { pitch, relLyDur: slot.relLyDur, tiedToNext: false },
				obligation: nextObligation,
				tiesPrev,
				weight,
			});
		};

		if (tieCandidate) {
			consider(prev!.pitch, true);
		}
		for (const pitch of new Set(pitches)) {
			consider(pitch, false);
		}

		return this.weightedShuffle(results);
	}

	/** Weighted random order from the request random source. */
	private weightedShuffle<T extends { weight: number }>(items: T[]): T[] {
		const pool = [...items];
		const ordered: T[] = [];
		while (pool.length > 0) {
			const total = pool.reduce((sum, item) => sum + item.weight, 0);
			let r = this.random() * total;
			let picked = pool.length - 1;
			for (let i = 0; i < pool.length; i++) {
				r -= pool[i].weight;
				if (r <= 0) { picked = i; break; }
			}
			ordered.push(pool.splice(picked, 1)[0]);
		}
		return ordered;
	}
}

// ---------------------------------------------------------------------------
// Slot-sequence builders used by the species classes
// ---------------------------------------------------------------------------

/** n slots per CF note at even positions, final CF note gets a single note. */
export function uniformSlots(cfLength: number, perNote: 1 | 2 | 4): CpSlot[] {
	const slots: CpSlot[] = [];
	for (let i = 0; i < cfLength; i++) {
		if (i === cfLength - 1 || perNote === 1) {
			slots.push({ cfIndex: i, beatPos: 0, relLyDur: 1 });
		} else {
			for (let k = 0; k < perNote; k++) {
				slots.push({ cfIndex: i, beatPos: k / perNote, relLyDur: perNote });
			}
		}
	}
	return slots;
}

/** Fourth species: opening silence, mandatory interior ties, cadential suspension. */
export function syncopatedSlots(cfLength: number): CpSlot[] {
	const slots: CpSlot[] = [];
	for (let i = 0; i < cfLength; i++) {
		if (i === cfLength - 1) {
			slots.push({ cfIndex: i, beatPos: 0, relLyDur: 1 });
		} else {
			if (i > 0) slots.push({ cfIndex: i, beatPos: 0, relLyDur: 2, mayTieFromPrev: true, mustTieFromPrev: true, mustSuspend: i === cfLength - 2 });
			slots.push({ cfIndex: i, beatPos: 0.5, relLyDur: 2 });
		}
	}
	return slots;
}

/** Fifth species: a random mix of rhythm templates per CF note. */
export function floridSlots(cfLength: number, random: RandomSource = createRandom()): CpSlot[] {
	const templates: { beatPos: number; relLyDur: number }[][] = [
		[{ beatPos: 0, relLyDur: 2 }, { beatPos: 0.5, relLyDur: 2 }],
		[{ beatPos: 0, relLyDur: 4 }, { beatPos: 0.25, relLyDur: 4 }, { beatPos: 0.5, relLyDur: 4 }, { beatPos: 0.75, relLyDur: 4 }],
		[{ beatPos: 0, relLyDur: 2 }, { beatPos: 0.5, relLyDur: 4 }, { beatPos: 0.75, relLyDur: 4 }],
		[{ beatPos: 0, relLyDur: 4 }, { beatPos: 0.25, relLyDur: 4 }, { beatPos: 0.5, relLyDur: 2 }],
	];

	const slots: CpSlot[] = [];
	for (let i = 0; i < cfLength; i++) {
		if (i === cfLength - 1) {
			slots.push({ cfIndex: i, beatPos: 0, relLyDur: 1 });
			continue;
		}
		const template = i === 0
			? templates[0]
			: templates[Math.floor(random() * templates.length)];
		for (let k = 0; k < template.length; k++) {
			slots.push({
				cfIndex: i,
				beatPos: template[k].beatPos,
				relLyDur: template[k].relLyDur,
				// A downbeat half note may tie from the previous upbeat (suspension)
				mayTieFromPrev: k === 0 && i > 0 && template[k].relLyDur === 2,
			});
		}
	}
	return slots;
}
