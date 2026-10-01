import { describe, test, expect } from 'bun:test';
import { getSuffix } from '../../src/helper-functions.js';

describe('Helper Functions', () => {
	describe('getSuffix', () => {
		test('should return correct octave suffixes for LilyPond notation', () => {
			// Test each octave suffix mapping
			expect(getSuffix(0)).toBe(',,,'); // Octave 0
			expect(getSuffix(1)).toBe(',,');  // Octave 1
			expect(getSuffix(2)).toBe(',');   // Octave 2
			expect(getSuffix(3)).toBe('');    // Octave 3
			expect(getSuffix(4)).toBe("'");   // Octave 4 (single quote)
			expect(getSuffix(5)).toBe("''");  // Octave 5 (double quote)
			expect(getSuffix(6)).toBe("'''"); // Octave 6
			expect(getSuffix(7)).toBe("''''"); // Octave 7
			expect(getSuffix(8)).toBe("'''''"); // Octave 8
		});

		test('should throw error for invalid octave numbers', () => {
			expect(() => getSuffix(-1)).toThrow('Error could not get proper suffix');
			expect(() => getSuffix(9)).toThrow('Error could not get proper suffix');
			expect(() => getSuffix(100)).toThrow('Error could not get proper suffix');
		});

	});

});
