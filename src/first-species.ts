import { Species } from './species.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export class FirstSpecies extends Species {

    constructor() {
        super();

        // Enable rules specific to First Species
        this.rules.mustBeginOnPerfectConsonance = true;
        this.rules.mustEndOnPerfectConsonance = true;
        this.rules.noUnisonExceptEnds = true;
        this.rules.onlyConsonantOnDownbeat = true;
        this.rules.noParallelFifths = true;
        this.rules.noParallelOctaves = true;
        this.rules.noHiddenParallels = true;
        this.rules.preferContraryMotion = true;
        this.rules.limitConsecutiveIntervals = true;
        this.rules.noLargeLeaps = true;
        this.rules.noVoiceCrossing = true;
        this.rules.limitToTenth = true;
    }

    generateCounterpoint(cantusFirmus: Note[]): Note[] {
        this.cantusFirmus = cantusFirmus.map(n => n.getNote());
        this.counterpoint = [];

        for (let i = 0; i < this.cantusFirmus.length; i++) {
            this.currentIndex = i;
            this.setNoteBelow(this.cantusFirmus[i]);

            // Set previous note context
            if (i > 0) {
                this.setNoteBefore(this.counterpoint[i - 1]);
                this.setNoteBeforeAndBelow(this.cantusFirmus[i - 1]);
            }

            if (i > 1) {
                this.setNoteTwoBefore(this.counterpoint[i - 2]);
            }

            let nextNote: number;

            if (i === 0) {
                // First note - must be perfect consonance
                nextNote = this.generateFirstNote();
            } else if (i === this.cantusFirmus.length - 1) {
                // Last note - must be perfect consonance (octave or unison)
                nextNote = this.generateLastNote();
            } else {
                // Middle notes
                nextNote = this.generateMiddleNote();
            }

            this.counterpoint.push(nextNote);
            this.updatePreviousIntervals();
        }

        // Convert to Note objects
        return this.counterpoint.map(noteValue => new Note(noteValue as NoteType, 1));
    }

    private generateFirstNote(): number {
        // First note must be unison, fifth, or octave
        const options = [
            this.noteBelow,        // Unison
            this.noteBelow + 7,    // Perfect fifth above
            this.noteBelow + 12    // Octave above
        ];

        // Weight the options (prefer octave and fifth over unison)
        const weights = [0.1, 0.4, 0.5];
        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return options[i];
            }
        }

        return options[2]; // Default to octave
    }

    private generateLastNote(): number {
        // Final note must be octave or unison
        // Approach should be by step (handled by cantus firmus)

        if (Math.random() < 0.8) {
            return this.noteBelow + 12; // Octave (more common)
        } else {
            return this.noteBelow; // Unison
        }
    }

    private generateMiddleNote(): number {
        // Generate all possible notes
        this.generateNoteOptions();

        // Apply all relevant rules for First Species
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();
        this.applyNoUnisonExceptEnds();
        this.applyOnlyConsonantIntervals();
        this.applyNoParallelFifths();
        this.applyNoParallelOctaves();
        this.applyNoHiddenParallels();
        this.applyNoLargeLeaps();
        this.applyLimitConsecutiveIntervals();
        this.applyPreferContraryMotion();

        // Choose from remaining valid options
        return this.chooseNextNote();
    }
}