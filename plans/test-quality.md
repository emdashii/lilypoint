# Test quality and coverage

Run `bun run test:all` for the TypeScript typecheck, Bun suite, build, and the five built-module scripts in `test/` (`proto-generation`, `proto-score-state`, `proto-smoke`, `site-static`, `exercise-audit`). The GitHub Actions workflow runs the same command with Bun 1.3.14 when started manually through **Actions → Tests → Run workflow**. Its only trigger is `workflow_dispatch`; pushes and pull-request updates do not start CI. `bun test` alone excludes those scripts.

## Coverage retained

- `tests/e2e/known-examples.test.ts` validates the 25 published Fux transcriptions.
- `tests/e2e/generated-species.test.ts` checks generated phrases across seeds, keys, and lengths against the historical validators.
- `tests/integration/audit-roadmap.test.ts` validates generated phrases with the student profile in every supported key, mode, and species, and covers cadence spelling, seed isolation, stored events, and both halves of the publishing gate (solver drift, and a student-only spelling fault). `audit-regressions.test.ts` covers export spelling, input rejection, ties, suspensions, and regeneration.
- `tests/unit/cantus-firmus.test.ts` checks every key and mode at lengths 3 to 64 for the tonic frame, the degree-two cadence, one climax, diatonic pitches, legal leaps, and leap recovery, plus four distinct pitches in long lines and variety across seeds.
- `tests/integration/species-structure.test.ts` checks species ratios, ties, and mixed durations. `write-phrase.test.ts` checks how the writer scales durations to meter and fills the requested bars.
- `test/exercise-audit.mjs` checks 40 generated exercises against an independent checker; its self-check runs that checker on hand-written clean and broken exercises before trusting it. `test/proto-generation.mjs` injects exhausted cantus searches to prove the Write room's retry.
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

## Mutation audit, 3 November 2026

Branch `test-audit/2026-11-03`, starting from commit `669705c`. The question was which tests would catch a real regression in the generator and in `test/exercise-audit.mjs`, and which would not. Each test was judged by whether a deliberate fault made it fail.

Baseline before any edit: `bun run test:all` passed with Bun 1.4.4 on Linux (CI pins 1.3.14 and was not run). That covered 390 Bun tests across 15 files and all five built-module scripts.

Method: 56 generator faults and 36 audit-script faults, each made of one to three exact find-and-replace edits, were applied in a scratch `git worktree` of the commit under test. For each fault the harness ran `tsc --noEmit`, each Bun test file on its own (30 s limit; a timeout counts as caught), `bun run build`, and each built script (45 s limit). It then restored the worktree with `git checkout`. The first 16 before-run rows used one whole-suite run or a 90 s per-file limit; only E4 ever reached a limit. The working tree was never mutated. The fault list and runner are kept in [`plans/mutation-audit/`](mutation-audit/), so every row can be rerun. "Before" is commit `669705c`; "after" is this branch's final test code with production code unchanged. Test names are shortened: *regressions* and *roadmap* are `tests/integration/audit-regressions.test.ts` and `audit-roadmap.test.ts`, and `.mjs` names are the built scripts in `test/`.

### Generator faults

C rows are `src/cantus-firmus.ts`, E and R rows `src/species-engine.ts`, W rows `src/write-phrase.ts`, and A rows `public/proto/shared/core.js` and `studio.js`. `W1+` rows pair the disabled gate with a solver fault, to show what reaches the user if the gate is lost.

