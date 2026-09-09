import { pitchInterval, PitchSpelling } from '../pitch.js';
import { SpeciesInput, Violation, alignToCantusFirmus, mergeTies, isConsonant } from './species-rules.js';

export function regularMelodicInterval(a: PitchSpelling, b: PitchSpelling): boolean {
	const interval = pitchInterval(a, b);
	const steps = Math.abs(interval.diatonicSteps);
	const semitones = Math.abs(interval.semitones);
	const base = [0, 2, 4, 5, 7, 9, 11][steps % 7] + 12 * Math.floor(steps / 7);
	return [0, 3, 4].includes(steps % 7) ? semitones === base : semitones === base || semitones === base - 1;
}
export function spelledConsonance(a: PitchSpelling, b: PitchSpelling): boolean {
	const interval = pitchInterval(a, b);
	return [0, 2, 4, 5].includes(Math.abs(interval.diatonicSteps) % 7) && regularMelodicInterval(a, b) && isConsonant(Math.abs(interval.semitones));
}
export function checkStudentRules(input: SpeciesInput): Violation[] {
	const violations: Violation[] = [];
	const fail = (rule: string, at: number, detail: string) => violations.push({ rule, at, detail });
	const aligned = alignToCantusFirmus(input);
	for (let i = 0; i < aligned.length; i++) {
		const a = aligned[i];
		if (a.interval === null) continue;
		if (a.interval > 16) fail('spacing', a.event.start, 'student spacing exceeds a tenth');
		if (a.event.spelling && a.cf.spelling && isConsonant(a.interval) && !spelledConsonance(a.event.spelling, a.cf.spelling)) fail('spelling', a.event.start, 'sounding consonance has dissonant spelling');
		if (((input.species === 3 || input.species === 5) && a.beatPos === 0.5) && !isConsonant(a.interval)) fail('metric', a.event.start, 'half-pulse position must be consonant');
		const prev = aligned[i - 1];
		if (prev && prev.cfIndex !== a.cfIndex && a.cf.pitch !== null && prev.cf.pitch !== null) {
			const cpMove = a.event.pitch! - prev.event.pitch!;
			const cfMove = a.cf.pitch - prev.cf.pitch;
			if ([0,7].includes(a.interval % 12) && cpMove !== 0 && Math.sign(cpMove) === Math.sign(cfMove)) fail('directPerfect', a.event.start, 'similar motion into a perfect interval');
		}
	}
	for (const voice of [input.cp, input.cf]) {
		const notes = mergeTies(voice).filter(n => n.pitch !== null);
		for (let i = 1; i < notes.length; i++) {
			const a = notes[i - 1], b = notes[i];
			if (a.spelling && b.spelling && !regularMelodicInterval(a.spelling, b.spelling)) fail('spelling', b.start, 'augmented or diminished melodic interval');
			if (i < notes.length - 1) {
				const move = b.pitch! - a.pitch!, next = notes[i + 1].pitch! - b.pitch!;
				if (Math.abs(move) > 4 && (Math.abs(next) < 1 || Math.abs(next) > 2 || Math.sign(next) === Math.sign(move))) fail('melodicRecovery', b.start, 'leap larger than a third needs a contrary step');
			}
		}
	}
	const cp = mergeTies(input.cp).filter(n => n.pitch !== null);
	const cf = mergeTies(input.cf).filter(n => n.pitch !== null);
	if (cp.length >= 2 && cf.length >= 2) {
		const cpMove = cp.at(-1)!.pitch! - cp.at(-2)!.pitch!;
		const cfMove = cf.at(-1)!.pitch! - cf.at(-2)!.pitch!;
		if (Math.sign(cpMove) === Math.sign(cfMove) || ![1,2].includes(Math.abs(cfMove)) || ![1,2].includes(Math.abs(cpMove)) || cpMove > 1 || cfMove > 1) fail('cadence', cp.at(-1)!.start, 'cadence requires contrary steps and a raised ascending leading tone');
	}
	if (input.species === 4) {
		const weak = aligned.filter(a => a.beatPos === 0.5);
		for (let i = 1; i < weak.length; i++) {
			const a = weak[i - 1], b = weak[i];
			if (a.interval !== null && b.interval !== null && [0,7].includes(b.interval % 12) && a.interval % 12 === b.interval % 12) fail('afterbeatPerfects', b.event.start, 'consecutive weak-beat perfect intervals');
		}
	}
	return violations;
}
