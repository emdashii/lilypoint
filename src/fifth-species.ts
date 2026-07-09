import { Species } from './species.js';
import { Note } from './note.js';
import { SpeciesEngine, floridSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/**
 * Fifth species (florid): each measure freely mixes halves, quarters, and
 * suspensions (rhythm templates chosen per CF note in floridSlots). All
 * dissonances are treated: passing/neighbor tones on weak positions and
 * tied suspensions resolving down by step on strong ones.
 */
export class FifthSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			weakDissonance: 'passing+neighbor',
		});
		const solved = engine.solve(floridSlots(cf.length));
		if (!solved) {
			throw new CounterpointUnsolvableError('fifth species', cf);
		}
		return solvedToNotes(solved);
	}
}