| ID | Fault | Caught before (`669705c`) | Caught after |
| --- | --- | --- | --- |
| C1 | drop the four-distinct-pitch minimum for long lines | **none** | **none** |
| C2 | restore the pre-fix peak set (degrees 2-6, no tritone filter, no pitch minimum) | cantus four-pitch | cantus per-key contract, cantus four-pitch |
| C3 | the climax pitch may recur away from the climax position | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +8 more | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +8 more |
| C4 | allow melodic tritone leaps | **none** | **none** |
| C5 | approach the final from the subtonic below instead of degree 2 | roadmap long-cantus variety, roadmap student grid, roadmap fourth-species rules, roadmap minor cadences, +18 more | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +18 more |
| C6 | drop leap recovery from the search | **none** | cantus per-key contract |
| C7 | shuffle with Math.random instead of the request random | regressions regenerate, cantus reproduce | regressions regenerate, cantus reproduce, proto-generation.mjs |
| C8 | low-entropy shuffle (only the last two choices swap) | generated-species (fourth), exercise-audit.mjs | generated-species (fourth), exercise-audit.mjs |
| C9 | allow repeated adjacent pitches | cantus per-key contract, cantus four-pitch | cantus per-key contract, cantus four-pitch |
| C10 | start on the dominant instead of the tonic | roadmap long-cantus variety, roadmap student grid, roadmap minor cadences, roadmap seed isolation, +15 more | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +14 more |
| C11 | three-note lines rejected | regressions cantus cadences | cantus per-key contract |
| C12 | lines over 16 notes skip the final tonic | regressions cantus cadences | cantus per-key contract |
| C13 | interior choices in a fixed order (seed only picks climax place and pitch) | roadmap long-cantus variety | cantus 15-of-20 |
| E1 | allow note-to-note parallel perfects | **none** | **none** |
| E2 | final may be any interval | **none** | **none** |
| E3 | allow struck dissonance on strong beats | roadmap student grid, write-phrase: Species 2: upper voice, write-phrase: Species 3: upper voice, write-phrase: all species, +6 more | generated-species (second), generated-species (third), generated-species (fifth), roadmap student grid, +7 more |
| E4 | never raise the minor leading tone (two files exceed the 30 s limit; run alone, the student grid, minor-cadence, and seed-isolation tests fail) | generated-species (timeout), audit-roadmap (timeout), regressions every-species, proto-generation.mjs, +3 more | generated-species (timeout), audit-roadmap (timeout), proto-generation.mjs, proto-score-state.mjs, +2 more |
| E5 | suspensions resolve upward | generated-species (fourth), generated-species (fifth), regressions every-species, roadmap student grid, +8 more | generated-species (fourth), generated-species (fifth), roadmap student grid, roadmap fourth-species rules, +8 more |
| E6 | chromatic pitches (scale filter disabled) | species-structure First, species-structure Second, species-structure Third, species-structure Fifth | species-structure First, species-structure Second, species-structure Third, species-structure Fifth |
| E7 | drop the student direct-perfect check | **none** | **none** |
| E8 | allow crossing below the cantus | **none** | **none** |
| E9 | spacing up to two octaves | generated-species (second), generated-species (third), generated-species (fifth), roadmap student grid, +4 more | generated-species (second), generated-species (third), generated-species (fifth), roadmap student grid, +5 more |
| E10 | passing tones may turn back (neighbors in species 2) | generated-species (second), write-phrase: Species 2: note lengths | generated-species (second), write-phrase: Species 2: note lengths |
| E11 | drop the student leap-recovery check | generated-species (first), generated-species (second), generated-species (third), generated-species (fifth), +11 more | generated-species (first), generated-species (second), generated-species (third), generated-species (fifth), +11 more |
| E12 | mid-phrase unisons allowed | **none** | **none** |
| R1 | florid species uses only the half-note template | species-structure Fifth | species-structure Fifth |
| R2 | fourth species without the cadential suspension | **none** | **none** |
| R3 | fourth species ties optional | generated-species (fourth), regressions every-species, roadmap student grid, roadmap minor cadences, +5 more | generated-species (fourth), roadmap student grid, roadmap minor cadences, write-phrase: Species 4: upper voice uses eighths and , +5 more |
| R4 | fourth species without the opening rest (first bar on the downbeat) | generated-species (fourth), regressions every-species, roadmap student grid, roadmap fourth-species rules, +7 more | generated-species (fourth), roadmap student grid, roadmap fourth-species rules, roadmap minor cadences, +7 more |
| R5 | florid quarter-note template written as eighths | exercise-audit.mjs | write-phrase: Species 5: upper voice divides each quar, exercise-audit.mjs |
| W1 | validation gate disabled | roadmap solver drift | roadmap solver drift, roadmap student gate |
| W2 | gate uses the historical profile | **none** | roadmap student gate |
| W3 | minor leading tone spelled from the key signature | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +8 more | generated-species (first), generated-species (second), generated-species (third), generated-species (fourth), +7 more |
| W4 | durations always scaled to quarter-note beats | write-phrase: Species 2: note lengths, proto-smoke.mjs, exercise-audit.mjs | write-phrase: Species 2: note lengths, proto-smoke.mjs, exercise-audit.mjs |
| W5 | one generation attempt | generated-species (fourth), regressions every-species, roadmap student grid, proto-smoke.mjs, exercise-audit.mjs | generated-species (fourth), roadmap student grid, proto-generation.mjs, proto-smoke.mjs, exercise-audit.mjs |
| W6 | species 3 request builds second species | generated-species (third), regressions every-species, regressions regenerate, roadmap student grid, +5 more | generated-species (third), regressions regenerate, roadmap student grid, roadmap minor cadences, +5 more |
| W7 | cantus length ignores the meter (always four per bar) | proto-smoke.mjs, exercise-audit.mjs | write-phrase: all species fill four bars of 3/4, proto-smoke.mjs, exercise-audit.mjs |
| W8 | instance seed ignored | roadmap seed isolation | roadmap seed isolation, proto-generation.mjs |
| W9b | key signature stays major when minor mode is requested | regressions every-species, roadmap student grid, roadmap minor cadences, proto-generation.mjs, +3 more | roadmap student grid, roadmap minor cadences, proto-generation.mjs, proto-score-state.mjs, +2 more |
| W10 | phrase one bar longer than requested | write-phrase: total duration, proto-smoke.mjs, exercise-audit.mjs | write-phrase: all species fill four bars of 4/4, write-phrase: all species fill four bars of 3/4, proto-smoke.mjs, exercise-audit.mjs |
| W1+C6 | Gate off and cantus drops leap recovery | roadmap student grid, roadmap fourth-species rules, roadmap solver drift, exercise-audit.mjs | roadmap student grid, roadmap fourth-species rules, roadmap solver drift, roadmap student gate, +2 more |
| W1+E1 | Gate off and engine allows parallel perfects | roadmap solver drift | roadmap solver drift, roadmap student gate |
| W1+E10 | Gate off and species-2 dissonances may turn back | generated-species (second), regressions every-species, roadmap student grid, roadmap solver drift, exercise-audit.mjs | generated-species (second), roadmap student grid, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| W1+E11 | Gate off and engine drops leap recovery | roadmap student grid, roadmap solver drift, exercise-audit.mjs | roadmap student grid, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| W1+E3 | Gate off and engine allows strong struck dissonance | generated-species (second), generated-species (third), generated-species (fifth), regressions every-species, +3 more | generated-species (second), generated-species (third), generated-species (fifth), roadmap student grid, +3 more |
| W1+E6 | Gate off and engine writes chromatic pitches | roadmap solver drift, species-structure First, species-structure Second, species-structure Third, species-structure Fifth | roadmap solver drift, roadmap student gate, species-structure First, species-structure Second, +2 more |
| W1+E7 | Gate off and engine drops the direct-perfect check | roadmap student grid, roadmap solver drift, exercise-audit.mjs | roadmap student grid, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| W1+E8 | Gate off and engine allows crossing | generated-species (first), regressions every-species, roadmap student grid, roadmap solver drift, exercise-audit.mjs | generated-species (first), roadmap student grid, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| W1+R1 | Gate off and florid rhythm uses only halves | roadmap solver drift, species-structure Fifth | roadmap solver drift, roadmap student gate, species-structure Fifth |
| W1+R2 | Gate off and no fourth-species cadential suspension | roadmap solver drift, exercise-audit.mjs | roadmap student grid, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| W1+R3 | Gate off and fourth-species ties optional | roadmap student grid, roadmap fourth-species rules, roadmap solver drift, exercise-audit.mjs | roadmap student grid, roadmap fourth-species rules, roadmap solver drift, roadmap student gate, exercise-audit.mjs |
| A1 | MIDI number off by one semitone | proto-score-state.mjs, exercise-audit.mjs | proto-score-state.mjs, exercise-audit.mjs |
| A2 | no retry after cantus search exhaustion | **none** | proto-generation.mjs |
| A3 | onsets not accumulated | exercise-audit.mjs | exercise-audit.mjs |
| A4 | total ticks assume four bars | proto-smoke.mjs, exercise-audit.mjs | proto-smoke.mjs, exercise-audit.mjs |
| A5 | retry reuses the same seed | **none** | proto-generation.mjs |

