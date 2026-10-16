# Exercise audit, October 16, 2026

Branch `exercise-audit`, starting from commit `c19179d`. The audit generated 40 exercises through the app's generation path (`generatePhrase` in `public/proto/shared/studio.js`), exported each as LilyPond and MIDI the way the Write room does, parsed both exports back, and checked every note against an independent implementation of the rules in [counterpoint-profiles.md](counterpoint-profiles.md) (profile tier) and the broader textbook rules in `src/counterpoint-species-definitions.md` (textbook tier). The script is `test/exercise-audit.mjs`; `bun run test:built` now runs it and fails on any profile violation.

## Matrix

Five species × two modes × four variants: 4/4 for 4 bars, 3/4 for 4 bars, 2/4 for 8 bars, and 6/8 for 2 bars, cycling through all 12 keys the app offers. Seeds 1000 through 1039. Each exercise is written to `tests/temp/exercise-audit/NN-sS-KEY-MODE-TIME-BARS.ly` and `.mid`, with `report.json` beside them.

## Export checks

All 40 LilyPond files declare the requested key, mode, and meter, and their merged sounding notes, spellings, and total durations match the generated events. All 40 MIDI files are format 1 with a conductor track carrying the tempo, meter, and key/mode meta events, and their note on/off pairs match the LilyPond notes. No export defects were found.

## Results

Profile tier: 0 violations in the 40 exercises, and 0 in a further 400-exercise sweep (seeds 20000 through 20399, all combinations ten times). Textbook tier: 92 findings in 32 of the 40 exercises, all in the counterpoint voice. No cantus line broke a textbook melodic rule.

The checker was validated against the historical Fux fixtures in `tests/fixtures/examples/`, where it reports the documented student-profile exceptions (crossing, spacing, leap recovery, modal cadences, syncopation breaks) and nothing on the D-dorian first-species model.

### Classification by rule

| rule | count | class | basis |
|---|---|---|---|
| skipsSameDirection | 26 | rule ambiguity | Definitions doc: do not move both parts in the same direction by skip. OMT: avoid combining similar motion with leaps. The profile only forbids similar motion into a perfect interval. |
| consecutiveSkips | 18 | rule ambiguity | Definitions doc: a second skip in the same direction must be smaller than the first. OMT states it for the cantus only. The profile requires contrary recovery only after leaps larger than a third. |
| tritoneOutline | 16 | rule ambiguity | Definitions doc: do not outline a tritone between turning points. Not in the profile for the counterpoint voice; the cantus is checked. |
| singleClimax | 14 | rule ambiguity | Definitions doc and OMT: the counterpoint should have a single climax. Not in the profile. Species 3 and 5 lines of 48 notes repeat the top pitch often. |
| leapIntoOctave | 10 | rule ambiguity | Definitions doc: do not leap into an octave or unison even in contrary motion. OMT does not state it. The profile only governs similar motion into perfects. |
| skipOutline | 4 | rule ambiguity | Definitions doc: consecutive skips must not outline a dissonance. Not in the profile; the cantus search checks tritone outlines but the counterpoint search does not. |
| intervalRun | 2 | rule ambiguity | Definitions doc and OMT first species: no more than three of the same interval in a row. Not in the profile. |
| repeatedNote | 1 | acceptable | OMT first species allows a single repeat and asks to avoid more. One repeat occurred. |
| accentedPerfects | 1 | rule ambiguity | Definitions doc and OMT second species: do not begin consecutive bars with the same perfect interval. The historical validator deliberately checks note-to-note only because Fux breaks the downbeat form (Gradus Figs. 36, 57, 77). |

The rule ambiguities are real differences between the two in-repo documents. `src/counterpoint-species-definitions.md` and Open Music Theory state them as rules; `plans/counterpoint-profiles.md` omits them and is the generation contract. This audit does not change musical rules. The owner can decide which, if any, to promote into the student profile; the checker already implements each one.

