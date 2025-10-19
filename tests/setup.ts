// Test configuration and global setup
// This file is automatically loaded by Bun's test runner before running tests

// Global test configuration
export const TEST_CONFIG = {
	// Default seed for deterministic testing
	DEFAULT_SEED: 12345,

	// Test timeout in milliseconds
	DEFAULT_TIMEOUT: 5000,

	// Common test keys
	TEST_KEYS: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'Db', 'Eb', 'Gb', 'Ab', 'Bb', 'F#'],

	// Common test modes
	TEST_MODES: ['major', 'minor'],

	// Common test time signatures
	TEST_TIME_SIGNATURES: ['2/4', '3/4', '4/4', '6/8'],

	// Species types
	SPECIES_TYPES: [1, 2, 3, 4, 5],

	// Test phrase lengths (in measures)
	TEST_PHRASE_LENGTHS: [2, 3, 4, 8],
};

// Helper to reset random seed for deterministic tests
export function resetSeed(seed: number = TEST_CONFIG.DEFAULT_SEED): void {
	// Note: WritePhrase.setSeed() will be called in tests that need it
	Math.random = (() => {
		let s = seed;
		return () => {
			s = Math.imul(s ^ s >>> 15, s | 1);
			s ^= s + Math.imul(s ^ s >>> 7, s | 61);
			return ((s ^ s >>> 14) >>> 0) / 4294967296;
		};
	})();
}

// Console logger for debugging tests (disabled by default)
export const testLog = {
	enabled: false,
	log: (...args: any[]) => {
		if (testLog.enabled) {
			console.log('[TEST]', ...args);
		}
	}
};