### Exercise-audit faults

Each `X-` row turns one profile check in `checkExercise` into a no-op. Before this audit, the self-check covered only the Fux D-dorian model and the Phrygian `leadingTone` case. Because the 40 generated exercises are valid, dropping any other check changed nothing, so the audit would have kept passing while blind to that rule.

| ID | Fault | Caught before (`669705c`) | Caught after |
| --- | --- | --- | --- |
| X-afterbeatPerfects | drop the afterbeatPerfects profile check | **none** | exercise-audit.mjs |
| X-allConsonant | drop the allConsonant profile check | **none** | exercise-audit.mjs |
| X-beginsPerfect | drop the beginsPerfect profile check | **none** | exercise-audit.mjs |
| X-cadence | drop the cadence profile check | **none** | exercise-audit.mjs |
| X-cadentialSuspension | drop the cadentialSuspension profile check | **none** | exercise-audit.mjs |
| X-cantusRhythm | drop the cantusRhythm profile check | **none** | exercise-audit.mjs |
| X-continuity | drop the continuity profile check | **none** | **none** |
| X-crossing | drop the crossing profile check | **none** | exercise-audit.mjs |
| X-directPerfect | drop the directPerfect profile check | **none** | exercise-audit.mjs |
| X-dissonanceTreatment | drop the dissonanceTreatment profile check | **none** | exercise-audit.mjs |
| X-dissonantLeap | drop the dissonantLeap profile check | **none** | exercise-audit.mjs |
| X-endsPerfect | drop the endsPerfect profile check | **none** | exercise-audit.mjs |
| X-equalDuration | drop the equalDuration profile check | **none** | exercise-audit.mjs |
| X-floridDuration | drop the floridDuration profile check | **none** | exercise-audit.mjs |
| X-harmonicSpelling | drop the harmonicSpelling profile check | **none** | exercise-audit.mjs |
| X-leadingTone | drop the leadingTone profile check | exercise-audit.mjs | exercise-audit.mjs |
| X-leadingToneSpelling | drop the leadingToneSpelling profile check | **none** | exercise-audit.mjs |
| X-leapRecovery | drop the leapRecovery profile check | **none** | exercise-audit.mjs |
| X-leapSize | drop the leapSize profile check | **none** | exercise-audit.mjs |
| X-melodicSpelling | drop the melodicSpelling profile check | **none** | exercise-audit.mjs |
| X-metric | drop the metric profile check | **none** | exercise-audit.mjs |
| X-parallelPerfect | drop the parallelPerfect profile check | **none** | exercise-audit.mjs |
| X-spacing | drop the spacing profile check | **none** | exercise-audit.mjs |
| X-strongDissonance | drop the strongDissonance profile check | **none** | exercise-audit.mjs |
| X-subdivision | drop the subdivision profile check | **none** | exercise-audit.mjs |
| X-syncopation | drop the syncopation profile check | **none** | exercise-audit.mjs |
| X-tie | drop the tie profile check | **none** | exercise-audit.mjs |
| XP1 | unmarked LilyPond octave read as octave 4 | exercise-audit.mjs | exercise-audit.mjs |
| XP2 | dots ignored | **none** | exercise-audit.mjs |
| XP3 | ties ignored | exercise-audit.mjs | exercise-audit.mjs |
| XP4 | suspensions never classified | exercise-audit.mjs | exercise-audit.mjs |
| XP5 | profile violations do not set the exit code | **none** | **none** |
| XP6 | passing tones classified as neighbors | exercise-audit.mjs | exercise-audit.mjs |
| XP7 | intervals reduced to one octave (spacing blind) | **none** | exercise-audit.mjs |
| XP8 | beat position measured from the bar start, not the cantus note | exercise-audit.mjs | exercise-audit.mjs |
| XP9 | LilyPond round-trip compares generator events to themselves | **none** | **none** |

