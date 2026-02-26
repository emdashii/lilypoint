/**
 * Integration tests for WritePhrase orchestration
 * Tests that WritePhrase correctly generates phrases for all 5 species types
 */

import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../../src/write-phrase.js';
import { Note } from '../../src/note.js';

describe('WritePhrase Integration', () => {
	describe('Species 1 (First Species)', () => {
		test('should generate a phrase with equal upper and lower voice lengths', () => {
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBe(phrase.getLowerVoice().length);
			expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
		});

		test('should produce Note objects in both voices', () => {
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note).toBeInstanceOf(Note);
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note).toBeInstanceOf(Note);
			}
		});
	});

	describe('Species 2 (Second Species)', () => {
		test('should generate a phrase with 2:1 note ratio', () => {
			const wp = new WritePhrase('C', 4, 2, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBe(phrase.getLowerVoice().length * 2);
		});

		test('should produce valid notes', () => {
			const wp = new WritePhrase('G', 4, 2, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
			expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
		});
	});

	describe('Species 3 (Third Species)', () => {
		test('should generate a phrase with 4:1 note ratio', () => {
			const wp = new WritePhrase('C', 4, 3, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBe(phrase.getLowerVoice().length * 4);
		});

		test('should produce valid notes', () => {
			const wp = new WritePhrase('F', 4, 3, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
			expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
		});
	});

	describe('Species 4 (Fourth Species)', () => {
		test('should generate a phrase with syncopated output', () => {
			const wp = new WritePhrase('C', 4, 4, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
			expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
		});

		test('should produce valid notes', () => {
			const wp = new WritePhrase('G', 4, 4, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note).toBeInstanceOf(Note);
				expect(note.getNote()).toBeGreaterThanOrEqual(0);
				expect(note.getNote()).toBeLessThan(88);
			}
		});
	});

	describe('Species 5 (Fifth Species)', () => {
		test('should generate a phrase with mixed rhythm', () => {
			const wp = new WritePhrase('C', 4, 5, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
			expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
		});

		test('should produce valid notes', () => {
			const wp = new WritePhrase('D', 4, 5, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note).toBeInstanceOf(Note);
				expect(note.getNote()).toBeGreaterThanOrEqual(0);
				expect(note.getNote()).toBeLessThan(88);
			}
		});
	});

	describe('Species rhythm and note lengths', () => {
		// Helper: compute total beats for a voice (LilyPond duration N = 1/N of whole = 4/N quarter beats)
		function totalBeats(voice: Note[]): number {
			return voice.reduce((sum, n) => sum + 4 / n.getLength(), 0);
		}

		test('Species 1: both voices should use quarter notes (length 4) in 4/4', () => {
			WritePhrase.setSeed(12345);
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note.getLength()).toBe(4);
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 2: upper voice should use eighth notes (length 8) in 4/4', () => {
			WritePhrase.setSeed(12345);
			const wp = new WritePhrase('C', 4, 2, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note.getLength()).toBe(8);
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 3: upper voice should use sixteenth notes (length 16) in 4/4', () => {
			WritePhrase.setSeed(12345);
			const wp = new WritePhrase('C', 4, 3, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getUpperVoice()) {
				expect(note.getLength()).toBe(16);
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 4: first upper note should be quarter, rest eighth notes in 4/4', () => {
			WritePhrase.setSeed(12345);
			const wp = new WritePhrase('C', 4, 4, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();
			const upper = phrase.getUpperVoice();

			expect(upper[0].getLength()).toBe(4);
			for (let i = 1; i < upper.length; i++) {
				expect(upper[i].getLength()).toBe(8);
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 5: upper voice should use valid LilyPond durations', () => {
			WritePhrase.setSeed(12345);
			const wp = new WritePhrase('C', 4, 5, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();
			const validDurations = [1, 2, 4, 8, 16, 32];

			for (const note of phrase.getUpperVoice()) {
				expect(validDurations).toContain(note.getLength());
			}
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('all species should have equal total duration in both voices (4/4 time)', () => {
			for (const species of [1, 2, 3, 4, 5]) {
				WritePhrase.setSeed(12345);
				const wp = new WritePhrase('C', 4, species, '4/4');
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				const upperBeats = totalBeats(phrase.getUpperVoice());
				const lowerBeats = totalBeats(phrase.getLowerVoice());

				expect(upperBeats).toBe(lowerBeats);
			}
		});

		test('all species should have equal total duration in both voices (3/4 time)', () => {
			for (const species of [1, 2, 3, 4, 5]) {
				WritePhrase.setSeed(12345);
				const wp = new WritePhrase('C', 4, species, '3/4');
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				const upperBeats = totalBeats(phrase.getUpperVoice());
				const lowerBeats = totalBeats(phrase.getLowerVoice());

				expect(upperBeats).toBe(lowerBeats);
			}
		});

		test('total duration should match expected beats for the phrase', () => {
			WritePhrase.setSeed(12345);
			// 4 measures of 4/4 = 16 quarter-note beats
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(totalBeats(phrase.getLowerVoice())).toBe(16);
			expect(totalBeats(phrase.getUpperVoice())).toBe(16);
		});

		test('Species 2: note lengths should scale with time signature beat unit', () => {
			WritePhrase.setSeed(12345);
			// In 6/8, beat unit is 8; upper should be 8*2=16
			const wp = new WritePhrase('C', 4, 2, '6/8');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(8);
			}
			for (const note of phrase.getUpperVoice()) {
				expect(note.getLength()).toBe(16);
			}
		});
	});

	describe('Common properties', () => {
		test('should work with different keys for all species', () => {
			const keys = ['C', 'G', 'F', 'D'];
			const speciesTypes = [1, 2, 3, 4, 5];

			for (const key of keys) {
				for (const species of speciesTypes) {
					const wp = new WritePhrase(key, 4, species, '4/4');
					wp.writeThePhrase();
					const phrase = wp.getPhrase();

					expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
					expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
				}
			}
		});

		test('should set key information on phrase', () => {
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getKeyString()).toBeDefined();
		});

		test('should set time signature on phrase', () => {
			const wp = new WritePhrase('C', 4, 1, '3/4');
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			expect(phrase.getTimeSig()).toBe('3/4');
		});

		test('should handle different phrase lengths', () => {
			const lengths = [2, 4, 6, 8];

			for (const length of lengths) {
				const wp = new WritePhrase('C', length, 1, '4/4');
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				expect(phrase.getUpperVoice().length).toBeGreaterThan(0);
				expect(phrase.getLowerVoice().length).toBeGreaterThan(0);
			}
		});
	});
});
