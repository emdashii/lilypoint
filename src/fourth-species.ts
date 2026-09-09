import { Species } from './species.js';
import { Note, TICKS_PER_WHOLE } from './note.js';
import { SpeciesEngine, syncopatedSlots, solvedToNotes, CounterpointUnsolvableError } from './species-engine.js';

/** Fourth species uses a half-pulse opening rest, mandatory interior ties,
 * consonant preparations, and a dissonant cadential suspension.
 */
export class FourthSpecies extends Species {
	generateCounterpoint(cantusFirmus: Note[]): Note[] {
		const cf = cantusFirmus.map(n => n.getNote());
		const engine = new SpeciesEngine(cf, this.scaleDegrees, {
			...this.engineOptions,
			weakDissonance: 'none',
		});
		const solved = engine.solve(syncopatedSlots(cf.length));
		if (!solved) {
			throw new CounterpointUnsolvableError('fourth species', cf);
		}
		return [Note.rest(TICKS_PER_WHOLE / 2), ...solvedToNotes(solved)];
	}
}
