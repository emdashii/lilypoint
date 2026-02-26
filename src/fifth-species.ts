import { Species } from './species.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';

export class FifthSpecies extends Species {
    private currentRhythm: 'whole' | 'half' | 'quarter' | 'eighth' = 'quarter';
    private measuresGenerated: number = 0;
    private notesInCurrentMeasure: number = 0;
    private rhythmPattern: number[] = []; // Note lengths for variety

    constructor() {
        super();

        // Enable all rules - fifth species combines all previous species
        this.rules.mustBeginOnPerfectConsonance = true;
        this.rules.mustEndOnPerfectConsonance = true;
        this.rules.noUnisonExceptEnds = true;
        this.rules.onlyConsonantOnDownbeat = true;
        this.rules.allowDissonantPassing = true;
        this.rules.allowSuspensions = true;
        this.rules.resolveSuspensionsDown = true;
        this.rules.noParallelFifths = true;
        this.rules.noParallelOctaves = true;
        this.rules.noHiddenParallels = true;
        this.rules.preferContraryMotion = true;
        this.rules.noLargeLeaps = true;
        this.rules.approachLeapsByStep = true;
        this.rules.noVoiceCrossing = true;
        this.rules.limitToTenth = true;
        this.rules.approachFinalByStep = true;
    }

    generateCounterpoint(cantusFirmus: Note[]): Note[] {
        this.cantusFirmus = cantusFirmus.map(n => n.getNote());
        this.counterpoint = [];
        this.rhythmPattern = [];

        // Fifth species uses mixed note values - florid counterpoint
        for (let cfIndex = 0; cfIndex < this.cantusFirmus.length; cfIndex++) {
            this.setNoteBelow(this.cantusFirmus[cfIndex]);
            this.currentIndex = cfIndex;
            this.measuresGenerated = cfIndex;

            // Determine rhythm pattern for this measure
            const pattern = this.selectRhythmPattern(cfIndex);

            // Generate notes according to the pattern
            this.generateMeasure(pattern, cfIndex);
        }

        // Convert to Note objects with appropriate durations
        const notes: Note[] = [];
        for (let i = 0; i < this.counterpoint.length; i++) {
            const duration = this.rhythmPattern[i] || 4;
            notes.push(new Note(this.counterpoint[i] as NoteType, duration));
        }

        return notes;
    }

    private selectRhythmPattern(measureIndex: number): number[] {
        // Select rhythm pattern for this measure
        // Returns array of note durations that sum to a whole note (4 beats)

        if (measureIndex === 0) {
            // First measure - start simple
            return [2, 2]; // Two half notes
        }

        if (measureIndex === this.cantusFirmus.length - 1) {
            // Last measure - end with longer values
            return [2, 4, 4]; // Half, quarter, quarter leading to final
        }

        // Middle measures - varied patterns
        const patterns = [
            [1], // Whole note (first species)
            [2, 2], // Two halves (second species)
            [4, 4, 4, 4], // Four quarters (third species)
            [2, 2], // Syncopation (fourth species style)
            [2, 4, 4], // Mixed values
            [4, 4, 2], // Mixed values
            [4, 8, 8, 4, 4], // With eighth notes
            [8, 8, 4, 2], // Starting with eighths
        ];

        // Choose pattern based on context and variety
        const lastPattern = this.getLastRhythmPattern();
        let availablePatterns = patterns;

        // Avoid repeating the same pattern
        if (lastPattern.length > 0) {
            availablePatterns = patterns.filter(p =>
                p.length !== lastPattern.length ||
                p.some((v, i) => v !== lastPattern[i])
            );
        }

        // Prefer certain patterns in middle of phrase
        if (measureIndex === Math.floor(this.cantusFirmus.length / 2)) {
            // Climax area - prefer more active rhythm
            availablePatterns = availablePatterns.filter(p => p.length >= 3);
        }

        const pattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        return pattern;
    }

    private getLastRhythmPattern(): number[] {
        // Get the rhythm pattern from the previous measure
        if (this.rhythmPattern.length < 2) return [];

        let sum = 0;
        const pattern: number[] = [];

        for (let i = this.rhythmPattern.length - 1; i >= 0; i--) {
            pattern.unshift(this.rhythmPattern[i]);
            sum += 4 / this.rhythmPattern[i]; // Convert to beat value
            if (sum >= 4) break; // Found a complete measure
        }

        return pattern;
    }

    private generateMeasure(pattern: number[], cfIndex: number): void {
        let beatsUsed = 0;

        for (let i = 0; i < pattern.length; i++) {
            const duration = pattern[i];
            const isDownbeat = beatsUsed === 0;
            const isLastNote = cfIndex === this.cantusFirmus.length - 1 && i === pattern.length - 1;
            const isFirstNote = cfIndex === 0 && i === 0;

            // Set context
            if (this.counterpoint.length > 0) {
                this.setNoteBefore(this.counterpoint[this.counterpoint.length - 1]);
            }
            if (this.counterpoint.length > 1) {
                this.setNoteTwoBefore(this.counterpoint[this.counterpoint.length - 2]);
            }
            if (cfIndex > 0 && isDownbeat) {
                this.setNoteBeforeAndBelow(this.cantusFirmus[cfIndex - 1]);
            }

            let nextNote: number;

            if (isFirstNote) {
                nextNote = this.generateFirstNote();
            } else if (isLastNote) {
                nextNote = this.generateLastNote();
            } else if (cfIndex === this.cantusFirmus.length - 1) {
                // Cadential approach
                nextNote = this.generateCadentialNote(i, pattern.length);
            } else {
                // Regular note based on duration and position
                nextNote = this.generateFloridNote(duration, isDownbeat, beatsUsed);
            }

            this.counterpoint.push(nextNote);
            this.rhythmPattern.push(duration);
            this.updatePreviousIntervals();

            // Update beat position
            beatsUsed += 4 / duration; // Convert duration to beats
        }
    }

