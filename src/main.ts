import { ExportToFile } from './export-to-file.js';
import { WritePhrase } from './write-phrase.js';
import { getNumberInput, getStringInput, generateExample, analyzeCounterpoint } from './helper-functions.js';

async function main(): Promise<void> {
	WritePhrase.setSeed(Date.now());
	
	try {
		// await generateExample();
		// await analyzeCounterpoint();
	} catch (error) {
		if (error instanceof Error) {
			console.log(error.message);
		}
	}

	// Get inputs
	let numPhrasesDesired: number;
	let keyDesired: string;
	let lengthDesired: number;
	let speciesTypeDesired: number;
	let beatsPerMeasureDesired: number;
	let fileNameDesired: string;
	let authorInfoDesired: string;
	let titleDesired: string;

	const myFileExport = new ExportToFile();

	try {
		numPhrasesDesired = await getNumberInput("Enter the number of phrases you want: ");
		
		for (let i = 0; i < numPhrasesDesired; i++) {
			console.log(`Choose specifics for phrase ${i + 1}:`);
			console.log("	Options for Key: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B");
			
			keyDesired = await getStringInput(`	Enter the key you want phrase ${i + 1} to be in: `);
			speciesTypeDesired = await getNumberInput(`	Which species type would you like phrase ${i + 1} to be?\n\t\tNew species (1-5): 1=First, 2=Second, 3=Third, 4=Fourth, 5=Fifth\n\t\tLegacy species: -1=Imitative, -2=Legacy First, -4=Legacy Second\n\t\tEnter species: `);
			lengthDesired = await getNumberInput(`	Enter how many measures you want phrase ${i + 1} to consist of: `);
			beatsPerMeasureDesired = await getNumberInput(`	Enter how many notes you want per measure for phrase ${i + 1}: `);

			const phrase = new WritePhrase(keyDesired, lengthDesired, speciesTypeDesired, beatsPerMeasureDesired);
			phrase.writeThePhrase();
			myFileExport.addPhrase(phrase.getPhrase());
		}
		
		fileNameDesired = await getStringInput("Enter your desired output filename: ");
		authorInfoDesired = await getStringInput("Enter the composer of this piece: ");
		titleDesired = await getStringInput("Enter the title for this piece: ");

		await myFileExport.setFileName(fileNameDesired);
		myFileExport.setComposer(authorInfoDesired);
		myFileExport.setTitle(titleDesired);
		await myFileExport.writeOutput();
	} catch (error) {
		if (error instanceof Error) {
			console.log(error.message);
		}
	}
}

// Run main if this is the entry point
main().catch(console.error);