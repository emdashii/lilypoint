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

-   bun test # Run all tests
-   bun test tests/unit # Unit tests only
-   bun test tests/integration # Integration tests only
-   bun test tests/e2e # E2E tests only

### Project Structure

-   `src/` - TypeScript source code
-   `public/` - Static web assets
-   `dist/` - Build output directory
-   `Music Project/` - Legacy C++ implementation

### Colors

Colors from https://stephango.com/flexoki

### Credits

Caleb Nelson and Elliott Claus wrote the original C++ implementation of the music generator, at
https://github.com/emdashii/counterpoint_generator Elliott Claus wrote the TypeScript implementation of the music
generator, at https://github.com/emdahsii/lilypoint, which can be found at https://lilypoint.mazzaella.com/
