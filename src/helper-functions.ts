import { Note } from './note.js';
import { Phrase } from './phrase.js';
import { NoteType } from './types-and-globals.js';
import { ExportToFile } from './export-to-file.js';
import { WritePhrase } from './write-phrase.js';

export function getNumberInput(prompt: string): Promise<number> {
	return new Promise((resolve, reject) => {
		// Browser environment - not supported
		if (typeof window !== 'undefined') {
			reject(new Error('getNumberInput not supported in browser environment'));
			return;
		}

		// Node.js environment
		const readline = require('readline');
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
	return new Promise((resolve, reject) => {
		// Browser environment - not supported
		if (typeof window !== 'undefined') {
			reject(new Error('getStringInput not supported in browser environment'));
			return;
		}

		// Node.js environment
		const readline = require('readline');
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

export async function generateExample(): Promise<void> {
	console.log('🎵 Generating Example Counterpoint Phrases...\n');
	
	// Generate different examples to showcase variety
	const examples = [
		{ key: 'C', measures: 4, species: 1, beatsPerMeasure: 4, name: 'C Major First Species' },
		{ key: 'G', measures: 3, species: 2, beatsPerMeasure: 4, name: 'G Major Second Species' },
		{ key: 'F', measures: 2, species: 0, beatsPerMeasure: 4, name: 'F Major Imitative' }
	];

	const exportToFile = new ExportToFile('example-counterpoint', 'Counterpoint Examples', 'Lilypoint Generator');

	for (let i = 0; i < examples.length; i++) {
		const example = examples[i];
		console.log(`📝 Example ${i + 1}: ${example.name}`);
		console.log(`   Key: ${example.key}, Measures: ${example.measures}, Species: ${example.species}`);
		
		try {
			const phrase = new WritePhrase(example.key, example.measures, example.species, example.beatsPerMeasure);
			phrase.writeThePhrase();
			exportToFile.addPhrase(phrase.getPhrase());
			
			console.log(`   ✅ Generated successfully`);
		} catch (error) {
			console.log(`   ❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
		console.log('');
	}

	// In browser environment, return the generated content
	if (typeof window !== 'undefined') {
		console.log('🎼 All examples generated! Use "View as Sheet Music" to see the results.');
		const output = await exportToFile.writeOutput();
		console.log('\n📋 Generated LilyPond code preview:');
		console.log(output.substring(0, 200) + '...\n');
	} else {
		await exportToFile.writeOutput();
		console.log('📁 Examples saved to file successfully!');
	}
}

export async function analyzeCounterpoint(): Promise<void> {
	console.log('🔍 Analyzing Counterpoint Generation System...\n');

	// Test different configurations
	const testConfigs = [
		{ key: 'C', measures: 2, species: 1, name: 'Simple First Species' },
		{ key: 'G', measures: 3, species: 2, name: 'Second Species Example' },
		{ key: 'F', measures: 2, species: 0, name: 'Imitative Species' }
	];

	console.log('📊 Testing different counterpoint configurations:\n');

	for (const config of testConfigs) {
		console.log(`🎼 Testing: ${config.name} in ${config.key} major`);
		console.log(`   Configuration: ${config.measures} measures, Species ${config.species}`);
		
		try {
			const startTime = performance.now();
			const phrase = new WritePhrase(config.key, config.measures, config.species, 4);
			phrase.writeThePhrase();
			const endTime = performance.now();
			
			const upperVoice = phrase.getPhrase().getUpperVoice();
			const lowerVoice = phrase.getPhrase().getLowerVoice();
			
			console.log(`   ⏱️  Generation time: ${(endTime - startTime).toFixed(2)}ms`);
			console.log(`   🎵 Upper voice: ${upperVoice.length} notes`);
			console.log(`   🎵 Lower voice: ${lowerVoice.length} notes`);
			
			// Show first few notes for preview
			if (upperVoice.length > 0) {
				const firstNote = upperVoice[0].getNote();
				console.log(`   🎹 First upper note: ${NoteType[firstNote]} (${firstNote})`);
			}
			
			console.log('   ✅ Generation successful\n');
			
		} catch (error) {
			console.log(`   ❌ Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
		}
	}

	console.log('🎯 Analysis complete! The system can generate various counterpoint styles.');
	console.log('💡 Try different keys and species types in the main form above.');
}