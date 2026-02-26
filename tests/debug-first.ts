import { CantusFirmus } from '../src/cantus-firmus.js';
import { FirstSpecies } from '../src/first-species.js';
import { Phrase } from '../src/phrase.js';
import { NoteType } from '../src/types-and-globals.js';
import { FirstSpeciesValidator } from './validators/first-species-validator.js';

const cMajorScale = [
    NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
    NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
    NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
];

const validator = new FirstSpeciesValidator();
let total = 100;
let passed = 0;
const failures: Record<string, number> = {};

for (let i = 0; i < total; i++) {
    const cf = new CantusFirmus('C', 10, 'major');
    const cfNotes = cf.generate();
    const species = new FirstSpecies();
    species.setScaleDegrees(cMajorScale);
    const cpNotes = species.generateCounterpoint(cfNotes);

    const phrase = new Phrase();
    phrase.setKey(cf.getKeyInfo());
    phrase.setTimeSignature('4/4');
    phrase.setMode('major');
    for (const n of cpNotes) phrase.addNoteToUpperVoice(n);
    for (const n of cfNotes) phrase.addNoteToLowerVoice(n);
    
    const results = validator.validateAllRules(phrase);
    const allPassed = Object.values(results).every(v => v === true);
    if (allPassed) { passed++; }
    else {
        for (const [rule, result] of Object.entries(results)) {
            if (!result) failures[rule] = (failures[rule] || 0) + 1;
        }
    }
}

console.log(`Passed: ${passed}/${total} (${(passed/total*100).toFixed(0)}%)`);
for (const [rule, count] of Object.entries(failures).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count} (${(count/total*100).toFixed(0)}%)`);
}
