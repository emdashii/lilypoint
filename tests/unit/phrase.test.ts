import { test, expect } from 'bun:test';
import { Phrase } from '../../src/phrase.js';
import { getKey } from '../../src/key.js';

test('phrase mode and key signature stay in sync through construction and edits', () => {
	const phrase = new Phrase([], [], getKey('G', 'minor'));
	expect(phrase.getMode()).toBe('minor');
	expect(phrase.getKey().notes).toEqual(['bes', 'ees']);
	phrase.setMode('major');
	expect(phrase.getKey()).toEqual({ key: 'g', type: 'is', mode: 'major', notes: ['fis'] });
	phrase.setKey(getKey('Bb', 'minor'));
	expect(phrase.getMode()).toBe('minor');
	expect(phrase.getKey().notes).toEqual(['bes', 'ees', 'aes', 'des', 'ges']);
});
