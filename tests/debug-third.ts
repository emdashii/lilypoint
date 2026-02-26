import { CantusFirmus } from '../src/cantus-firmus.js';
import { ThirdSpecies } from '../src/third-species.js';
import { NoteType } from '../src/types-and-globals.js';
import { CounterpointRules } from './validators/counterpoint-rules.js';

const cMajorScale = [NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4, NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4, NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5, NoteType.Note_E5];

for (let a = 0; a < 3; a++) {
    const cf = new CantusFirmus('C', 4, 'major');
    const cfNotes = cf.generate();
    const species = new ThirdSpecies();
    species.setScaleDegrees(cMajorScale);
    const cp = species.generateCounterpoint(cfNotes);
    const upper = cp.map(n => n.getNote());
    const lower = cfNotes.map(n => n.getNote());
    console.log(`\n=== Attempt ${a + 1} ===`);
    console.log('CF:', lower.join(', '));
    console.log('CP:', upper.join(', '));
    for (let i = 0; i < lower.length; i++) {
        for (let beat = 1; beat < 4; beat++) {
            const uIdx = i * 4 + beat;
            if (uIdx >= upper.length || uIdx < 1) continue;
            const note = upper[uIdx];
            const cfNote = lower[i];
            const interval = Math.abs(note - cfNote) % 12;
            const isConsonant = [0, 3, 4, 7, 8, 9].includes(interval);
            if (!isConsonant) {
                const prevNote = upper[uIdx - 1];
                const stepwise = CounterpointRules.isStepwiseMotion(prevNote, note);
                console.log(`  DISSONANT at cf[${i}] beat ${beat}: upper=${note} cf=${cfNote} intv=${interval} prev=${prevNote} step=${stepwise} leap=${Math.abs(note - prevNote)}`);
            }
        }
    }
}
