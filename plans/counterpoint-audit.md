# Counterpoint logic audit and practice roadmap

Audited September 8, 2026, starting at commit `21f94aa`. This report describes the TypeScript generator and the repairs made in this working tree.

## Verdict

Keep the shared species solver. Its separation between rhythm slots and pitch search is the right foundation. Keep chromatic piano-key numbers for sounding pitch, too. The mapping is consistent: A0 is 0, middle C is 39, an octave is 12, and MIDI pitch is the stored value plus 21. Moving to MIDI numbers alone would not simplify the musical rules.

The project is reasonably close to producing useful short exercises. It is not yet a dependable strict-counterpoint generator across all five species and lengths. The main remaining work is a better cantus generator, explicit musical rule profiles, and a richer representation of spelling and time. These can extend the current solver without replacing the application.

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

The present `Note` stores a sounding pitch, a LilyPond duration denominator, and a tie flag. That works for the current generated rhythms, which use undotted powers of two. `TimedEvent` already moves in the right direction by describing absolute musical time.

Extend this incrementally:

1. **Pitch:** retain chromatic pitch and preserve letter, accidental, and written octave when they become available. Compute both diatonic distance and semitone distance for intervals. C to D-sharp and C to E-flat must remain distinguishable. Key-based spelling is sufficient for today's diatonic output, but cannot represent arbitrary chromatic intentions.
2. **Time:** store onset and duration in integer ticks for the supported rhythm vocabulary, or reduced fractions if arbitrary tuplets become a requirement. Do not store a LilyPond denominator as the core duration. Dotted notes, rests, and tied spans need explicit representation.
3. **Analysis:** derive sounding intervals at the union of both voices' change times. Preserve the difference between a new attack and a held note. Rhythmic rules count attacks or notated subdivisions; harmonic rules inspect everything that sounds.
4. **Notation:** derive LilyPond tokens from the musical events. Split at barlines and carry ties in this adapter. Avoid changing what `Note.length` means between generation and export, as `adjustForSpeciesRhythm()` currently does.

The useful public operations would be generation from a request, validation of the resulting score, and export. Species should supply rhythm and rule configuration to those operations. Keep rule details inside those modules. `src/species.ts` still contains old rule flags and helper implementations that the modern species' `generateCounterpoint()` methods bypass; they should not remain a second apparent specification.

## Remaining work, in order

All findings below have high confidence from source inspection. Effort estimates include tests: S is hours, M is roughly one or two days, and L is several days or more. These are estimates, not commitments.

| Priority | Finding and evidence | Impact | Effort / change risk |
| --- | --- | --- | --- |
| 1 | `src/cantus-firmus.ts`, `generate()`, requires ascent through the first half of a melody drawn from seven pitches. | Long phrases cannot sustain that ascent. With C major and seeds 1 through 20, all 32-note and 64-note samples used the fallback and each length produced only one distinct melody. Eight-note samples produced 10 distinct melodies and 16-note samples produced 20. | M / medium |
| 2 | `src/species-engine.ts`, `syncopatedSlots()`, makes every tie optional. Fourth-species validation checks counts and dissonances but does not require sustained syncopation. | A consonant second-species line can pass as fourth species. The opening rest, cadential suspension, and limits on breaking species are not enforced. | M / medium |
| 3 | `getScaleDegrees()` in both cantus generation and `WritePhrase` uses natural minor exclusively. | Minor cadences cannot select a raised leading tone. The project's own species definitions require this when approaching the tonic from below. | M / medium, requires spelling-aware intervals |
| 4 | `src/validation/species-rules.ts`, `alignToCantusFirmus()`, aligns only at counterpoint onsets. `checkRatio()` counts events without enforcing their exact durations. | A held counterpoint note can miss a changing harmony; irregular subdivisions can satisfy an event-count rule. This matters when adding dotted rhythms, imported scores, and sustained events. | M / medium |
| 5 | `SpeciesEngine` primarily checks local semitone constraints. Validators mirror a limited subset, with thresholds widened for textbook examples. | Passing tests does not prove a strict exercise. Direct approaches to perfect intervals, melodic recovery, characteristic cadence patterns, and species-specific metric restrictions need an explicit policy. | L / high if changed without a written profile |
| 6 | `WritePhrase.setSeed()` replaces global `Math.random`; generation returns without a final independent validation gate. | Other generators and tests share hidden random state. Generator/validator drift can reach export. | M / low to medium |

