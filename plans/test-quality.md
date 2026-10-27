# Test quality and coverage

Run `bun run test:all` for the TypeScript typecheck, Bun suite, build, and the five built-module scripts in `test/` (`proto-generation`, `proto-score-state`, `proto-smoke`, `site-static`, `exercise-audit`). The GitHub Actions workflow runs the same command with Bun 1.3.14 when started manually through **Actions → Tests → Run workflow**. Its only trigger is `workflow_dispatch`; pushes and pull-request updates do not start CI. `bun test` alone excludes those scripts.

## Coverage retained

- `tests/e2e/known-examples.test.ts` validates the 25 published Fux transcriptions.
- `tests/e2e/generated-species.test.ts` checks generated phrases across seeds, keys, and lengths against the historical validators.
- `tests/integration/audit-regressions.test.ts` and `audit-roadmap.test.ts` cover every supported key and mode, student rules, cadence spelling, seed isolation, stored events, and validation before publishing a phrase.
- `tests/integration/species-structure.test.ts` checks species ratios, ties, and mixed durations. `write-phrase.test.ts` checks how the writer scales durations to meter.
- Notation tests preserve key signatures, piano pitch indices, enharmonic spelling, octave suffixes, and the 88-pitch LilyPond round trip.

## Cleanup decisions

Locations below are relative to `tests/`, except the smoke script. A group names the original `describe` block; the titles identify individual removals where useful.

| Location | Decision and remaining proof |
| --- | --- |
| `unit/cantus-firmus.test.ts`, `constructor`, `getNotes`, `getKeyInfo`, `getLength` | Replace field and shape probes with generated musical contracts. Length, tonic, diatonic membership, and cadence now have explicit expected values for all 13 keys in both modes. Key signature details remain in `key.test.ts`. |
| Same file, `generate` and `validation rules` | Replace the weak climax and diversity assertions with exactly one maximum and distinct melodies across fixed seeds. Check no repeated adjacent pitch, tritone, seventh, or leap larger than an octave. Retain seeded reproducibility and extend the laws beyond C major. |
| Same file, `should use predominantly stepwise motion` | Remove the unseeded 30% assertion. The comment's 50% threshold had no documented quantitative musical contract. A stepwise cadence and prohibited intervals are asserted directly; no claim is made about the fraction of steps in the whole melody. |
| `unit/phrase.test.ts`, all field round-trip groups | Replace with one mode and key signature invariant through construction, `setMode`, and `setKey`, including explicit accidentals. Move the corresponding `phrase mode and key signature have one source of truth` test out of `integration/audit-regressions.test.ts` to avoid duplication. |
| `unit/note.test.ts`, `constructor`, getters, setters, `getTied / setTied`, `Note immutability behavior` | Replace field echoes with stored-event expectations for default quarter duration and independent edits. A previous snapshot must stay unchanged after pitch, length, and tie edits. Keep the `NoteType enum` piano map. Invalid notes and durations remain covered in `audit-regressions.test.ts`; spelling, rests, and ties remain covered by the export and stored-event tests. |
| `unit/helper-functions.test.ts`, `verboseLog` | Remove both no-throw probes: they did not exercise enabled logging or assert output. Logging output has no musical or file obligation in this suite. Keep the full suffix map and invalid-octave failures. Remove `should handle boundary octaves correctly`, whose three exact expectations already appear in the full map. |
| `unit/export-to-file.test.ts`, `constructor`, `addPhrase`, `setTitle`, `setComposer` | Remove existence and no-throw probes. Header output proves the title and composer setters; phrase definitions and multiple-phrase output prove `addPhrase`. The constructor with all parameters is also exercised through the built browser adapter in `test/proto-smoke.mjs`. |
| Same file, `setFileName` | Replace all three probes with writes into unique temporary directories for both `score` and `score.txt`. Require exactly `score.txt`, read its contents, and compare them with the returned LilyPond score. |
| Same file, `should convert notes to LilyPond format` | Remove the quote and letter search. Existing octave and duration tests assert exact tokens; the filename tests also require `c''4 d''4 e''4`, and the 88-pitch round trip checks sounding pitches. |
| `integration/write-phrase.test.ts`, species 1–5 shape groups and `Common properties` | Remove nonempty voices, `instanceof Note`, defined key strings, and repeated ratio probes. `species-structure.test.ts` protects the ratios, ties, and mixed durations. Generated-species and audit grids validate actual music in different keys and lengths. The remaining writer tests protect meter scaling and equal voice durations with instance seeds. |
| Same file, species 4 duration title | Rename to describe the asserted rhythm: eighths followed by a held final quarter in 4/4. |
| `unit/key.test.ts`, `should handle all major/minor keys` | Replace defined-name checks with explicit LilyPond tonic, accidental type, mode, and complete signature for every supported key, including Gb minor's double flats. |
| `test/proto-smoke.mjs` | Replace printed output and the printed URL equality with failing assertions. Check URL settings, ABC voices and durations, MusicXML measures, signatures and durations, LilyPond pitch round trips, printable chunks, and playback time. Expected durations come from the three input meters and bar counts. |

