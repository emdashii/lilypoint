# lilypoint

Website for counterpoint generator using LilyPond

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

-   `bun test` — Run all tests
-   `bun test tests/unit` — Unit tests only
-   `bun test tests/integration` — Integration tests only
-   `bun test tests/e2e` — E2E tests only

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
generator, at https://github.com/emdahsii/lilypoint, which can be found at https://lilypoint.mazzaella.com/


## Counterpoint generation and stored scores

Modern generation uses the [student rule profile](plans/counterpoint-profiles.md) and validates the assembled score before returning it. The [audit](plans/counterpoint-audit.md) records completed repairs, verification, and the remaining piano-practice release work.

For isolated, repeatable generation, call `writer.setSeed(seed)` on a `WritePhrase` instance before `writeThePhrase()`. Static `WritePhrase.setSeed(seed)` remains a default for callers that use the older interface. Neither method replaces `Math.random`.

Notes store duration in integer ticks, with 4096 ticks per whole note, and preserve explicit pitch spelling when available. Use `getPitch()` for nullable sounding pitch and `getDurationTicks()` for time. `voiceToMusicalEvents()` and `musicalEventsToVoice()` in `src/validation/timed-events.ts` serialize and restore onset, duration, pitch, spelling, rests, and ties. The exporter splits spans at barlines without changing the stored notes.
