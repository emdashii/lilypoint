import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { SpeciesOne } from './species-one.js';
import { SpeciesTwo } from './species-two.js';
import { GenerateLowerVoice } from './generate-lower-voice.js';
import { Key, KeyInfo } from './key.js';
import { FirstSpecies } from './first-species.js';
import { SecondSpecies } from './second-species.js';
import { ThirdSpecies } from './third-species.js';
import { FourthSpecies } from './fourth-species.js';
import { FifthSpecies } from './fifth-species.js';
// Force recompilation

export class WritePhrase {
	private key: Key;
	private phraseLength: number;
	private beatsPerMeasure: number = 4;
	private speciesType: number = -2;
	private phraseN: Phrase = new Phrase();
	private upperVoiceI: number[] = [];
	private lowerVoiceI: number[] = [];
	private intervalStrings: string[] = [];

	constructor(key: string, phraseLength: number);
	constructor(key: string, phraseLength: number, speciesType: number, beatsPerMeasure: number);
	constructor(key: string, phraseLength: number, speciesType?: number, beatsPerMeasure?: number) {
		this.key = new Key(key);
		this.phraseLength = phraseLength;
		if (speciesType !== undefined) this.speciesType = speciesType;
		if (beatsPerMeasure !== undefined) this.beatsPerMeasure = beatsPerMeasure;
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

	setLength(length: number): void { this.phraseLength = length; }
	setBeatsPerMeasure(beatsPerMeasure: number): void { this.beatsPerMeasure = beatsPerMeasure; }
	setSpeciesType(speciesType: number): void { this.speciesType = speciesType; }
	setKey(key: string): void { this.key = new Key(key); }

	getPhrase(): Phrase {
		this.phraseN.setKey(this.getKey());
		this.phraseN.setTimeSignature(this.getTimeSignature());
		return this.phraseN;
	}

	writeThePhrase(): void {
		// Handle legacy species (negative numbers)
		if (this.speciesType === -1) {
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
			this.writeUpperVoiceTwo();
		} else if (this.speciesType === -2) {
			this.writeLowerVoice();
			this.writeUpperVoiceOne();
		}
		// Handle new proper species (positive numbers)
		else if (this.speciesType >= 1 && this.speciesType <= 5) {
			this.writeProperCounterpoint();
		} else {
			console.log(`Unknown species type: ${this.speciesType}. Converting to First Species (1)`);
			this.speciesType = 1;
			this.writeProperCounterpoint();
		}
	}

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
		switch (this.beatsPerMeasure) {
			case 2: return "2/4";
			case 3: return "3/4";
			case 4: return "4/4";
			case 6: return "6/8";
			case 9: return "9/12";
			default: return "4/4";
		}
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

	private writeLowerVoiceTwo(): void {
		const imitativeLower = new SpeciesOne();
		imitativeLower.writeImitativeTwoVoices(Math.floor(this.phraseLength * this.beatsPerMeasure / 2));
		this.lowerVoiceI = imitativeLower.getImitativeLower();
		for (const i of this.lowerVoiceI) {
			this.phraseN.addNoteToLowerVoice(this.convertIntToNoteTwo(i));
		}
	}

	private writeProperCounterpoint(): void {
		// Generate cantus firmus (lower voice)
		this.generateCantusFirmus();
		
		// Generate counterpoint melody based on species
		switch (this.speciesType) {
			case 1:
				this.writeFirstSpecies();
				break;
			case 2:
				this.writeSecondSpecies();
				break;
			case 3:
				this.writeThirdSpecies();
				break;
			case 4:
				this.writeFourthSpecies();
				break;
			case 5:
				this.writeFifthSpecies();
				break;
			default:
				console.log(`Unknown species: ${this.speciesType}`);
				this.writeFirstSpecies();
		}
	}

	private generateCantusFirmus(): void {
		// Generate cantus firmus based on total length (measures * beatsPerMeasure)
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		this.lowerVoiceI = [1]; // Start on tonic
		
		for (let i = 1; i < totalLength - 1; i++) {
			const lastNote = this.lowerVoiceI[this.lowerVoiceI.length - 1];
			let nextNote: number;
			
			// Simple stepwise motion with occasional leaps
			if (Math.random() < 0.7) {
				// Stepwise motion
				nextNote = lastNote + (Math.random() < 0.5 ? 1 : -1);
			} else {
				// Small leap (3rd or 4th)
				const leap = Math.random() < 0.5 ? 2 : 3;
				nextNote = lastNote + (Math.random() < 0.5 ? leap : -leap);
			}
			
			// Keep in reasonable range
			if (nextNote < -2) nextNote = -2;
			if (nextNote > 6) nextNote = 6;
			
			this.lowerVoiceI.push(nextNote);
		}
		
		// End with step to tonic
		this.lowerVoiceI.push(1);
		
		// Convert to Note objects
		for (const i of this.lowerVoiceI) {
			this.phraseN.addNoteToLowerVoice(this.convertIntToNote(i));
		}
	}

	private writeFirstSpecies(): void {
		const firstSpecies = new FirstSpecies();
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		const counterpoint = firstSpecies.generateCounterpoint(this.lowerVoiceI, totalLength);
		
		for (const note of counterpoint) {
			this.phraseN.addNoteToUpperVoice(this.convertIntToNote(note));
		}
	}

	private writeSecondSpecies(): void {
		const secondSpecies = new SecondSpecies();
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		const counterpoint = secondSpecies.generateCounterpoint(this.lowerVoiceI, totalLength);
		
		for (const note of counterpoint) {
			if (note === 0) {
				// Rest - skip or use a rest note
				continue;
			}
			this.phraseN.addNoteToUpperVoice(this.convertIntToNoteTwo(note));
		}
	}

	private writeThirdSpecies(): void {
		const thirdSpecies = new ThirdSpecies();
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		const counterpoint = thirdSpecies.generateCounterpoint(this.lowerVoiceI, totalLength);
		
		for (const note of counterpoint) {
			this.phraseN.addNoteToUpperVoice(this.convertIntToNote(note));
		}
	}

	private writeFourthSpecies(): void {
		const fourthSpecies = new FourthSpecies();
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		const counterpoint = fourthSpecies.generateCounterpoint(this.lowerVoiceI, totalLength);
		
		for (const note of counterpoint) {
			if (note === 0) {
				// Rest - skip or use a rest note
				continue;
			}
			this.phraseN.addNoteToUpperVoice(this.convertIntToNoteTwo(note));
		}
	}

	private writeFifthSpecies(): void {
		const fifthSpecies = new FifthSpecies();
		const totalLength = this.phraseLength * this.beatsPerMeasure;
		const counterpoint = fifthSpecies.generateCounterpoint(this.lowerVoiceI, totalLength);
		
		for (const note of counterpoint) {
			if (note === 0) {
				// Rest - create a rest note (using Note with duration but no pitch)
				// For now, we'll convert rests to actual notes to maintain count
				// In a full implementation, we'd need a proper Rest class
				const restAsNote = new Note(this.convertIntToNote(1).getNote(), 4); // Use tonic as placeholder
				this.phraseN.addNoteToUpperVoice(restAsNote);
			} else {
				// Use quarter notes for fifth species
				const quarterNote = new Note(this.convertIntToNote(note).getNote(), 4);
				this.phraseN.addNoteToUpperVoice(quarterNote);
			}
		}
	}
}