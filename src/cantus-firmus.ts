import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';
import { KeyInfo, getKey } from './key.js';

export class CantusFirmus {
    private notes: Note[] = [];
    private keyInfo: KeyInfo;
    private tonic: NoteType;
    private length: number;
    private scaleDegrees: NoteType[] = [];

    constructor(keyName: string, length: number = 8, mode: string = "major") {
        this.keyInfo = getKey(keyName, mode);
        this.length = length;
        this.tonic = this.getTonicNote(keyName);
        this.scaleDegrees = this.getScaleDegrees(mode);
    }

    private getTonicNote(keyName: string): NoteType {
        const baseNotes: Record<string, NoteType> = {
            'C': NoteType.Note_C4,
            'G': NoteType.Note_G3,
            'D': NoteType.Note_D4,
            'A': NoteType.Note_A3,
            'E': NoteType.Note_E4,
            'B': NoteType.Note_B3,
            'F#': NoteType.Note_F4_sharp,
            'F': NoteType.Note_F4,
            'Bb': NoteType.Note_B3_flat,
            'Eb': NoteType.Note_E4_flat,
            'Ab': NoteType.Note_A3_flat,
            'Db': NoteType.Note_D4_flat,
            'Gb': NoteType.Note_G3_flat
        };
        return baseNotes[keyName] || NoteType.Note_C4;
    }

