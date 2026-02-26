# lilypoint

Website for counterpoint generator using LilyPond

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

Both implementations share the same xorshift32 random number generator, so given the same seed they produce identical LilyPond note sequences for the three legacy species.

To run the comparison:

```bash
# Build the C++ implementation (requires g++)
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
