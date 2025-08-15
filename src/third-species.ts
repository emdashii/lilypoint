import { Species } from './species.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export class ThirdSpecies extends Species {
    private beatInMeasure: number = 0;

    constructor() {
        super();

        // Enable rules specific to Third Species
        this.rules.mustBeginOnPerfectConsonance = true;
        this.rules.mustEndOnPerfectConsonance = true;
        this.rules.noUnisonExceptEnds = true;
        this.rules.onlyConsonantOnDownbeat = true;
        this.rules.allowDissonantPassing = true;
        this.rules.noParallelFifths = true;
        this.rules.noParallelOctaves = true;
        this.rules.preferContraryMotion = true;
        this.rules.noLargeLeaps = true;
        this.rules.approachLeapsByStep = true;
        this.rules.noVoiceCrossing = true;
        this.rules.limitToTenth = true;
    }

    generateCounterpoint(cantusFirmus: Note[]): Note[] {
        this.cantusFirmus = cantusFirmus.map(n => n.getNote());
        this.counterpoint = [];

        // Third species has 4 notes for each cantus firmus note
        for (let cfIndex = 0; cfIndex < this.cantusFirmus.length; cfIndex++) {
            this.setNoteBelow(this.cantusFirmus[cfIndex]);

            // Generate four quarter notes per cantus firmus note
            for (let beat = 0; beat < 4; beat++) {
                this.beatInMeasure = beat;
                const noteIndex = cfIndex * 4 + beat;
                this.currentIndex = cfIndex;

                // Set previous note context
                if (noteIndex > 0) {
                    this.setNoteBefore(this.counterpoint[noteIndex - 1]);
                }

                if (cfIndex > 0 && beat === 0) {
                    this.setNoteBeforeAndBelow(this.cantusFirmus[cfIndex - 1]);
                }

                if (noteIndex > 1) {
                    this.setNoteTwoBefore(this.counterpoint[noteIndex - 2]);
                }

                let nextNote: number;

                if (cfIndex === 0 && beat === 0) {
                    // First note
                    nextNote = this.generateFirstNote();
                } else if (cfIndex === this.cantusFirmus.length - 1) {
                    if (beat === 3) {
                        // Final note
                        nextNote = this.generateLastNote();
                    } else if (beat === 2) {
                        // Leading tone before final
                        nextNote = this.generateLeadingTone();
                    } else {
                        // Other notes in final measure
                        nextNote = this.generateCadentialApproach();
                    }
                } else {
                    // Middle notes
                    nextNote = this.generateMiddleNote();
                }

                this.counterpoint.push(nextNote);
                this.updatePreviousIntervals();
            }
        }

        // Convert to Note objects (quarter notes)
        return this.counterpoint.map(noteValue => new Note(noteValue as NoteType, 4));
    }

    private generateFirstNote(): number {
        // First note - perfect consonance
        const options = [
            this.noteBelow + 12,   // Octave
            this.noteBelow + 7,    // Fifth
        ];

        return options[Math.random() < 0.6 ? 0 : 1];
    }

    private generateLeadingTone(): number {
        // Approach final by step - typically leading tone
        const finalNote = this.noteBelow + 12; // Assuming octave final
        return finalNote - 1; // Half step below
    }

    private generateCadentialApproach(): number {
        // Notes leading to cadence
        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();
        this.applyOnlyConsonantIntervals();

        // Prefer stepwise motion in cadence
        if (this.noteBefore !== 0) {
            const stepwiseOptions = this.noteOptions.filter(note =>
                Math.abs(note - this.noteBefore) <= 2
            );
            if (stepwiseOptions.length > 0) {
                this.noteOptions = stepwiseOptions;
            }
        }

        return this.chooseNextNote();
    }

    private generateLastNote(): number {
        // Final note - octave or unison
        return this.noteBelow + 12;
    }

    private generateMiddleNote(): number {
        // Generate all possible notes
        this.generateNoteOptions();

        // Apply rules based on beat position
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();

        if (this.beatInMeasure === 0) {
            // First beat - must be consonant
            this.applyNoUnisonExceptEnds();
            this.applyOnlyConsonantIntervals();
            this.applyNoParallelFifths();
            this.applyNoParallelOctaves();
        } else {
            // Other beats - more flexible
            this.applyFlexibleRules();
        }

        // Common rules
        this.applyNoLargeLeaps();
        this.applyApproachLeapsByStep();
        this.applyPreferContraryMotion();

        return this.chooseNextNote();
    }

    private applyFlexibleRules(): void {
        // On beats 2-4, allow more flexibility

        // Five-note rule from Fux:
        // 1st note: consonant
        // 2nd note: consonant or dissonant
        // 3rd note: consonant (unless all others are consonant)
        // 4th note: dissonant if 5th is consonant

        if (this.noteBefore === 0) {
            this.applyOnlyConsonantIntervals();
            return;
        }

        this.noteOptions = this.noteOptions.filter(note => {
            const interval = Math.abs(note - this.noteBelow) % 12;
            const isConsonant = [0, 3, 4, 7, 8, 9].includes(interval);

            if (isConsonant) {
                return true; // Always allow consonances
            }

            // Check for passing tones and neighbor notes
            const stepFromPrevious = Math.abs(note - this.noteBefore) <= 2;

            if (!stepFromPrevious) {
                return false; // Dissonance must be approached by step
            }

            // Allow passing tones (continuing in same direction)
            if (this.noteTwoBefore !== 0) {
                const previousDirection = this.noteBefore > this.noteTwoBefore ? 1 : -1;
                const currentDirection = note > this.noteBefore ? 1 : -1;

                if (previousDirection === currentDirection) {
                    return true; // Passing tone
                }

                // Allow neighbor notes (return to previous pitch)
                if (Math.abs(note - this.noteTwoBefore) <= 1) {
                    return true; // Neighbor note
                }
            }

            // Special case: cambiata figure (leap from dissonance)
            // This would need more context to implement properly

            return this.beatInMeasure === 1 || this.beatInMeasure === 3;
        });

        if (this.noteOptions.length === 0) {
            // Fallback to consonances
            this.generateNoteOptions();
            this.applyNoVoiceCrossing();
            this.applyOnlyConsonantIntervals();
        }
    }
}