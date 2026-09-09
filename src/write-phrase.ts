import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { SpeciesOne } from './legacy/species-one.js';
import { SpeciesTwo } from './legacy/species-two.js';
import { GenerateLowerVoice } from './generate-lower-voice.js';
import { Key, KeyInfo } from './key.js';
import { CantusFirmus } from './cantus-firmus.js';
import { Species } from './species.js';
import { FirstSpecies } from './first-species.js';
import { SecondSpecies } from './second-species.js';
import { ThirdSpecies } from './third-species.js';
import { FourthSpecies } from './fourth-species.js';
import { FifthSpecies } from './fifth-species.js';
import { CounterpointUnsolvableError } from './species-engine.js';
import { verboseLog } from './helper-functions.js';

export class WritePhrase {
	private key: Key;
	private mode: string = "major";
	private phraseLength: number;
	private timeSignature: string = "4/4";
	private beatsPerMeasure: number = 4;
	private beatUnit: number = 4; // The bottom number of time signature (4 = quarter note, 8 = eighth note)
	private speciesType: number = 1;
	private phraseN: Phrase = new Phrase();
	private upperVoiceI: number[] = [];
	private lowerVoiceI: number[] = [];
	private intervalStrings: string[] = [];

	constructor(key: string, phraseLength: number);
	constructor(key: string, phraseLength: number, speciesType: number, timeSignature: string);
	constructor(key: string, phraseLength: number, speciesType?: number, timeSignature?: string) {
		this.key = new Key(key, this.mode);
		this.phraseLength = phraseLength;
		if (speciesType !== undefined) this.speciesType = speciesType;
		if (timeSignature !== undefined) {
			this.timeSignature = timeSignature;
			this.parseTimeSignature(timeSignature);
		}
	}

	private parseTimeSignature(timeSignature: string): void {
		if (!/^[1-9]\d*\/(1|2|4|8|16|32|64)$/.test(timeSignature)) {
			throw new Error(`Invalid time signature: ${timeSignature}`);
		}
		const [beats, unit] = timeSignature.split('/').map(Number);
		if (!Number.isSafeInteger(beats)) throw new Error(`Invalid time signature: ${timeSignature}`);
		this.beatsPerMeasure = beats;
		this.beatUnit = unit;
		this.timeSignature = timeSignature;
	}

	static setSeed(seed: number): void {
		Math.random = (() => {
			let s = seed;
			return () => {
				s = Math.imul(s ^ s >>> 15, s | 1);
				s ^= s + Math.imul(s ^ s >>> 7, s | 61);
				return ((s ^ s >>> 14) >>> 0) / 4294967296;
			};
		})();
	}

	getPhraseLength(): number { return this.phraseLength; }
	getBeatsPerMeasure(): number { return this.beatsPerMeasure; }
	getSpeciesType(): number { return this.speciesType; }
	getTotalLength(): number { return this.phraseLength * this.beatsPerMeasure; }
	getMode(): string { return this.mode; }

	private getSpeciesName(species: number): string {
		switch (species) {
			case 1: return 'First Species (1:1)';
			case 2: return 'Second Species (2:1)';
			case 3: return 'Third Species (4:1)';
			case 4: return 'Fourth Species (Syncopated)';
			case 5: return 'Fifth Species (Florid)';
			case -1: return 'Legacy Imitative';
			case -2: return 'Legacy First Species';
			case -4: return 'Legacy Second Species';
			default: return `Species ${species}`;
		}
	}

	setLength(length: number): void { this.phraseLength = length; }
	setTimeSignature(timeSignature: string): void {
		this.parseTimeSignature(timeSignature);
	}
	setBeatsPerMeasure(beatsPerMeasure: number): void { this.setTimeSignature(`${beatsPerMeasure}/${this.beatUnit}`); } // Legacy method
	setSpeciesType(speciesType: number): void { this.speciesType = speciesType; }
	setKey(key: string): void { this.key = new Key(key, this.mode); }
	setMode(mode: string): void {
		this.mode = mode;
		// Update the key with the new mode
		this.key = new Key(this.key.getKeyName(), mode);
	}

	getPhrase(): Phrase {
		this.phraseN.setKey(this.getKey());
		this.phraseN.setTimeSignature(this.getTimeSignature());
		return this.phraseN;
	}

