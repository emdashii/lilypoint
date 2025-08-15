import { Species } from './species.js';
import { Note } from './note.js';

export class SpeciesFour extends Species {

	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		return [];
	}
	
	protected chooseNextNote(): number {
		return 0;
	}
}