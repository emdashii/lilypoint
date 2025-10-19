import { describe, test, expect } from 'bun:test';
import { getSuffix, verboseLog } from '../../src/helper-functions.js';

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

		test('should handle boundary octaves correctly', () => {
			// Lowest valid octave
			expect(getSuffix(0)).toBe(',,,');

			// Middle C octave
			expect(getSuffix(3)).toBe('');

			// Highest valid octave
			expect(getSuffix(8)).toBe("'''''");
		});
	});

	describe('verboseLog', () => {
		test('should not throw error when called', () => {
			// verboseLog should handle various input types
			expect(() => verboseLog('test')).not.toThrow();
			expect(() => verboseLog('test', 123, { key: 'value' })).not.toThrow();
			expect(() => verboseLog()).not.toThrow();
		});

		test('should accept multiple arguments', () => {
			// Should not throw when called with various argument types
			expect(() => verboseLog('string', 42, true, null, undefined, { test: true })).not.toThrow();
		});
	});
});
