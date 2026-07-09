import { Species } from './species.js';
import { Note } from './note.js';
import { SpeciesEngine, uniformSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/**
 * Third species: four notes against each cantus firmus note (the final CF
 * note carries a single held note). First quarter of each group is
 * consonant; weak-quarter dissonances are passing or neighbor tones.
 */
export class ThirdSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			weakDissonance: 'passing+neighbor',
		});
		const solved = engine.solve(uniformSlots(cf.length, 4));
		if (!solved) {
			throw new CounterpointUnsolvableError('third species', cf);
		}
		return solvedToNotes(solved);
	}
}
