# Known-correct counterpoint example fixtures (.ly)

Each `.ly` file in this directory is a known-correct two-voice species counterpoint
example, transcribed from a public-domain or open-licensed source. These are the
ground truth the test-suite validators are calibrated against.

## File naming

`species<N>-<source>-<key>.ly`, e.g. `species1-fux-d-dorian.ly`,
`species2-omt-c-major.ly`.

## Required structure

The file must be BOTH valid LilyPond AND parseable by the simple parser in
`tests/helpers/ly-parser.ts`, so it must follow these constraints exactly:

1. Metadata header comments (all required, one per line, at the top):

```
% species: 1                  <- 1..5
% source: Fux, Gradus ad Parnassum (1725), Figure 5 (Mann trans.)
% source-url: https://...     <- where it was taken from
% mode: d dorian              <- tonic + mode (dorian/phrygian/lydian/mixolydian/aeolian/ionian/major/minor)
% cf-position: lower          <- lower | upper (which voice holds the cantus firmus)
% time: 4/4
```

2. Exactly two music variables, `cantusFirmus` and `counterpoint`, each a single
   `{ ... }` block on one or more lines containing ONLY:
   - Absolute-pitch Dutch note names (LilyPond default): `c d e f g a b`,
     accidentals `is`/`es` (e.g. `cis`, `bes`), octave marks `'` and `,`.
     NO `\relative` mode. Middle C is `c'`.
   - Durations `1`, `2`, `4` immediately after the pitch (e.g. `d'1`, `a'2`, `g'4`).
     A pitch without a duration repeats the previous duration (standard LilyPond) —
     but PREFER writing the duration on every note.
   - Ties: `~` immediately after the duration (fourth/fifth species suspensions).
   - Rests: `r2`, `r4` (e.g. the opening half rest in species 2/4).
   - Optional bar checks `|` — ignored by the parser.
   - Optionally `\clef "treble"` / `\clef "bass"` and `\time 4/4` at the start of
     the block (ignored by the parser aside from validation).

3. A closing `\score` block so the file compiles standalone with LilyPond:

```
\score {
  <<
    \new Staff { \counterpoint }
    \new Staff { \cantusFirmus }
  >>
  \layout {}
}
```

(If `cf-position: upper`, put `\cantusFirmus` in the first/upper staff instead.)

## Musical requirements

- Two voices only; the cantus firmus is in whole notes (semibreves), one per measure.
- Species ratio must be correct for the declared species:
  - 1: whole notes against whole notes (1:1)
  - 2: half notes against whole notes (2:1; may start with a half rest; final note whole)
  - 3: quarter notes against whole notes (4:1; final note whole)
  - 4: syncopated/tied half notes against whole notes; starts with half rest; final note whole
  - 5: florid — mixture of the above
- Transcribe the source EXACTLY (pitches, durations, ties, accidentals such as
  musica ficta / raised leading tones). Do not "correct" the source.
