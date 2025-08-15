import { Species } from './species.js';
import { Note } from './note.js';

export class SpeciesTwo extends Species {

	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		return [];
	}
	
	chooseNextNote(): number {
		if ((this.noteTwoBefore - this.noteBefore) === 2) {
			return this.noteBefore + 1;
		} else if ((this.noteTwoBefore - this.noteBefore) === -2) {
			return this.noteTwoBefore + 1;
		} else if ((this.noteTwoBefore - this.noteBefore) === 1) {
			return this.noteTwoBefore + 1;
		} else if ((this.noteTwoBefore - this.noteBefore) === -1) {
			return this.noteTwoBefore - 1;
		} else if ((this.noteTwoBefore - this.noteBefore) < 0) {
			return this.noteBefore + 1;
		} else if ((this.noteTwoBefore - this.noteBefore) > 0) {
			return this.noteBefore - 1;
		} else {
			return this.noteTwoBefore + 1;
		}
	}
}