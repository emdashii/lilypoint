import { PitchSpelling, soundingPitch } from './pitch.js';
import { NoteType } from './types-and-globals.js';

export const TICKS_PER_WHOLE = 4096;

export class Note {
	private note: NoteType = NoteType.Note_C4;
	private durationTicks: number = TICKS_PER_WHOLE / 4;
	private spelling?: PitchSpelling;
	private rest: boolean = false;
	private tied: boolean = false;

	constructor(note: NoteType, length: number = 4) {
		this.setNote(note);
		this.setLength(length);
	}

	/** Legacy pitched-note accessor. Use getPitch() for voices that include rests. */
	getNote(): NoteType {
		return this.note;
	}

	/** Compatibility reciprocal duration. Use ticks for dotted notes and spans. */
	getLength(): number {
		return TICKS_PER_WHOLE / this.durationTicks;
	}

	setNote(note: NoteType): void {
		if (!Number.isInteger(note) || note < 0 || note > 87) throw new Error('Pitch must be an integer piano-key index from 0 to 87');
		this.note = note;
		this.rest = false;
		this.spelling = undefined;
	}

	setLength(length: number): void {
		if (!Number.isSafeInteger(length) || length < 1 || !Number.isInteger(Math.log2(length))) {
			throw new Error('Note duration must be a positive power-of-two denominator');
		}
		this.setDurationTicks(TICKS_PER_WHOLE / length);
	}

	static rest(durationTicks: number): Note {
		const note = new Note(NoteType.Note_C4);
		note.rest = true;
		note.setDurationTicks(durationTicks);
		return note;
	}
	isRest(): boolean { return this.rest; }
	getPitch(): number | null { return this.rest ? null : this.note; }
	getDurationTicks(): number { return this.durationTicks; }
	setDurationTicks(ticks: number): void {
		if (!Number.isSafeInteger(ticks) || ticks <= 0) throw new Error('Duration must be positive integer ticks');
		this.durationTicks = ticks;
	}
	getSpelling(): PitchSpelling | undefined { return this.spelling ? { ...this.spelling } : undefined; }
	setSpelling(spelling: PitchSpelling): void {
		if (this.rest || soundingPitch(spelling) !== this.note) throw new Error('Spelling must match sounding pitch');
		this.spelling = { ...spelling };
	}
	scaled(divisor: number): Note {
		const copy = this.rest ? Note.rest(this.durationTicks / divisor) : new Note(this.note);
		copy.setDurationTicks(this.durationTicks / divisor);
		if (this.spelling) copy.setSpelling(this.spelling);
		copy.setTied(this.tied);
		return copy;
	}

	getTied(): boolean {
		return this.tied;
	}

	setTied(tied: boolean): void {
		this.tied = tied;
	}
}
