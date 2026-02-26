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
