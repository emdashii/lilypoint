# Testing Suite Design for Lilypoint

## Overview
Comprehensive testing suite for the counterpoint generator with unit tests, integration tests, and end-to-end tests that verify counterpoint rules.

## Testing Framework
**Bun Test** - Using Bun's built-in testing framework for fast, TypeScript-native testing.

## File Structure

```
lilypoint/
├── src/
│   └── (existing code)
├── tests/
│   ├── unit/
│   │   ├── note.test.ts                    # Test Note class
│   │   ├── phrase.test.ts                  # Test Phrase class
│   │   ├── key.test.ts                     # Test Key class
│   │   ├── cantus-firmus.test.ts           # Test cantus firmus generation
│   │   ├── species.test.ts                 # Test abstract Species base class
│   │   ├── helper-functions.test.ts        # Test utility functions
│   │   └── export-to-file.test.ts          # Test LilyPond export
│   ├── integration/
│   │   ├── first-species.test.ts           # Test FirstSpecies algorithm
│   │   ├── second-species.test.ts          # Test SecondSpecies algorithm
│   │   ├── third-species.test.ts           # Test ThirdSpecies algorithm
│   │   ├── fourth-species.test.ts          # Test FourthSpecies algorithm
│   │   ├── fifth-species.test.ts           # Test FifthSpecies algorithm
│   │   └── write-phrase.test.ts            # Test WritePhrase orchestration
│   ├── e2e/
│   │   ├── first-species-rules.test.ts     # E2E with rule verification
│   │   ├── second-species-rules.test.ts    # E2E with rule verification
│   │   ├── third-species-rules.test.ts     # E2E with rule verification
│   │   ├── fourth-species-rules.test.ts    # E2E with rule verification
│   │   ├── fifth-species-rules.test.ts     # E2E with rule verification
│   │   └── ui-simulation.test.ts           # Simulate web UI inputs
│   ├── validators/
│   │   ├── counterpoint-rules.ts           # Rule validation logic
│   │   ├── first-species-validator.ts      # First species rules
│   │   ├── second-species-validator.ts     # Second species rules
│   │   ├── third-species-validator.ts      # Third species rules
│   │   ├── fourth-species-validator.ts     # Fourth species rules
│   │   └── fifth-species-validator.ts      # Fifth species rules
│   ├── fixtures/
│   │   ├── test-phrases.ts                 # Pre-made test phrases
│   │   └── expected-outputs.ts             # Expected LilyPond outputs
│   ├── helpers/
│   │   ├── test-utils.ts                   # Testing utilities
│   │   └── mock-data.ts                    # Mock data generators
│   └── setup.ts                            # Test configuration
├── package.json
└── tsconfig.json
```

## Test Categories

### A. Unit Tests (Fast, isolated)
Test individual classes/methods in isolation with mocked dependencies.

**Coverage:**
- `Note` class: getters, setters, validation
- `Phrase` class: adding notes, managing voices
- `Key` class: scale degree generation
- Helper functions: interval calculations, conversions
- Individual methods of Species classes

**Example:**
```typescript
// note.test.ts
import { describe, test, expect } from 'bun:test';
import { Note } from '../src/note.js';
import { NoteType } from '../src/types-and-globals.js';

describe('Note', () => {
  test('should create note with correct value', () => {
    const note = new Note(NoteType.Note_C4, 4);
    expect(note.getNote()).toBe(NoteType.Note_C4);
    expect(note.getLength()).toBe(4);
  });
});
```

### B. Integration Tests (Medium complexity)
Test species classes with real dependencies, verify algorithm logic without full rule validation.

**Coverage:**
- `FirstSpecies.generateCounterpoint()` produces correct number of notes
- `WritePhrase` correctly orchestrates cantus firmus + counterpoint generation
- Each species produces output matching expected ratios (1:1, 2:1, 4:1, etc.)
- Species algorithms work with different keys and modes

**Example:**
```typescript
// first-species.test.ts
import { describe, test, expect } from 'bun:test';
import { FirstSpecies } from '../src/first-species.js';
import { Note } from '../src/note.js';

describe('FirstSpecies Integration', () => {
  test('should generate correct number of notes (1:1 ratio)', () => {
    const cf = [new Note(39, 4), new Note(41, 4), new Note(39, 4)]; // C, D, C
    const species = new FirstSpecies();
    species.setScaleDegrees([39, 41, 43, 44, 46, 48, 50]); // C major scale
    const result = species.generateCounterpoint(cf);
    expect(result.length).toBe(3); // 1:1 ratio
  });
});
```