For priority 1, replace forced ascent and rejection sampling with a bounded cantus search. Reserve one peak in a chosen middle region, prune illegal melodic moves, and plan the final approach before filling the interior. Return search failure explicitly if no valid melody fits. The current conservative fallback prevents unchecked output, but is not a satisfactory source of varied practice pieces.

For priorities 2 through 5, write separate profiles for strict student exercises and the more permissive historical examples. Keep the Fux fixtures, but do not make every exception a general permission. Pair positive examples with deliberately invalid examples that differ in one musical fact. A passing fixture suite alone cannot identify an overly permissive validator.

## Piano-practice release target

Start with a bounded release: two voices, 8 to 16 cantus notes, a documented rule profile, reproducible major-key exercises, and reliable score export. Add strict minor cadences and the remaining species as their tests meet the same standard.

The current duration arithmetic correctly fills the requested number of measures. However, it places one cantus note per denominator beat: in 4/4, third species becomes sixteenths over quarters. This is a deliberate rhythmic reduction rather than the whole-note cantus used in the fixtures. Give the user control over cantus pulse and tempo, with explicit handling of compound meter.

For piano use, prioritize:

- A piano staff with configurable clefs and comfortable ranges for each hand. Both exported voices currently use treble clef, which can be valid for the current register but is not a complete piano-layout policy.
- Downloadable `.ly`, rendered PDF, and MIDI with tempo. The exporter emits a MIDI block, but the page currently downloads `.txt` and hands rendering to a Hacklily iframe.
- An exposed seed, repeat/regenerate controls, and phrase-level validation diagnostics. Reject invalid output before presenting it as a finished exercise.
- A small set of reviewed practice scores, checked by playing them and inspecting the engraving. Mathematical validity does not establish musical variety or comfortable hand movement.

Accept a release when its documented key/species/length combinations pass seeded generation tests, bad-score fixtures fail for the intended reason, exports preserve pitch and timing, and representative PDF/MIDI artifacts have been rendered and reviewed. Treat long-phrase variety and search time as measured requirements.

## Verification and scope

The baseline had 401 passing tests. After the repairs, all 424 tests pass, typechecking passes, and the production build passes. The expanded suite includes 260 generated cases across 13 keys, two modes, five species, and two seeds, plus exhaustive piano-pitch export round trips and targeted negative tests. Run `bun test`, `bun run typecheck`, and `bun run build` from the repository root.

This audit covers the modern TypeScript pitch, rhythm, cantus, solver, validation, and export paths. It does not certify the legacy C++ or negative-species algorithms, hosted rendering, browser behavior, PDF engraving, or MIDI playback. No dependency/security audit or exhaustive search-space proof was performed. The C++ random-number header mirrors TypeScript's current routine, despite its xorshift32 name. Cross-implementation output equivalence was not tested; README now describes the harness without promising exact text equality after spelling repairs.

## Musical references

[Open Music Theory: intervals](https://viva.pressbooks.pub/openmusictheory/chapter/intervals/) distinguishes interval number and quality, which supports preserving pitch spelling in addition to chromatic distance.

[Open Music Theory: fourth species](https://openmusictheory.github.io/fourthSpecies.html) describes consonant preparation, a tied accented dissonance, and consonant resolution down by step. It also documents the opening rest, restricted breaks in syncopation, and the cadential suspension. The repairs enforce the basic preparation/resolution requirements; the broader species policy remains roadmap work.
