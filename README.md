# lilypoint

Website for counterpoint generator using LilyPond

lilypoint is free to use. If it helps your practice, you can [support it on Ko-fi](https://ko-fi.com/mazzaella).

## Main website and hosting

The site is static. Netlify runs `bun run build` and publishes `dist/`; visitors generate music, play audio, and export scores in their browser. No backend or Netlify Functions are required.

- `/` is Write, based on prototype 07.
- `/practice.html` is Practice, based on prototype 08.
- `/about.html` explains the purpose, history, and earlier interfaces.
- `/write.html` redirects to `/` so older sheet links still open.
- `/classic.html` preserves the previous form-based generator and Hacklily viewer.
- `/proto/` keeps all eight prototypes at their existing URLs. Search engines are asked not to index that gallery.
- Unknown paths serve a site 404 page with links back to Write, Practice, and About.

The main room HTML files reuse `public/proto/shared/` modules. Keep their control markup in sync with 07 and 08 when changing shared behavior. Practice's `data-write-url` selects the main Write page at `/`; the prototype defaults to 07. Write stores a tab-scoped draft and encodes scores in URLs. Saved scores persist in local storage as versioned note snapshots. Export/import provides a JSON backup. Unsaved kept phrases last until navigation or reload. Fonts, rendering libraries, and piano samples need network access.

After building, run `bun test/proto-score-state.mjs`, `bun test/proto-generation.mjs`, `bun test/proto-smoke.mjs`, `bun test/site-static.mjs`, and `bun test/exercise-audit.mjs`. Serve `dist/` to check the Practice-to-Write handoff, exports, About links, and classic generator.

See the [counterpoint logic audit and practice roadmap](plans/counterpoint-audit.md) for the current musical guarantees, repaired defects, and remaining work before treating generated output as strict species exercises.

## Development

### Prerequisites

-   Bun (v1.0 or higher) - [Install Bun](https://bun.sh)

### Setup

```bash
bun install
```

### Development Commands

-   **Build**: `bun run build` - Compiles TypeScript and prepares files for production
-   **Development**: `bun run dev` - Runs TypeScript in watch mode with hot reloading
-   **Run directly**: `bun run src/main.ts` - Execute the CLI directly

### Running Locally

After building the project, you need to serve the `dist/` folder with a web server:

**Option 1 - Using Bun:**

```bash
bun run build
bunx serve dist -p 8000
```

Then open http://localhost:8000 in your browser.

**Option 2 - Using Python:**

```bash
bun run build
cd dist
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

**Option 3 - Using any other web server:** Point your web server to the `dist/` directory after running `bun run build`.

### Testing

-   `bun run test:all` — Typecheck, run the TypeScript suite, build, and run all seven built-module scripts. The manual GitHub Actions workflow runs this command.
-   `bun test` — Run the TypeScript suite; this excludes `test/*.mjs` and the optional C++ comparison.
-   `bun run test:built` — Run the seven built-module scripts against the current `dist/`. Build first when source or public files change. `test/exercise-audit.mjs` generates 40 exercises across every species and mode, exports LilyPond and MIDI, re-parses both, and checks every note with a separately written rule checker; see [the exercise audit](plans/exercise-audit.md). `test/practice-collection.mjs` and `test/practice-session.mjs` cover saved scores, backups, and saved practice sessions.
-   `bun test tests/unit` — Unit tests only
-   `bun test tests/integration` — Integration tests only
-   `bun test tests/e2e` — E2E tests only

The E2E tests check musical generation and published examples through validators. The built-module scripts check score state, recovery, exports, and static site files without driving a browser. See [test quality and coverage](plans/test-quality.md) for the cleanup decisions and remaining limits.

CI runs only when you start it manually. After `.github/workflows/test.yml` is pushed to the default branch, open **Actions → Tests → Run workflow**, select the branch to test, and start the run. Pushes and pull-request updates do not trigger it.

### Cross-Implementation Comparison (C++ vs TypeScript)

Both implementations share a seeded random-number routine. The comparison harness checks the three legacy species; modern species have no C++ equivalent. Exact LilyPond text can differ as TypeScript's key spelling improves, so inspect pitch and spelling differences separately.

To run the comparison:

```bash
# Build the C++ implementation (requires g++ and make in PATH)
# On Windows: install MinGW via chocolatey/winget and ensure
# g++ and make are on your PATH before running this
make -C "Music Project"

# Run comparison tests (defaults to seed 12345)
bash test/compare-outputs.sh [SEED]
```

You can also run each implementation individually in non-interactive mode:

```bash
# C++
"Music Project/counterpoint" --seed 12345 --key C --species 1 --measures 4 --beats 4 --output out.txt

# TypeScript
bun run src/compare-runner.ts --seed 12345 --key C --species -2 --measures 4 --beats 4 --output out.txt
```

**Species mapping between implementations:**

| C++ | TypeScript | Description |
|-----|-----------|-------------|
| 0   | -1        | Imitative counterpoint |
| 1   | -2        | First species |
| 2   | -4        | Second species |

> **Note:** Keys Ab, A, Bb, and B have an octave mismatch between implementations (`convertKeyToNote()` maps them to octave 3 in C++ and octave 4 in TypeScript). The comparison tests use keys C–G to avoid this.
>
> **Note:** Key=F will always produce 3 failures due to an enharmonic spelling difference: C++ names the note A#/Bb as `ais` while TypeScript names it `bes`. The notes are musically identical but notated differently, so these are not logic errors.

### Project Structure

-   `src/` - TypeScript source code
-   `src/compare-runner.ts` - Non-interactive CLI for comparison testing
-   `public/` - Static web assets
-   `dist/` - Build output directory
-   `Music Project/` - Legacy C++ implementation (build with `make`)
-   `test/compare-outputs.sh` - Cross-implementation comparison test harness

### Colors

Colors from https://stephango.com/flexoki

### Credits

Caleb Nelson and Elliott Claus wrote the original C++ implementation of the music generator, at
https://github.com/emdashii/counterpoint_generator Elliott Claus wrote the TypeScript implementation of the music
generator, at https://github.com/emdashii/lilypoint, which can be found at https://lilypoint.mazzaella.com/


## Counterpoint generation and stored scores

Modern generation uses the [student rule profile](plans/counterpoint-profiles.md) and validates the assembled score before returning it. The [audit](plans/counterpoint-audit.md) records completed repairs, verification, and the remaining piano-practice release work.

For isolated, repeatable generation, call `writer.setSeed(seed)` on a `WritePhrase` instance before `writeThePhrase()`. Static `WritePhrase.setSeed(seed)` remains a default for callers that use the older interface. Neither method replaces `Math.random`.

Notes store duration in integer ticks, with 4096 ticks per whole note, and preserve explicit pitch spelling when available. Use `getPitch()` for nullable sounding pitch and `getDurationTicks()` for time. `voiceToMusicalEvents()` and `musicalEventsToVoice()` in `src/validation/timed-events.ts` serialize and restore onset, duration, pitch, spelling, rests, and ties. The exporter splits spans at barlines without changing the stored notes.

## UI prototypes

`public/proto/` holds eight alternative interfaces that render notation in the browser. Build, serve `dist/`, and open `/proto/` to compare them.

The latest pair combines feedback on the first six: `07-studio.html` is an editable sheet with a live phrase editor; `08-lessons.html` opens lessons into an endless practice feed. Both use abcjs with separate staves, sampled piano, highlighting, and PDF export of complete systems. The practice collection stays in memory across filter and lesson changes; **Open as a sheet** transfers the exact notes to Write through a snapshot URL. Reloading clears unsaved lesson exercises; saved scores remain available.

The writing room keeps its exact score draft in session storage for the current browser tab. Plain navigation back to Write restores the phrases, order, tempos, title, composer, and selected phrase, including an intentionally empty sheet. A URL containing `p` or `score` intentionally replaces the draft.

Practice uses a continuous sheet with controls in the margin. Its filters allow multiple species, keys, modes, and lengths of 2, 4, 8, 12, or 16 bars. Random mode and random length enable every option in their row. Lessons follow explicit sequences until species, key, or mode filters change. Kept phrases are snapshots, so rerolling an exercise preserves the earlier kept version. Both rooms export LilyPond and MIDI. Print session includes completed exercises and kept phrases without duplicates.

In 07, tempo belongs to each phrase and is saved as an optional seventh field in its URL spec. Six-field links still load at 80 BPM. An appended phrase inherits the previous phrase's tempo. Tempo edits preserve the notes and update playback, PDF, MIDI, and LilyPond. Tempo and meter markings appear initially and at changes. `shared/midi.js` writes a conductor track because abcjs's MIDI writer omits inline tempo changes. Run `bun test/proto-score-state.mjs` after building to check URL compatibility, notation changes, MIDI tempo events, and the shared signature of C minor and E-flat major.

`shared/studio.js` owns their engraving, audio, and export behavior. ABC uses `%%score {1 2}` for separate staves. PDF bounds must retain each SVG's viewBox origin because later systems have nonzero vertical offsets. Export every SVG, not just the first one. See `CLAUDE.md` for the original prototypes' module layout.

The new rooms retry exhausted cantus searches with up to six consecutive seeds while preserving all musical settings. After building, run `bun test/proto-generation.mjs` for the seeded recovery regression check.

## Saved practice collection

Save an exercise by naming it and choosing **Save exercise**. In Write, **Save sheet** uses the piece title. Saved scores appear in both rooms. **Open in Write** and **Practice** restore stored notes without invoking the generator. **Practice sheet** returns the current sheet to Practice. Existing `?p=` links retain their six/seven-field format and generation behavior. Snapshot handoffs use `?score=`.

`shared/collection.js` owns schema version 1 and the generator version marker. Each snapshot stores requested/effective seeds, settings, key metadata, clefs, pitch spelling, integer timing, rests, and ties. Imports validate the entire file before merging. A failed storage write leaves saved entries unchanged and offers the proposed change through **Export collection**. Corrupt or unsupported stored files remain untouched and can be exported for recovery. **Delete** removes only the selected local score.

After building, run `bun test/practice-collection.mjs` for exact note/export restoration and storage/import failure cases.

## Deliberate practice sessions

Choose **Add to session** on saved scores, then edit their order, target tempos, repetitions, and notes. **Start session** begins again. **Resume session** restores the saved exercise, repetition, playback position, and settings without starting audio automatically. Sessions contain independent score copies, so deleting a collection entry does not remove its session exercise.

Practice offers upper/lower clefs, an inclusive first/last measure range, pause/resume, and a position slider. The range applies to each repetition. **Loop** repeats the complete session; a single-exercise session loops its selected measures. Count-in runs once when starting playback at the range beginning. Voice selection applies across exercise transitions. Tempo changes preserve the tick position and rebuild the audio buffer. **Exercise MIDI** downloads the complete focused score through the same exporter as Write, including its tempo, pitches, rests, and merged ties. Playback range, repetitions, and voice muting are rehearsal settings, not edits to the exported score.

`shared/practice-session.js` validates session backups and owns exercise/repetition advancement. Session progress uses `lilypoint-practice-session-v1` in local storage. It saves about once per second during playback and immediately on pause, settings changes, and navigation. A sudden browser/process crash can lose up to one second of position. **Export session** includes exact scores, settings, notes, and progress. Import validates the whole file before replacing the local session. Denied/quota-limited storage offers the pending session as a file; corrupt or unsupported stored data remains untouched and can be exported.

Audio startup and sample-loading errors leave playback ready to retry with **Play**. Sample loading has a 15-second timeout. The audio clock drives the slider, highlights, and range boundaries. Animation uses the current abcjs note timings, while score duration and seeking use the stored integer ticks.

After building, run `bun test/practice-session.mjs` for exact session restoration, range/progress rules, MIDI note/tie/timing parity, and failed imports/storage writes. See [overnight verification](plans/overnight-practice.md) for the browser evidence and remaining limits.
