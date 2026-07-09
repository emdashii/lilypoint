import { Species } from './species.js';
import { Note } from './note.js';
import { SpeciesEngine, syncopatedSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/**
 * Fourth species: syncopated halves. Each upbeat half may tie over the
 * barline; a tied downbeat that is dissonant against the new CF note is a
 * suspension and resolves down by step. Upbeats (preparations) are always
 * consonant. Where a ligature is not possible the engine writes plain
 * halves instead ("breaking" the species, as Fux allows).
 */
export class FourthSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			weakDissonance: 'none',
		});
		const solved = engine.solve(syncopatedSlots(cf.length));
		if (!solved) {
			throw new CounterpointUnsolvableError('fourth species', cf);
		}
		return solvedToNotes(solved);
	}
}
