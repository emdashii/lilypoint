/**
 * Backtracking counterpoint solver shared by all five species generators.
 *
 * Each species describes its counterpoint as a sequence of rhythm slots
 * (CpSlot) against the cantus firmus; the engine assigns a pitch to every
 * slot with depth-first search, backtracking whenever a slot has no legal
 * pitch. The constraints mirror the calibrated validators in
 * src/validation/ (the generator is deliberately a bit STRICTER than the
 * validator — e.g. it never crosses voices even though Fux occasionally
 * does — so its output always validates).
 *
 * Randomness comes from Math.random (seedable via WritePhrase.setSeed), used
 * to order candidate pitches, so the search is deterministic per seed.
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

	constructor(
		private cf: number[],
		scaleDegrees: number[],
		private options: EngineOptions
	) {
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
			if (interval === 0 && !isFirst && !isFinal) return;
			if (interval > MAX_SPACING) return;

			// Final note: octave or unison with the final CF note, approached by step
			if (isFinal) {
				if (intervalMod !== 0) return;
				if (prev !== null) {
					const step = Math.abs(pitch - prev.pitch);
					if (step < 1 || step > 2) return;
				}
			}

			const consonant = CONSONANT.has(intervalMod);
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
						nextObligation = { kind: 'step', dir: Math.random() < 0.7 ? dir : (-dir as 1 | -1) };
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

	/** Weighted random order (deterministic under the seeded Math.random). */
	private weightedShuffle<T extends { weight: number }>(items: T[]): T[] {
		const pool = [...items];
		const ordered: T[] = [];
		while (pool.length > 0) {
			const total = pool.reduce((sum, item) => sum + item.weight, 0);
			let r = Math.random() * total;
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

/** Fourth species: paired halves where each downbeat may tie from the upbeat before. */
export function syncopatedSlots(cfLength: number): CpSlot[] {
	const slots: CpSlot[] = [];
	for (let i = 0; i < cfLength; i++) {
		if (i === cfLength - 1) {
			slots.push({ cfIndex: i, beatPos: 0, relLyDur: 1 });
		} else {
			slots.push({ cfIndex: i, beatPos: 0, relLyDur: 2, mayTieFromPrev: i > 0 });
			slots.push({ cfIndex: i, beatPos: 0.5, relLyDur: 2 });
		}
	}
	return slots;
}

/** Fifth species: a random mix of rhythm templates per CF note. */
export function floridSlots(cfLength: number): CpSlot[] {
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
			: templates[Math.floor(Math.random() * templates.length)];
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