### What changed

| Change | Location | Evidence |
| --- | --- | --- |
| Added a leap-recovery check (a leap larger than a third is followed by a contrary step) to the per-key cantus contract. Extended its lengths from 4, 8, and 16 to 3, 4, 8, 16, 32, and 64. | `tests/unit/cantus-firmus.test.ts` | C6 passed every test before and now fails all 26 key/mode tests. C11 (three-note lines rejected) and C12 (long lines skip the final tonic) were caught only by the removed regressions cantus test; both now fail all 26. |
| Added "length 32/64: twenty seeds give at least fifteen different melodies", moved from the roadmap. Seeds now go through `createRandom` instead of the static default seed. | same | C13 (seed only picks the climax) is caught by this test alone, before and after. The remaining "provide variation" test requires only two different melodies among three seeds and misses C13. |
| Removed "generated cantus cadences satisfy the melodic checks after finalization". | was `tests/integration/audit-regressions.test.ts` | Its C-major checks are a subset of the per-key contract above, which now covers its lengths. It caught C3, C5, C10, C11, and C12; all five fail the per-key contract after the change. |
| Removed "long cantus melodies vary across seeds". | was `tests/integration/audit-roadmap.test.ts` | Moved to the cantus unit test. It caught C3, C5, C10, and C13; all four are still caught (C13 by the moved test). |
| Removed the 13 "every species validates in KEY major and minor for two seeds" tests. Added seed 1 at two bars to the student grid. | was `audit-regressions.test.ts`; `audit-roadmap.test.ts` | They ran the historical validators over the same writer output that the roadmap grid checks with the stricter student profile (the student profile adds rules to every historical check). Seed 42 at two bars was the same input in both, and seed 1 is now in the grid. Each fault they caught (C5, C10, E4, E5, E11, R3, R4, W3, W5, W6, W9b, W1+E3, W1+E8, W1+E10) is caught by the student grid after the change. |
| Removed the unused `afterEach` that restored `Math.random`. | `audit-regressions.test.ts` | No test in the file replaces `Math.random`; it was setup with nothing to undo. |
| Added "the publishing gate applies student rules that the historical profile does not". The solver's first note is respelled enharmonically (C as B-sharp). The test first shows that the historical profile accepts the result and the student profile rejects it, then that the writer refuses to publish it. | `audit-roadmap.test.ts` | W2 (gate validates with the historical profile) passed every test before and fails only this test after. |
| Rewrote the Species 5 duration test. It used to accept any of 1, 2, 4, 8, 16, or 32; now upper notes must be quarters, eighths, or sixteenths (whole, half, or quarter subdivisions of the quarter-note cantus beat), over four seeds. | `tests/integration/write-phrase.test.ts` | R5 (florid quarters written as eighths) was caught only by `exercise-audit.mjs` and is now also caught by this test. |
| Replaced the 4/4 and 3/4 equal-duration tests with exact totals (16 and 12 quarter beats in both voices for every species). Removed the species-1-only "total duration should match expected beats". | same | W7 (cantus length ignores the meter) was caught only by the built scripts and is now caught by the 3/4 test. W10 (one bar too long) was caught by the removed test and is now caught by the 4/4 test. The old equal-duration assertions are implied by the exact totals. |
| Rewrote `proto-generation.mjs`. Its seeds (G minor, species 1 seed 6 and species 4 seed 1) no longer exhaust the cantus search. A sweep of 10,800 settings (12 keys, 2 modes, 5 species, 6 meter and length pairs, seeds 1–30) found no exhausted search, so the retry was never reached. The script now injects two exhausted searches at `CantusFirmus.prototype.generate`. It then checks the requested settings, the seed advanced by two, that the stored seed reproduces the phrase, that six failures give up, and that other errors are not retried. | `test/proto-generation.mjs` | A2 (no retry) and A5 (retry reuses the seed) passed every test before; both fail this script after. |
| Added 36 hand-written exercises to `selfCheck()`: 6 clean lines (one per species, plus A minor in species 1) and 30 broken lines. Each broken line must report exactly the listed set of profile rules. | `test/exercise-audit.mjs` | Every `X-` fault except `continuity` now fails the script, as do XP2 and XP7, which were not caught before. |

