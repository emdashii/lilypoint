import { Species } from './species.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export class SecondSpecies extends Species {
    private isDownbeat: boolean = true;

    constructor() {
        super();

        // Enable rules specific to Second Species
        this.rules.mustBeginOnPerfectConsonance = true;
        this.rules.mustEndOnPerfectConsonance = true;
        this.rules.noUnisonExceptEnds = true;
        this.rules.onlyConsonantOnDownbeat = true;
        this.rules.allowDissonantPassing = true; // Key difference from first species
        this.rules.noParallelFifths = true;
        this.rules.noParallelOctaves = true;
        this.rules.noHiddenParallels = true;
        this.rules.preferContraryMotion = true;
        this.rules.noLargeLeaps = true;
        this.rules.approachLeapsByStep = true;
        this.rules.noVoiceCrossing = true;
        this.rules.limitToTenth = true;
    }

    generateCounterpoint(cantusFirmus: Note[]): Note[] {
        this.cantusFirmus = cantusFirmus.map(n => n.getNote());
        this.counterpoint = [];

        // Second species has 2 notes for each cantus firmus note
        for (let cfIndex = 0; cfIndex < this.cantusFirmus.length; cfIndex++) {
            this.setNoteBelow(this.cantusFirmus[cfIndex]);

            // Generate two notes per cantus firmus note
            for (let beat = 0; beat < 2; beat++) {
                this.isDownbeat = (beat === 0);
                const noteIndex = cfIndex * 2 + beat;
                this.currentIndex = cfIndex;

                // Set previous note context
                if (noteIndex > 0) {
                    this.setNoteBefore(this.counterpoint[noteIndex - 1]);
                }

                if (cfIndex > 0) {
                    this.setNoteBeforeAndBelow(this.cantusFirmus[cfIndex - 1]);
                }

                if (noteIndex > 1) {
                    this.setNoteTwoBefore(this.counterpoint[noteIndex - 2]);
                }

                let nextNote: number;

                if (cfIndex === 0 && beat === 0) {
                    // First note - perfect consonance
                    nextNote = this.generateFirstNote();
                } else if (cfIndex === this.cantusFirmus.length - 1) {
                    if (beat === 0) {
                        // Penultimate note - prepare cadence (often 6th or 3rd)
                        nextNote = this.generatePenultimateNote();
                    } else {
                        // Final note - perfect consonance
                        nextNote = this.generateLastNote();
                    }
                } else {
                    // Middle notes
                    nextNote = this.generateMiddleNote();
                }

                this.counterpoint.push(nextNote);
                this.updatePreviousIntervals();
            }
        }

        // Convert to Note objects (half notes)
        return this.counterpoint.map(noteValue => new Note(noteValue as NoteType, 2));
    }

    private generateFirstNote(): number {
        // Can start with half rest or perfect consonance
        const options = [
            this.noteBelow + 12,   // Octave
            this.noteBelow + 7,    // Fifth
            this.noteBelow         // Unison (rare)
        ];

        const weights = [0.5, 0.4, 0.1];
        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return options[i];
            }
        }

        return options[0];
    }

    private generatePenultimateNote(): number {
        // Typical cadential approach
        // If cantus firmus is in lower voice: 5-6-8 pattern
        // This would be the 6th (major 6th above)
        return this.noteBelow + 9; // Major 6th
    }

    private generateLastNote(): number {
        // Final note - octave or unison
        return this.noteBelow + 12; // Octave
    }

    private generateMiddleNote(): number {
        // Generate all possible notes
        this.generateNoteOptions();

        // Apply rules based on whether it's downbeat or upbeat
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();

        if (this.isDownbeat) {
            // Downbeat - must be consonant
            this.applyNoUnisonExceptEnds();
            this.applyOnlyConsonantIntervals();
            this.applyNoParallelFifths();
            this.applyNoParallelOctaves();
            this.applyNoHiddenParallels();
        } else {
            // Upbeat - can be dissonant if approached/left by step
            this.applyPassingToneRules();
        }

        // Common rules for both beats
        this.applyNoLargeLeaps();
        this.applyApproachLeapsByStep();
        this.applyPreferContraryMotion();

        return this.chooseNextNote();
    }

    private applyPassingToneRules(): void {
        // On weak beat, allow dissonance if it's a passing tone
        if (this.noteBefore === 0) {
            // If no previous note, must be consonant
            this.applyOnlyConsonantIntervals();
            return;
        }

        // Filter to allow passing tones
        this.noteOptions = this.noteOptions.filter(note => {
            const interval = Math.abs(note - this.noteBelow) % 12;
            const isConsonant = [0, 3, 4, 7, 8, 9].includes(interval);

            if (isConsonant) {
                return true; // Always allow consonances
            }

            // Allow dissonance only if approached by step
            const approachedByStep = Math.abs(note - this.noteBefore) <= 2;

            // For passing tone, we need to check if it continues in same direction
            // This is simplified - in practice would need to look ahead
            if (approachedByStep) {
                // Passing tone moving in same direction
                const direction = note > this.noteBefore ? 1 : -1;
                const previousDirection = this.noteTwoBefore !== 0 ?
                    (this.noteBefore > this.noteTwoBefore ? 1 : -1) : direction;

                // Allow if continuing in same direction (true passing tone)
                return direction === previousDirection;
            }

            return false;
        });

        // If no valid options, fall back to consonances only
        if (this.noteOptions.length === 0) {
            this.generateNoteOptions();
            this.applyNoVoiceCrossing();
            this.applyLimitToTenth();
            this.applyOnlyConsonantIntervals();
        }
    }
}