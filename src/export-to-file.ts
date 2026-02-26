import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { KeyInfo } from './key.js';
import { readFile, writeFile, access } from 'node:fs/promises';
import readline from 'node:readline';

export class ExportToFile {
	private fileName: string = "";
	private title: string = "";
	private composer: string = "";
	private phrases: Phrase[] = [];

	constructor();
	constructor(fileName: string, musicTitle: string, composer: string);
	constructor(fileName?: string, musicTitle?: string, composer?: string) {
		if (fileName && musicTitle && composer) {
			this.title = musicTitle;
			this.composer = composer;
			this.setFileName(fileName);
		}
	}

	addPhrase(phrase: Phrase): void {
		this.phrases.push(phrase);
	}

	async setFileName(fileName: string): Promise<void> {
		fileName = this.verifyEnding(fileName);

		// Skip file existence check in browser environment
		if (typeof window !== 'undefined') {
			this.fileName = fileName;
			return;
		}

		// In Bun/Node.js environment, check for file existence
		if (typeof window === 'undefined') {
			while (await this.exists(fileName)) {
				console.log(`Warning a file already exists with the chosen output filename: ${fileName}!`);
				console.log("Please enter a different filename: ");

				const rl = readline.createInterface({
					input: process.stdin,
					output: process.stdout
				});

				const newFileName = await new Promise<string>((resolve) => {
					rl.question('', (answer: string) => {
						rl.close();
						resolve(answer || fileName);
					});
				});

				fileName = this.verifyEnding(newFileName);
			}
		}

		this.fileName = fileName;
	}

	setComposer(composer: string): void {
		this.composer = composer;
	}

	setTitle(title: string): void {
		this.title = title;
	}

	async writeOutput(): Promise<string> {
		try {
			let output = "";

			// Output general header information
			output += "\\header {\n";
			output += `title = "${this.title}"\n`;
			output += `composer = "${this.composer}"\n`;
			output += 'tagline = "Generated using lilypoint at lilypoint.mazzaella.com"\n';
			output += "}\n";
			output += "\\paper {\n";
			output += "\tsystem-system-spacing.basic-distance = #16\n";
			output += "}\n\n\n";

			// Loop through phrases to be printed
			let numPhrases = 0;
			for (const phrase of this.phrases) {
				output += this.writePhrase(phrase, ++numPhrases);
			}

			// Output final info for file
			output += "\\score {\n";
			output += "\t<<\n";
			output += '\t\t\\new Staff {\n';
			output += '\t\t\t\\new Voice = "upper" {\n';

			// Write the phrase names to be printed
			for (let i = 1; i <= numPhrases; i++) {
				const phraseNumberWord = this.numberToWord(i);
				output += `\t\t\t\t\\topPhrase${phraseNumberWord}\n`;
			}
			output += "\t\t\t}\n"; // End top voice info
			output += "\t\t}\n"; // End staff

			// Write lower voice info
			output += '\t\t\\new Staff {\n';
			output += '\t\t\t\\new Voice = "lower" {\n';

			// Write the phrase names to be printed
			for (let i = 1; i <= numPhrases; i++) {
				const phraseNumberWord = this.numberToWord(i);
				output += `\t\t\t\t\\bottomPhrase${phraseNumberWord}\n`;
			}
			output += "\t\t\t}\n"; // End bottom voice info
			output += "\t\t}\n"; // End staff

			// Final closing for file
			output += "\t>>\n";
			output += "\t\\layout{}\n";
			output += "\t\\midi{}\n";
			output += "}\n";

			// In browser environment, return the output; in Bun/Node.js, write to file
			if (typeof window !== 'undefined') {
				console.log("Generated LilyPond Output created successfully!");
				return output;
			} else {
				await writeFile(this.fileName, output);
				console.log("Final output file successfully created!");
				return output;
			}
		} catch (error) {
			throw new Error("Couldn't open file for output!");
		}
	}

