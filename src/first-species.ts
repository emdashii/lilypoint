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
        // First note must be unison, fifth, or octave FROM THE SCALE
        const options: number[] = [];

        // Unison - same note
        if (this.scaleDegrees.includes(this.noteBelow)) {
            options.push(this.noteBelow);
        }

        // Perfect fifth - find the 5th scale degree above (7 semitones, but must be in scale)
        const fifthCandidates = this.scaleDegrees.filter(note => {
            const interval = note - this.noteBelow;
            return interval === 7 || interval === 19; // Same octave or octave above
        });
        options.push(...fifthCandidates);

        // Octave above - same note an octave up
        const octaveNote = this.noteBelow + 12;
        if (this.scaleDegrees.includes(octaveNote) ||
            this.scaleDegrees.includes(octaveNote % 12 + Math.floor(octaveNote / 12) * 12)) {
            options.push(octaveNote);
        }

        // If no diatonic options found (shouldn't happen), fall back to octave
        if (options.length === 0) {
            return this.noteBelow + 12;
        }

        // Weight the options (prefer octave and fifth over unison)
        // Give higher weight to later options (fifth and octave)
        const weights = options.map((_, i) => (i + 1) / options.length);
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        const random = Math.random() * totalWeight;
        let cumulative = 0;

        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return options[i];
            }
        }

        return options[options.length - 1]; // Default to last option
    }

    private generateLastNote(): number {
        // Final note must be octave or unison FROM THE SCALE
        const octaveNote = this.noteBelow + 12;

        // Prefer octave if it's in the scale, otherwise unison
        if (this.scaleDegrees.includes(octaveNote) && Math.random() < 0.8) {
            return octaveNote;
        } else if (this.scaleDegrees.includes(this.noteBelow)) {
            return this.noteBelow;
        } else {
            // Fallback - shouldn't happen if cantus firmus is diatonic
            return octaveNote;
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