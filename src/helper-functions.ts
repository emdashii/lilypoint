import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { ExportToFile } from './export-to-file.js';
import { WritePhrase } from './write-phrase.js';

import * as readline from 'readline';

export function getNumberInput(prompt: string): Promise<number> {
	return new Promise((resolve, reject) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		function askQuestion() {
			rl.question(prompt, (answer: string) => {
				const num = parseInt(answer);
				if (isNaN(num)) {
					console.log("Invalid input! Please try again.");
					askQuestion();
				} else {
					rl.close();
					resolve(num);
				}
			});
		}
		askQuestion();
	});
}

export function getStringInput(prompt: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});

		rl.question(prompt, (answer: string) => {
			rl.close();
			resolve(answer);
		});
	});
}

export function generateNoteEnum(): void {
	let letter = 'A';
	let keyNumber = 0;
	let keyLabelNumber = 0;

	for (; keyNumber < 88; keyNumber++) {
		if (letter === 'H') letter = 'A';
		if (letter === 'C') keyLabelNumber++;

		console.log(`Note_${letter}${keyLabelNumber} = ${keyNumber},`);

		if (letter !== 'B' && letter !== 'E' && keyNumber < 87) {
			keyNumber++;
			console.log(`Note_${letter}${keyLabelNumber}_sharp = ${keyNumber},`);
			let nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
			if (nextLetter === 'H') nextLetter = 'A';
			console.log(`Note_${nextLetter}${keyLabelNumber}_flat = ${keyNumber},`);
		}

		letter = String.fromCharCode(letter.charCodeAt(0) + 1);
	}
}

export function generateNoteVector(): void {
	let letter = 'A';
	let keyNumber = 0;
	let keyLabelNumber = 0;

	for (; keyNumber < 88; keyNumber++) {
		if (letter === 'H') letter = 'A';
		if (letter === 'C') keyLabelNumber++;

		console.log(`["Note_${letter}${keyLabelNumber}", ${keyNumber}],`);

		if (letter !== 'B' && letter !== 'E' && keyNumber < 87) {
			keyNumber++;
			console.log(`["Note_${letter}${keyLabelNumber}_sharp", ${keyNumber}],`);
			let nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
			if (nextLetter === 'H') nextLetter = 'A';
			console.log(`["Note_${nextLetter}${keyLabelNumber}_flat", ${keyNumber}],`);
		}

		letter = String.fromCharCode(letter.charCodeAt(0) + 1);
	}
}

export function generateNoteConversionCases(): void {
	let letter = 'A';
	let keyNumber = 0;
	let keyLabelNumber = 0;

	console.log("const noteLengthString = note.getLength().toString();");

	for (; keyNumber < 88; keyNumber++) {
		if (letter === 'H') letter = 'A';
		if (letter === 'C') keyLabelNumber++;

		console.log(`case NoteType.Note_${letter}${keyLabelNumber}:`);
		console.log(`\treturn "${letter.toLowerCase()}${getSuffix(keyLabelNumber)}" + noteLengthString;`);

		if (letter !== 'B' && letter !== 'E' && keyNumber < 87) {
			keyNumber++;
			console.log(`case NoteType.Note_${letter}${keyLabelNumber}_sharp:`);
			console.log(`\treturn "${letter.toLowerCase()}is${getSuffix(keyLabelNumber)}" + noteLengthString;`);
		}

		letter = String.fromCharCode(letter.charCodeAt(0) + 1);
	}
}

export function getSuffix(keyLabelNumber: number): string {
	switch (keyLabelNumber) {
		case 0:
			return ",,,";
		case 1:
			return ",,";
		case 2:
			return ",";
		case 3:
			return "";
		case 4:
			return "'";
		case 5:
			return "''";
		case 6:
			return "'''";
		case 7:
			return "''''";
		case 8:
			return "'''''";
		default:
			throw new Error("Error could not get proper suffix when converting NoteType to output for lily pond!");
	}
}

export async function tests1(): Promise<void> {
	const note1 = new Note(NoteType.Note_C4, 4);
	const note2 = new Note(NoteType.Note_C4, 2);
	const note3 = new Note(NoteType.Note_D4, 4);
	const note4 = new Note(NoteType.Note_D4, 2);

	const upperPhrase1 = [note1, note2];
	const lowerPhrase1 = [note3, note4];
	const upperPhrase2 = [note2, note1];
	const lowerPhrase2 = [note4, note3];

	const phrase1 = new Phrase(upperPhrase1, lowerPhrase1);
	const phrase2 = new Phrase(upperPhrase2, lowerPhrase2);

	const exportTest = new ExportToFile("lilyPondOutput1", "noice title", "caleb is a great composer");
	exportTest.addPhrase(phrase1);
	exportTest.addPhrase(phrase2);
	
	// In browser environment, we can't write files, so just log the attempt
	if (typeof window !== 'undefined') {
		console.log('Test 1 completed - ExportToFile functionality tested (file writing skipped in browser)');
	} else {
		await exportTest.writeOutput();
	}
}

export async function tests2(): Promise<void> {
	const phrase1 = new WritePhrase("C", 3);
	phrase1.writeThePhrase();
	phrase1.printPhraseI();
	phrase1.calculateInterval();
	console.log();
	phrase1.printPhraseN();
	console.log();

	const phrase2 = new WritePhrase("D", 3);
	phrase2.setSpeciesType(0);
	phrase2.writeThePhrase();
	phrase2.printPhraseI();
	phrase2.calculateInterval();
	console.log();
	phrase2.printPhraseN();

	const phrase3 = new WritePhrase("Bb", 3);
	phrase3.writeThePhrase();
	phrase3.printPhraseI();
	phrase3.calculateInterval();
	console.log();
	phrase3.printPhraseN();
	console.log();

	const phrase4 = new WritePhrase("F", 4);
	phrase4.setSpeciesType(0);
	phrase4.writeThePhrase();
	phrase4.printPhraseI();
	phrase4.calculateInterval();
	console.log();
	phrase4.printPhraseN();

	const phrase5 = new WritePhrase("C", 4);
	phrase4.setSpeciesType(2);
	phrase4.writeThePhrase();
	phrase4.printPhraseI();
	console.log();
	phrase4.printPhraseN();

	const phrase11 = new Phrase(phrase1.getPhrase().getUpperVoice(), phrase1.getPhrase().getLowerVoice(), phrase1.getKey(), phrase1.getTimeSignature());
	const phrase22 = new Phrase(phrase2.getPhrase().getUpperVoice(), phrase2.getPhrase().getLowerVoice(), phrase2.getKey(), phrase2.getTimeSignature());
	const phrase33 = new Phrase(phrase3.getPhrase().getUpperVoice(), phrase3.getPhrase().getLowerVoice(), phrase3.getKey(), phrase3.getTimeSignature());
	const phrase44 = new Phrase(phrase4.getPhrase().getUpperVoice(), phrase4.getPhrase().getLowerVoice(), phrase4.getKey(), phrase4.getTimeSignature());

	const exportTest = new ExportToFile("lilyPondOutput1.9", "SpeciesTwo test part 1", "TheProgram (duh)");
	exportTest.addPhrase(phrase11);
	exportTest.addPhrase(phrase22);
	exportTest.addPhrase(phrase33);
	exportTest.addPhrase(phrase44);
	
	// In browser environment, we can't write files, so just log the attempt
	if (typeof window !== 'undefined') {
		console.log('Test 2 completed - WritePhrase functionality tested (file writing skipped in browser)');
	} else {
		await exportTest.writeOutput();
	}
}