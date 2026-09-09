import { createRandom, RandomSource } from './random.js';
import { Note } from './note.js';
import { NoteType } from './types-and-globals.js';
import { KeyInfo, getKey } from './key.js';
import { verboseLog } from './helper-functions.js';

export class CantusFirmus {
    private notes: Note[] = [];
    private keyInfo: KeyInfo;
    private tonic: NoteType;
    private length: number;
    private scaleDegrees: NoteType[] = [];

    constructor(keyName: string, length: number = 8, mode: string = "major", private random: RandomSource = createRandom()) {
        this.keyInfo = getKey(keyName, mode);
        if (!Number.isSafeInteger(length) || length < 3) throw new Error('Cantus firmus requires at least three notes');
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

        // Scale the limit based on melody length
        // For longer melodies, allow more consecutive motion
        const limit = Math.min(8, Math.max(4, Math.floor(notes.length / 4)));
        return maxConsecutive > limit;
    }

    private tooManyLeapsInARow(notes: Note[]): boolean {
        if (notes.length < 3) return false;

        let consecutiveLeaps = 0;
        // Allow more consecutive leaps for longer melodies
        const maxLeaps = notes.length > 16 ? 3 : 2;

        for (let i = 1; i < notes.length; i++) {
            const prev = notes[i - 1].getNote();
            const curr = notes[i].getNote();

            if (this.isLeap(prev, curr)) {
                consecutiveLeaps++;

                if (consecutiveLeaps > maxLeaps) {
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
        verboseLog(`\n=== Validating Cantus Firmus (${notes.length} notes) ===`);
        verboseLog('Notes:', notes.map(n => n.getNote()).join(', '));

        // Check all the rules
        if (!this.isWithinOctave(notes)) {
            verboseLog('❌ Within octave check failed');
            return false;
        }
        verboseLog('✓ Within octave check passed');

        if (!this.hasOnlyOneClimax(notes)) {
            verboseLog('❌ Only one climax check failed');
            return false;
        }
        verboseLog('✓ Only one climax check passed');

        if (!this.climaxInMiddle(notes)) {
            verboseLog('❌ Climax in middle check failed');
            return false;
        }
        verboseLog('✓ Climax in middle check passed');

        if (this.tooMuchMotionInOneDirection(notes)) {
            verboseLog('❌ Too much motion in one direction check failed');
            return false;
        }
        verboseLog('✓ Motion direction check passed');

        if (this.tooManyLeapsInARow(notes)) {
            verboseLog('❌ Too many leaps in a row check failed');
            return false;
        }
        verboseLog('✓ Leaps check passed');

        if (this.hasProhibitedIntervals(notes)) {
            verboseLog('❌ Prohibited intervals check failed');
            return false;
        }
        verboseLog('✓ Prohibited intervals check passed');

        if (this.outlinesTritone(notes)) {
            verboseLog('❌ Outlines tritone check failed');
            return false;
        }
        verboseLog('✓ Tritone outline check passed');

        // Must begin and end on tonic
        const firstNote = notes[0].getNote();
        const lastNote = notes[notes.length - 1].getNote();
        if (firstNote !== this.tonic || lastNote !== this.tonic) {
            verboseLog(`❌ Tonic check failed: first=${firstNote}, last=${lastNote}, tonic=${this.tonic}`);
            return false;
        }
        verboseLog(`✓ Tonic check passed: first=${firstNote}, last=${lastNote}, tonic=${this.tonic}`);

        if (!this.isStepwise(notes[notes.length - 2].getNote(), lastNote)) return false;

        verboseLog('✅ All validation checks passed!');
        return true;
    }

    generate(): Note[] {
        this.notes = [];
        let budget = 100000;
        const shuffle = <T>(items: T[]): T[] => {
            for (let i = items.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1));
                [items[i], items[j]] = [items[j], items[i]];
            }
            return items;
        };
        const firstPeak = Math.max(1, Math.floor(this.length / 4));
        const lastPeak = Math.min(this.length - 2, Math.floor(3 * this.length / 4));
        const positions = shuffle(Array.from({ length: lastPeak - firstPeak + 1 }, (_, i) => i + firstPeak));
        for (const peakIndex of positions) {
            for (const peak of shuffle(this.scaleDegrees.slice(1, 6))) {
                const path = [new Note(this.tonic, 1)];
                const search = (): boolean => {
                    if (--budget < 0) return false;
                    const i = path.length;
                    if (i === this.length) return this.validateCantusFirmus(path);
                    const choices = i === this.length - 1 ? [this.tonic]
                        : i === this.length - 2 ? [this.scaleDegrees[1]]
                        : i === peakIndex ? [peak]
                        : shuffle(this.scaleDegrees.filter(p => p < peak));
                    for (const pitch of choices) {
                        if ((i === peakIndex) !== (pitch === peak)) continue;
                        const previous = path[i - 1].getNote();
                        if (pitch === previous || Math.abs(pitch - previous) > 5) continue;
                        if (i > 1) {
                            const leap = previous - path[i - 2].getNote();
                            const move = pitch - previous;
                            if (Math.abs(leap) > 4 && (Math.abs(move) > 2 || Math.sign(move) === Math.sign(leap))) continue;
                        }
                        path.push(new Note(pitch, 1));
                        if (!this.hasProhibitedIntervals(path) && !this.tooManyLeapsInARow(path) &&
                            !this.tooMuchMotionInOneDirection(path) && !this.outlinesTritone(path) && search()) return true;
                        path.pop();
                        if (budget < 0) return false;
                    }
                    return false;
                };
                if (search()) {
                    this.notes = path;
                    return this.notes;
                }
                if (budget < 0) break;
            }
            if (budget < 0) break;
        }
        throw new Error('Cantus firmus search exhausted its budget or legal melodies');
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
