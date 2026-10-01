import { describe, test, expect } from 'bun:test';
import { CantusFirmus } from '../../src/cantus-firmus.js';
import { createRandom } from '../../src/random.js';

// Tonic piano indices and scale intervals are musical expectations, independent
// of the generator's key and scale helpers.
const tonics: [string, number][] = [
	['C', 39], ['Db', 40], ['D', 41], ['Eb', 42], ['E', 43],
	['F', 44], ['F#', 45], ['Gb', 33], ['G', 34], ['Ab', 35],
	['A', 36], ['Bb', 37], ['B', 38],
];
const modes: ('major' | 'minor')[] = ['major', 'minor'];

describe('Seeded cantus musical contracts', () => {
	for (const [key, tonic] of tonics) for (const mode of modes) {
		test(`${key} ${mode}: tonic cadence, one climax, diatonic pitches, legal leaps`, () => {
			const scale = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
			for (const seed of [1, 7, 42]) for (const length of [4, 8, 16]) {
				const pitches = new CantusFirmus(key, length, mode, createRandom(seed)).generate().map(n => n.getNote());
				expect(pitches).toHaveLength(length);
				expect(pitches[0]).toBe(tonic);
				expect(pitches.at(-1)).toBe(tonic);
				// Scale degree two approaches the tonic by a genuine step.
				expect(pitches.at(-2)).toBe(tonic + 2);
				expect(pitches.filter(p => p === Math.max(...pitches))).toHaveLength(1);
				for (const pitch of pitches) {
					expect(pitch).toBeGreaterThanOrEqual(0);
					expect(pitch).toBeLessThan(88);
					expect(scale).toContain((pitch - tonic + 12) % 12);
				}
				for (let i = 1; i < pitches.length; i++) {
					const interval = Math.abs(pitches[i] - pitches[i - 1]);
					expect(interval).toBeGreaterThan(0);
					expect(interval).toBeLessThanOrEqual(12);
					expect([6, 10, 11]).not.toContain(interval);
				}
			}
		});
	}

	test.each([8, 32, 64])('length %i: seeds reproduce melodies and provide variation', length => {
		const generate = (seed: number) => new CantusFirmus('C', length, 'major', createRandom(seed)).generate().map(n => n.getNote());
		const melodies = [1, 7, 42].map(generate);
		expect(generate(7)).toEqual(melodies[1]);
		expect(new Set(melodies.map(pitches => JSON.stringify(pitches))).size).toBeGreaterThan(1);
	});
});