	private writePhrase(phrase: Phrase, phraseNumber: number): string {
		let output = "";
		const phraseNumberWord = this.numberToWord(phraseNumber);
		const topPhraseName = `topPhrase${phraseNumberWord}`;
		const bottomPhraseName = `bottomPhrase${phraseNumberWord}`;

		// write comment with phrase info
		output += `% Phrase ${phraseNumber}\n`;
		output += `${topPhraseName} = { \\clef "treble" \\key ${phrase.getKeyString()} \\major \\time ${phrase.getTimeSig()}\n`;

		// Time to print out the notes for the top voice of this phrase
		for (const note of phrase.getUpperVoice()) {
			output += " " + this.convertNoteToOutput(note, phrase.getKey());
		}

		// End top voice of this phrase
		output += '\\bar "||" }\n';

		output += `${bottomPhraseName} = { \\clef "treble" \\key ${phrase.getKeyString()} \\major \\time ${phrase.getTimeSig()}\n`;

		// Time to print out the notes for the bottom voice of this phrase
		for (const note of phrase.getLowerVoice()) {
			output += " " + this.convertNoteToOutput(note, phrase.getKey());
		}

		// End bottom voice of this phrase
		output += "}\n";

		return output;
	}

	private async exists(fileName: string): Promise<boolean> {
		// In browser environment, files don't exist in the traditional sense
		if (typeof window !== 'undefined') {
			return false;
		}

		try {
			await access(fileName);
			return true;
		} catch {
			return false;
		}
	}

	private verifyEnding(fileName: string): string {
		// Put ending of .txt on the end of the filename if it doesn't have that ending already
		if (fileName.length < 4) {
			return fileName + ".txt";
		}
		if (!fileName.endsWith(".txt")) {
			return fileName + ".txt";
		}
		return fileName;
	}

	private convertNoteToOutput(note: Note, keyInfo?: KeyInfo): string {
		const noteLengthString = note.getLength().toString();
		const useFlats = keyInfo?.type === 'es';

		// Handle accidentals based on key signature
		let output: string;
		if (useFlats) {
			output = this.convertNoteToOutputFlats(note.getNote(), noteLengthString);
		} else {
			output = this.convertNoteToOutputSharps(note.getNote(), noteLengthString);
		}

		// Append tie marker for tied notes (fourth species suspensions)
		if (note.getTied()) {
			output += '~';
		}

		return output;
	}

