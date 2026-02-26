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
        this.rules.noLargeLeaps = true;
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

        // Convert to Note objects (half notes) and mark ties
        const notes = this.counterpoint.map(noteValue => new Note(noteValue as NoteType, 2));

        // Mark notes as tied where the next note has the same pitch (suspension mechanism)
        for (let i = 0; i < notes.length - 1; i++) {
            if (notes[i].getNote() === notes[i + 1].getNote()) {
                notes[i].setTied(true);
            }
        }

        return notes;
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
        const prevNote = this.counterpoint.length > 0
            ? this.counterpoint[this.counterpoint.length - 1] : 0;

        // Prefer major 6th for 7-6-8 cadence, but check constraints
        const candidates = [9, 8, 7, 4, 3].map(i => this.noteBelow + i);
        for (const note of candidates) {
            if (note > this.noteBelow && Math.abs(note - this.noteBelow) <= 16
                && (prevNote === 0 || Math.abs(note - prevNote) <= 12)
                && this.isConsonant(note, this.noteBelow)) {
                return note;
            }
        }
        return this.noteBelow + 9; // Fallback
    }

    private generateLastNote(): number {
        // Final note - octave or unison, checking for large leaps
        const octaveNote = this.noteBelow + 12;
        const unisonNote = this.noteBelow;
        const prevNote = this.counterpoint.length > 0
            ? this.counterpoint[this.counterpoint.length - 1] : 0;

        const octaveLeapOk = prevNote === 0 || Math.abs(octaveNote - prevNote) <= 12;
        const unisonLeapOk = prevNote === 0 || Math.abs(unisonNote - prevNote) <= 12;

        if (octaveLeapOk) return octaveNote;
        if (unisonLeapOk) return unisonNote;
        // Both are large leaps - pick the smaller one
        return Math.abs(octaveNote - prevNote) <= Math.abs(unisonNote - prevNote)
            ? octaveNote : unisonNote;
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
        // Dissonance must resolve down by step (1 or 2 semitones)
        // Prefer resolving to a consonant note that doesn't cross below CF
        const stepDown1 = dissonantNote - 1;
        const stepDown2 = dissonantNote - 2;

        // Check which resolutions are consonant with the current CF note
        const consonantResolutions = [stepDown1, stepDown2].filter(note => {
            if (note < this.noteBelow) return false; // No voice crossing
            const interval = Math.abs(note - this.noteBelow) % 12;
            return [0, 3, 4, 7, 8, 9].includes(interval);
        });

        if (consonantResolutions.length > 0) {
            return consonantResolutions[0];
        }

        // If no consonant resolution above CF, allow any that doesn't cross
        const aboveCf = [stepDown1, stepDown2].filter(note => note >= this.noteBelow);
        if (aboveCf.length > 0) {
            return aboveCf[0];
        }

        // Fallback to step down by 1
        return stepDown1;
    }

    private prepareNextSuspension(currentNote: number): number {
        // Prepare a note that will become dissonant when CF changes
        // Common suspensions: 4-3, 7-6, 9-8, 2-1

        this.setNoteBefore(currentNote);
        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();
        this.applyNoLargeLeaps();

        // Find notes that are consonant now but will be dissonant with next CF
        if (this.currentIndex < this.cantusFirmus.length - 1) {
            const nextCF = this.cantusFirmus[this.currentIndex + 1];

            const suspensionOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBelow) % 12;
                const nextInterval = Math.abs(note - nextCF) % 12;

                const isCurrentlyConsonant = [0, 3, 4, 7, 8, 9].includes(currentInterval);
                const willBeDissonant = [1, 2, 5, 6, 10, 11].includes(nextInterval);

                // Good suspension: consonant now, dissonant next
                return isCurrentlyConsonant && willBeDissonant;
            });

            if (suspensionOptions.length > 0) {
                this.noteOptions = suspensionOptions;
            } else {
                // No suspension possible - just pick a consonant note
                this.applyOnlyConsonantIntervals();
            }
        }

        return this.chooseNextNote();
    }

    private createSuspensionPreparation(cfIndex: number): number {
        // Create a note that will form a good suspension
        const nextCF = this.cantusFirmus[cfIndex + 1];
        const prevNote = this.counterpoint.length > 0
            ? this.counterpoint[this.counterpoint.length - 1] : 0;

        // Common suspension preparations
        const options = [
            nextCF + 5,  // Will create 4-3 suspension
            nextCF + 10, // Will create 7-6 suspension
            nextCF + 2,  // Will create 9-8 suspension
        ];

        // Filter: must be consonant with CURRENT CF, above CF, within tenth, no large leaps
        const validOptions = options.filter(note => {
            if (note <= this.noteBelow) return false; // No voice crossing
            if (Math.abs(note - this.noteBelow) > 16) return false; // Within a tenth
            if (prevNote !== 0 && Math.abs(note - prevNote) > 12) return false; // No large leaps
            const interval = Math.abs(note - this.noteBelow) % 12;
            return [0, 3, 4, 7, 8, 9].includes(interval); // Must be consonant with current CF
        });

        if (validOptions.length > 0) {
            return validOptions[Math.floor(Math.random() * validOptions.length)];
        }

        // Fallback: consonant interval within range and leap constraint
        const fallbackOptions = [3, 4, 7, 8, 9, 12].map(i => this.noteBelow + i)
            .filter(note => prevNote === 0 || Math.abs(note - prevNote) <= 12);
        if (fallbackOptions.length > 0) {
            return fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        }
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
        this.applyNoLargeLeaps();

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
