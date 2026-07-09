import { Species } from './species.js';
import { Note } from './note.js';
import { SpeciesEngine, uniformSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/**
 * First species: one note against each cantus firmus note, all intervals
 * consonant. Pitches are found with the backtracking engine so the result
 * always satisfies the calibrated species rules (src/validation/).
 */
export class FirstSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			allowRepeat: true,
			weakDissonance: 'none',
		});
		const solved = engine.solve(uniformSlots(cf.length, 1));
		if (!solved) {
			throw new CounterpointUnsolvableError('first species', cf);
		}
		return solvedToNotes(solved);
	}
}