	private convertNoteToOutputSharps(noteType: NoteType, noteLengthString: string): string {
		switch (noteType) {
			case NoteType.Note_A0: return "a,,," + noteLengthString;
			case NoteType.Note_A0_sharp: return "ais,,," + noteLengthString;
			case NoteType.Note_B0_flat: return "ais,,," + noteLengthString;
			case NoteType.Note_B0: return "b,,," + noteLengthString;
			case NoteType.Note_C1: return "c,," + noteLengthString;
			case NoteType.Note_C1_sharp: return "cis,," + noteLengthString;
			case NoteType.Note_D1_flat: return "cis,," + noteLengthString;
			case NoteType.Note_D1: return "d,," + noteLengthString;
			case NoteType.Note_D1_sharp: return "dis,," + noteLengthString;
			case NoteType.Note_E1_flat: return "dis,," + noteLengthString;
			case NoteType.Note_E1: return "e,," + noteLengthString;
			case NoteType.Note_F1: return "f,," + noteLengthString;
			case NoteType.Note_F1_sharp: return "fis,," + noteLengthString;
			case NoteType.Note_G1_flat: return "fis,," + noteLengthString;
			case NoteType.Note_G1: return "g,," + noteLengthString;
			case NoteType.Note_G1_sharp: return "gis,," + noteLengthString;
			case NoteType.Note_A1_flat: return "gis,," + noteLengthString;
			case NoteType.Note_A1: return "a,," + noteLengthString;
			case NoteType.Note_A1_sharp: return "ais,," + noteLengthString;
			case NoteType.Note_B1_flat: return "ais,," + noteLengthString;
			case NoteType.Note_B1: return "b,," + noteLengthString;
			case NoteType.Note_C2: return "c," + noteLengthString;
			case NoteType.Note_C2_sharp: return "cis," + noteLengthString;
			case NoteType.Note_D2_flat: return "cis," + noteLengthString;
			case NoteType.Note_D2: return "d," + noteLengthString;
			case NoteType.Note_D2_sharp: return "dis," + noteLengthString;
			case NoteType.Note_E2_flat: return "dis," + noteLengthString;
			case NoteType.Note_E2: return "e," + noteLengthString;
			case NoteType.Note_F2: return "f," + noteLengthString;
			case NoteType.Note_F2_sharp: return "fis," + noteLengthString;
			case NoteType.Note_G2_flat: return "fis," + noteLengthString;
			case NoteType.Note_G2: return "g," + noteLengthString;
			case NoteType.Note_G2_sharp: return "gis," + noteLengthString;
			case NoteType.Note_A2_flat: return "gis," + noteLengthString;
			case NoteType.Note_A2: return "a," + noteLengthString;
			case NoteType.Note_A2_sharp: return "ais," + noteLengthString;
			case NoteType.Note_B2_flat: return "ais," + noteLengthString;
			case NoteType.Note_B2: return "b," + noteLengthString;
			case NoteType.Note_C3: return "c" + noteLengthString;
			case NoteType.Note_C3_sharp: return "cis" + noteLengthString;
			case NoteType.Note_D3_flat: return "cis" + noteLengthString;
			case NoteType.Note_D3: return "d" + noteLengthString;
			case NoteType.Note_D3_sharp: return "dis" + noteLengthString;
			case NoteType.Note_E3_flat: return "dis" + noteLengthString;
			case NoteType.Note_E3: return "e" + noteLengthString;
			case NoteType.Note_F3: return "f" + noteLengthString;
			case NoteType.Note_F3_sharp: return "fis" + noteLengthString;
			case NoteType.Note_G3_flat: return "fis" + noteLengthString;
			case NoteType.Note_G3: return "g" + noteLengthString;
			case NoteType.Note_G3_sharp: return "gis" + noteLengthString;
			case NoteType.Note_A3_flat: return "gis" + noteLengthString;
			case NoteType.Note_A3: return "a" + noteLengthString;
			case NoteType.Note_A3_sharp: return "ais" + noteLengthString;
			case NoteType.Note_B3_flat: return "ais" + noteLengthString;
			case NoteType.Note_B3: return "b" + noteLengthString;
			case NoteType.Note_C4: return "c'" + noteLengthString;
			case NoteType.Note_C4_sharp: return "cis'" + noteLengthString;
			case NoteType.Note_D4_flat: return "cis'" + noteLengthString;
			case NoteType.Note_D4: return "d'" + noteLengthString;
			case NoteType.Note_D4_sharp: return "dis'" + noteLengthString;
			case NoteType.Note_E4_flat: return "dis'" + noteLengthString;
			case NoteType.Note_E4: return "e'" + noteLengthString;
			case NoteType.Note_F4: return "f'" + noteLengthString;
			case NoteType.Note_F4_sharp: return "fis'" + noteLengthString;
			case NoteType.Note_G4_flat: return "fis'" + noteLengthString;
			case NoteType.Note_G4: return "g'" + noteLengthString;
			case NoteType.Note_G4_sharp: return "gis'" + noteLengthString;
			case NoteType.Note_A4_flat: return "gis'" + noteLengthString;
			case NoteType.Note_A4: return "a'" + noteLengthString;
			case NoteType.Note_A4_sharp: return "ais'" + noteLengthString;
			case NoteType.Note_B4_flat: return "ais'" + noteLengthString;
			case NoteType.Note_B4: return "b'" + noteLengthString;
			case NoteType.Note_C5: return "c''" + noteLengthString;
			case NoteType.Note_C5_sharp: return "cis''" + noteLengthString;
			case NoteType.Note_D5_flat: return "cis''" + noteLengthString;
			case NoteType.Note_D5: return "d''" + noteLengthString;
			case NoteType.Note_D5_sharp: return "dis''" + noteLengthString;
			case NoteType.Note_E5_flat: return "dis''" + noteLengthString;
			case NoteType.Note_E5: return "e''" + noteLengthString;
			case NoteType.Note_F5: return "f''" + noteLengthString;
			case NoteType.Note_F5_sharp: return "fis''" + noteLengthString;
			case NoteType.Note_G5_flat: return "fis''" + noteLengthString;
			case NoteType.Note_G5: return "g''" + noteLengthString;
			case NoteType.Note_G5_sharp: return "gis''" + noteLengthString;
			case NoteType.Note_A5_flat: return "gis''" + noteLengthString;
			case NoteType.Note_A5: return "a''" + noteLengthString;
			case NoteType.Note_A5_sharp: return "ais''" + noteLengthString;
			case NoteType.Note_B5_flat: return "ais''" + noteLengthString;
			case NoteType.Note_B5: return "b''" + noteLengthString;
			case NoteType.Note_C6: return "c'''" + noteLengthString;
			case NoteType.Note_C6_sharp: return "cis'''" + noteLengthString;
			case NoteType.Note_D6_flat: return "cis'''" + noteLengthString;
			case NoteType.Note_D6: return "d'''" + noteLengthString;
			case NoteType.Note_D6_sharp: return "dis'''" + noteLengthString;
			case NoteType.Note_E6_flat: return "dis'''" + noteLengthString;
			case NoteType.Note_E6: return "e'''" + noteLengthString;
			case NoteType.Note_F6: return "f'''" + noteLengthString;
			case NoteType.Note_F6_sharp: return "fis'''" + noteLengthString;
			case NoteType.Note_G6_flat: return "fis'''" + noteLengthString;
			case NoteType.Note_G6: return "g'''" + noteLengthString;
			case NoteType.Note_G6_sharp: return "gis'''" + noteLengthString;
			case NoteType.Note_A6_flat: return "gis'''" + noteLengthString;
			case NoteType.Note_A6: return "a'''" + noteLengthString;
			case NoteType.Note_A6_sharp: return "ais'''" + noteLengthString;
			case NoteType.Note_B6_flat: return "ais'''" + noteLengthString;
			case NoteType.Note_B6: return "b'''" + noteLengthString;
			case NoteType.Note_C7: return "c''''" + noteLengthString;
			case NoteType.Note_C7_sharp: return "cis''''" + noteLengthString;
			case NoteType.Note_D7_flat: return "cis''''" + noteLengthString;
			case NoteType.Note_D7: return "d''''" + noteLengthString;
			case NoteType.Note_D7_sharp: return "dis''''" + noteLengthString;
			case NoteType.Note_E7_flat: return "dis''''" + noteLengthString;
			case NoteType.Note_E7: return "e''''" + noteLengthString;
			case NoteType.Note_F7: return "f''''" + noteLengthString;
			case NoteType.Note_F7_sharp: return "fis''''" + noteLengthString;
			case NoteType.Note_G7_flat: return "fis''''" + noteLengthString;
			case NoteType.Note_G7: return "g''''" + noteLengthString;
			case NoteType.Note_G7_sharp: return "gis''''" + noteLengthString;
			case NoteType.Note_A7_flat: return "gis''''" + noteLengthString;
			case NoteType.Note_A7: return "a''''" + noteLengthString;
			case NoteType.Note_A7_sharp: return "ais''''" + noteLengthString;
			case NoteType.Note_B7_flat: return "ais''''" + noteLengthString;
			case NoteType.Note_B7: return "b''''" + noteLengthString;
			case NoteType.Note_C8: return "c'''''" + noteLengthString;
			default:
				throw new Error("Error, could not convert note to proper output for lily pond!");
		}
	}