	writeThePhrase(): void {
		if (!Number.isSafeInteger(this.phraseLength) || this.phraseLength < 1 ||
			!Number.isSafeInteger(this.getTotalLength()) || this.getTotalLength() < 3) {
			throw new Error('Phrase length must be a positive integer with at least three beats');
		}
		this.getKey();
		this.phraseN = new Phrase();
		this.upperVoiceI = [];
		this.lowerVoiceI = [];
		this.intervalStrings = [];
		verboseLog('\n🎼 === Starting Phrase Generation ===');
		verboseLog(`Key: ${this.key.getKeyName()} ${this.mode}`);
		verboseLog(`Species Type: ${this.speciesType}`);
		verboseLog(`Phrase Length: ${this.phraseLength} measures`);
		verboseLog(`Beats per Measure: ${this.beatsPerMeasure}`);
		verboseLog(`Total Length: ${this.getTotalLength()} beats`);
		
		// Handle legacy species (negative numbers) - keep existing functionality
		if (this.speciesType === -1) {
			// Legacy imitative counterpoint
			verboseLog('\n📜 Using Legacy Imitative Counterpoint (Species -1)');
			const imitative = new SpeciesOne();
			imitative.writeImitativeTwoVoices(this.phraseLength * this.beatsPerMeasure);
			this.lowerVoiceI = imitative.getImitativeLower();
			this.upperVoiceI = imitative.getImitativeUpper();
			this.upperVoiceI.unshift(1);
			for (let i = 0; i < this.lowerVoiceI.length; i++) {
				this.phraseN.addNoteToLowerVoice(this.convertIntToNote(this.lowerVoiceI[i]));
				this.phraseN.addNoteToUpperVoice(this.convertIntToNote(this.upperVoiceI[i]));
			}
		} else if (this.speciesType === -4) {
			// Legacy second species
			verboseLog('\n📜 Using Legacy Second Species (Species -4)');
			this.writeUpperVoiceTwo();
		} else if (this.speciesType === -2) {
			// Legacy first species
			verboseLog('\n📜 Using Legacy First Species (Species -2)');
			this.writeLowerVoice();
			this.writeUpperVoiceOne();
		}
		// Handle new proper species (positive numbers) - NEW IMPLEMENTATION
		else if (this.speciesType >= 1 && this.speciesType <= 5) {
			verboseLog('\n🎵 Using Modern Species Counterpoint');
			this.writeProperSpeciesCounterpoint();
		} else {
			console.log(`Unknown species type: ${this.speciesType}. Converting to First Species (1)`);
			verboseLog(`⚠️ Unknown species type: ${this.speciesType}, defaulting to First Species`);
			this.speciesType = 1;
			this.writeProperSpeciesCounterpoint();
		}
		
		verboseLog('\n✅ Phrase Generation Complete!');
		verboseLog(`Final phrase has ${this.phraseN.getUpperVoice().length} upper notes and ${this.phraseN.getLowerVoice().length} lower notes`);
	}

	private createSpecies(): Species {
		switch (this.speciesType) {
			case 2: return new SecondSpecies();
			case 3: return new ThirdSpecies();
			case 4: return new FourthSpecies();
			case 5: return new FifthSpecies();
			default: return new FirstSpecies();
		}
	}

