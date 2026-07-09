/**
 * Integration tests for the species generator classes: structural contract
 * of each species' output (note counts, relative durations, ties, diatonic
 * membership, determinism). Musical rule correctness is covered end-to-end
 * by tests/e2e/generated-species.test.ts against the calibrated validators.
 *
 * Species classes emit durations RELATIVE to one CF note (1 = whole CF note,
 * 2 = half of it, 4 = quarter); WritePhrase scales them by the beat unit.
 */

import { describe, test, expect } from 'bun:test';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';
import { WritePhrase } from '../../src/write-phrase.js';
import { FirstSpecies } from '../../src/first-species.js';
import { SecondSpecies } from '../../src/second-species.js';
import { ThirdSpecies } from '../../src/third-species.js';
import { FourthSpecies } from '../../src/fourth-species.js';
import { FifthSpecies } from '../../src/fifth-species.js';
import { Species } from '../../src/species.js';

const C_MAJOR_SCALE = [
	NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4, NoteType.Note_F4,
	NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4,
];
const SCALE_CLASSES = new Set(C_MAJOR_SCALE.map(d => d % 12));

/** A short, well-formed C major cantus firmus (starts/ends on tonic, steps). */
function cantusFirmus(pitches: number[] = [39, 41, 43, 44, 46, 44, 43, 41, 39]): Note[] {
	return pitches.map(p => new Note(p as NoteType, 4));
}

function generate(species: Species, cf: Note[] = cantusFirmus(), seed = 12345): Note[] {
	WritePhrase.setSeed(seed);
	species.setScaleDegrees(C_MAJOR_SCALE);
	return species.generateCounterpoint(cf);
}

function expectDiatonic(notes: Note[]): void {
	for (const note of notes) {
		expect(SCALE_CLASSES.has(note.getNote() % 12)).toBe(true);
	}
}

/** Sum of durations in CF-note units (relative duration d contributes 1/d). */
function totalCfUnits(notes: Note[]): number {
	return notes.reduce((sum, n) => sum + 1 / n.getLength(), 0);
}

describe('FirstSpecies structure', () => {
	test('1:1 — one whole note per CF note', () => {
		const result = generate(new FirstSpecies());
		expect(result.length).toBe(9);
		for (const note of result) expect(note.getLength()).toBe(1);
	});

	test('diatonic output', () => {
		expectDiatonic(generate(new FirstSpecies()));
	});

	test('deterministic per seed', () => {
		const a = generate(new FirstSpecies(), cantusFirmus(), 7).map(n => n.getNote());
		const b = generate(new FirstSpecies(), cantusFirmus(), 7).map(n => n.getNote());
		expect(a).toEqual(b);
	});

	test('handles a minimal 3-note CF', () => {
		const result = generate(new FirstSpecies(), cantusFirmus([39, 41, 39]));
		expect(result.length).toBe(3);
	});
});

describe('SecondSpecies structure', () => {
	test('2:1 — two halves per CF note, single held final', () => {
		const result = generate(new SecondSpecies());
		expect(result.length).toBe(8 * 2 + 1);
		for (let i = 0; i < result.length - 1; i++) {
			expect(result[i].getLength()).toBe(2);
		}
		expect(result[result.length - 1].getLength()).toBe(1);
	});

	test('diatonic output', () => {
		expectDiatonic(generate(new SecondSpecies()));
	});

	test('fills exactly one CF unit per CF note', () => {
		const result = generate(new SecondSpecies());
		expect(totalCfUnits(result)).toBe(9);
	});
});

describe('ThirdSpecies structure', () => {
	test('4:1 — four quarters per CF note, single held final', () => {
		const result = generate(new ThirdSpecies());
		expect(result.length).toBe(8 * 4 + 1);
		for (let i = 0; i < result.length - 1; i++) {
			expect(result[i].getLength()).toBe(4);
		}
		expect(result[result.length - 1].getLength()).toBe(1);
	});

	test('diatonic output', () => {
		expectDiatonic(generate(new ThirdSpecies()));
	});
});

describe('FourthSpecies structure', () => {
	test('syncopated halves with a single held final', () => {
		const result = generate(new FourthSpecies());
		expect(result.length).toBe(8 * 2 + 1);
		for (let i = 0; i < result.length - 1; i++) {
			expect(result[i].getLength()).toBe(2);
		}
		expect(result[result.length - 1].getLength()).toBe(1);
	});

	test('contains ligatures, and tied pairs share their pitch', () => {
		const result = generate(new FourthSpecies());
		const tied = result.filter(n => n.getTied());
		expect(tied.length).toBeGreaterThan(0);
		for (let i = 0; i < result.length - 1; i++) {
			if (result[i].getTied()) {
				expect(result[i + 1].getNote()).toBe(result[i].getNote());
			}
		}
	});

	test('final note is never tied', () => {
		const result = generate(new FourthSpecies());
		expect(result[result.length - 1].getTied()).toBe(false);
	});
});

describe('FifthSpecies structure', () => {
	test('florid rhythm still fills exactly one CF unit per CF note', () => {
		const result = generate(new FifthSpecies());
		expect(totalCfUnits(result)).toBe(9);
		expect(result[result.length - 1].getLength()).toBe(1);
	});

	test('uses mixed durations (not a single uniform value)', () => {
		// Across a few seeds at least one phrase must mix halves and quarters
		const seen = new Set<number>();
		for (const seed of [1, 2, 3]) {
			for (const note of generate(new FifthSpecies(), cantusFirmus(), seed)) {
				seen.add(note.getLength());
			}
		}
		expect(seen.has(2)).toBe(true);
		expect(seen.has(4)).toBe(true);
	});

	test('diatonic output', () => {
		expectDiatonic(generate(new FifthSpecies()));
	});
});
