# Counterpoint logic audit and practice roadmap

Audited September 8, 2026, starting at commit `21f94aa`. Updated September 9 after completing the six numbered repairs and the incremental pitch/time extension.

## Verdict

Keep the shared species solver. Its separation between rhythm slots and pitch search is the right foundation. Keep chromatic piano-key numbers for sounding pitch, too. The mapping is consistent: A0 is 0, middle C is 39, an octave is 12, and MIDI pitch is the stored value plus 21. Moving to MIDI numbers alone would not simplify the musical rules.

The six numbered findings below are implemented and verified. Modern generation uses the documented [student rule profile](counterpoint-profiles.md), a bounded cantus search, request-local randomness, and an independent validation gate. Historical fixtures retain their separate permissive profile. The piano-practice release target remains separate work, particularly rendering, playback, hand ranges, and reviewed scores.

## Repairs completed

| Defect | Repair and verification |
| --- | --- |
| C, G, F, B-flat, E-flat, A-flat, and D-flat minor signatures were wrong. The G-minor test explicitly repeated the implementation's mistake. | Corrected the signatures against musical expectations, including double flats for theoretical keys. Added G-flat minor to match the existing key API. |
| Export always declared major mode. Key orientation alone misspelled E-sharp as F and C-flat as B. | Export uses the phrase's key mode and signature spellings. Tests preserve sounding pitch across all 88 keys in 26 key/mode combinations, including written octave changes and double accidentals. |
| Phrase mode and key mode could disagree. | Key metadata is now the source of truth. Changing phrase mode recomputes its signature. |
| Cantus validation repaired the penultimate note after checking the melody, invalidating earlier checks. Its fallback was never validated. | Establish the cadence before validation, make validation observational, and validate the fallback by the same rules. Added checks for finalized cadences, leaps, and unique peaks through 64 notes. |
| Reusing `WritePhrase` appended new notes and multiplied the old upper-voice durations again. | Each generation starts a new phrase. A regression checks both repeatability and preservation of the previously returned notes. |
| Invalid durations, pitches, meters, and lengths entered arithmetic unchecked. | Reject invalid piano pitches, non-power-of-two duration denominators, malformed meters, and invalid generation lengths. The beat-count setter now updates the written meter. |
| A tie flag could connect different pitches or cross a gap. Unequal voice lengths could pass validation. | Validate temporal continuity, equal voice duration, pitch bounds, and tie identity before musical rules. Tie merging respects adjacency. |
| Suspension classification did not require consonant preparation or resolution. | Require both. The search also requires a suspension's next step to land on a consonance. |

These repairs change seeded output. They do not establish exact compatibility with the legacy C++ generator.

## What to store

`Note` now stores integer duration ticks, sounding pitch, optional letter/accidental/written-octave spelling, an explicit rest flag, and a tie-to-next flag. There are 4096 ticks per whole note. `getPitch()` returns `null` for a rest. `getNote()` remains a legacy pitched-note accessor and must not be used to interpret rests.

`voiceToMusicalEvents()` produces serializable events with `onsetTicks`, `durationTicks`, nullable pitch, optional spelling, and ties. `musicalEventsToVoice()` restores them and rejects gaps, overlaps, fractional ticks, mismatched spelling, and invalid ties. `pitchInterval()` returns both signed semitone distance and signed diatonic distance, so C to D-sharp differs from C to E-flat.

The generation vocabulary still uses binary subdivisions. Stored durations can represent dotted notes and longer spans down to one tick. Arbitrary tuplets require a future rational-time representation. The `Note` constructor and `setLength()` retain the denominator-based compatibility interface; `getLength()` is the reciprocal duration and may be fractional for dotted notes. New code uses `getDurationTicks()` and `setDurationTicks()`.

The validator's `TimedEvent` remains a whole-note-unit adapter for existing fixtures. Harmonic alignment splits at the union of voice changes and reports whether each segment is an attack or a held note. Rhythm checks inspect original subdivisions rather than counting these harmonic segments. `lyDuration` is a compatibility hint and does not govern analysis.

The exporter derives LilyPond tokens from spelling and tick durations, splits spans at barlines, and inserts ties for sounding fragments. It preserves explicit rests and spelling. Score assembly scales copies of normalized solver notes, so it never changes the duration or meaning of a previously returned note.

Modern `Species` now supplies only scale and engine configuration. The old rule flags and helpers live under `src/legacy/`, where the negative-species implementations still use them.

## Numbered work completed, in order

