/**
 * Parser for the known-correct example fixtures in tests/fixtures/examples/*.ly
 * (format spec: tests/fixtures/examples/FORMAT.md).
 *
 * Produces a timed-event representation so validators can align the two voices
 * by beat position instead of by array index (required for species 2-5, where
 * the voices have different note counts).
 *
 * Pitch numbering matches NoteType: 0 = A0 ... 87 = C8 (39 = middle C = c').
 */


export type { TimedEvent } from '../../src/validation/timed-events.js';
export { voiceToTimedEvents, phraseToTimedVoices } from '../../src/validation/timed-events.js';
import type { TimedEvent } from '../../src/validation/timed-events.js';

export interface ExampleMetadata {
	species: number;
	source: string;
	sourceUrl: string;
	/** e.g. "d dorian", "c major" */
	mode: string;
	cfPosition: 'lower' | 'upper';
	time: string;
}

export interface ParsedExample {
	metadata: ExampleMetadata;
	cantusFirmus: TimedEvent[];
	counterpoint: TimedEvent[];
	/** Convenience accessors resolved via cfPosition */
	upper: TimedEvent[];
	lower: TimedEvent[];
}

const LETTER_SEMITONES: Record<string, number> = {
	c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11,
};

/** Middle C (c') = NoteType 39; unmarked c = c3 = 27. */
const UNMARKED_C = 27;

/**
 * Convert an absolute-mode LilyPond pitch (Dutch names) to a NoteType value.
 * e.g. "c'" -> 39, "d'" -> 41, "cis''" -> 52, "b," -> 14
 */
export function lyPitchToNoteValue(pitch: string): number {
	const m = pitch.match(/^([a-g])(isis|eses|is|es)?([',]*)$/);
	if (!m) {
		throw new Error(`Unparseable LilyPond pitch: "${pitch}"`);
	}
	const [, letter, accidental, marks] = m;
	let value = UNMARKED_C + LETTER_SEMITONES[letter];
	if (accidental === 'is') value += 1;
	else if (accidental === 'es') value -= 1;
	else if (accidental === 'isis') value += 2;
	else if (accidental === 'eses') value -= 2;
	for (const mark of marks) {
		value += mark === "'" ? 12 : -12;
	}
	if (value < 0 || value > 87) {
		throw new Error(`Pitch "${pitch}" out of 88-key range (got ${value})`);
	}
	return value;
}

/** Parse the tokens inside one music variable's { ... } block. */
export function parseMusicBlock(block: string): TimedEvent[] {
	// Strip commands we ignore: \clef "treble", \time 4/4, \bar "||", bar checks
	const cleaned = block
		.replace(/\\clef\s+"[^"]*"/g, ' ')
		.replace(/\\time\s+\d+\/\d+/g, ' ')
		.replace(/\\bar\s+"[^"]*"/g, ' ')
		.replace(/\|/g, ' ');

	const events: TimedEvent[] = [];
	let start = 0;
	let lastLyDuration = 4; // LilyPond's default previous-duration is a quarter

	const tokenRe = /([a-g](?:isis|eses|is|es)?[',]*|r)(\d*)(\.?)(\s*~)?/g;
	// Validate there is no unexpected junk: check the cleaned string token by token
	const junk = cleaned.replace(tokenRe, ' ').trim();
	if (/[^\s]/.test(junk)) {
		throw new Error(`Unexpected content in music block: "${junk.slice(0, 40)}"`);
	}

	tokenRe.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = tokenRe.exec(cleaned)) !== null) {
		if (m[0].trim() === '') continue; // regex can match empty at positions
		const [, pitchToken, durToken, dotToken, tieToken] = m;
		const lyDuration = durToken ? parseInt(durToken, 10) : lastLyDuration;
		lastLyDuration = lyDuration;
		let duration = 1 / lyDuration;
		if (dotToken === '.') duration *= 1.5;

		events.push({
			pitch: pitchToken === 'r' ? null : lyPitchToNoteValue(pitchToken),
			start,
			duration,
			lyDuration,
			tiedToNext: Boolean(tieToken),
		});
		start += duration;
	}

	if (events.length === 0) {
		throw new Error('Music block contained no notes');
	}
	if (events.some(e => e.pitch === null && e.tiedToNext)) {
		throw new Error('A rest cannot be tied');
	}
	return events;
}

function requireMeta(source: string, name: string): string {
	const m = source.match(new RegExp(`^%\\s*${name}:\\s*(.+)$`, 'm'));
	if (!m) {
		throw new Error(`Missing required metadata comment "% ${name}: ..."`);
	}
	return m[1].trim();
}

function extractVariable(source: string, name: string): string {
	const m = source.match(new RegExp(`${name}\\s*=\\s*\\{([^}]*)\\}`));
	if (!m) {
		throw new Error(`Missing music variable "${name} = { ... }"`);
	}
	return m[1];
}

/** Parse a full fixture file's contents. */
export function parseExample(source: string): ParsedExample {
	const cfPosition = requireMeta(source, 'cf-position');
	if (cfPosition !== 'lower' && cfPosition !== 'upper') {
		throw new Error(`cf-position must be "lower" or "upper", got "${cfPosition}"`);
	}

	const metadata: ExampleMetadata = {
		species: parseInt(requireMeta(source, 'species'), 10),
		source: requireMeta(source, 'source'),
		sourceUrl: requireMeta(source, 'source-url'),
		mode: requireMeta(source, 'mode').toLowerCase(),
		cfPosition,
		time: requireMeta(source, 'time'),
	};
	if (!(metadata.species >= 1 && metadata.species <= 5)) {
		throw new Error(`species must be 1-5, got ${metadata.species}`);
	}

	const cantusFirmus = parseMusicBlock(extractVariable(source, 'cantusFirmus'));
	const counterpoint = parseMusicBlock(extractVariable(source, 'counterpoint'));

	return {
		metadata,
		cantusFirmus,
		counterpoint,
		upper: cfPosition === 'upper' ? cantusFirmus : counterpoint,
		lower: cfPosition === 'lower' ? cantusFirmus : counterpoint,
	};
}

/** Parse a fixture file from disk. */
export async function parseExampleFile(path: string): Promise<ParsedExample> {
	const { readFile } = await import('node:fs/promises');
	return parseExample(await readFile(path, 'utf-8'));
}