### C. End-to-End Tests (Comprehensive)
Full workflow from input → generation → validation. **Most important for verifying counterpoint rules.**

**Coverage:**
- Generate First Species → verify all rules (no parallel 5ths/8ves, consonant intervals, etc.)
- Generate with different keys (C major, D minor, F# major, etc.)
- Generate with different modes (major, minor)
- Generate with different time signatures (3/4, 4/4, 6/8)
- Generate with different phrase lengths (2-16 measures)
- Simulate all UI input combinations

**Example:**
```typescript
// first-species-rules.test.ts
import { describe, test, expect } from 'bun:test';
import { WritePhrase } from '../src/write-phrase.js';
import { FirstSpeciesValidator } from '../validators/first-species-validator.js';

describe('First Species E2E - Rule Validation', () => {
  test('should generate valid C major first species counterpoint', () => {
    WritePhrase.setSeed(12345); // Deterministic
    const phrase = new WritePhrase('C', 4, 1, '4/4');
    phrase.setMode('major');
    phrase.writeThePhrase();

    const result = phrase.getPhrase();
    const validator = new FirstSpeciesValidator();

    // Validate all first species rules
    const validationResults = validator.validateAllRules(result);
    expect(validationResults.noParallelFifths).toBe(true);
    expect(validationResults.noParallelOctaves).toBe(true);
    expect(validationResults.allConsonant).toBe(true);
    expect(validationResults.noVoiceCrossing).toBe(true);
    expect(validationResults.beginsOnPerfectConsonance).toBe(true);
    expect(validationResults.endsOnPerfectConsonance).toBe(true);
    expect(validationResults.noUnisonExceptEnds).toBe(true);
    expect(validationResults.noHiddenParallels).toBe(true);
    expect(validationResults.limitToTenth).toBe(true);
    expect(validationResults.noLargeLeaps).toBe(true);
    expect(validationResults.limitConsecutiveIntervals).toBe(true);
  });
});
```

## Counterpoint Rule Validators

These verify that generated music follows counterpoint rules. Each validator returns an object with boolean results for each rule.

### Common Rules (all species)
- No voice crossing (counterpoint stays above/below cantus firmus)
- Stay within a tenth interval (max 16 semitones)
- Melodic intervals (no leaps larger than an octave)
- Begin and end on perfect consonance (unison, 5th, or octave)
- All notes are diatonic (match the key/mode scale degrees)

### First Species Specific Rules
- **1:1 note ratio** - Same number of notes in both voices
- **All intervals consonant** - Unison, 3rd, 5th, 6th, 8ve only (intervals 0, 3, 4, 7, 8, 9 mod 12)
- **No parallel perfect 5ths** - If previous interval is P5, current cannot be P5
- **No parallel octaves** - If previous interval is octave/unison, current cannot be octave/unison
- **No hidden parallels** - Both voices moving in same direction to perfect consonance must have stepwise motion in at least one voice
- **Prefer contrary motion** - When cantus moves up, counterpoint should prefer moving down (and vice versa)
- **Limit consecutive intervals** - No more than 2 consecutive identical intervals
- **No large leaps** - Maximum leap of one octave (12 semitones)
- **No unison except at beginning/end** - Middle notes cannot be unison with cantus firmus
- **Begins on perfect consonance** - First note must be unison, 5th, or octave
- **Ends on perfect consonance** - Last note must be unison or octave

### Second Species Specific Rules
- **2:1 note ratio** - Twice as many notes in counterpoint vs cantus firmus
- **Downbeats consonant** - Every other note (aligned with cantus) must be consonant
- **Passing tones allowed** - Upbeats can be dissonant if they move stepwise

### Third Species Specific Rules
- **4:1 note ratio** - Four times as many notes in counterpoint vs cantus firmus
- **Downbeats consonant** - First note of each group of 4 must be consonant
- **Passing tones and neighbor tones** - More rhythmic freedom

### Fourth Species Specific Rules
- **Syncopation** - Notes are rhythmically offset from cantus firmus
- **Suspensions** - Dissonances created by suspensions
- **Dissonances resolve down by step** - Suspended dissonances must resolve downward

### Fifth Species Specific Rules
- **Florid counterpoint** - Mixed rhythms combining all previous species
- **Free combination** - Can use techniques from all four previous species

## Validator Implementation Pattern

```typescript
// validators/counterpoint-rules.ts
export interface RuleValidationResult {
  [ruleName: string]: boolean;
}

export interface CounterpointValidator {
  validateAllRules(phrase: Phrase): RuleValidationResult;
}

// validators/first-species-validator.ts
export class FirstSpeciesValidator implements CounterpointValidator {
  validateAllRules(phrase: Phrase): RuleValidationResult {
    return {
      noParallelFifths: this.checkNoParallelFifths(phrase),
      noParallelOctaves: this.checkNoParallelOctaves(phrase),
      allConsonant: this.checkAllConsonant(phrase),
      // ... other rules
    };
  }

  private checkNoParallelFifths(phrase: Phrase): boolean {
    // Implementation
  }

  // ... other validation methods
}
```

## Test Coverage Goals

- **Unit tests:** 90%+ coverage of core classes
- **Integration tests:** All species algorithms (5 species)
- **E2E tests:** At least 3 scenarios per species
  - Different keys (major and minor)
  - Different time signatures
  - Different phrase lengths
- **Rule validators:** 100% coverage of all counterpoint rules

## Additional Testing Features

### Snapshot Testing
Save "known good" LilyPond output and compare against future changes to detect regressions.

```typescript
import { test, expect } from 'bun:test';
import { toMatchSnapshot } from 'bun:test';

test('should generate expected LilyPond output', () => {
  WritePhrase.setSeed(12345);
  const phrase = new WritePhrase('C', 4, 1, '4/4');
  phrase.writeThePhrase();
  const output = exportToFile.writeOutput();
  expect(output).toMatchSnapshot();
});
```

### Property-Based Testing
Generate random valid inputs and verify output properties always hold.

```typescript
test('all generated first species phrases should pass validation', () => {
  for (let i = 0; i < 100; i++) {
    WritePhrase.setSeed(i);
    const randomKey = ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)];
    const phrase = new WritePhrase(randomKey, 4, 1, '4/4');
    phrase.writeThePhrase();

    const validator = new FirstSpeciesValidator();
    const results = validator.validateAllRules(phrase.getPhrase());

    // All rules must pass
    Object.values(results).forEach(result => {
      expect(result).toBe(true);
    });
  }
});
```

### Deterministic vs Random Testing
- **Deterministic (seeded):** Used for regression tests and debugging
- **Random:** Used for property-based testing to find edge cases

### Performance Benchmarks
Ensure generation doesn't slow down over time.

```typescript
import { test } from 'bun:test';

test('first species generation should complete in < 100ms', async () => {
  const start = performance.now();

  const phrase = new WritePhrase('C', 8, 1, '4/4');
  phrase.writeThePhrase();

  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

## NPM Scripts

```json
{
  "scripts": {
    "test": "bun test",
    "test:unit": "bun test tests/unit",
    "test:integration": "bun test tests/integration",
    "test:e2e": "bun test tests/e2e",
    "test:watch": "bun test --watch",
    "test:coverage": "bun test --coverage",
    "build": "tsc && copyfiles -u 1 \"public/**/*\" dist",
    "build:test": "npm run build && npm run test",
    "precommit": "npm run test && npm run build"
  }
}
```

## CI/CD Integration

When running in CI (GitHub Actions, etc.), tests should:
1. Run all unit tests
2. Run all integration tests
3. Run all E2E tests
4. Generate coverage report
5. Fail the build if coverage drops below threshold (e.g., 85%)
6. Fail the build if any rule validation tests fail

## Implementation Priority

### Phase 1: Foundation
1. Set up test infrastructure (folders, setup.ts)
2. Create test helpers and utilities
3. Write basic unit tests for Note, Phrase, Key

### Phase 2: Validators
1. Implement common counterpoint rule validators
2. Implement First Species validator (most important)
3. Test validators thoroughly

### Phase 3: First Species Complete
1. Integration tests for FirstSpecies
2. E2E tests with rule validation for First Species
3. Multiple test scenarios (keys, modes, lengths)

### Phase 4: Other Species
1. Implement validators for Species 2-5
2. Integration tests for each species
3. E2E tests with rule validation for each species

### Phase 5: Advanced
1. Snapshot testing
2. Property-based testing
3. Performance benchmarks
4. Browser E2E tests (if needed)

## Notes

- All tests use deterministic seeding for reproducibility
- Each test file should be independent and runnable in isolation
- Validators are separate from the main codebase for maintainability
- Focus on First Species first as it's the foundation for all others
- E2E rule validation is the most critical part - ensures musical correctness