| Priority | Original finding | Implemented result |
| --- | --- | --- |
| 1 | Forced ascent exhausted seven pitches and collapsed long phrases to one fallback. | Bounded backtracking reserves a middle-region peak and the re-do cadence, prunes melodic violations, and reports failure explicitly. The deterministic fallback is removed. |
| 2 | Optional ties allowed second-species lines to pass as fourth species. | Generation requires the opening rest, every interior tie, and a dissonant cadential suspension. The student validator checks these independently. Its initial policy permits zero breaks. Historical fixtures remain separate. |
| 3 | Natural minor could not supply a raised leading tone. | The solver can select raised degree seven at the final counterpoint approach and preserves its letter, including E-sharp in F-sharp minor. Spelled intervals reject augmented seconds. Generated cantus lines use re-do, which needs no alteration. |
| 4 | Onset-only harmony and event counts missed held dissonances and irregular durations. | Harmonic analysis includes cantus changes under held notes. Fixed-ratio rules require exact onset positions and durations. Suspension classification also rejects a resolution across a rest. |
| 5 | Rule thresholds conflated student exercises and historical exceptions. | The [profile document](counterpoint-profiles.md) defines separate policies. Student checks include direct perfect approaches, contrary-step recovery, cadence direction, spelling, metric restrictions, and fourth-species weak-beat perfect intervals. Positive and negative cases exercise each policy. |
| 6 | Seeding replaced global randomness and output lacked independent validation. | Each request shares an injected random source across its searches. Instance `setSeed()` isolates writers. Static `WritePhrase.setSeed()` is a compatibility default and never changes `Math.random`. An independent student validator checks the assembled score before the writer returns it. Failed candidates retry within a 50-attempt bound. |

The cantus search has a 100,000-node budget and the species search defaults to 200,000 nodes per attempt. A bounded search can fail explicitly. These limits do not promise success for every arbitrary cantus, length, or seed.

On September 9, C-major cantus generation with seeds 1 through 20 produced 16 distinct 8-note melodies, 18 distinct 16-note melodies, and 20 distinct melodies at both 32 and 64 notes. The 20-sample batches took 16, 3, 3, and 11 milliseconds respectively on this machine. These are local measurements, not performance guarantees. The regression requires at least 15 distinct melodies at each long length and exercises the actual generator.

## Piano-practice release target

The generator now covers two voices, a documented student profile, reproducible major and minor exercises, and all five species. The release work below still needs UI, rendering, playback, and human musical review. Automated coverage includes 8 and 16 cantus notes in all supported keys, modes, and species.

The current duration arithmetic correctly fills the requested number of measures. However, it places one cantus note per denominator beat: in 4/4, third species becomes sixteenths over quarters. This is a deliberate rhythmic reduction rather than the whole-note cantus used in the fixtures. Give the user control over cantus pulse and tempo, with explicit handling of compound meter.

For piano use, prioritize:

- A piano staff with configurable clefs and comfortable ranges for each hand. Both exported voices currently use treble clef, which can be valid for the current register but is not a complete piano-layout policy.
- Downloadable `.ly`, rendered PDF, and MIDI with tempo. The exporter emits a MIDI block, but the page currently downloads `.txt` and hands rendering to a Hacklily iframe.
- UI controls for the seed and repeat/regenerate actions, plus phrase-level validation diagnostics. The generation API already isolates instance seeds and rejects invalid output.
- A small set of reviewed practice scores, checked by playing them and inspecting the engraving. Mathematical validity does not establish musical variety or comfortable hand movement.

Accept a release when its documented key/species/length combinations pass seeded generation tests, bad-score fixtures fail for the intended reason, exports preserve pitch and timing, and representative PDF/MIDI artifacts have been rendered and reviewed. Treat long-phrase variety and search time as measured requirements.

## Verification and scope

The original baseline had 401 tests, and the first audit repairs brought it to 424. The completed roadmap has 440 passing tests. Typechecking and the production build pass. Run `bun test`, `bun run typecheck`, and `bun run build` from the repository root.

`tests/integration/audit-roadmap.test.ts` adds 260 student-profile generation cases across 13 keys, two modes, five species, and two lengths. It also checks pitch/time storage round trips, dotted and barline-split export, minor leading-tone spelling, long-cantus diversity, profile-specific negative cases, seed isolation, and rejection of deliberately corrupted solver output. Existing historical fixtures and exhaustive piano-pitch export tests still pass.

This audit covers the modern TypeScript pitch, rhythm, cantus, solver, validation, and export paths. It does not certify the legacy C++ or negative-species algorithms, hosted rendering, browser behavior, PDF engraving, or MIDI playback. No dependency/security audit or exhaustive search-space proof was performed. The C++ random-number header mirrors TypeScript's current routine, despite its xorshift32 name. Cross-implementation output equivalence was not tested; README now describes the harness without promising exact text equality after spelling repairs.

## Musical references

[Open Music Theory: intervals](https://viva.pressbooks.pub/openmusictheory/chapter/intervals/) distinguishes interval number and quality, which supports preserving pitch spelling in addition to chromatic distance.

[Open Music Theory: fourth species](https://openmusictheory.github.io/fourthSpecies.html) describes consonant preparation, a tied accented dissonance, and consonant resolution down by step. It also documents the opening rest, restricted breaks in syncopation, and the cadential suspension. The repairs enforce the basic preparation/resolution requirements; the broader species policy remains roadmap work.
