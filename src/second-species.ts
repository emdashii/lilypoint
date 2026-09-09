import { Species } from './species.js';
import { Note } from './note.js';
import { SpeciesEngine, uniformSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/**
 * Second species: two notes against each cantus firmus note (the final CF
 * note carries a single held note). Downbeats are consonant; weak-beat
 * dissonances are passing tones entered and left by step.
 */
export class SecondSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			...this.engineOptions,
			weakDissonance: 'passing',
		});
		const solved = engine.solve(uniformSlots(cf.length, 2));
		if (!solved) {
			throw new CounterpointUnsolvableError('second species', cf);
		}
		return solvedToNotes(solved);
	}
}
