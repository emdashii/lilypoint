export abstract class Species {
	protected noteBefore: number = 0;
	protected noteBelow: number = 0;
	protected noteBeforeAndBelow: number = 0;
	protected noteTwoBefore: number = 0;

	setNoteBefore(noteBefore: number): void {
		this.noteBefore = noteBefore;
	}

	setNoteBelow(noteBelow: number): void {
		this.noteBelow = noteBelow;
	}

	setNoteBeforeAndBelow(noteBeforeAndBelow: number): void {
		this.noteBeforeAndBelow = noteBeforeAndBelow;
	}

	setNoteTwoBefore(noteTwoBefore: number): void {
		this.noteTwoBefore = noteTwoBefore;
	}

	getNoteBefore(): number {
		return this.noteBefore;
	}

	getNoteBelow(): number {
		return this.noteBelow;
	}

	getNoteBeforeAndBelow(): number {
		return this.noteBeforeAndBelow;
	}

	getNoteTwoBefore(): number {
		return this.noteTwoBefore;
	}

	protected abstract chooseNextNote(): number;
}