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
        const unisonNote = this.noteBelow;

        // Build candidates, checking for parallel octaves and large leaps
        const candidates: { note: number; weight: number }[] = [];

        const prevNote = this.counterpoint.length > 0
            ? this.counterpoint[this.counterpoint.length - 1] : 0;
        const prevCF = this.cantusFirmus.length >= 2
            ? this.cantusFirmus[this.cantusFirmus.length - 2] : 0;

        // Check for parallel octaves/unisons with previous interval
        const prevInterval = prevNote !== 0 && prevCF !== 0
            ? Math.abs(prevNote - prevCF) % 12 : -1;

        for (const candidate of [octaveNote, unisonNote]) {
            const currentInterval = Math.abs(candidate - this.noteBelow) % 12;

            // Skip if it would create parallel octaves/unisons
            if (prevInterval === 0 && currentInterval === 0) continue;

            // Skip if the leap from the previous note is too large (> octave)
            if (prevNote !== 0 && Math.abs(candidate - prevNote) > 12) continue;

            const weight = candidate === octaveNote ? 0.8 : 0.2;
            candidates.push({ note: candidate, weight });
        }

        if (candidates.length === 0) {
            // Both octave and unison would create parallel octaves
            // Choose the one that doesn't create a large leap
            if (prevNote !== 0) {
                const octaveLeap = Math.abs(octaveNote - prevNote);
                const unisonLeap = Math.abs(unisonNote - prevNote);
                return octaveLeap <= unisonLeap ? octaveNote : unisonNote;
            }
            return octaveNote;
        }

        // Weighted random selection
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;
        for (const c of candidates) {
            random -= c.weight;
            if (random <= 0) return c.note;
        }
        return candidates[candidates.length - 1].note;
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

        // Penultimate note: avoid octave/unison intervals to prevent
        // forced parallel octaves with the final note
        if (this.currentIndex === this.cantusFirmus.length - 2) {
            const nonOctaveOptions = this.noteOptions.filter(note => {
                const interval = Math.abs(note - this.noteBelow) % 12;
                return interval !== 0; // Exclude octaves and unisons
            });
            if (nonOctaveOptions.length > 0) {
                this.noteOptions = nonOctaveOptions;
            }
        }

        this.applyPreferContraryMotion();

        // Choose from remaining valid options
        return this.chooseNextNote();
    }
}