import { Note } from './note.js';
import { KeyInfo } from './key.js';

export class Phrase {
	private upperVoice: Note[] = [];
	private lowerVoice: Note[] = [];
	private key: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] };
	private timeSignature: string = "4/4";
	private mode: string = "major";

	constructor(upperVoice: Note[] = [], lowerVoice: Note[] = [], key: KeyInfo = { key: 'c', type: 'natural', mode: 'major', notes: [] }, timeSignature: string = "4/4") {
		this.upperVoice = upperVoice;
		this.lowerVoice = lowerVoice;
		this.key = key;
		this.timeSignature = timeSignature;
	}

	addNoteToUpperVoice(note: Note): void {
		this.upperVoice.push(note);
	}

	addNoteToLowerVoice(note: Note): void {
		this.lowerVoice.push(note);
	}

	setKey(key: KeyInfo): void {
		this.key = key;
	}

	setTimeSignature(timeSignature: string): void {
		this.timeSignature = timeSignature;
	}

	setMode(mode: string): void {
		this.mode = mode;
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

	getKey(): KeyInfo {
		return this.key;
	}

	getKeyString(): string {
		return this.key.key;
	}

	getMode(): string {
		return this.mode;
	}
}