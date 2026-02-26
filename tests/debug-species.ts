import { CantusFirmus } from '../src/cantus-firmus.js';
import { FirstSpecies } from '../src/first-species.js';
import { SecondSpecies } from '../src/second-species.js';
import { ThirdSpecies } from '../src/third-species.js';
import { FourthSpecies } from '../src/fourth-species.js';
import { FifthSpecies } from '../src/fifth-species.js';
import { Phrase } from '../src/phrase.js';
import { NoteType } from '../src/types-and-globals.js';
import { FirstSpeciesValidator } from './validators/first-species-validator.js';
import { SecondSpeciesValidator } from './validators/second-species-validator.js';
import { ThirdSpeciesValidator } from './validators/third-species-validator.js';
import { FourthSpeciesValidator } from './validators/fourth-species-validator.js';
import { FifthSpeciesValidator } from './validators/fifth-species-validator.js';

const cMajorScale = [
    NoteType.Note_C4, NoteType.Note_D4, NoteType.Note_E4,
    NoteType.Note_F4, NoteType.Note_G4, NoteType.Note_A4,
    NoteType.Note_B4, NoteType.Note_C5, NoteType.Note_D5,
    NoteType.Note_E5
];

function testSpecies(name: string, speciesFactory: () => any, validatorFactory: () => any, attempts: number = 30) {
    const ruleFails: Record<string, number> = {};
    let passes = 0;
    for (let i = 0; i < attempts; i++) {
        const cf = new CantusFirmus('C', 6, 'major');
        const cantusFirmusNotes = cf.generate();
        const species = speciesFactory();
        species.setScaleDegrees(cMajorScale);
        const counterpointNotes = species.generateCounterpoint(cantusFirmusNotes);
        const phrase = new Phrase();
        phrase.setKey(cf.getKeyInfo());
        for (const note of counterpointNotes) phrase.addNoteToUpperVoice(note);
        for (const note of cantusFirmusNotes) phrase.addNoteToLowerVoice(note);
        const validator = validatorFactory();
        const results = validator.validateAllRules(phrase);
        let allPassed = true;
        for (const [rule, passed] of Object.entries(results)) {
            if (!passed) {
                ruleFails[rule] = (ruleFails[rule] || 0) + 1;
                allPassed = false;
            }
        }
        if (allPassed) passes++;
    }
    console.log(`\n${name}: ${passes}/${attempts} fully valid (${Math.round(passes/attempts*100)}%)`);
    if (Object.keys(ruleFails).length > 0) {
        console.log('  Rule failure counts:');
        for (const [rule, count] of Object.entries(ruleFails).sort((a, b) => (b as number) - (a as number))) {
            console.log(`    ${rule}: ${count}/${attempts}`);
        }
    }
}

testSpecies('First Species', () => new FirstSpecies(), () => new FirstSpeciesValidator());
testSpecies('Second Species', () => new SecondSpecies(), () => new SecondSpeciesValidator());
testSpecies('Third Species', () => new ThirdSpecies(), () => new ThirdSpeciesValidator());
testSpecies('Fourth Species', () => new FourthSpecies(), () => new FourthSpeciesValidator());
testSpecies('Fifth Species', () => new FifthSpecies(), () => new FifthSpeciesValidator());
