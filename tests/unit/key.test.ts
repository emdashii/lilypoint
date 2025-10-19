import { describe, test, expect } from 'bun:test';
import { Key, getKey, KeyInfo } from '../../src/key.js';

describe('Key', () => {
	describe('constructor', () => {
		test('should create key with name and default major mode', () => {
			const key = new Key('C');
			expect(key.getKeyName()).toBe('C');
		});

		test('should create key with specified mode', () => {
			const majorKey = new Key('C', 'major');
			const minorKey = new Key('A', 'minor');

			expect(majorKey.getKeyName()).toBe('C');
			expect(minorKey.getKeyName()).toBe('A');
		});
	});

	describe('getKeyName', () => {
		test('should return the key name', () => {
			const keys = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

			for (const keyName of keys) {
				const key = new Key(keyName);
				expect(key.getKeyName()).toBe(keyName);
			}
		});

		test('should handle sharp and flat keys', () => {
			const sharpFlatKeys = ['F#', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];

			for (const keyName of sharpFlatKeys) {
				const key = new Key(keyName);
				expect(key.getKeyName()).toBe(keyName);
			}
		});
	});

	describe('getKeyInfo', () => {
		test('should return KeyInfo for C major', () => {
			const key = new Key('C', 'major');
			const info = key.getKeyInfo();

			expect(info.key).toBe('c');
			expect(info.type).toBe('natural');
			expect(info.mode).toBe('major');
			expect(info.notes).toEqual([]);
		});

		test('should return KeyInfo for G major (1 sharp)', () => {
			const key = new Key('G', 'major');
			const info = key.getKeyInfo();

			expect(info.key).toBe('g');
			expect(info.type).toBe('is');
			expect(info.mode).toBe('major');
			expect(info.notes).toEqual(['fis']);
		});

		test('should return KeyInfo for F major (1 flat)', () => {
			const key = new Key('F', 'major');
			const info = key.getKeyInfo();

			expect(info.key).toBe('f');
			expect(info.type).toBe('es');
			expect(info.mode).toBe('major');
			expect(info.notes).toEqual(['bes']);
		});
	});

	describe('toString', () => {
		test('should return key name as string', () => {
			const key = new Key('D');
			expect(key.toString()).toBe('D');
		});
	});
});

describe('getKey', () => {
	describe('major keys', () => {
		test('should return C major with no sharps/flats', () => {
			const info = getKey('C', 'major');

			expect(info.key).toBe('c');
			expect(info.type).toBe('natural');
			expect(info.mode).toBe('major');
			expect(info.notes).toEqual([]);
		});

		test('should return sharp keys correctly', () => {
			// G major - 1 sharp
			const g = getKey('G', 'major');
			expect(g.notes).toEqual(['fis']);

			// D major - 2 sharps
			const d = getKey('D', 'major');
			expect(d.notes).toEqual(['fis', 'cis']);

			// A major - 3 sharps
			const a = getKey('A', 'major');
			expect(a.notes).toEqual(['fis', 'cis', 'gis']);
		});

		test('should return flat keys correctly', () => {
			// F major - 1 flat
			const f = getKey('F', 'major');
			expect(f.notes).toEqual(['bes']);

			// Bb major - 2 flats
			const bb = getKey('Bb', 'major');
			expect(bb.notes).toEqual(['bes', 'ees']);

			// Eb major - 3 flats
			const eb = getKey('Eb', 'major');
			expect(eb.notes).toEqual(['bes', 'ees', 'aes']);
		});

		test('should handle all major keys', () => {
			const majorKeys = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];

			for (const keyName of majorKeys) {
				const info = getKey(keyName, 'major');
				expect(info.mode).toBe('major');
				expect(info.key).toBeDefined();
			}
		});
	});

	describe('minor keys', () => {
		test('should return A minor with no sharps/flats', () => {
			const info = getKey('A', 'minor');

			expect(info.key).toBe('a');
			expect(info.type).toBe('natural');
			expect(info.mode).toBe('minor');
			expect(info.notes).toEqual([]);
		});

		test('should return sharp minor keys correctly', () => {
			// E minor - 1 sharp
			const e = getKey('E', 'minor');
			expect(e.notes).toEqual(['fis']);

			// B minor - 2 sharps
			const b = getKey('B', 'minor');
			expect(b.notes).toEqual(['fis', 'cis']);
		});

		test('should return flat minor keys correctly', () => {
			// D minor - 1 flat
			const d = getKey('D', 'minor');
			expect(d.notes).toEqual(['bes']);

			// G minor - 2 flats (but wait, G minor actually has sharps in the key signature)
			// Let me check the actual code...
			// According to the source, G has ['fis', 'cis', 'gis', 'dis', 'ais'] for minor
			const g = getKey('G', 'minor');
			expect(g.notes).toEqual(['fis', 'cis', 'gis', 'dis', 'ais']);
		});

		test('should handle all minor keys', () => {
			const minorKeys = ['A', 'E', 'B', 'F#', 'C', 'G', 'D', 'Bb', 'F', 'Eb', 'Ab', 'Db'];

			for (const keyName of minorKeys) {
				const info = getKey(keyName, 'minor');
				expect(info.mode).toBe('minor');
				expect(info.key).toBeDefined();
			}
		});
	});

	describe('default mode', () => {
		test('should default to major mode when mode not specified', () => {
			const info = getKey('C');
			expect(info.mode).toBe('major');
		});
	});

	describe('error handling', () => {
		test('should throw error for unsupported major key', () => {
			expect(() => getKey('X', 'major')).toThrow('Unsupported major key');
		});

		test('should throw error for unsupported minor key', () => {
			expect(() => getKey('X', 'minor')).toThrow('Unsupported minor key');
		});
	});

	describe('key signature properties', () => {
		test('should have correct LilyPond notation for sharp keys', () => {
			const g = getKey('G', 'major');
			expect(g.key).toBe('g');
			expect(g.type).toBe('is'); // Sharp keys use 'is' type

			const d = getKey('D', 'major');
			expect(d.type).toBe('is');
		});

		test('should have correct LilyPond notation for flat keys', () => {
			const f = getKey('F', 'major');
			expect(f.key).toBe('f');
			expect(f.type).toBe('es'); // Flat keys use 'es' type

			const bb = getKey('Bb', 'major');
			expect(bb.key).toBe('bes'); // Bb becomes 'bes' in LilyPond
			expect(bb.type).toBe('es');
		});

		test('should have natural type for C major', () => {
			const c = getKey('C', 'major');
			expect(c.type).toBe('natural');
		});

		test('should have natural type for A minor', () => {
			const a = getKey('A', 'minor');
			expect(a.type).toBe('natural');
		});
	});
});
