import { WritePhrase } from './write-phrase.js';
import { ExportToFile } from './export-to-file.js';
import { writeFile } from 'node:fs/promises';

function getArg(args: string[], name: string): string | undefined {
	const idx = args.indexOf(name);
	if (idx !== -1 && idx + 1 < args.length) {
		return args[idx + 1];
	}
	return undefined;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);

	const seed = getArg(args, '--seed');
	const key = getArg(args, '--key');
	const species = getArg(args, '--species');
	const measures = getArg(args, '--measures');
	const beats = getArg(args, '--beats');
	const output = getArg(args, '--output');

	if (!seed || !key || !species || !measures || !beats || !output) {
		console.error('Usage: bun run src/compare-runner.ts --seed SEED --key KEY --species SPECIES --measures N --beats N --output FILE');
		process.exit(1);
	}

	const seedNum = parseInt(seed);
	const speciesNum = parseInt(species);
	const measuresNum = parseInt(measures);
	const beatsNum = parseInt(beats);

	// Build time signature string from beats (e.g., 4 -> "4/4")
	const timeSignature = `${beatsNum}/4`;

	WritePhrase.setSeed(seedNum);

	const phrase = new WritePhrase(key, measuresNum, speciesNum, timeSignature);
	phrase.writeThePhrase();

	const myFileExport = new ExportToFile();
	myFileExport.addPhrase(phrase.getPhrase());
	// Directly set filename without existence check
	await myFileExport.setFileName(output);
	myFileExport.setComposer('Comparison Test');
	myFileExport.setTitle('Comparison Test');
	const content = await myFileExport.writeOutput();

	// Also write directly to ensure file is created at the exact path
	await writeFile(output, content);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
