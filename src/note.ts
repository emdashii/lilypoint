import { NoteType } from './types-and-globals.js';

export class Note {
	private note: NoteType = NoteType.Note_C4;
	private length: number = 4;
	private tied: boolean = false;

	constructor(note: NoteType, length: number = 4) {
		this.setNote(note);
		this.setLength(length);
	}

	getNote(): NoteType {
		return this.note;
	}

	getLength(): number {
		return this.length;
	}

	setNote(note: NoteType): void {
		if (!Number.isInteger(note) || note < 0 || note > 87) throw new Error('Pitch must be an integer piano-key index from 0 to 87');
		this.note = note;
	}

	setLength(length: number): void {
		if (!Number.isSafeInteger(length) || length < 1 || !Number.isInteger(Math.log2(length))) {
			throw new Error('Note duration must be a positive power-of-two denominator');
		}
		this.length = length;
	}

	getTied(): boolean {
		return this.tied;
	}

	setTied(tied: boolean): void {
		this.tied = tied;
	}
}