### Generator bug: degenerate cantus lines

The 400-exercise sweep showed 103 cantus lines of 12 to 16 notes made of only three distinct pitches, such as `ab bb ab bb ab bb ab bb ab bb ab bb c ab bb ab`. Histogram of distinct pitches per cantus before the fix: 3 → 103, 4 → 119, 5 → 125, 6 → 53. Open Music Theory's cantus guidance, which the profile references, requires "no repetition of motives or licks" and a smooth shape to the climax. The cause is in `CantusFirmus.generate()`: peak candidates included scale degrees 2 and 3, and every other note had to lie strictly below the peak, so a degree-3 peak forced a two-pitch oscillation. The repair narrows the search without adding a validator rule: lines of eight or more notes require a climax at least a fourth above the tonic and at least four distinct pitches, and a climax a tritone from the forced penultimate second degree is skipped because that line can never complete. After the fix the same 400-seed sweep gives 4 → 161, 5 → 185, 6 → 54, with no search failures and still zero profile violations. Seeded output changes, so textbook findings in the 40-exercise set rose from 92 to 161, mostly similar-motion skips and consecutive skips in the counterpoint, which now has a wider cantus to move against. The regression test in `tests/unit/cantus-firmus.test.ts` generates 12- and 16-note lines for every key, mode, and 20 seeds and fails on the previous code.

### Full table of textbook findings (40-exercise set)