## New negative cases

`unit/species-validator.test.ts` now covers third- and fifth-species downbeat dissonances and weak dissonances approached by leap. A legal passing-note control must avoid the same rule violation. Broken cases must report `dissonanceTreatment` at the intended onset, without a structure or ratio error masking the path.

Third species also rejects a 2:1 rhythm with equal total duration. Fifth species accepts a prepared suspension and rejects its upward resolution while retaining valid ties and mixed durations. These are historical-profile cases; student-profile restrictions remain in `audit-roadmap.test.ts`.

## Verification evidence

The cleanup landed in commit `0e8cd00` (1 Oct 2026). Re-audited 26 Oct 2026 against `c9692fc`: every decision below is reflected in the tracked tests, `bun test` reports 390 passing (the later exercise-audit work added three), and `bun run test:all` passes with five built-module scripts. The fault-injection results below were not re-run in that audit.

The cleanup started from 441 passing tests and four passing built-module scripts on Windows with Bun 1.3.14. The revised suite has 387 passing tests. `bun run test:all` passed, including typechecking, building, and all four built-module scripts. `bun install --frozen-lockfile` and `git diff --check` also passed. The previous smoke script printed output but did not assert most of it.

A fresh copy containing only tracked files and the new workflow and coverage document also passed `bun install --frozen-lockfile` and `bun run test:all`. The export and enharmonic tests now create `tests/temp` themselves; the fresh copy started without that untracked directory, `node_modules`, or `dist`.

Six faults were applied separately in a temporary copy of `src/`, `tests/`, `dist/`, and `test/`. The affected tests and smoke script passed in that copy before mutation. Each fault produced exit 1 with an assertion failure, and the original file was restored before the next fault. Production files in the working tree were not mutated.

| Reversible fault | Command and observed failure |
| --- | --- |
| Duplicate an interior maximum immediately before returning generated cantus | `bun test tests/unit/cantus-firmus.test.ts -t 'C major:'`; unique-climax assertion fails. |
| Bypass dissonance treatment for species 3 and 5 | `bun test tests/unit/species-validator.test.ts -t 'Species [35] dissonance'`; all four passing-note and leap cases fail to find the required violation. |
| Bypass filename suffix normalization | `bun test tests/unit/export-to-file.test.ts -t 'writes score with'`; directory contains `score` instead of `score.txt`. |
| Change the first seed during URL decoding in built `core.js` | `bun test/proto-smoke.mjs`; URL settings comparison fails. |
| Add 32 ticks to each MusicXML note duration in built `notation.js` | `bun test/proto-smoke.mjs`; exported duration sum fails. |
| Omit the lower ABC voice's music in built `notation.js` | `bun test/proto-smoke.mjs`; lower voice duration sum fails. |

## Limits

The validators and generation grids prove musical rules, not browser interaction. The built-module scripts exercise real modules and static files without a DOM, audio device, or engraving engine. Visual engraving and complete UI journeys still need a browser pass.

The optional `test/compare-outputs.sh` is outside `test:all` and CI. The supplied audit reported CRLF parsing and a WSL attempt to execute a MinGW binary; this cleanup does not establish a working C++ comparison environment. The script compares raw LilyPond text, so the documented F spelling difference remains a failure. Treat that comparison as a separate compatibility check, not evidence that the modern generation suite passes.

The first manual Ubuntu CI run [passed on commit `0e8cd00`](https://github.com/emdashii/lilypoint/actions/runs/36876652471). The workflow now uses `actions/checkout@v7`, whose action runtime is Node 24; its first hosted run [passed on 16 Oct 2026](https://github.com/emdashii/lilypoint/actions/runs/38960676825). A quantitative whole-melody stepwise-motion guarantee remains unspecified.
