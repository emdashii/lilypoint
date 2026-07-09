import { describe, test, expect } from 'bun:test';
import {
	lyPitchToNoteValue,
	parseMusicBlock,
	parseExample,
} from '../helpers/ly-parser.js';
import { NoteType } from '../../src/types-and-globals.js';

describe('lyPitchToNoteValue', () => {
	test('middle C and octave marks', () => {
		expect(lyPitchToNoteValue("c'")).toBe(NoteType.Note_C4);
		expect(lyPitchToNoteValue('c')).toBe(NoteType.Note_C3);
		expect(lyPitchToNoteValue("c''")).toBe(NoteType.Note_C5);
		expect(lyPitchToNoteValue('c,')).toBe(NoteType.Note_C2);
		expect(lyPitchToNoteValue('a,,,')).toBe(NoteType.Note_A0);
		expect(lyPitchToNoteValue("c'''''")).toBe(NoteType.Note_C8);
	});

	test('accidentals', () => {
		expect(lyPitchToNoteValue("cis'")).toBe(NoteType.Note_C4_sharp);
		expect(lyPitchToNoteValue("bes'")).toBe(NoteType.Note_B4_flat);
		expect(lyPitchToNoteValue("fis'")).toBe(NoteType.Note_F4_sharp);
	});

	test('rejects invalid pitches', () => {
		expect(() => lyPitchToNoteValue('h')).toThrow();
		expect(() => lyPitchToNoteValue("c''''''")).toThrow();
	});
});

describe('parseMusicBlock', () => {
	test('whole notes with explicit durations', () => {
		const events = parseMusicBlock("d'1 f'1 e'1");
		expect(events.length).toBe(3);
		expect(events[0]).toMatchObject({ pitch: 41, start: 0, duration: 1, lyDuration: 1 });
		expect(events[1].start).toBe(1);
		expect(events[2].start).toBe(2);
	});

	test('duration carries over when omitted', () => {
		const events = parseMusicBlock("d'2 e' f'4 g'");
		expect(events.map(e => e.lyDuration)).toEqual([2, 2, 4, 4]);
		expect(events.map(e => e.start)).toEqual([0, 0.5, 1, 1.25]);
	});

	test('rests and ties', () => {
		const events = parseMusicBlock("r2 a'2~ a'2 b'2");
		expect(events[0].pitch).toBeNull();
		expect(events[1].tiedToNext).toBe(true);
		expect(events[2].tiedToNext).toBe(false);
		expect(events[3].start).toBe(1.5);
	});

	test('ignores clef, time, bar checks', () => {
		const events = parseMusicBlock('\\clef "treble" \\time 4/4 d\'1 | f\'1 \\bar "||"');
		expect(events.length).toBe(2);
	});

	test('rejects junk content', () => {
		expect(() => parseMusicBlock("d'1 \\relative f'1")).toThrow();
	});
});

describe('parseExample', () => {
	const fixture = `% species: 1
% source: Fux, Gradus ad Parnassum (1725), Figure 5
% source-url: https://example.org
% mode: d dorian
% cf-position: lower
% time: 4/4

cantusFirmus = { \\clef "treble" \\time 4/4 d'1 f'1 e'1 d'1 g'1 f'1 a'1 g'1 f'1 e'1 d'1 }
counterpoint = { \\clef "treble" \\time 4/4 a'1 a'1 g'1 a'1 b'1 c''1 c''1 b'1 d''1 cis''1 d''1 }

\\score { << \\new Staff { \\counterpoint } \\new Staff { \\cantusFirmus } >> \\layout {} }
`;

	test('parses metadata and both voices', () => {
		const parsed = parseExample(fixture);
		expect(parsed.metadata.species).toBe(1);
		expect(parsed.metadata.mode).toBe('d dorian');
		expect(parsed.metadata.cfPosition).toBe('lower');
		expect(parsed.cantusFirmus.length).toBe(11);
		expect(parsed.counterpoint.length).toBe(11);
		expect(parsed.lower).toBe(parsed.cantusFirmus);
		expect(parsed.upper).toBe(parsed.counterpoint);
		// Raised leading tone (cis'') survives parsing
		expect(parsed.counterpoint[9].pitch).toBe(lyPitchToNoteValue("cis''"));
	});

	test('rejects missing metadata', () => {
		expect(() => parseExample(fixture.replace('% mode: d dorian\n', ''))).toThrow(/mode/);
	});
});