| # | exercise | bar | rule | expected | actual | class |
|---|---|---|---|---|---|---|
| 1 | 01-s1-C-major-4-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 4, cf 3 | rule ambiguity |
| 2 | 01-s1-C-major-4-4-4bars | 4 | repeatedNote | upper: no immediate repetition | 50 repeated | acceptable |
| 3 | 02-s1-Db-major-3-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 8, cf 4 | rule ambiguity |
| 4 | 02-s1-Db-major-3-4-4bars | 3 | singleClimax | upper: one highest note | 3 notes at 52 | rule ambiguity |
| 5 | 03-s1-D-major-2-4-8bars | 4 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -4 | rule ambiguity |
| 6 | 03-s1-D-major-2-4-8bars | 3 | intervalRun | at most three equal intervals in a row | m3+1oct x4 | rule ambiguity |
| 7 | 03-s1-D-major-2-4-8bars | 3 | singleClimax | upper: one highest note | 3 notes at 60 | rule ambiguity |
| 8 | 03-s1-D-major-2-4-8bars | 6 | tritoneOutline | upper: no outlined tritone | 58 to 52 | rule ambiguity |
| 9 | 04-s1-Eb-major-6-8-2bars | 2 | tritoneOutline | upper: no outlined tritone | 59 to 53 | rule ambiguity |
| 10 | 05-s1-E-minor-4-4-4bars | 2 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 5 | rule ambiguity |
| 11 | 05-s1-E-minor-4-4-4bars | 4 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -3 | rule ambiguity |
| 12 | 05-s1-E-minor-4-4-4bars | 3 | tritoneOutline | upper: no outlined tritone | 51 to 57 | rule ambiguity |
| 13 | 06-s1-F-minor-3-4-4bars | 1 | leapIntoOctave | step into unison or octave | leap of 4 into P1+1oct | rule ambiguity |
| 14 | 07-s1-Fs-minor-2-4-8bars | 2 | skipsSameDirection | not both voices skipping the same way | cp -4, cf -3 | rule ambiguity |
| 15 | 07-s1-Fs-minor-2-4-8bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 5 | rule ambiguity |
| 16 | 07-s1-Fs-minor-2-4-8bars | 5 | skipsSameDirection | not both voices skipping the same way | cp 12, cf 5 | rule ambiguity |
| 17 | 07-s1-Fs-minor-2-4-8bars | 8 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -3 | rule ambiguity |
| 18 | 07-s1-Fs-minor-2-4-8bars | 4 | intervalRun | at most three equal intervals in a row | m3 x4 | rule ambiguity |
| 19 | 08-s1-G-minor-6-8-2bars | 1 | skipsSameDirection | not both voices skipping the same way | cp 8, cf 5 | rule ambiguity |
| 20 | 09-s2-Ab-major-4-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -5 | rule ambiguity |
| 21 | 09-s2-Ab-major-4-4-4bars | 1 | consecutiveSkips | upper: second skip smaller than the first | -4 then -5 | rule ambiguity |
| 22 | 09-s2-Ab-major-4-4-4bars | 4 | singleClimax | upper: one highest note | 2 notes at 51 | rule ambiguity |
| 23 | 09-s2-Ab-major-4-4-4bars | 2 | tritoneOutline | upper: no outlined tritone | 46 to 40 | rule ambiguity |
| 24 | 10-s2-A-major-3-4-4bars | 2 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 25 | 10-s2-A-major-3-4-4bars | 4 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 26 | 11-s2-Bb-major-2-4-8bars | 4 | accentedPerfects | no successive accented fifths or octaves | P5 then P5 | rule ambiguity |
| 27 | 11-s2-Bb-major-2-4-8bars | 7 | singleClimax | upper: one highest note | 2 notes at 54 | rule ambiguity |
| 28 | 12-s2-B-major-6-8-2bars | 1 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 29 | 13-s2-C-minor-4-4-4bars | 2 | leapIntoOctave | step into unison or octave | leap of 4 into P1+1oct | rule ambiguity |
| 30 | 13-s2-C-minor-4-4-4bars | 4 | leapIntoOctave | step into unison or octave | leap of 4 into P1+1oct | rule ambiguity |
| 31 | 14-s2-Db-minor-3-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 4 | rule ambiguity |
| 32 | 14-s2-Db-minor-3-4-4bars | 2 | consecutiveSkips | upper: second skip smaller than the first | 3 then 5 | rule ambiguity |
| 33 | 14-s2-Db-minor-3-4-4bars | 1 | tritoneOutline | upper: no outlined tritone | 54 to 48 | rule ambiguity |
| 34 | 16-s2-Eb-minor-6-8-2bars | 1 | consecutiveSkips | upper: second skip smaller than the first | 3 then 4 | rule ambiguity |
| 35 | 17-s3-E-major-4-4-4bars | 3 | consecutiveSkips | upper: second skip smaller than the first | -4 then -5 | rule ambiguity |
| 36 | 17-s3-E-major-4-4-4bars | 3 | consecutiveSkips | upper: second skip smaller than the first | 4 then 7 | rule ambiguity |
| 37 | 17-s3-E-major-4-4-4bars | 3 | skipOutline | upper: consecutive skips outline a consonance | M7 | rule ambiguity |
| 38 | 17-s3-E-major-4-4-4bars | 3 | consecutiveSkips | upper: second skip smaller than the first | -3 then -4 | rule ambiguity |
| 39 | 17-s3-E-major-4-4-4bars | 1 | tritoneOutline | upper: no outlined tritone | 48 to 54 | rule ambiguity |
| 40 | 17-s3-E-major-4-4-4bars | 4 | tritoneOutline | upper: no outlined tritone | 48 to 54 | rule ambiguity |
| 41 | 18-s3-F-major-3-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 4 | rule ambiguity |
| 42 | 18-s3-F-major-3-4-4bars | 1 | consecutiveSkips | upper: second skip smaller than the first | 4 then 5 | rule ambiguity |
| 43 | 18-s3-F-major-3-4-4bars | 2 | singleClimax | upper: one highest note | 3 notes at 63 | rule ambiguity |
| 44 | 19-s3-Fs-major-2-4-8bars | 4 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 5 | rule ambiguity |
| 45 | 19-s3-Fs-major-2-4-8bars | 8 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -3 | rule ambiguity |
| 46 | 19-s3-Fs-major-2-4-8bars | 6 | consecutiveSkips | upper: second skip smaller than the first | -3 then -4 | rule ambiguity |
| 47 | 19-s3-Fs-major-2-4-8bars | 7 | singleClimax | upper: one highest note | 2 notes at 64 | rule ambiguity |
| 48 | 20-s3-G-major-6-8-2bars | 2 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -4 | rule ambiguity |
| 49 | 20-s3-G-major-6-8-2bars | 2 | consecutiveSkips | upper: second skip smaller than the first | 3 then 3 | rule ambiguity |
| 50 | 20-s3-G-major-6-8-2bars | 2 | skipOutline | upper: consecutive skips outline a consonance | TT | rule ambiguity |
| 51 | 20-s3-G-major-6-8-2bars | 2 | tritoneOutline | upper: no outlined tritone | 45 to 39 | rule ambiguity |
| 52 | 21-s3-Ab-minor-4-4-4bars | 1 | singleClimax | upper: one highest note | 6 notes at 52 | rule ambiguity |
| 53 | 21-s3-Ab-minor-4-4-4bars | 4 | tritoneOutline | upper: no outlined tritone | 52 to 46 | rule ambiguity |
| 54 | 22-s3-A-minor-3-4-4bars | 1 | tritoneOutline | upper: no outlined tritone | 44 to 50 | rule ambiguity |
| 55 | 22-s3-A-minor-3-4-4bars | 2 | tritoneOutline | upper: no outlined tritone | 50 to 44 | rule ambiguity |
| 56 | 22-s3-A-minor-3-4-4bars | 4 | tritoneOutline | upper: no outlined tritone | 44 to 50 | rule ambiguity |
| 57 | 23-s3-Bb-minor-2-4-8bars | 1 | skipsSameDirection | not both voices skipping the same way | cp 12, cf 5 | rule ambiguity |
| 58 | 23-s3-Bb-minor-2-4-8bars | 5 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 4 | rule ambiguity |
| 59 | 23-s3-Bb-minor-2-4-8bars | 8 | skipsSameDirection | not both voices skipping the same way | cp -4, cf -3 | rule ambiguity |
| 60 | 23-s3-Bb-minor-2-4-8bars | 3 | singleClimax | upper: one highest note | 3 notes at 57 | rule ambiguity |
| 61 | 24-s3-B-minor-6-8-2bars | 2 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 62 | 24-s3-B-minor-6-8-2bars | 1 | consecutiveSkips | upper: second skip smaller than the first | -3 then -4 | rule ambiguity |
| 63 | 24-s3-B-minor-6-8-2bars | 2 | consecutiveSkips | upper: second skip smaller than the first | 3 then 4 | rule ambiguity |
| 64 | 24-s3-B-minor-6-8-2bars | 1 | singleClimax | upper: one highest note | 4 notes at 57 | rule ambiguity |
| 65 | 26-s4-Db-major-3-4-4bars | 3 | singleClimax | upper: one highest note | 2 notes at 57 | rule ambiguity |
| 66 | 26-s4-Db-major-3-4-4bars | 3 | tritoneOutline | upper: no outlined tritone | 57 to 51 | rule ambiguity |
| 67 | 30-s4-F-minor-3-4-4bars | 2 | singleClimax | upper: one highest note | 4 notes at 58 | rule ambiguity |
| 68 | 33-s5-Ab-major-4-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp -3, cf -5 | rule ambiguity |
| 69 | 33-s5-Ab-major-4-4-4bars | 1 | consecutiveSkips | upper: second skip smaller than the first | 4 then 7 | rule ambiguity |
| 70 | 33-s5-Ab-major-4-4-4bars | 1 | skipOutline | upper: consecutive skips outline a consonance | M7 | rule ambiguity |
| 71 | 33-s5-Ab-major-4-4-4bars | 3 | consecutiveSkips | upper: second skip smaller than the first | -3 then -5 | rule ambiguity |
| 72 | 33-s5-Ab-major-4-4-4bars | 2 | singleClimax | upper: one highest note | 2 notes at 49 | rule ambiguity |
| 73 | 33-s5-Ab-major-4-4-4bars | 1 | tritoneOutline | upper: no outlined tritone | 46 to 40 | rule ambiguity |
| 74 | 34-s5-A-major-3-4-4bars | 1 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 75 | 34-s5-A-major-3-4-4bars | 4 | skipsSameDirection | not both voices skipping the same way | cp -7, cf -4 | rule ambiguity |
| 76 | 34-s5-A-major-3-4-4bars | 1 | consecutiveSkips | upper: second skip smaller than the first | 3 then 4 | rule ambiguity |
| 77 | 35-s5-Bb-major-2-4-8bars | 5 | consecutiveSkips | upper: second skip smaller than the first | 4 then 7 | rule ambiguity |
| 78 | 35-s5-Bb-major-2-4-8bars | 5 | skipOutline | upper: consecutive skips outline a consonance | M7 | rule ambiguity |
| 79 | 36-s5-B-major-6-8-2bars | 1 | skipsSameDirection | not both voices skipping the same way | cp 7, cf 5 | rule ambiguity |
| 80 | 36-s5-B-major-6-8-2bars | 2 | skipsSameDirection | not both voices skipping the same way | cp 3, cf 4 | rule ambiguity |
| 81 | 36-s5-B-major-6-8-2bars | 2 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 82 | 36-s5-B-major-6-8-2bars | 2 | leapIntoOctave | step into unison or octave | leap of 3 into P1+1oct | rule ambiguity |
| 83 | 36-s5-B-major-6-8-2bars | 2 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 4 | rule ambiguity |
| 84 | 36-s5-B-major-6-8-2bars | 1 | singleClimax | upper: one highest note | 3 notes at 52 | rule ambiguity |
| 85 | 38-s5-Db-minor-3-4-4bars | 3 | skipsSameDirection | not both voices skipping the same way | cp 5, cf 5 | rule ambiguity |
| 86 | 38-s5-Db-minor-3-4-4bars | 2 | consecutiveSkips | upper: second skip smaller than the first | -4 then -5 | rule ambiguity |
| 87 | 38-s5-Db-minor-3-4-4bars | 3 | tritoneOutline | upper: no outlined tritone | 54 to 60 | rule ambiguity |
| 88 | 38-s5-Db-minor-3-4-4bars | 4 | tritoneOutline | upper: no outlined tritone | 57 to 51 | rule ambiguity |
| 89 | 39-s5-D-minor-2-4-8bars | 5 | skipsSameDirection | not both voices skipping the same way | cp -4, cf -3 | rule ambiguity |
| 90 | 39-s5-D-minor-2-4-8bars | 5 | consecutiveSkips | upper: second skip smaller than the first | -4 then -12 | rule ambiguity |
| 91 | 40-s5-Eb-minor-6-8-2bars | 2 | consecutiveSkips | upper: second skip smaller than the first | 3 then 4 | rule ambiguity |
| 92 | 40-s5-Eb-minor-6-8-2bars | 2 | singleClimax | upper: one highest note | 2 notes at 61 | rule ambiguity |

## Verification

`bun run typecheck`, `bun test` (389 pass), `bun run build`, and `bun run test:built` (five scripts, 40 exercises, 0 profile violations) passed on this branch after the fix. The 400-exercise sweep before and after the fix reported 0 profile violations.

## Limits

LilyPond is not installed on this machine, so the `.ly` files were parsed but not engraved. MIDI files were parsed byte by byte but not played. The checker and the generator's own validator were written separately, but both implement the same documents, so agreement proves consistency with the documents, not musical quality. The audit does not cover the legacy negative-species generators or the classic page.
