import { pitchToken, spellPitch } from './pitch.js';
import { TICKS_PER_WHOLE } from './note.js';
import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { KeyInfo } from './key.js';

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
			const rl = await import('node:readline');
			while (await this.exists(fileName)) {
				console.log(`Warning a file already exists with the chosen output filename: ${fileName}!`);
				console.log("Please enter a different filename: ");

				const iface = rl.default.createInterface({
					input: process.stdin,
					output: process.stdout
				});

				const newFileName = await new Promise<string>((resolve) => {
					iface.question('', (answer: string) => {
						iface.close();
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
				const { writeFile } = await import('node:fs/promises');
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
		output += `${topPhraseName} = { \\clef "treble" \\key ${phrase.getKeyString()} \\${phrase.getKey().mode} \\time ${phrase.getTimeSig()}\n`;

		// Time to print out the notes for the top voice of this phrase
		output += this.writeVoice(phrase.getUpperVoice(), phrase);

		// End top voice of this phrase
		output += '\\bar "||" }\n';

		output += `${bottomPhraseName} = { \\clef "treble" \\key ${phrase.getKeyString()} \\${phrase.getKey().mode} \\time ${phrase.getTimeSig()}\n`;

		// Time to print out the notes for the bottom voice of this phrase
		output += this.writeVoice(phrase.getLowerVoice(), phrase);

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
			const { access } = await import('node:fs/promises');
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
		const token = note.isRest() ? 'r' : pitchToken(note.getSpelling() ?? spellPitch(note.getNote(), keyInfo ?? { notes: [], type: 'is' } as unknown as KeyInfo));
		let ticks = note.getDurationTicks();
		const parts: string[] = [];
		while (ticks > 0) {
			const size = Math.min(TICKS_PER_WHOLE, 2 ** Math.floor(Math.log2(ticks)));
			let used = size;
			let duration = String(TICKS_PER_WHOLE / size);
			if (size >= 2 && ticks >= size * 1.5) { used *= 1.5; duration += '.'; }
			ticks -= used;
			parts.push(token + duration + (!note.isRest() && (ticks > 0 || note.getTied()) ? '~' : ''));
		}
		return parts.join(' ');
	}

	private writeVoice(voice: Note[], phrase: Phrase): string {
		const [beats, unit] = phrase.getTimeSig().split('/').map(Number);
		const barTicks = beats * TICKS_PER_WHOLE / unit;
		let onset = 0;
		const tokens: string[] = [];
		for (const note of voice) {
			let remaining = note.getDurationTicks();
			while (remaining > 0) {
				const duration = Math.min(remaining, barTicks - onset % barTicks);
				const part = note.scaled(1);
				part.setDurationTicks(duration);
				remaining -= duration;
				part.setTied(!part.isRest() && (remaining > 0 || note.getTied()));
				tokens.push(this.convertNoteToOutput(part, phrase.getKey()));
				onset += duration;
			}
		}
		return ' ' + tokens.join(' ');
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
