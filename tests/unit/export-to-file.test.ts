import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { ExportToFile } from '../../src/export-to-file.js';
import { Phrase } from '../../src/phrase.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';
import { getKey, KeyInfo } from '../../src/key.js';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

describe('ExportToFile', () => {
	// Store test files to clean up
	const testFiles: string[] = [];

	afterEach(async () => {
		// Clean up test files after each test
		for (const file of testFiles) {
			try {
				if (existsSync(file)) {
					await unlink(file);
				}
			} catch (e) {
				// Ignore errors during cleanup
			}
		}
		testFiles.length = 0;
	});

	describe('constructor', () => {
		test('should create with no parameters', () => {
			const exporter = new ExportToFile();
			expect(exporter).toBeDefined();
		});

		test('should create with all parameters', () => {
			const exporter = new ExportToFile('test-file', 'Test Title', 'Test Composer');
			expect(exporter).toBeDefined();
		});
	});

	describe('addPhrase', () => {
		test('should add a phrase', () => {
			const exporter = new ExportToFile('test', 'title', 'composer');
			const phrase = new Phrase();

			expect(() => exporter.addPhrase(phrase)).not.toThrow();
		});

		test('should add multiple phrases', () => {
			const exporter = new ExportToFile('test', 'title', 'composer');
			const phrase1 = new Phrase();
			const phrase2 = new Phrase();

			expect(() => {
				exporter.addPhrase(phrase1);
				exporter.addPhrase(phrase2);
			}).not.toThrow();
		});
	});

	describe('setFileName', () => {
		test('should set filename', async () => {
			const exporter = new ExportToFile();
			await expect(exporter.setFileName('test-output')).resolves.toBeUndefined();
		});

		test('should add .txt extension if missing', async () => {
			const exporter = new ExportToFile();
			await exporter.setFileName('test-output');
			// The filename should now have .txt extension
		});

		test('should keep .txt extension if already present', async () => {
			const exporter = new ExportToFile();
			await expect(exporter.setFileName('test-output.txt')).resolves.toBeUndefined();
		});
	});

	describe('setComposer', () => {
		test('should set composer name', () => {
			const exporter = new ExportToFile();
			expect(() => exporter.setComposer('John Doe')).not.toThrow();
		});
	});

	describe('setTitle', () => {
		test('should set title', () => {
			const exporter = new ExportToFile();
			expect(() => exporter.setTitle('My Composition')).not.toThrow();
		});
	});

	describe('writeOutput', () => {
		test('should generate LilyPond output string', async () => {
			const filename = './tests/temp/test-output-1';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile();
			await exporter.setFileName(filename);
			exporter.setTitle('Test Title');
			exporter.setComposer('Test Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toBeDefined();
			expect(typeof output).toBe('string');
			expect(output.length).toBeGreaterThan(0);
		});

		test('should include header information', async () => {
			const filename = 'tests/temp/test-output-2';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'My Test Title', 'My Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\header');
			expect(output).toContain('title = "My Test Title"');
			expect(output).toContain('composer = "My Composer"');
			expect(output).toContain('tagline');
		});

		test('should include paper settings', async () => {
			const filename = 'tests/temp/test-output-3';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\paper');
			expect(output).toContain('system-system-spacing');
		});

		test('should include score structure', async () => {
			const filename = 'tests/temp/test-output-4';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\score');
			expect(output).toContain('\\layout');
			expect(output).toContain('\\midi');
		});

		test('should include phrase definitions', async () => {
			const filename = 'tests/temp/test-output-5';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('topPhraseOne');
			expect(output).toContain('bottomPhraseOne');
		});

		test('should include staff and voice structure', async () => {
			const filename = 'tests/temp/test-output-6';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\new Staff');
			expect(output).toContain('\\new Voice = "upper"');
			expect(output).toContain('\\new Voice = "lower"');
		});

		test('should include clef, key, and time signature', async () => {
			const filename = 'tests/temp/test-output-7';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\clef "treble"');
			expect(output).toContain('\\key');
			expect(output).toContain('\\time 4/4');
		});

		test('should convert notes to LilyPond format', async () => {
			const filename = 'tests/temp/test-output-8';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			// Should contain LilyPond note notation
			expect(output).toContain("'");
			expect(output.match(/[a-g]/g)).toBeTruthy();
		});

		test('should handle multiple phrases', async () => {
			const filename = 'tests/temp/test-output-9';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase1 = createTestPhrase();
			const phrase2 = createTestPhrase();

			exporter.addPhrase(phrase1);
			exporter.addPhrase(phrase2);

			const output = await exporter.writeOutput();

			expect(output).toContain('topPhraseOne');
			expect(output).toContain('bottomPhraseOne');
			expect(output).toContain('topPhraseTwo');
			expect(output).toContain('bottomPhraseTwo');
		});

		test('should use sharp notation for sharp keys', async () => {
			const filename = 'tests/temp/test-output-10';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();
			const keyInfo = getKey('G', 'major'); // G major has sharps

			phrase.setKey(keyInfo);
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_F4_sharp, 4));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_F4_sharp, 4));

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			// Should use "is" notation for sharps in LilyPond
			expect(output).toContain('fis');
		});

		test('should use flat notation for flat keys', async () => {
			const filename = 'tests/temp/test-output-11';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();
			const keyInfo = getKey('F', 'major'); // F major has flats

			phrase.setKey(keyInfo);
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_B4_flat, 4));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_B4_flat, 4));

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			// Should use "es" notation for flats in LilyPond
			expect(output).toContain('bes');
		});

		test('should handle different time signatures', async () => {
			const filename = 'tests/temp/test-output-12';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = createTestPhrase();
			phrase.setTimeSignature('3/4');

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('\\time 3/4');
		});

		test('should handle empty phrase', async () => {
			const filename = 'tests/temp/test-output-13';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toBeDefined();
			expect(output).toContain('topPhraseOne');
			expect(output).toContain('bottomPhraseOne');
		});
	});

	describe('note conversion', () => {
		test('should convert middle C correctly', async () => {
			const filename = 'tests/temp/test-output-14';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();

			phrase.addNoteToUpperVoice(new Note(NoteType.Note_C4, 4));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_C4, 4));

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain("c'4");
		});

		test('should convert different octaves correctly', async () => {
			const filename = 'tests/temp/test-output-15';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();

			// C3 (octave below middle C)
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_C3, 4));
			// C5 (octave above middle C)
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_C5, 4));

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain('c4'); // C3 notation
			expect(output).toContain("c''4"); // C5 notation
		});

		test('should convert different note lengths', async () => {
			const filename = 'tests/temp/test-output-16';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');
			const phrase = new Phrase();

			phrase.addNoteToUpperVoice(new Note(NoteType.Note_C4, 1)); // Whole note
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_D4, 2)); // Half note
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_E4, 4)); // Quarter note
			phrase.addNoteToUpperVoice(new Note(NoteType.Note_F4, 8)); // Eighth note

			phrase.addNoteToLowerVoice(new Note(NoteType.Note_C4, 1));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_D4, 2));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_E4, 4));
			phrase.addNoteToLowerVoice(new Note(NoteType.Note_F4, 8));

			exporter.addPhrase(phrase);

			const output = await exporter.writeOutput();

			expect(output).toContain("c'1");
			expect(output).toContain("d'2");
			expect(output).toContain("e'4");
			expect(output).toContain("f'8");
		});
	});

	describe('phrase numbering', () => {
		test('should number phrases correctly from 1 to 10', async () => {
			const filename = 'tests/temp/test-output-17';
			testFiles.push(filename + '.txt');
			const exporter = new ExportToFile(filename, 'Title', 'Composer');

			for (let i = 0; i < 10; i++) {
				exporter.addPhrase(createTestPhrase());
			}

			const output = await exporter.writeOutput();

			expect(output).toContain('topPhraseOne');
			expect(output).toContain('topPhraseTwo');
			expect(output).toContain('topPhraseThree');
			expect(output).toContain('topPhraseFour');
			expect(output).toContain('topPhraseFive');
			expect(output).toContain('topPhraseSix');
			expect(output).toContain('topPhraseSeven');
			expect(output).toContain('topPhraseEight');
			expect(output).toContain('topPhraseNine');
			expect(output).toContain('topPhraseTen');
		});
	});
});

// Helper function to create a simple test phrase
function createTestPhrase(): Phrase {
	const phrase = new Phrase();
	const keyInfo = getKey('C', 'major');

	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');
	phrase.setMode('major');

	// Add a few notes to make it valid
	phrase.addNoteToUpperVoice(new Note(NoteType.Note_C5, 4));
	phrase.addNoteToUpperVoice(new Note(NoteType.Note_D5, 4));
	phrase.addNoteToUpperVoice(new Note(NoteType.Note_E5, 4));

	phrase.addNoteToLowerVoice(new Note(NoteType.Note_C4, 4));
	phrase.addNoteToLowerVoice(new Note(NoteType.Note_D4, 4));
	phrase.addNoteToLowerVoice(new Note(NoteType.Note_E4, 4));

	return phrase;
}
