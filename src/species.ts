import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export abstract class Species {
    protected noteBefore: number = 0;
    protected noteBelow: number = 0;
    protected noteBeforeAndBelow: number = 0;
    protected noteTwoBefore: number = 0;
    protected noteOptions: number[] = [];
    protected previousIntervals: number[] = [];
    protected cantusFirmus: number[] = [];
    protected counterpoint: number[] = [];
    protected currentIndex: number = 0;
    protected scaleDegrees: number[] = []; // Diatonic scale degrees to restrict note choices

    // Rule flags - can be enabled/disabled by each species
    protected rules = {
        // Harmonic rules
        mustBeginOnPerfectConsonance: false,
        mustEndOnPerfectConsonance: false,
        noUnison: false,
        noUnisonExceptEnds: false,
        onlyConsonantOnDownbeat: false,
        allowDissonantPassing: false,
        allowSuspensions: false,

        // Melodic rules
        noParallelFifths: false,
        noParallelOctaves: false,
        noHiddenParallels: false,
        preferContraryMotion: false,
        limitConsecutiveIntervals: false,
        noLargeLeaps: false,
        approachLeapsByStep: false,
        resolveSuspensionsDown: false,

        // Voice leading rules
        maintainRange: false,
        oneClimax: false,
        climaxInMiddle: false,
        approachFinalByStep: false,
        noVoiceCrossing: false,
        limitToTenth: false
    };

    constructor() {}

    setNoteBefore(noteBefore: number): void {
        this.noteBefore = noteBefore;
    }

    setNoteBelow(noteBelow: number): void {
        this.noteBelow = noteBelow;
    }

    setNoteBeforeAndBelow(noteBeforeAndBelow: number): void {
        this.noteBeforeAndBelow = noteBeforeAndBelow;
    }

    setNoteTwoBefore(noteTwoBefore: number): void {
        this.noteTwoBefore = noteTwoBefore;
    }

    setCantusFirmus(cantusFirmus: number[]): void {
        this.cantusFirmus = cantusFirmus;
    }

    setCurrentIndex(index: number): void {
        this.currentIndex = index;
    }

    setScaleDegrees(scaleDegrees: number[]): void {
        this.scaleDegrees = scaleDegrees;
    }

    // Abstract method - each species implements its own generation logic
    abstract generateCounterpoint(cantusFirmus: Note[]): Note[];

    // Common rule implementations that can be used by any species

    protected generateNoteOptions(): void {
        this.noteOptions = [];

        if (this.scaleDegrees.length === 0) {
            // Fallback: if no scale degrees provided, use chromatic scale (legacy behavior)
            const minNote = this.noteBelow - 12;
            const maxNote = this.noteBelow + 16;
            for (let note = minNote; note <= maxNote; note++) {
                this.noteOptions.push(note);
            }
        } else {
            // Generate options using only diatonic scale degrees
            // We need scale degrees across multiple octaves to have enough options
            const minNote = this.noteBelow - 12;
            const maxNote = this.noteBelow + 16;

            // Generate scale degrees across the range
            const baseScaleDegrees = [...this.scaleDegrees];
            const scaleLength = baseScaleDegrees.length;

            // Find the tonic (assumed to be first scale degree)
            const tonic = baseScaleDegrees[0];

            // Generate notes across multiple octaves
            for (let octaveOffset = -2; octaveOffset <= 2; octaveOffset++) {
                for (const scaleDegree of baseScaleDegrees) {
                    const note = scaleDegree + (octaveOffset * 12);
                    if (note >= minNote && note <= maxNote) {
                        this.noteOptions.push(note);
                    }
                }
            }

            // Sort the options
            this.noteOptions.sort((a, b) => a - b);
        }
    }

    protected applyNoVoiceCrossing(): void {
        if (!this.rules.noVoiceCrossing) return;

        this.noteOptions = this.noteOptions.filter(note => {
            // Counterpoint should stay above cantus firmus (or below if CF is upper voice)
            return note > this.noteBelow;
        });
    }

    protected applyLimitToTenth(): void {
        if (!this.rules.limitToTenth) return;

        this.noteOptions = this.noteOptions.filter(note => {
            const interval = Math.abs(note - this.noteBelow);
            return interval <= 16; // Major 10th = 16 semitones
        });
    }

    protected applyNoUnison(): void {
        if (!this.rules.noUnison) return;

        const index = this.noteOptions.indexOf(this.noteBelow);
        if (index > -1) {
            this.noteOptions.splice(index, 1);
        }
    }

    protected applyNoUnisonExceptEnds(): void {
        if (!this.rules.noUnisonExceptEnds) return;

        // Check if we're at beginning or end
        const isBeginning = this.currentIndex === 0;
        const isEnd = this.currentIndex === this.cantusFirmus.length - 1;

        if (!isBeginning && !isEnd) {
            this.applyNoUnison();
        }
    }

    protected applyOnlyConsonantIntervals(): void {
        if (!this.rules.onlyConsonantOnDownbeat) return;

        this.noteOptions = this.noteOptions.filter(note => {
            const interval = Math.abs(note - this.noteBelow) % 12;
            // Consonant intervals: unison(0), 3rd(3,4), 5th(7), 6th(8,9), octave(0)
            // Perfect 4th(5) is sometimes considered dissonant in two-voice counterpoint
            return [0, 3, 4, 7, 8, 9].includes(interval);
        });
    }

    protected applyNoParallelFifths(): void {
        if (!this.rules.noParallelFifths || this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;

        const previousInterval = Math.abs(this.noteBefore - this.noteBeforeAndBelow) % 12;

        if (previousInterval === 7) { // Previous was a fifth
            this.noteOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBelow) % 12;
                return currentInterval !== 7; // Don't allow another fifth
            });
        }
    }

    protected applyNoParallelOctaves(): void {
        if (!this.rules.noParallelOctaves || this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;

        const previousInterval = Math.abs(this.noteBefore - this.noteBeforeAndBelow) % 12;

        if (previousInterval === 0) { // Previous was unison/octave
            this.noteOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBelow) % 12;
                return currentInterval !== 0; // Don't allow another unison/octave
            });
        }
    }

    protected applyNoHiddenParallels(): void {
        if (!this.rules.noHiddenParallels || this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;

        // Check if both voices move in same direction
        const cfMotion = this.noteBelow - this.noteBeforeAndBelow;

        this.noteOptions = this.noteOptions.filter(note => {
            const cpMotion = note - this.noteBefore;

            // If similar motion (same direction)
            if (cfMotion * cpMotion > 0) {
                const interval = Math.abs(note - this.noteBelow) % 12;

                // Approaching perfect consonance by similar motion
                if (interval === 0 || interval === 7) {
                    // Allow only if one voice moves by step
                    const cfStep = Math.abs(cfMotion) <= 2;
                    const cpStep = Math.abs(cpMotion) <= 2;
                    return cfStep || cpStep;
                }
            }
            return true;
        });
    }

    protected applyPreferContraryMotion(): void {
        if (!this.rules.preferContraryMotion || this.noteBefore === 0 || this.noteBeforeAndBelow === 0) return;

        const cfMotion = this.noteBelow - this.noteBeforeAndBelow;

        // If CF moved up, prefer CP to move down and vice versa
        if (cfMotion > 0 && Math.random() < 0.7) {
            // CF moved up, prefer down motion in CP
            const contraryOptions = this.noteOptions.filter(note => note < this.noteBefore);
            if (contraryOptions.length > 0) {
                this.noteOptions = contraryOptions;
            }
        } else if (cfMotion < 0 && Math.random() < 0.7) {
            // CF moved down, prefer up motion in CP
            const contraryOptions = this.noteOptions.filter(note => note > this.noteBefore);
            if (contraryOptions.length > 0) {
                this.noteOptions = contraryOptions;
            }
        }
    }

    protected applyNoLargeLeaps(): void {
        if (!this.rules.noLargeLeaps || this.noteBefore === 0) return;

        this.noteOptions = this.noteOptions.filter(note => {
            const interval = Math.abs(note - this.noteBefore);
            return interval <= 12; // Maximum octave leap
        });
    }

    protected applyApproachLeapsByStep(): void {
        if (!this.rules.approachLeapsByStep || this.noteBefore === 0 || this.noteTwoBefore === 0) return;

        const previousInterval = Math.abs(this.noteBefore - this.noteTwoBefore);

        // If previous motion was a leap (more than 2 semitones)
        if (previousInterval > 2) {
            // Prefer stepwise motion or motion in opposite direction
            const leapDirection = this.noteBefore > this.noteTwoBefore ? 1 : -1;

            this.noteOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBefore);
                const currentDirection = note > this.noteBefore ? 1 : -1;

                // Allow stepwise motion or opposite direction
                return currentInterval <= 2 || currentDirection !== leapDirection;
            });
        }
    }

    protected applyLimitConsecutiveIntervals(): void {
        if (!this.rules.limitConsecutiveIntervals || this.previousIntervals.length < 2) return;

        const last = this.previousIntervals[this.previousIntervals.length - 1];
        const secondLast = this.previousIntervals[this.previousIntervals.length - 2];

        // If last two intervals were the same, don't allow a third consecutive identical interval
        if (last === secondLast) {
            this.noteOptions = this.noteOptions.filter(note => {
                const currentInterval = Math.abs(note - this.noteBelow) % 12;
                return currentInterval !== last;
            });
        }
    }

    protected applyAllowDissonantPassing(): void {
        if (!this.rules.allowDissonantPassing || this.noteBefore === 0) return;

        // Add stepwise options (may be dissonant) but respect voice crossing and tenth limits
        const stepUp = this.noteBefore + 1;
        const stepDown = this.noteBefore - 1;

        [stepUp, stepDown].forEach(note => {
            if (!this.noteOptions.includes(note)) {
                // Only add if it respects voice crossing and tenth limit
                const aboveCf = !this.rules.noVoiceCrossing || note > this.noteBelow;
                const withinTenth = !this.rules.limitToTenth || Math.abs(note - this.noteBelow) <= 16;
                if (aboveCf && withinTenth) {
                    this.noteOptions.push(note);
                }
            }
        });
    }

    protected applyResolveSuspensionsDown(): void {
        if (!this.rules.resolveSuspensionsDown || this.noteBefore === 0) return;

        // Check if previous note created a dissonance
        const previousInterval = Math.abs(this.noteBefore - this.noteBeforeAndBelow) % 12;

        // If previous was dissonant (2nd, 4th, 7th)
        if ([1, 2, 5, 6, 10, 11].includes(previousInterval)) {
            // Must resolve down by step
            this.noteOptions = [this.noteBefore - 1, this.noteBefore - 2].filter(note =>
                this.noteOptions.includes(note)
            );
        }
    }

    protected isConsonant(note1: number, note2: number): boolean {
        const interval = Math.abs(note1 - note2) % 12;
        return [0, 3, 4, 7, 8, 9].includes(interval);
    }

    protected isPerfectConsonance(note1: number, note2: number): boolean {
        const interval = Math.abs(note1 - note2) % 12;
        return interval === 0 || interval === 7; // Unison/octave or fifth
    }

    protected updatePreviousIntervals(): void {
        if (this.noteBefore !== 0 && this.noteBelow !== 0) {
            const interval = Math.abs(this.noteBefore - this.noteBelow);
            this.previousIntervals.push(interval);

            // Keep sliding window of recent intervals
            if (this.previousIntervals.length > 5) {
                this.previousIntervals.shift();
            }
        }
    }

    protected chooseNextNote(): number {
        if (this.noteOptions.length === 0) {
            // Fallback: find a consonant note that respects voice crossing, tenth, and leap constraints
            console.warn("No valid options found, using fallback");
            const candidates = [7, 4, 3, 9, 8, 12, 0].map(i => this.noteBelow + i);
            for (const note of candidates) {
                const leapOk = this.noteBefore === 0 || Math.abs(note - this.noteBefore) <= 12;
                const aboveCf = note >= this.noteBelow;
                const withinTenth = Math.abs(note - this.noteBelow) <= 16;
                if (leapOk && aboveCf && withinTenth) return note;
            }
            return this.noteBelow + 7; // Last resort
        }

        // Random selection from valid options
        const index = Math.floor(Math.random() * this.noteOptions.length);
        return this.noteOptions[index];
    }
}