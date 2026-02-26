import { CantusFirmus } from '../src/cantus-firmus.js';
import { FifthSpecies } from '../src/fifth-species.js';
import { Phrase } from '../src/phrase.js';
import { NoteType } from '../src/types-and-globals.js';
import { FifthSpeciesValidator } from './validators/fifth-species-validator.js';
import { CounterpointRules } from './validators/counterpoint-rules.js';

const cMajorScale = [
    NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
    NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
    NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
];

const validator = new FifthSpeciesValidator();
let total = 100;
let passed = 0;
let printed = 0;
const failures: Record<string, number> = {};

for (let i = 0; i < total; i++) {
    const cf = new CantusFirmus('C', 6, 'major');
    const cantusFirmusNotes = cf.generate();
    const species = new FifthSpecies();
    species.setScaleDegrees(cMajorScale);
    const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);

    const phrase = new Phrase();
    phrase.setKey(cf.getKeyInfo());
    phrase.setTimeSignature('4/4');
    phrase.setMode('major');
    for (const note of counterpointNotes) phrase.addNoteToUpperVoice(note);
    for (const note of cantusFirmusNotes) phrase.addNoteToLowerVoice(note);
    
    const results = validator.validateAllRules(phrase);
    const allPassed = Object.values(results).every(v => v === true);
    if (allPassed) {
        passed++;
    } else {
        for (const [rule, result] of Object.entries(results)) {
            if (!result) {
                failures[rule] = (failures[rule] || 0) + 1;
            }
        }
        if (printed < 3 && (!results.limitToTenth || !results.noVoiceCrossing)) {
            printed++;
            const upper = phrase.getUpperVoice();
            const lower = phrase.getLowerVoice();
            const failedRules = Object.entries(results).filter(([,v]) => !v).map(([k]) => k);
            console.log(`\n--- Violations: ${failedRules.join(', ')} ---`);
            const cfBeats: number[] = [0];
            let cfBeat = 0;
            for (const note of lower) { cfBeat += 4 / note.getLength(); cfBeats.push(cfBeat); }
            let upperBeat = 0;
            for (let j = 0; j < upper.length; j++) {
                let cfIdx = 0;
                for (let k = 0; k < cfBeats.length - 1; k++) {
                    if (upperBeat >= cfBeats[k] && upperBeat < cfBeats[k + 1]) { cfIdx = k; break; }
                    cfIdx = k;
                }
                cfIdx = Math.min(cfIdx, lower.length - 1);
                const interval = CounterpointRules.calculateInterval(upper[j].getNote(), lower[cfIdx].getNote());
                const flag = (interval > 16 ? ' >TENTH' : '') + (upper[j].getNote() < lower[cfIdx].getNote() ? ' CROSSES' : '');
                if (flag) console.log(`  [${j}] upper=${upper[j].getNote()} cf[${cfIdx}]=${lower[cfIdx].getNote()} interval=${interval}${flag}`);
                upperBeat += 4 / upper[j].getLength();
            }
        }
    }
}

console.log(`\nPassed: ${passed}/${total}`);
for (const [rule, count] of Object.entries(failures).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count} (${(count/total*100).toFixed(0)}%)`);
}