	private convertNoteToOutputFlats(noteType: NoteType, noteLengthString: string): string {
		switch (noteType) {
			case NoteType.Note_A0: return "a,,," + noteLengthString;
			case NoteType.Note_A0_sharp: return "bes,,," + noteLengthString;
			case NoteType.Note_B0_flat: return "bes,,," + noteLengthString;
			case NoteType.Note_B0: return "b,,," + noteLengthString;
			case NoteType.Note_C1: return "c,," + noteLengthString;
			case NoteType.Note_C1_sharp: return "des,," + noteLengthString;
			case NoteType.Note_D1_flat: return "des,," + noteLengthString;
			case NoteType.Note_D1: return "d,," + noteLengthString;
			case NoteType.Note_D1_sharp: return "ees,," + noteLengthString;
			case NoteType.Note_E1_flat: return "ees,," + noteLengthString;
			case NoteType.Note_E1: return "e,," + noteLengthString;
			case NoteType.Note_F1: return "f,," + noteLengthString;
			case NoteType.Note_F1_sharp: return "ges,," + noteLengthString;
			case NoteType.Note_G1_flat: return "ges,," + noteLengthString;
			case NoteType.Note_G1: return "g,," + noteLengthString;
			case NoteType.Note_G1_sharp: return "aes,," + noteLengthString;
			case NoteType.Note_A1_flat: return "aes,," + noteLengthString;
			case NoteType.Note_A1: return "a,," + noteLengthString;
			case NoteType.Note_A1_sharp: return "bes,," + noteLengthString;
			case NoteType.Note_B1_flat: return "bes,," + noteLengthString;
			case NoteType.Note_B1: return "b,," + noteLengthString;
			case NoteType.Note_C2: return "c," + noteLengthString;
			case NoteType.Note_C2_sharp: return "des," + noteLengthString;
			case NoteType.Note_D2_flat: return "des," + noteLengthString;
			case NoteType.Note_D2: return "d," + noteLengthString;
			case NoteType.Note_D2_sharp: return "ees," + noteLengthString;
			case NoteType.Note_E2_flat: return "ees," + noteLengthString;
			case NoteType.Note_E2: return "e," + noteLengthString;
			case NoteType.Note_F2: return "f," + noteLengthString;
			case NoteType.Note_F2_sharp: return "ges," + noteLengthString;
			case NoteType.Note_G2_flat: return "ges," + noteLengthString;
			case NoteType.Note_G2: return "g," + noteLengthString;
			case NoteType.Note_G2_sharp: return "aes," + noteLengthString;
			case NoteType.Note_A2_flat: return "aes," + noteLengthString;
			case NoteType.Note_A2: return "a," + noteLengthString;
			case NoteType.Note_A2_sharp: return "bes," + noteLengthString;
			case NoteType.Note_B2_flat: return "bes," + noteLengthString;
			case NoteType.Note_B2: return "b," + noteLengthString;
			case NoteType.Note_C3: return "c" + noteLengthString;
			case NoteType.Note_C3_sharp: return "des" + noteLengthString;
			case NoteType.Note_D3_flat: return "des" + noteLengthString;
			case NoteType.Note_D3: return "d" + noteLengthString;
			case NoteType.Note_D3_sharp: return "ees" + noteLengthString;
			case NoteType.Note_E3_flat: return "ees" + noteLengthString;
			case NoteType.Note_E3: return "e" + noteLengthString;
			case NoteType.Note_F3: return "f" + noteLengthString;
			case NoteType.Note_F3_sharp: return "ges" + noteLengthString;
			case NoteType.Note_G3_flat: return "ges" + noteLengthString;
			case NoteType.Note_G3: return "g" + noteLengthString;
			case NoteType.Note_G3_sharp: return "aes" + noteLengthString;
			case NoteType.Note_A3_flat: return "aes" + noteLengthString;
			case NoteType.Note_A3: return "a" + noteLengthString;
			case NoteType.Note_A3_sharp: return "bes" + noteLengthString;
			case NoteType.Note_B3_flat: return "bes" + noteLengthString;
			case NoteType.Note_B3: return "b" + noteLengthString;
			case NoteType.Note_C4: return "c'" + noteLengthString;
			case NoteType.Note_C4_sharp: return "des'" + noteLengthString;
			case NoteType.Note_D4_flat: return "des'" + noteLengthString;
			case NoteType.Note_D4: return "d'" + noteLengthString;
			case NoteType.Note_D4_sharp: return "ees'" + noteLengthString;
			case NoteType.Note_E4_flat: return "ees'" + noteLengthString;
			case NoteType.Note_E4: return "e'" + noteLengthString;
			case NoteType.Note_F4: return "f'" + noteLengthString;
			case NoteType.Note_F4_sharp: return "ges'" + noteLengthString;
			case NoteType.Note_G4_flat: return "ges'" + noteLengthString;
			case NoteType.Note_G4: return "g'" + noteLengthString;
			case NoteType.Note_G4_sharp: return "aes'" + noteLengthString;
			case NoteType.Note_A4_flat: return "aes'" + noteLengthString;
			case NoteType.Note_A4: return "a'" + noteLengthString;
			case NoteType.Note_A4_sharp: return "bes'" + noteLengthString;
			case NoteType.Note_B4_flat: return "bes'" + noteLengthString;
			case NoteType.Note_B4: return "b'" + noteLengthString;
			case NoteType.Note_C5: return "c''" + noteLengthString;
			case NoteType.Note_C5_sharp: return "des''" + noteLengthString;
			case NoteType.Note_D5_flat: return "des''" + noteLengthString;
			case NoteType.Note_D5: return "d''" + noteLengthString;
			case NoteType.Note_D5_sharp: return "ees''" + noteLengthString;
			case NoteType.Note_E5_flat: return "ees''" + noteLengthString;
			case NoteType.Note_E5: return "e''" + noteLengthString;
			case NoteType.Note_F5: return "f''" + noteLengthString;
			case NoteType.Note_F5_sharp: return "ges''" + noteLengthString;
			case NoteType.Note_G5_flat: return "ges''" + noteLengthString;
			case NoteType.Note_G5: return "g''" + noteLengthString;
			case NoteType.Note_G5_sharp: return "aes''" + noteLengthString;
			case NoteType.Note_A5_flat: return "aes''" + noteLengthString;
			case NoteType.Note_A5: return "a''" + noteLengthString;
			case NoteType.Note_A5_sharp: return "bes''" + noteLengthString;
			case NoteType.Note_B5_flat: return "bes''" + noteLengthString;
			case NoteType.Note_B5: return "b''" + noteLengthString;
			case NoteType.Note_C6: return "c'''" + noteLengthString;
			case NoteType.Note_C6_sharp: return "des'''" + noteLengthString;
			case NoteType.Note_D6_flat: return "des'''" + noteLengthString;
			case NoteType.Note_D6: return "d'''" + noteLengthString;
			case NoteType.Note_D6_sharp: return "ees'''" + noteLengthString;
			case NoteType.Note_E6_flat: return "ees'''" + noteLengthString;
			case NoteType.Note_E6: return "e'''" + noteLengthString;
			case NoteType.Note_F6: return "f'''" + noteLengthString;
			case NoteType.Note_F6_sharp: return "ges'''" + noteLengthString;
			case NoteType.Note_G6_flat: return "ges'''" + noteLengthString;
			case NoteType.Note_G6: return "g'''" + noteLengthString;
			case NoteType.Note_G6_sharp: return "aes'''" + noteLengthString;
			case NoteType.Note_A6_flat: return "aes'''" + noteLengthString;
			case NoteType.Note_A6: return "a'''" + noteLengthString;
			case NoteType.Note_A6_sharp: return "bes'''" + noteLengthString;
			case NoteType.Note_B6_flat: return "bes'''" + noteLengthString;
			case NoteType.Note_B6: return "b'''" + noteLengthString;
			case NoteType.Note_C7: return "c''''" + noteLengthString;
			case NoteType.Note_C7_sharp: return "des''''" + noteLengthString;
			case NoteType.Note_D7_flat: return "des''''" + noteLengthString;
			case NoteType.Note_D7: return "d''''" + noteLengthString;
			case NoteType.Note_D7_sharp: return "ees''''" + noteLengthString;
			case NoteType.Note_E7_flat: return "ees''''" + noteLengthString;
			case NoteType.Note_E7: return "e''''" + noteLengthString;
			case NoteType.Note_F7: return "f''''" + noteLengthString;
			case NoteType.Note_F7_sharp: return "ges''''" + noteLengthString;
			case NoteType.Note_G7_flat: return "ges''''" + noteLengthString;
			case NoteType.Note_G7: return "g''''" + noteLengthString;
			case NoteType.Note_G7_sharp: return "aes''''" + noteLengthString;
			case NoteType.Note_A7_flat: return "aes''''" + noteLengthString;
			case NoteType.Note_A7: return "a''''" + noteLengthString;
			case NoteType.Note_A7_sharp: return "bes''''" + noteLengthString;
			case NoteType.Note_B7_flat: return "bes''''" + noteLengthString;
			case NoteType.Note_B7: return "b''''" + noteLengthString;
			case NoteType.Note_C8: return "c'''''" + noteLengthString;
			default:
				throw new Error("Error, could not convert note to proper output for lily pond!");
		}
	}

	private numberToWord(num: number): string {
		const words = [
			'', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
			'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'
		];
		
		if (num >= 1 && num <= 20) {
			return words[num];
		} else {
			// For numbers beyond 20, fall back to the number itself with a prefix
			return `Phrase${num}`;
		}
	}
}