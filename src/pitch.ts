import { KeyInfo } from './key.js';
export interface PitchSpelling { letter: 'c' | 'd' | 'e' | 'f' | 'g' | 'a' | 'b'; accidental: number; octave: number }
const letters = 'cdefgab';
const natural = [0, 2, 4, 5, 7, 9, 11];
export function soundingPitch(p: PitchSpelling): number {
	if (!letters.includes(p.letter) || p.letter.length !== 1 || !Number.isInteger(p.accidental) || Math.abs(p.accidental) > 2 || !Number.isInteger(p.octave)) throw new Error('Invalid pitch spelling');
	return 12 * (p.octave + 1) + natural[letters.indexOf(p.letter)] + p.accidental - 21;
}
export function spellPitch(pitch: number, key: KeyInfo, preferredLetter?: string): PitchSpelling {
	const midi = pitch + 21;
	const signature = new Map(key.notes.map(token => [token[0], token.slice(1).startsWith('is') ? (token.length - 1) / 2 : -(token.length - 1) / 2]));
	const choices: PitchSpelling[] = [];
	for (let i = 0; i < 7; i++) for (let accidental = -2; accidental <= 2; accidental++) {
		if ((midi - natural[i] - accidental) % 12 !== 0) continue;
		choices.push({ letter: letters[i] as PitchSpelling['letter'], accidental, octave: (midi - natural[i] - accidental) / 12 - 1 });
	}
	const cost = (p: PitchSpelling) => (preferredLetter && p.letter !== preferredLetter ? 100 : 0) +
		(p.accidental === (signature.get(p.letter) ?? 0) ? 0 : 10) + Math.abs(p.accidental) + ((key.type === 'es' ? p.accidental > 0 : p.accidental < 0) ? 1 : 0);
	choices.sort((a,b) => Number(cost(a)) - Number(cost(b)));
	return choices[0];
}
export function pitchInterval(a: PitchSpelling, b: PitchSpelling): { semitones: number; diatonicSteps: number } {
	return { semitones: soundingPitch(b) - soundingPitch(a), diatonicSteps: 7 * (b.octave - a.octave) + letters.indexOf(b.letter) - letters.indexOf(a.letter) };
}
export function pitchToken(p: PitchSpelling): string {
	return p.letter + (p.accidental >= 0 ? 'is'.repeat(p.accidental) : 'es'.repeat(-p.accidental)) + (p.octave >= 3 ? "'".repeat(p.octave - 3) : ','.repeat(3 - p.octave));
}

