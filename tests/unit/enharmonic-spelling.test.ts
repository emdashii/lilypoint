import { describe, test, expect, afterEach } from 'bun:test';
import { ExportToFile } from '../../src/export-to-file.js';
import { Phrase } from '../../src/phrase.js';
import { Note } from '../../src/note.js';
import { NoteType } from '../../src/types-and-globals.js';
import { getKey } from '../../src/key.js';
import { unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const testFiles: string[] = [];
let testCounter = 0;

afterEach(async () => {
	for (const file of testFiles) {
		try {
			if (existsSync(file)) {
				await unlink(file);
			}
		} catch (e) {
			// Ignore cleanup errors
		}
	}
	testFiles.length = 0;
});

function nextFile(): string {
	testCounter++;
	const filename = `tests/temp/enharmonic-test-${testCounter}`;
	testFiles.push(filename + '.txt');
	return filename;
}

async function getOutput(keyName: string, notes: NoteType[]): Promise<string> {
	const filename = nextFile();
	const exporter = new ExportToFile();
	await exporter.setFileName(filename);
	exporter.setTitle('Title');
	exporter.setComposer('Composer');
	const phrase = new Phrase();
	const keyInfo = getKey(keyName, 'major');

	phrase.setKey(keyInfo);
	phrase.setTimeSignature('4/4');

	for (const n of notes) {
		phrase.addNoteToUpperVoice(new Note(n, 4));
		phrase.addNoteToLowerVoice(new Note(NoteType.Note_C4, 4));
	}

	exporter.addPhrase(phrase);
	return await exporter.writeOutput();
}

// All 5 enharmonic pairs at octave 4 (the most common range)
const accidentalNotes = [
	NoteType.Note_A4_sharp, // ais' / bes'
	NoteType.Note_C4_sharp, // cis' / des'
	NoteType.Note_D4_sharp, // dis' / ees'
	NoteType.Note_F4_sharp, // fis' / ges'
	NoteType.Note_G4_sharp, // gis' / aes'
];

// Same pairs at octave 3 (no octave suffix in LilyPond)
const accidentalNotesOctave3 = [
	NoteType.Note_A3_sharp, // ais / bes
	NoteType.Note_C3_sharp, // cis / des
	NoteType.Note_D3_sharp, // dis / ees
	NoteType.Note_F3_sharp, // fis / ges
	NoteType.Note_G3_sharp, // gis / aes
];

describe('Enharmonic spelling', () => {
	describe('flat keys use flat spellings', () => {
		const flatKeys = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'];

		for (const key of flatKeys) {
			test(`${key} major uses bes (not ais) for Bb`, async () => {
				const output = await getOutput(key, [NoteType.Note_A4_sharp]);
				expect(output).toContain("bes'");
				expect(output).not.toMatch(/ais'/);
			});

			test(`${key} major uses des (not cis) for Db`, async () => {
				const output = await getOutput(key, [NoteType.Note_C4_sharp]);
				expect(output).toContain("des'");
				expect(output).not.toMatch(/cis'/);
			});

			test(`${key} major uses ees (not dis) for Eb`, async () => {
				const output = await getOutput(key, [NoteType.Note_D4_sharp]);
				expect(output).toContain("ees'");
				expect(output).not.toMatch(/dis'/);
			});

			test(`${key} major uses ges (not fis) for Gb`, async () => {
				const output = await getOutput(key, [NoteType.Note_F4_sharp]);
				expect(output).toContain("ges'");
				expect(output).not.toMatch(/fis'/);
			});

			test(`${key} major uses aes (not gis) for Ab`, async () => {
				const output = await getOutput(key, [NoteType.Note_G4_sharp]);
				expect(output).toContain("aes'");
				expect(output).not.toMatch(/gis'/);
			});
		}
	});

	describe('sharp keys use sharp spellings', () => {
		const sharpKeys = ['G', 'D', 'A', 'E', 'B', 'F#'];

		for (const key of sharpKeys) {
			test(`${key} major uses ais (not bes) for A#`, async () => {
				const output = await getOutput(key, [NoteType.Note_A4_sharp]);
				expect(output).toContain("ais'");
				expect(output).not.toMatch(/bes'/);
			});

			test(`${key} major uses cis (not des) for C#`, async () => {
				const output = await getOutput(key, [NoteType.Note_C4_sharp]);
				expect(output).toContain("cis'");
				expect(output).not.toMatch(/des'/);
			});

			test(`${key} major uses dis (not ees) for D#`, async () => {
				const output = await getOutput(key, [NoteType.Note_D4_sharp]);
				expect(output).toContain("dis'");
				expect(output).not.toMatch(/ees'/);
			});

			test(`${key} major uses fis (not ges) for F#`, async () => {
				const output = await getOutput(key, [NoteType.Note_F4_sharp]);
				expect(output).toContain("fis'");
				expect(output).not.toMatch(/ges'/);
			});

			test(`${key} major uses gis (not aes) for G#`, async () => {
				const output = await getOutput(key, [NoteType.Note_G4_sharp]);
				expect(output).toContain("gis'");
				expect(output).not.toMatch(/aes'/);
			});
		}
	});

	describe('C major (natural key) defaults to sharp spellings', () => {
		test('C major uses ais for A#/Bb', async () => {
			const output = await getOutput('C', [NoteType.Note_A4_sharp]);
			expect(output).toContain("ais'");
		});

		test('C major uses cis for C#/Db', async () => {
			const output = await getOutput('C', [NoteType.Note_C4_sharp]);
			expect(output).toContain("cis'");
		});

		test('C major uses dis for D#/Eb', async () => {
			const output = await getOutput('C', [NoteType.Note_D4_sharp]);
			expect(output).toContain("dis'");
		});

		test('C major uses fis for F#/Gb', async () => {
			const output = await getOutput('C', [NoteType.Note_F4_sharp]);
			expect(output).toContain("fis'");
		});

		test('C major uses gis for G#/Ab', async () => {
			const output = await getOutput('C', [NoteType.Note_G4_sharp]);
			expect(output).toContain("gis'");
		});
	});

	describe('octave consistency', () => {
		test('flat spelling is consistent across octave 3 (F major)', async () => {
			const output = await getOutput('F', accidentalNotesOctave3);
			expect(output).toContain('bes4');
			expect(output).toContain('des4');
			expect(output).toContain('ees4');
			expect(output).toContain('ges4');
			expect(output).toContain('aes4');
		});

		test('flat spelling is consistent across octave 4 (F major)', async () => {
			const output = await getOutput('F', accidentalNotes);
			expect(output).toContain("bes'4");
			expect(output).toContain("des'4");
			expect(output).toContain("ees'4");
			expect(output).toContain("ges'4");
			expect(output).toContain("aes'4");
		});

		test('sharp spelling is consistent across octave 3 (G major)', async () => {
			const output = await getOutput('G', accidentalNotesOctave3);
			expect(output).toContain('ais4');
			expect(output).toContain('cis4');
			expect(output).toContain('dis4');
			expect(output).toContain('fis4');
			expect(output).toContain('gis4');
		});

		test('sharp spelling is consistent across octave 4 (G major)', async () => {
			const output = await getOutput('G', accidentalNotes);
			expect(output).toContain("ais'4");
			expect(output).toContain("cis'4");
			expect(output).toContain("dis'4");
			expect(output).toContain("fis'4");
			expect(output).toContain("gis'4");
		});
	});

	describe('Note_*_flat enum variants also use correct spelling', () => {
		test('Note_B4_flat uses bes in flat key', async () => {
			const output = await getOutput('F', [NoteType.Note_B4_flat]);
			expect(output).toContain("bes'");
		});

		test('Note_B4_flat uses ais in sharp key', async () => {
			const output = await getOutput('G', [NoteType.Note_B4_flat]);
			expect(output).toContain("ais'");
		});

		test('Note_D4_flat uses des in flat key', async () => {
			const output = await getOutput('F', [NoteType.Note_D4_flat]);
			expect(output).toContain("des'");
		});

		test('Note_D4_flat uses cis in sharp key', async () => {
			const output = await getOutput('G', [NoteType.Note_D4_flat]);
			expect(output).toContain("cis'");
		});

		test('Note_E4_flat uses ees in flat key', async () => {
			const output = await getOutput('Eb', [NoteType.Note_E4_flat]);
			expect(output).toContain("ees'");
		});

		test('Note_G4_flat uses ges in flat key', async () => {
			const output = await getOutput('Gb', [NoteType.Note_G4_flat]);
			expect(output).toContain("ges'");
		});

		test('Note_A4_flat uses aes in flat key', async () => {
			const output = await getOutput('Ab', [NoteType.Note_A4_flat]);
			expect(output).toContain("aes'");
		});
	});
});
