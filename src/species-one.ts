import { Species } from './species.js';
import { Note } from './note.js';

export class SpeciesOne extends Species {
	protected noteOptions: number[] = [];
	protected previousIntervals: number[] = [];
	private lower: number[] = [];
	private upper: number[] = [];
	private count: number = 0;

	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		return [];
	}

	chooseNextNote(): number {
		this.noteOptions = [];
		this.h_cannotCrossMelody();

		this.h_avoidDimFifth();
		this.h_noFourthOrSeventh();
		this.h_noSecondOrNinth();

		this.m_noParallelFifths();
		this.m_noSimilarFifths();
		this.m_noParallelOctaves();
		this.m_noSimilarOctaves();

		if (!(this.count % 4 === 0)) {
			this.h_removeEighth();
		}

		if (this.previousIntervals.length !== 0) {
			console.log("PreviousInterval: " + this.previousIntervals[this.previousIntervals.length - 1]);
		}

		const toChoose = Math.floor(Math.random() * this.noteOptions.length);
		const chosen = this.noteOptions[toChoose];

		return chosen;
	}

	writeImitativeTwoVoices(length: number = 8): void {
		this.lower = this.writeImitativeLowerVoice(length);
		for (let i = 0; i < length - 3; i++) {
			const temp = this.lower[i];
			this.upper.push(temp + 4);
		}
		this.upper.push(7);
		this.upper.push(8);
	}

	writeImitativeLowerVoice(length: number): number[] {
		const ImitativeLowerVoice: number[] = [];
		ImitativeLowerVoice.push(1);

		for (let i = 0; i < length - 3; i++) {
			let nextNote: number;
			const lastNote = ImitativeLowerVoice[ImitativeLowerVoice.length - 1];
			
			if (lastNote < -4) {
				nextNote = lastNote + this.pickImitativeUp() - 1;
			} else if (lastNote > 5) {
				nextNote = lastNote - this.pickImitativeDown() - 1;
			} else if (Math.random() < 0.5) {
				nextNote = lastNote - this.pickImitativeDown() - 1;
			} else {
				nextNote = lastNote + this.pickImitativeUp() - 1;
			}
			ImitativeLowerVoice.push(nextNote);
		}
		ImitativeLowerVoice.push(2);
		ImitativeLowerVoice.push(1);
		return ImitativeLowerVoice;
	}

	pickImitativeUp(): number {
		const rand = Math.floor(Math.random() * 9);
		switch (rand) {
			case 0:
				return 1;
			case 1:
			case 2:
			case 3:
			case 4:
				return 3;
			case 5:
			case 6:
				return 5;
			default:
				return 3;
		}
	}

	pickImitativeDown(): number {
		const rand = Math.floor(Math.random() * 7);
		switch (rand) {
			case 0:
				return 1;
			case 1:
			case 2:
			case 3:
			case 4:
				return 2;
			case 5:
			case 6:
				return 4;
			default:
				return 2;
		}
	}

	printImitativeCounterpoint(): void {
		console.log("Top:\t\t" + this.upper.join("\t"));
		console.log("Bottom:\t" + this.lower.join("\t"));
	}

	getImitativeUpper(): number[] {
		return this.upper;
	}

	getImitativeLower(): number[] {
		return this.lower;
	}

	protected h_cannotCrossMelody(): void {
		for (let i = this.noteBelow + 1; i < this.noteBelow + 9; i++) {
			this.noteOptions.push(i);
		}
	}

	protected h_avoidDimFifth(): void {
		if (this.noteBelow === 0 || this.noteBelow === 7) {
			const index = this.noteOptions.indexOf(this.noteBelow + 4);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected h_noFourthOrSeventh(): void {
		let index = this.noteOptions.indexOf(this.noteBelow + 3);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
		
		index = this.noteOptions.indexOf(this.noteBelow + 6);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected h_noSecondOrNinth(): void {
		let index = this.noteOptions.indexOf(this.noteBelow + 1);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
		
		index = this.noteOptions.indexOf(this.noteBelow + 8);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected h_removeEighth(): void {
		const index = this.noteOptions.indexOf(this.noteBelow + 7);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected m_noParallelFifths(): void {
		if ((this.noteBefore - 4) === this.noteBeforeAndBelow) {
			const index = this.noteOptions.indexOf(this.noteBelow + 4);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noSimilarFifths(): void {
		if ((this.noteBeforeAndBelow > this.noteBelow) && ((this.noteBefore - 4) >= this.noteBeforeAndBelow)) {
			const index = this.noteOptions.indexOf(this.noteBelow + 4);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
		if ((this.noteBeforeAndBelow < this.noteBelow) && ((this.noteBefore - 4) <= this.noteBeforeAndBelow)) {
			const index = this.noteOptions.indexOf(this.noteBelow + 4);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noParallelOctaves(): void {
		if ((this.noteBefore - 7) === this.noteBeforeAndBelow) {
			const index = this.noteOptions.indexOf(this.noteBelow + 7);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noSimilarOctaves(): void {
		if ((this.noteBeforeAndBelow > this.noteBelow) && ((this.noteBefore - 7) >= this.noteBeforeAndBelow)) {
			const index = this.noteOptions.indexOf(this.noteBelow + 7);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
		if ((this.noteBeforeAndBelow < this.noteBelow) && ((this.noteBefore - 7) <= this.noteBeforeAndBelow)) {
			const index = this.noteOptions.indexOf(this.noteBelow + 7);
			if (index > -1) {
				this.noteOptions.splice(index, 1);
			}
		}
	}

	protected m_noSameNote(): void {
		const index = this.noteOptions.indexOf(this.noteBefore);
		if (index > -1) {
			this.noteOptions.splice(index, 1);
		}
	}

	protected m_onlyUse1Once(): void {
		this.previousIntervals.push(this.noteBefore - this.noteBeforeAndBelow + 1);

		const index = this.previousIntervals.indexOf(1);
		if (index > -1) {
			this.noteOptions.shift();
		}
	}
}