	private writeProperSpeciesCounterpoint(): void {
		// Total CF notes = measures × beats per measure (top number of time signature)
		const totalBeats = this.phraseLength * this.beatsPerMeasure;
		verboseLog(`Time signature: ${this.timeSignature} = ${this.beatsPerMeasure} beats per measure`);
		verboseLog(`Generating cantus firmus: ${this.phraseLength} measures × ${this.beatsPerMeasure} beats = ${totalBeats} notes`);

		const scaleDegrees = this.getScaleDegrees();
		verboseLog(`Scale degrees for ${this.key.getKeyName()} ${this.mode}: [${scaleDegrees.join(', ')}]`);

		// The backtracking engine occasionally finds no counterpoint for a given
		// cantus firmus; regenerate the CF and retry (deterministic per seed).
		const maxAttempts = 50;
		let cantusFirmusNotes: Note[] = [];
		let counterpointNotes: Note[] = [];

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			const cantusFirmus = new CantusFirmus(this.key.getKeyName(), totalBeats, this.mode);
			cantusFirmusNotes = cantusFirmus.generate();
			verboseLog(`Attempt ${attempt}: CF [${cantusFirmusNotes.map(n => n.getNote()).join(', ')}]`);

			const species = this.createSpecies();
			species.setScaleDegrees(scaleDegrees);
			try {
				counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);
				break;
			} catch (error) {
				if (error instanceof CounterpointUnsolvableError && attempt < maxAttempts) {
					verboseLog(`Attempt ${attempt} unsolvable, regenerating cantus firmus`);
					continue;
				}
				throw error;
			}
		}

		verboseLog(`Generated ${counterpointNotes.length} counterpoint notes`);
		verboseLog('Counterpoint notes:', counterpointNotes.map(n => n.getNote()).join(', '));

		// Step 3: Assign voices to the phrase
		verboseLog('\n--- Step 3: Assign Voices ---');
		verboseLog('Assigning cantus firmus to lower voice');
		verboseLog('Assigning counterpoint to upper voice');
		
		// Cantus firmus typically goes in the lower voice
		for (const note of cantusFirmusNotes) {
			this.phraseN.addNoteToLowerVoice(note);
		}

		// Counterpoint goes in the upper voice
		for (const note of counterpointNotes) {
			this.phraseN.addNoteToUpperVoice(note);
		}

		// Handle special cases for different species rhythms
		verboseLog('\n--- Step 4: Adjust Rhythms ---');
		this.adjustForSpeciesRhythm();
		verboseLog('Rhythm adjustments complete');
	}

	private adjustForSpeciesRhythm(): void {
		// Species classes emit durations RELATIVE to one cantus firmus note
		// (1 = full CF note, 2 = half of it, 4 = quarter of it). Each CF note
		// occupies one beat unit, so scaling both voices by the beat unit
		// yields final LilyPond durations (e.g. relative half × beat unit 4
		// = 8, an eighth note in 4/4).
		const lowerVoice = this.phraseN.getLowerVoice();
		const upperVoice = this.phraseN.getUpperVoice();

		verboseLog(`Adjusting rhythm for ${this.getSpeciesName(this.speciesType)}`);
		verboseLog(`Time signature: ${this.timeSignature}, Beat unit: ${this.beatUnit}`);

		lowerVoice.forEach(note => note.setLength(this.beatUnit));
		upperVoice.forEach(note => note.setLength(note.getLength() * this.beatUnit));

		verboseLog(`Lower voice lengths: [${lowerVoice.map(n => n.getLength()).join(', ')}]`);
		verboseLog(`Upper voice lengths: [${upperVoice.map(n => n.getLength()).join(', ')}]`);
	}

	// Legacy methods below - kept for backward compatibility with negative species types

	printPhraseI(): void {
		console.log("Phrase in ints: ");
		console.log("Top   : " + this.upperVoiceI.join("\t"));
		console.log("Bottom: " + this.lowerVoiceI.join("\t"));
	}

	printPhraseN(): void {
		console.log("Phrase in Notes: ");
		console.log("Top   : " + NoteType.Note_C4 + " | " +
			this.phraseN.getUpperVoice().map(note => note.getNote()).join(" "));
		console.log("Bottom: " +
			this.phraseN.getLowerVoice().map(note => note.getNote()).join(" "));
	}

	calculateInterval(): void {
		const intervals: number[] = [];
		for (let i = 0; i < this.lowerVoiceI.length; i++) {
			intervals.push(this.upperVoiceI[i] - this.lowerVoiceI[i] + 1);
		}
		console.log("dist  : " + intervals.join("\t"));

		this.intervalStrings = intervals.map(i => i.toString());
	}

	getKey(): KeyInfo {
		return this.key.getKeyInfo();
	}

	getKeyString(): string {
		return this.key.getKeyInfo().key;
	}

	getTimeSignature(): string {
		return this.timeSignature;
	}

	getBeatUnit(): number {
		return this.beatUnit;
	}

	private getScaleDegrees(): number[] {
		// Generate diatonic scale degrees based on key and mode
		const tonic = this.convertKeyToNote().getNote();
		const scalePattern = this.mode === "minor"
			? [0, 2, 3, 5, 7, 8, 10] // Natural minor scale intervals
			: [0, 2, 4, 5, 7, 9, 11]; // Major scale intervals

		const degrees: number[] = [];
		for (const interval of scalePattern) {
			degrees.push(tonic + interval);
		}

		return degrees;
	}

	convertIntToNote(num: number): Note {
		const key = this.convertKeyToNote();
		const computeNext = this.convertScaleDegreeToHalfStep(num) + key.getNote();
		const val = computeNext as NoteType;
		return new Note(val, 4);
	}

	convertIntToNoteTwo(num: number): Note {
		const key = this.convertKeyToNote();
		const computeNext = this.convertScaleDegreeToHalfStep(num) + key.getNote();
		const val = computeNext as NoteType;
		return new Note(val, 2);
	}

	convertScaleDegreeToHalfStep(scaleDegree: number): number {
		let halfStep: number;
		let expression = (((scaleDegree - 1) % 7) + 1);
		if (expression <= 0) {
			expression += 7;
		}

		switch (expression) {
			case 1: halfStep = 0; break;
			case 2: halfStep = 2; break;
			case 3: halfStep = 4; break;
			case 4: halfStep = 5; break;
			case 5: halfStep = 7; break;
			case 6: halfStep = 9; break;
			case 7: halfStep = 11; break;
			default:
				halfStep = 99;
				console.log(`Could not convert scale degree ${scaleDegree} to half step! Expression: ${expression}`);
		}
		return Math.floor((scaleDegree - 1) / 7) * 12 + halfStep;
	}

	convertKeyToNote(): Note {
		const keyName = this.key.getKeyName();
		switch (keyName) {
			case "C": return new Note(NoteType.Note_C4);
			case "Db": return new Note(NoteType.Note_D4_flat);
			case "D": return new Note(NoteType.Note_D4);
			case "Eb": return new Note(NoteType.Note_E4_flat);
			case "E": return new Note(NoteType.Note_E4);
			case "F": return new Note(NoteType.Note_F4);
			case "F#": return new Note(NoteType.Note_F4_sharp);
			case "G": return new Note(NoteType.Note_G4);
			case "Ab": return new Note(NoteType.Note_A4_flat);
			case "A": return new Note(NoteType.Note_A4);
			case "Bb": return new Note(NoteType.Note_B4_flat);
			case "B": return new Note(NoteType.Note_B4);
			case "Gb": return new Note(NoteType.Note_G4_flat);
			default:
				throw new Error("Cannot convert key to note!");
		}
	}

	// Legacy methods for backward compatibility
	private writeLowerVoice(): void {
		const lower = new GenerateLowerVoice(this.phraseLength * this.beatsPerMeasure);
		this.lowerVoiceI = lower.getLowerVoice();
		for (const i of this.lowerVoiceI) {
			this.phraseN.addNoteToLowerVoice(this.convertIntToNote(i));
		}
	}

	private writeUpperVoiceOne(): void {
		if (Math.random() < 0.5) {
			this.upperVoiceI.push(5);
		} else {
			this.upperVoiceI.push(8);
		}

		for (let i = 1; i < this.lowerVoiceI.length - 2; i++) {
			const one = new SpeciesOne();
			one.setNoteBefore(this.upperVoiceI[i - 1]);
			one.setNoteBelow(this.lowerVoiceI[i]);
			one.setNoteBeforeAndBelow(this.lowerVoiceI[i - 1]);
			if (i >= 2) {
				one.setNoteTwoBefore(this.upperVoiceI[i - 2]);
			}
			const nextNote = one.chooseNextNote();
			this.upperVoiceI.push(nextNote);
		}

		this.upperVoiceI.push(7);
		this.upperVoiceI.push(8);

		for (const i of this.upperVoiceI) {
			this.phraseN.addNoteToUpperVoice(this.convertIntToNote(i));
		}
	}

	private writeUpperVoiceTwo(): void {
		const imitative = new SpeciesOne();
		imitative.writeImitativeTwoVoices(Math.floor(this.phraseLength * this.beatsPerMeasure / 2));
		this.lowerVoiceI = imitative.getImitativeLower();
		for (const i of this.lowerVoiceI) {
			this.phraseN.addNoteToLowerVoice(this.convertIntToNoteTwo(i));
		}

		this.upperVoiceI = imitative.getImitativeUpper();
		this.upperVoiceI.unshift(1);
		for (let i = 0; i < this.lowerVoiceI.length; i++) {
			this.upperVoiceI.splice((i * 2) + 1, 0, this.upperVoiceI[i * 2] + 1);
		}

		for (let i = 0; i < this.upperVoiceI.length - 4; i++) {
			this.phraseN.addNoteToUpperVoice(this.convertIntToNote(this.upperVoiceI[i]));
		}
		this.phraseN.addNoteToUpperVoice(this.convertIntToNoteTwo(this.upperVoiceI[this.upperVoiceI.length - 4]));
		this.phraseN.addNoteToUpperVoice(this.convertIntToNoteTwo(this.upperVoiceI[this.upperVoiceI.length - 3]));
	}
}
