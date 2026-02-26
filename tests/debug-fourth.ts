import { CantusFirmus } from '../src/cantus-firmus.js';
import { FourthSpecies } from '../src/fourth-species.js';
import { Phrase } from '../src/phrase.js';
import { NoteType } from '../src/types-and-globals.js';
import { FourthSpeciesValidator } from './validators/fourth-species-validator.js';

const cMajorScale = [
    NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
    NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
    NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5
];

const validator = new FourthSpeciesValidator();
let total = 200;
let passed = 0;
let printed = 0;
const failures: Record<string, number> = {};

for (let i = 0; i < total; i++) {
    const cf = new CantusFirmus('C', 6, 'major');
    const cfNotes = cf.generate();
    const species = new FourthSpecies();
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
        if (printed < 4 && !results.noLargeLeaps) {
            printed++;
            const upper = phrase.getUpperVoice().map(n => n.getNote());
            const lower = phrase.getLowerVoice().map(n => n.getNote());
            console.log(`\nCF: ${lower.join(', ')}`);
            console.log(`CP: ${upper.join(', ')}`);
            for (let j = 1; j < upper.length; j++) {
                const leap = Math.abs(upper[j] - upper[j-1]);
                if (leap > 12) console.log(`  LEAP [${j-1}→${j}] ${upper[j-1]}→${upper[j]} = ${leap}`);
            }
        }
    }
}

console.log(`\nPassed: ${passed}/${total} (${(passed/total*100).toFixed(0)}%)`);
for (const [rule, count] of Object.entries(failures).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${rule}: ${count} (${(count/total*100).toFixed(0)}%)`);
}
