/**
 * Timed-event representation of a voice: each note/rest with an absolute start
 * time in whole-note units. Both generated Phrases and parsed .ly fixtures are
 * converted to this shape so the species rules align the voices by musical
 * time (beat position) rather than by array index.
 */

import { Note, TICKS_PER_WHOLE } from '../note.js';
import { Phrase } from '../phrase.js';

/** A sounding note or rest with an absolute start time, in whole-note units. */
export interface TimedEvent {
	/** NoteType value 0-87, or null for a rest */
	pitch: number | null;
	spelling?: import('../pitch.js').PitchSpelling;
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
 * Convert tick durations and explicit rests to the rule engine adapter.
 * lyDuration is a compatibility hint; start and duration govern analysis.
 */
export function voiceToTimedEvents(voice: Note[]): TimedEvent[] {
	const events: TimedEvent[] = [];
	let start = 0;
	for (const note of voice) {
		const lyDuration = note.getLength();
		const duration = note.getDurationTicks() / TICKS_PER_WHOLE;
		events.push({
			pitch: note.getPitch(),
			spelling: note.getSpelling(),
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

/** Canonical stored events use integer ticks; the rule adapter uses whole notes. */
export interface MusicalEvent {
	pitch: number | null;
	spelling?: import('../pitch.js').PitchSpelling;
	onsetTicks: number;
	durationTicks: number;
	tiedToNext: boolean;
}
export function voiceToMusicalEvents(voice: Note[]): MusicalEvent[] {
	let onsetTicks = 0;
	return voice.map(note => {
		const event = { pitch: note.getPitch(), spelling: note.getSpelling(), onsetTicks, durationTicks: note.getDurationTicks(), tiedToNext: note.getTied() };
		onsetTicks += event.durationTicks;
		return event;
	});
}

/** Load a contiguous stored voice without losing rests, spelling, or ties. */
export function musicalEventsToVoice(events: MusicalEvent[]): Note[] {
	let end = 0;
	return events.map((event, i) => {
		if (!Number.isSafeInteger(event.onsetTicks) || event.onsetTicks !== end) throw new Error('Stored voice has an invalid onset, gap, or overlap');
		const note = event.pitch === null ? Note.rest(event.durationTicks) : new Note(event.pitch);
		note.setDurationTicks(event.durationTicks);
		if (event.spelling) note.setSpelling(event.spelling);
		if (event.tiedToNext && (event.pitch === null || events[i + 1]?.pitch !== event.pitch || events[i + 1]?.onsetTicks !== event.onsetTicks + event.durationTicks)) throw new Error('Invalid stored tie');
		note.setTied(event.tiedToNext);
		end += event.durationTicks;
		if (!Number.isSafeInteger(end)) throw new Error('Stored voice duration exceeds integer precision');
		return note;
	});
}