### Still not caught

- **C1, C4, E1.** No output changed: 780 cantus lines (13 keys, 2 modes, lengths 3, 4, 8, 12, 16, and 32, 5 seeds) and 260 two-bar phrases came out identical. C1 and C4 are blocked by the restricted peak set: no tritone pair falls below an allowed climax, and long lines already have three fixed pitches. E1 is blocked by the student direct-perfect rule, which already forbids similar motion into a perfect interval. These are equivalent faults on that grid, not gaps.
- **E2, E7, E8, E12, R2.** Each drops a rule from the search. The independent gate rejects the drifted attempt, and the writer retries with a new cantus. Output stayed valid (no errors on the grid), but 78, 182, 195, 221, and 13 of the 260 seeded phrases changed. With the gate also disabled, E7, E8, and R2 are caught (the W1+ rows). The real exposure is that **no test pins the music a seed produces**. Shared `?p=` links and drafts store only the seed, so a change like these silently changes a shared exercise. The October audit accepted such changes for a bug fix. Whether seed-to-music stability is a compatibility promise is an owner decision; no snapshot test was added without one.
- **XP5** (profile violations no longer set the exit code) and **XP9** (the audit's LilyPond round-trip compares generator events with themselves) remain undetected. Both only matter when another fault is present. The exporter has its own Bun tests (88-pitch round trip, spelling, ties); this audit did not mutate the exporter to confirm they cover what XP9 gives up.
- **X-continuity** is unreachable: `parseLyBlock` builds contiguous events, so a gap can never reach the check.

### Verification

Final branch: `bun run test:all` passed with Bun 1.4.4 on Linux, after `rm -rf dist`. That covered typecheck, 377 Bun tests across 15 files, the build, and all five built-module scripts; the exercise audit still reports 0 profile violations and 161 textbook findings. The count went from 390 to 377: the 13 every-species tests, the regressions cantus test, the roadmap variety test, and the species-1 duration test were removed, and two 15-of-20 tests and the student-gate test were added. Production code is unchanged. CI was not run for this branch.

The "after" column is the final test code, rerun against all 92 faults. Every added or rewritten test was shown to fail on the fault named in its row above, and every removed test's faults are caught after the change.

## Limits

The validators and generation grids prove musical rules, not browser interaction. The built-module scripts exercise real modules and static files without a DOM, audio device, or engraving engine. Visual engraving and complete UI journeys still need a browser pass.

The optional `test/compare-outputs.sh` is outside `test:all` and CI. The supplied audit reported CRLF parsing and a WSL attempt to execute a MinGW binary; this cleanup does not establish a working C++ comparison environment. The script compares raw LilyPond text, so the documented F spelling difference remains a failure. Treat that comparison as a separate compatibility check, not evidence that the modern generation suite passes.

The first manual Ubuntu CI run [passed on commit `0e8cd00`](https://github.com/emdashii/lilypoint/actions/runs/36876652471). The workflow now uses `actions/checkout@v7`, whose action runtime is Node 24; its first hosted run [passed on 16 Oct 2026](https://github.com/emdashii/lilypoint/actions/runs/38960676825). A quantitative whole-melody stepwise-motion guarantee remains unspecified.
