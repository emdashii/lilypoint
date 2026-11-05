/**
 * Integration tests for WritePhrase orchestration
 * Tests that WritePhrase correctly generates phrases for all 5 species types
 */

import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../../src/write-phrase.js';
import { Note } from '../../src/note.js';

describe('WritePhrase Integration', () => {
	describe('Species rhythm and note lengths', () => {
		// Helper: compute total beats for a voice (LilyPond duration N = 1/N of whole = 4/N quarter beats)
		function totalBeats(voice: Note[]): number {
			return voice.reduce((sum, n) => sum + 4 / n.getLength(), 0);
		}

		test('Species 1: both voices should use quarter notes (length 4) in 4/4', () => {
			const wp = new WritePhrase('C', 4, 1, '4/4');
			wp.setSeed(12345);
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
			const wp = new WritePhrase('C', 4, 2, '4/4');
			wp.setSeed(12345);
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			const upper = phrase.getUpperVoice();
			for (let i = 0; i < upper.length - 1; i++) {
				expect(upper[i].getLength()).toBe(8);
			}
			// final note is held for the whole final CF note
			expect(upper[upper.length - 1].getLength()).toBe(4);
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 3: upper voice should use sixteenth notes (length 16) in 4/4', () => {
			const wp = new WritePhrase('C', 4, 3, '4/4');
			wp.setSeed(12345);
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			const upper = phrase.getUpperVoice();
			for (let i = 0; i < upper.length - 1; i++) {
				expect(upper[i].getLength()).toBe(16);
			}
			expect(upper[upper.length - 1].getLength()).toBe(4);
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 4: upper voice uses eighths and a held final quarter in 4/4', () => {
			const wp = new WritePhrase('C', 4, 4, '4/4');
			wp.setSeed(12345);
			wp.writeThePhrase();
			const phrase = wp.getPhrase();
			const upper = phrase.getUpperVoice();

			// syncopated halves relative to the CF: eighths in 4/4, final note held
			for (let i = 0; i < upper.length - 1; i++) {
				expect(upper[i].getLength()).toBe(8);
			}
			expect(upper[upper.length - 1].getLength()).toBe(4);
			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(4);
			}
		});

		test('Species 5: upper voice divides each quarter-note cantus beat into whole, half, or quarter parts in 4/4', () => {
			for (const seed of [1, 2, 3, 12345]) {
				const wp = new WritePhrase('C', 4, 5, '4/4');
				wp.setSeed(seed);
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				// Florid rhythm uses whole, half, and quarter subdivisions of a cantus note:
				// quarters, eighths, and sixteenths against quarter-note cantus beats.
				for (const note of phrase.getUpperVoice()) {
					expect([4, 8, 16]).toContain(note.getLength());
				}
				for (const note of phrase.getLowerVoice()) {
					expect(note.getLength()).toBe(4);
				}
			}
		});

		test('all species fill four bars of 4/4 (sixteen quarter beats) in both voices', () => {
			for (const species of [1, 2, 3, 4, 5]) {
				const wp = new WritePhrase('C', 4, species, '4/4');
				wp.setSeed(12345);
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				expect(totalBeats(phrase.getLowerVoice())).toBe(16);
				expect(totalBeats(phrase.getUpperVoice())).toBe(16);
			}
		});

		test('all species fill four bars of 3/4 (twelve quarter beats) in both voices', () => {
			for (const species of [1, 2, 3, 4, 5]) {
				const wp = new WritePhrase('C', 4, species, '3/4');
				wp.setSeed(12345);
				wp.writeThePhrase();
				const phrase = wp.getPhrase();

				expect(totalBeats(phrase.getLowerVoice())).toBe(12);
				expect(totalBeats(phrase.getUpperVoice())).toBe(12);
			}
		});

		test('Species 2: note lengths should scale with time signature beat unit', () => {
			// In 6/8, beat unit is 8; upper should be 8*2=16
			const wp = new WritePhrase('C', 4, 2, '6/8');
			wp.setSeed(12345);
			wp.writeThePhrase();
			const phrase = wp.getPhrase();

			for (const note of phrase.getLowerVoice()) {
				expect(note.getLength()).toBe(8);
			}
			const upper = phrase.getUpperVoice();
			for (let i = 0; i < upper.length - 1; i++) {
				expect(upper[i].getLength()).toBe(16);
			}
			expect(upper[upper.length - 1].getLength()).toBe(8);
		});
	});

});