    private getScaleDegrees(mode: string = "major"): NoteType[] {
        // Generate scale from tonic based on mode
        const scalePattern = mode === "minor" 
            ? [0, 2, 3, 5, 7, 8, 10] // Natural minor scale intervals
            : [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals
        const degrees: NoteType[] = [];

        for (const interval of scalePattern) {
            degrees.push((this.tonic + interval) as NoteType);
        }

        return degrees;
    }

    private isStepwise(note1: NoteType, note2: NoteType): boolean {
        // Check if two notes are adjacent scale degrees
        const idx1 = this.scaleDegrees.indexOf(note1);
        const idx2 = this.scaleDegrees.indexOf(note2);

        if (idx1 === -1 || idx2 === -1) {
            // If not in scale, check chromatic distance
            return Math.abs(note2 - note1) <= 2;
        }

        return Math.abs(idx2 - idx1) === 1;
    }

    private isLeap(note1: NoteType, note2: NoteType): boolean {
        const interval = Math.abs(note2 - note1);
        return interval > 2;
    }

    private isTritone(note1: NoteType, note2: NoteType): boolean {
        const interval = Math.abs(note2 - note1) % 12;
        return interval === 6;
    }

    private isSeventh(note1: NoteType, note2: NoteType): boolean {
        const interval = Math.abs(note2 - note1) % 12;
        return interval === 10 || interval === 11;
    }

    private isWithinOctave(notes: Note[]): boolean {
        if (notes.length === 0) return true;

        const noteValues = notes.map(n => n.getNote());
        const min = Math.min(...noteValues);
        const max = Math.max(...noteValues);

        // Cantus firmus should stay within an octave (sometimes a 10th is allowed)
        return (max - min) <= 15; // Allowing up to a major 10th
    }

    private hasOnlyOneClimax(notes: Note[]): boolean {
        if (notes.length === 0) return true;

        const noteValues = notes.map(n => n.getNote());
        const maxNote = Math.max(...noteValues);
        const climaxCount = noteValues.filter(note => note === maxNote).length;

        return climaxCount === 1;
    }

    private climaxInMiddle(notes: Note[]): boolean {
        if (notes.length < 3) return true;

        const noteValues = notes.map(n => n.getNote());
        const maxNote = Math.max(...noteValues);
        const climaxIndex = noteValues.indexOf(maxNote);

        // Climax should be in the middle portion, not at the very beginning or end
        const firstQuarter = Math.floor(notes.length / 4);
        const lastQuarter = Math.floor(3 * notes.length / 4);

        return climaxIndex >= firstQuarter && climaxIndex <= lastQuarter;
    }

    private tooMuchMotionInOneDirection(notes: Note[]): boolean {
        if (notes.length < 4) return false;

        let consecutiveUp = 0;
        let consecutiveDown = 0;
        let maxConsecutive = 0;

        for (let i = 1; i < notes.length; i++) {
            const prev = notes[i - 1].getNote();
            const curr = notes[i].getNote();

            if (curr > prev) {
                consecutiveUp++;
                consecutiveDown = 0;
            } else if (curr < prev) {
                consecutiveDown++;
                consecutiveUp = 0;
            } else {
                consecutiveUp = 0;
                consecutiveDown = 0;
            }

            maxConsecutive = Math.max(maxConsecutive, consecutiveUp, consecutiveDown);
        }

        // No more than 4 notes moving in the same direction
        return maxConsecutive > 4;
    }

    private tooManyLeapsInARow(notes: Note[]): boolean {
        if (notes.length < 3) return false;

        let consecutiveLeaps = 0;

        for (let i = 1; i < notes.length; i++) {
            const prev = notes[i - 1].getNote();
            const curr = notes[i].getNote();

            if (this.isLeap(prev, curr)) {
                consecutiveLeaps++;

                // More than two leaps in a row is generally avoided
                if (consecutiveLeaps > 2) {
                    return true;
                }
            } else {
                consecutiveLeaps = 0;
            }
        }

        return false;
    }

    private hasProhibitedIntervals(notes: Note[]): boolean {
        for (let i = 1; i < notes.length; i++) {
            const prev = notes[i - 1].getNote();
            const curr = notes[i].getNote();

            // Check for tritones and sevenths (melodic)
            if (this.isTritone(prev, curr) || this.isSeventh(prev, curr)) {
                return true;
            }

            // Check for augmented intervals or intervals larger than an octave
            const interval = Math.abs(curr - prev);
            if (interval > 12) { // Larger than octave
                return true;
            }

            // Check for augmented seconds (3 semitones) in diatonic context
            if (interval === 3 && !this.isValidThirdInScale(prev, curr)) {
                return true;
            }
        }
        return false;
    }

    private isValidThirdInScale(note1: NoteType, note2: NoteType): boolean {
        // Check if the interval forms a valid third in the scale
        const idx1 = this.scaleDegrees.indexOf(note1);
        const idx2 = this.scaleDegrees.indexOf(note2);

        if (idx1 === -1 || idx2 === -1) return false;

        // A third in the scale is 2 scale degrees apart
        return Math.abs(idx2 - idx1) === 2;
    }

    private outlinesTritone(notes: Note[]): boolean {
        // Check if the overall melodic contour outlines a tritone
        if (notes.length < 3) return false;

        for (let i = 0; i < notes.length - 2; i++) {
            for (let j = i + 2; j < notes.length; j++) {
                const note1 = notes[i].getNote();
                const note2 = notes[j].getNote();

                if (this.isTritone(note1, note2)) {
                    // Check if this tritone is prominently outlined
                    // (e.g., both notes are on strong beats or are turning points)
                    const isTurningPoint1 = this.isTurningPoint(notes, i);
                    const isTurningPoint2 = this.isTurningPoint(notes, j);

                    if (isTurningPoint1 && isTurningPoint2) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    private isTurningPoint(notes: Note[], index: number): boolean {
        if (index === 0 || index === notes.length - 1) return true;

        const prev = index > 0 ? notes[index - 1].getNote() : null;
        const curr = notes[index].getNote();
        const next = index < notes.length - 1 ? notes[index + 1].getNote() : null;

        if (prev === null || next === null) return false;

        // Check if it's a local maximum or minimum
        return (curr > prev && curr > next) || (curr < prev && curr < next);
    }

    private validateCantusFirmus(notes: Note[]): boolean {
        if (notes.length < 5 || notes.length > 12) return false;

        // Check all the rules
        if (!this.isWithinOctave(notes)) return false;
        if (!this.hasOnlyOneClimax(notes)) return false;
        if (!this.climaxInMiddle(notes)) return false;
        if (this.tooMuchMotionInOneDirection(notes)) return false;
        if (this.tooManyLeapsInARow(notes)) return false;
        if (this.hasProhibitedIntervals(notes)) return false;
        if (this.outlinesTritone(notes)) return false;

        // Must begin and end on tonic
        const firstNote = notes[0].getNote();
        const lastNote = notes[notes.length - 1].getNote();
        if (firstNote !== this.tonic || lastNote !== this.tonic) return false;

        // Penultimate note should approach final by step
        if (notes.length >= 2) {
            const penultimate = notes[notes.length - 2].getNote();
            if (!this.isStepwise(penultimate, lastNote)) return false;
        }

        return true;
    }

    generate(): Note[] {
        const maxAttempts = 1000;
        let attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;
            this.notes = [];

            // Start with tonic
            this.notes.push(new Note(this.tonic, 1));

            // Build the melody
            const targetClimax = Math.floor(this.length / 2);

            for (let i = 1; i < this.length - 1; i++) {
                const lastNote = this.notes[i - 1].getNote();
                let possibleNotes: NoteType[] = [];

                // Determine direction based on position relative to climax
                const shouldAscend = i <= targetClimax;

                // Get possible next notes
                if (shouldAscend) {
                    // Moving toward climax
                    possibleNotes = this.scaleDegrees.filter(note => {
                        const interval = note - lastNote;
                        return interval > 0 && interval <= 5 && !this.isTritone(lastNote, note);
                    });
                } else {
                    // Moving away from climax
                    possibleNotes = this.scaleDegrees.filter(note => {
                        const interval = lastNote - note;
                        return interval >= -2 && interval <= 5 && !this.isTritone(lastNote, note);
                    });
                }

                // Prefer stepwise motion (70% of the time)
                if (Math.random() < 0.7) {
                    const stepwiseOptions = possibleNotes.filter(note =>
                        this.isStepwise(lastNote, note)
                    );
                    if (stepwiseOptions.length > 0) {
                        possibleNotes = stepwiseOptions;
                    }
                }

                if (possibleNotes.length > 0) {
                    const chosen = possibleNotes[Math.floor(Math.random() * possibleNotes.length)];
                    this.notes.push(new Note(chosen, 1));
                } else {
                    // Fallback to any scale degree within range
                    const fallback = this.scaleDegrees[Math.floor(Math.random() * this.scaleDegrees.length)];
                    this.notes.push(new Note(fallback, 1));
                }
            }

            // End with tonic
            this.notes.push(new Note(this.tonic, 1));

            if (this.validateCantusFirmus(this.notes)) {
                break;
            }
        }

        if (attempts >= maxAttempts) {
            console.warn('Could not generate valid cantus firmus after maximum attempts, using simple version');
            this.generateSimple();
        }

        return this.notes;
    }

    private generateSimple(): void {
        // Fallback: generate a simple, valid cantus firmus
        this.notes = [];

        // Simple ascending and descending pattern
        const pattern = [0, 2, 4, 5, 4, 2, 1, 0]; // Scale degrees: 1-3-5-6-5-3-2-1

        for (let i = 0; i < this.length; i++) {
            const patternIndex = i % pattern.length;
            const scaleDegreeIndex = pattern[patternIndex];

            if (scaleDegreeIndex < this.scaleDegrees.length) {
                this.notes.push(new Note(this.scaleDegrees[scaleDegreeIndex], 1));
            } else {
                this.notes.push(new Note(this.tonic, 1));
            }
        }

        // Ensure it ends on tonic
        if (this.notes.length > 0) {
            this.notes[this.notes.length - 1] = new Note(this.tonic, 1);
        }
    }

    getNotes(): Note[] {
        return this.notes;
    }

    getKeyInfo(): KeyInfo {
        return this.keyInfo;
    }

    getLength(): number {
        return this.length;
    }
}