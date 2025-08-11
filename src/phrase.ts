import { Note } from './note.js';

export class Phrase {
	private upperVoice: Note[] = [];
	private lowerVoice: Note[] = [];
	private key: string = "c";
	private timeSignature: string = "4/4";

	constructor(upperVoice: Note[] = [], lowerVoice: Note[] = [], key: string = "c", timeSignature: string = "4/4") {
		this.upperVoice = upperVoice;
		this.lowerVoice = lowerVoice;
		this.key = this.verifyKey(key);
		this.timeSignature = timeSignature;
	}

	addNoteToUpperVoice(note: Note): void {
		this.upperVoice.push(note);
	}

	addNoteToLowerVoice(note: Note): void {
		this.lowerVoice.push(note);
	}

	setKey(key: string): void {
		this.key = this.verifyKey(key);
	}

	setTimeSignature(timeSignature: string): void {
		this.timeSignature = timeSignature;
	}

	getUpperVoice(): Note[] {
		return this.upperVoice;
	}

	getLowerVoice(): Note[] {
		return this.lowerVoice;
	}

	getTimeSig(): string {
		return this.timeSignature;
	}

	getKey(): string {
		return this.key;
	}

	private verifyKey(key: string): string {
		key = key.toLowerCase();

		if (key.charAt(0) < 'a' || key.charAt(0) > 'g') {
			throw new Error("Invalid key letter passed to phrase class!");
		}

		if (key.length === 1) return key;

		if (key.length !== 3) {
			throw new Error("Invalid key length passed to phrase class!");
		}

		if (key.substring(1, 3) === "es" || key.substring(1, 3) === "is") {
			return key;
		}

		throw new Error("Invalid key passed to phrase class!");
	}
}