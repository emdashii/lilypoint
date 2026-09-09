import { Note } from './note.js';
import { EngineOptions } from './species-engine.js';

/** Species supply rhythm and search configuration; rules live in the engine and validators. */
export abstract class Species {
	protected scaleDegrees: number[] = [];
	protected engineOptions: Partial<EngineOptions> = {};
	setScaleDegrees(degrees: number[]): void { this.scaleDegrees = [...degrees]; }
	setEngineOptions(options: Partial<EngineOptions>): void { this.engineOptions = { ...options }; }
	abstract generateCounterpoint(cantusFirmus: Note[]): Note[];
}