    private generateFirstNote(): number {
        // First note - perfect consonance
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

    private generateLastNote(): number {
        // Final note - octave or unison, checking for large leaps
        const octaveNote = this.noteBelow + 12;
        const prevNote = this.counterpoint.length > 0
            ? this.counterpoint[this.counterpoint.length - 1] : 0;

        if (prevNote !== 0 && Math.abs(octaveNote - prevNote) > 12) {
            return this.noteBelow; // Unison if octave is too far
        }
        return Math.random() < 0.8 ? octaveNote : this.noteBelow;
    }

    private generateCadentialNote(position: number, totalInMeasure: number): number {
        // Generate notes approaching the cadence
        if (position === totalInMeasure - 1) {
            // Penultimate note - often leading tone, but ensure stepwise approach
            const leadingTone = this.noteBelow + 11;
            const prevNote = this.counterpoint.length > 0
                ? this.counterpoint[this.counterpoint.length - 1] : 0;

            if (prevNote !== 0 && Math.abs(leadingTone - prevNote) <= 2) {
                return leadingTone;
            }
            // If leading tone would be a leap, use a consonant stepwise note
        }

        // Other cadential notes
        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();
        this.applyOnlyConsonantIntervals();
        this.applyNoLargeLeaps();

        // Prefer stepwise motion in cadence
        if (this.noteBefore !== 0) {
            const stepwise = this.noteOptions.filter(note =>
                Math.abs(note - this.noteBefore) <= 2
            );
            if (stepwise.length > 0) {
                this.noteOptions = stepwise;
            }
        }

        return this.chooseNextNote();
    }

    private generateFloridNote(duration: number, isDownbeat: boolean, beatPosition: number): number {
        this.generateNoteOptions();
        this.applyNoVoiceCrossing();
        this.applyLimitToTenth();

        // Apply rules based on note duration and position
        if (duration === 1) {
            // Whole note - treat like first species
            this.applyFirstSpeciesRules();
        } else if (duration === 2) {
            // Half note - treat like second or fourth species
            if (beatPosition === 2) {
                // Syncopated half - could be suspension
                this.applyFourthSpeciesRules();
            } else {
                this.applySecondSpeciesRules(isDownbeat);
            }
        } else if (duration === 4) {
            // Quarter note - treat like third species
            this.applyThirdSpeciesRules(isDownbeat, beatPosition);
        } else {
            // Eighth note - even more flexible
            this.applyEighthNoteRules(isDownbeat);
        }

        // Common rules
        this.applyNoLargeLeaps();
        this.applyApproachLeapsByStep();
        this.applyPreferContraryMotion();

        // Maintain melodic interest
        this.avoidRepetition();

        return this.chooseNextNote();
    }

    private applyFirstSpeciesRules(): void {
        this.applyNoUnisonExceptEnds();
        this.applyOnlyConsonantIntervals();
        this.applyNoParallelFifths();
        this.applyNoParallelOctaves();
        this.applyNoHiddenParallels();
    }

    private applySecondSpeciesRules(isDownbeat: boolean): void {
        if (isDownbeat) {
            this.applyOnlyConsonantIntervals();
            this.applyNoParallelFifths();
            this.applyNoParallelOctaves();
        } else {
            this.applyAllowDissonantPassing();
        }
    }

    private applyThirdSpeciesRules(isDownbeat: boolean, beatPosition: number): void {
        if (isDownbeat) {
            this.applyOnlyConsonantIntervals();
        } else {
            // Allow passing tones and neighbors
            this.applyAllowDissonantPassing();
        }
    }

    private applyFourthSpeciesRules(): void {
        // Check for suspension possibility
        if (this.noteBefore !== 0) {
            const interval = Math.abs(this.noteBefore - this.noteBelow) % 12;
            if ([1, 2, 5, 6, 10, 11].includes(interval)) {
                // Dissonant - must resolve
                this.applyResolveSuspensionsDown();
            }
        }
    }

    private applyEighthNoteRules(isDownbeat: boolean): void {
        // Eighth notes - maximum flexibility
        // Can be dissonant if approached/left by step
        if (!isDownbeat && this.noteBefore !== 0) {
            this.applyAllowDissonantPassing();
        } else {
            this.applyOnlyConsonantIntervals();
        }
    }

    private avoidRepetition(): void {
        // Avoid too many repeated notes
        if (this.counterpoint.length >= 3) {
            const last = this.counterpoint[this.counterpoint.length - 1];
            const secondLast = this.counterpoint[this.counterpoint.length - 2];
            const thirdLast = this.counterpoint[this.counterpoint.length - 3];

            if (last === secondLast && secondLast === thirdLast) {
                // Three repeated notes - avoid another
                const index = this.noteOptions.indexOf(last);
                if (index > -1) {
                    this.noteOptions.splice(index, 1);
                }
            }
        }
    }
}