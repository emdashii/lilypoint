/**
 * Timed-event representation of a voice: each note/rest with an absolute start
 * time in whole-note units. Both generated Phrases and parsed .ly fixtures are
 * converted to this shape so the species rules align the voices by musical
 * time (beat position) rather than by array index.
 */

import { Note } from '../note.js';
import { Phrase } from '../phrase.js';

/** A sounding note or rest with an absolute start time, in whole-note units. */
export interface TimedEvent {
	/** NoteType value 0-87, or null for a rest */
	pitch: number | null;
	/** Absolute start offset from the beginning of the voice, in whole notes */
	start: number;
	/** Duration in whole notes (1 = whole, 0.5 = half, 0.25 = quarter, ...) */
	duration: number;
	/** LilyPond duration number (1, 2, 4, 8) */
	lyDuration: number;
	/** True if tied to the following event (suspension) */
	tiedToNext: boolean;
}

/**
 * Convert a Phrase voice (Note[]) to TimedEvents. Note.getLength() holds the
 * LilyPond duration number (1 = whole, 2 = half, 4 = quarter), matching
 * ExportToFile output.
 */
export function voiceToTimedEvents(voice: Note[]): TimedEvent[] {
	const events: TimedEvent[] = [];
	let start = 0;
	for (const note of voice) {
		const lyDuration = note.getLength();
		const duration = 1 / lyDuration;
		events.push({
			pitch: note.getNote(),
			start,
			duration,
			lyDuration,
			tiedToNext: note.getTied(),
		});
		start += duration;
	}
	return events;
}

/** Convert a Phrase into a pair of timed voices. */
export function phraseToTimedVoices(phrase: Phrase): { upper: TimedEvent[]; lower: TimedEvent[] } {
	return {
		upper: voiceToTimedEvents(phrase.getUpperVoice()),
		lower: voiceToTimedEvents(phrase.getLowerVoice()),
	};
}
