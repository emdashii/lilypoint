import { NoteType } from './types-and-globals.js';

export class Note {
	private note: NoteType = NoteType.Note_C4;
	private length: number = 4;

	constructor(note: NoteType, length: number = 4) {
		this.note = note;
		this.length = length;
	}

	getNote(): NoteType {
		return this.note;
	}

	getLength(): number {
		return this.length;
	}

	setNote(note: NoteType): void {
		this.note = note;
		console.log("setNote used: " + note);
	}

	setLength(length: number): void {
		this.length = length;
	}
}