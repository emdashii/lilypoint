import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { SpeciesOne } from './species-one.js';
import { SpeciesTwo } from './species-two.js';
import { GenerateLowerVoice } from './generate-lower-voice.js';
import { Key, KeyInfo } from './key.js';
import { CantusFirmus } from './cantus-firmus.js';
import { FirstSpecies } from './first-species.js';
import { SecondSpecies } from './second-species.js';
import { ThirdSpecies } from './third-species.js';
import { FourthSpecies } from './fourth-species.js';
import { FifthSpecies } from './fifth-species.js';
import { verboseLog } from './helper-functions.js';

export class WritePhrase {
	private key: Key;
	private mode: string = "major";
	private phraseLength: number;
	private beatsPerMeasure: number = 4;
	private speciesType: number = 1;
	private phraseN: Phrase = new Phrase();
	private upperVoiceI: number[] = [];
	private lowerVoiceI: number[] = [];
	private intervalStrings: string[] = [];

	constructor(key: string, phraseLength: number);
	constructor(key: string, phraseLength: number, speciesType: number, beatsPerMeasure: number);
	constructor(key: string, phraseLength: number, speciesType?: number, beatsPerMeasure?: number) {
		this.key = new Key(key, this.mode);
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
	setBeatsPerMeasure(beatsPerMeasure: number): void { this.beatsPerMeasure = beatsPerMeasure; }
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

	private writeProperSpeciesCounterpoint(): void {
		// NEW METHOD: Generate counterpoint using the new architecture
		verboseLog('\n--- Step 1: Generate Cantus Firmus ---');
		
		// Step 1: Generate Cantus Firmus
		const cantusFirmus = new CantusFirmus(this.key.getKeyName(), this.phraseLength, this.mode);
		const cantusFirmusNotes = cantusFirmus.generate();
		verboseLog(`Generated ${cantusFirmusNotes.length} cantus firmus notes`);
		verboseLog('Cantus Firmus notes:', cantusFirmusNotes.map(n => n.getNote()).join(', '));

		// Step 2: Generate Counterpoint based on species type
		verboseLog('\n--- Step 2: Generate Counterpoint ---');
		verboseLog(`Generating ${this.getSpeciesName(this.speciesType)} counterpoint...`);
		let counterpointNotes: Note[] = [];

		switch (this.speciesType) {
			case 1: {
				// First Species - note against note
				verboseLog('Creating First Species (1:1 note against note)');
				const firstSpecies = new FirstSpecies();
				counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
			}
			case 2: {
				// Second Species - 2:1
				verboseLog('Creating Second Species (2:1 counterpoint)');
				const secondSpecies = new SecondSpecies();
				counterpointNotes = secondSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
			}
			case 3: {
				// Third Species - 4:1
				verboseLog('Creating Third Species (4:1 counterpoint)');
				const thirdSpecies = new ThirdSpecies();
				counterpointNotes = thirdSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
			}
			case 4: {
				// Fourth Species - syncopation
				verboseLog('Creating Fourth Species (syncopated counterpoint)');
				const fourthSpecies = new FourthSpecies();
				counterpointNotes = fourthSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
			}
			case 5: {
				// Fifth Species - florid counterpoint
				verboseLog('Creating Fifth Species (florid counterpoint)');
				const fifthSpecies = new FifthSpecies();
				counterpointNotes = fifthSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
			}
			default: {
				// Default to first species
				verboseLog('Using default First Species counterpoint');
				const firstSpecies = new FirstSpecies();
				counterpointNotes = firstSpecies.generateCounterpoint(cantusFirmusNotes);
				break;
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
		// Adjust note lengths based on species type
		const lowerVoice = this.phraseN.getLowerVoice();
		const upperVoice = this.phraseN.getUpperVoice();
		
		verboseLog(`Adjusting rhythm for ${this.getSpeciesName(this.speciesType)}`);
		verboseLog(`Lower voice: ${lowerVoice.length} notes, Upper voice: ${upperVoice.length} notes`);

		switch (this.speciesType) {
			case 1:
				// First species - both voices have whole notes
				verboseLog('Setting all notes to whole note length (1)');
				lowerVoice.forEach(note => note.setLength(1));
				upperVoice.forEach(note => note.setLength(1));
				break;

			case 2:
				// Second species - CF has whole notes, CP has half notes
				verboseLog('Cantus firmus: whole notes, Counterpoint: half notes');
				lowerVoice.forEach(note => note.setLength(1));
				// Upper voice already has correct lengths from generation
				break;

			case 3:
				// Third species - CF has whole notes, CP has quarter notes
				verboseLog('Cantus firmus: whole notes, Counterpoint: quarter notes');
				lowerVoice.forEach(note => note.setLength(1));
				// Upper voice already has correct lengths from generation
				break;

			case 4:
				// Fourth species - CF has whole notes, CP has syncopated half notes
				verboseLog('Cantus firmus: whole notes, Counterpoint: syncopated half notes');
				lowerVoice.forEach(note => note.setLength(1));
				// Upper voice already has correct lengths from generation
				break;

			case 5:
				// Fifth species - CF has whole notes, CP has mixed values
				verboseLog('Cantus firmus: whole notes, Counterpoint: mixed note values');
				lowerVoice.forEach(note => note.setLength(1));
				// Upper voice already has varied lengths from generation
				break;
		}
		
		verboseLog('Note lengths after adjustment:');
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