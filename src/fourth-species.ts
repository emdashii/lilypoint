import { Species } from './species.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export class FourthSpecies extends Species {
    private isSuspension: boolean = false;
    private suspensionType: 'consonant' | 'dissonant' | 'none' = 'none';

    constructor() {
        super();

        // Enable rules specific to Fourth Species (Syncopation)
        this.rules.mustBeginOnPerfectConsonance = true;
        this.rules.mustEndOnPerfectConsonance = true;
        this.rules.allowSuspensions = true;
        this.rules.resolveSuspensionsDown = true;
        this.rules.noParallelFifths = true;
        this.rules.noParallelOctaves = true;
        this.rules.preferContraryMotion = true;
        this.rules.noVoiceCrossing = true;
        this.rules.limitToTenth = true;
        this.rules.approachFinalByStep = true;
    }

    generateCounterpoint(cantusFirmus: Note[]): Note[] {
        this.cantusFirmus = cantusFirmus.map(n => n.getNote());
        this.counterpoint = [];

        // Fourth species: syncopated half notes (tied over bar lines)
        // Pattern: rest-note | note-note | note-note...

        // Start with half rest (represented as -1 in processing, will be handled in output)
        // Then generate tied notes

        for (let cfIndex = 0; cfIndex < this.cantusFirmus.length; cfIndex++) {
            this.setNoteBelow(this.cantusFirmus[cfIndex]);
            this.currentIndex = cfIndex;

            // Generate two half notes per cantus firmus whole note
            // But they're tied, so often the same pitch continues

            if (cfIndex === 0) {
                // First measure: rest then note
                // Skip the rest (handled in output formatting)
                const firstNote = this.generateFirstNote();
                this.counterpoint.push(firstNote);

            } else if (cfIndex === this.cantusFirmus.length - 1) {
                // Final measure: resolve to final note
                const penultimate = this.generatePenultimateNote();
                const final = this.generateLastNote();
                this.counterpoint.push(penultimate);
                this.counterpoint.push(final);

            } else {
                // Middle measures: create suspensions
                this.generateSuspension(cfIndex);
            }
        }

        // Convert to Note objects (half notes)
        return this.counterpoint.map(noteValue => new Note(noteValue as NoteType, 2));
    }

    private generateFirstNote(): number {
        // First sounding note after the rest - perfect consonance
        const options = [
            this.noteBelow + 12,   // Octave
            this.noteBelow + 7,    // Fifth
        ];

        return options[Math.random() < 0.6 ? 0 : 1];
    }

    private generatePenultimateNote(): number {
        // Typical suspension resolution before final
        // 7-6 suspension is common
        if (this.counterpoint.length > 0) {
            const lastNote = this.counterpoint[this.counterpoint.length - 1];
            // Create 7-6 suspension
            if (this.isConsonant(lastNote, this.cantusFirmus[this.cantusFirmus.length - 2])) {
                return this.noteBelow + 9; // Major 6th for 7-6-8 cadence
            }
        }
        return this.noteBelow + 9; // Major 6th
    }

    private generateLastNote(): number {
        // Final note - octave
        return this.noteBelow + 12;
    }

    private generateSuspension(cfIndex: number): void {
        // Suspension pattern: preparation-suspension-resolution

        if (this.counterpoint.length === 0) {
            // Need a starting note
            const note = this.noteBelow + 7; // Fifth
            this.counterpoint.push(note);
            this.counterpoint.push(note); // Tied
            return;
        }

        const previousNote = this.counterpoint[this.counterpoint.length - 1];

        // Check if previous note creates a suspension with current CF
        const intervalWithCurrent = Math.abs(previousNote - this.noteBelow) % 12;
        const isCurrentlyDissonant = ![0, 3, 4, 7, 8, 9].includes(intervalWithCurrent);

        if (isCurrentlyDissonant) {
            // We have a dissonant suspension - must resolve down by step
            const resolution = this.resolveDissonance(previousNote);
            this.counterpoint.push(resolution);

            // Prepare next suspension or consonant interval
            const nextPrep = this.prepareNextSuspension(resolution);
            this.counterpoint.push(nextPrep);

        } else {
            // Consonant - can maintain or move to create next suspension

            // Check if we should create a suspension for next measure
            if (cfIndex < this.cantusFirmus.length - 2 && Math.random() < 0.7) {
                // Create a suspension preparation
                const suspensionPrep = this.createSuspensionPreparation(cfIndex);
                this.counterpoint.push(suspensionPrep);
                this.counterpoint.push(suspensionPrep); // Tie it over
            } else {
                // Continue with consonant motion
                const nextNote = this.generateConsonantMotion(previousNote);
                this.counterpoint.push(nextNote);
                this.counterpoint.push(nextNote); // Can tie or change
            }
        }
    }

    private resolveDissonance(dissonantNote: number): number {
        // Dissonance must resolve down by step
        return dissonantNote - 1; // Could be -2 for whole step
    }

    private prepareNextSuspension(currentNote: number): number {
        // Prepare a note that will become dissonant when CF changes
        // Common suspensions: 4-3, 7-6, 9-8, 2-1

        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();

        // Find notes that are consonant now but will be dissonant with next CF
        if (this.currentIndex < this.cantusFirmus.length - 1) {
            const nextCF = this.cantusFirmus[this.currentIndex + 1];

            this.noteOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBelow) % 12;
                const nextInterval = Math.abs(note - nextCF) % 12;

                const isCurrentlyConsonant = [0, 3, 4, 7, 8, 9].includes(currentInterval);
                const willBeDissonant = [1, 2, 5, 6, 10, 11].includes(nextInterval);

                // Good suspension: consonant now, dissonant next
                return isCurrentlyConsonant && willBeDissonant;
            });
        }

        if (this.noteOptions.length === 0) {
            // Fallback to consonant interval
            return this.noteBelow + 7; // Fifth
        }

        return this.chooseNextNote();
    }

    private createSuspensionPreparation(cfIndex: number): number {
        // Create a note that will form a good suspension
        const nextCF = this.cantusFirmus[cfIndex + 1];

        // Common suspension preparations
        const options = [
            nextCF + 5,  // Will create 4-3 suspension
            nextCF + 10, // Will create 7-6 suspension
            nextCF + 2,  // Will create 9-8 suspension
        ];

        // Filter for valid range
        const validOptions = options.filter(note =>
            note > this.noteBelow && note <= this.noteBelow + 16
        );

        if (validOptions.length > 0) {
            return validOptions[Math.floor(Math.random() * validOptions.length)];
        }

        // Fallback
        return this.noteBelow + 7;
    }

    private generateConsonantMotion(previousNote: number): number {
        this.setNoteBefore(previousNote);
        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();
        this.applyOnlyConsonantIntervals();
        this.applyNoParallelFifths();
        this.applyNoParallelOctaves();

        // Prefer stepwise motion in fourth species
        const stepwiseOptions = this.noteOptions.filter(note =>
            Math.abs(note - previousNote) <= 2
        );

        if (stepwiseOptions.length > 0 && Math.random() < 0.7) {
            this.noteOptions = stepwiseOptions;
        }

        return this.chooseNextNote();
    }
	}
