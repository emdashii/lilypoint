# lilypoint

Website for counterpoint generator using LilyPond

## Development

### Prerequisites

-   Node.js (v18 or higher)
-   npm

### Setup

```bash
npm install
```

### Development Commands

-   **Build**: `npm run build` - Compiles TypeScript and prepares files for production
-   **Development**: `npm run dev` - Runs TypeScript compiler in watch mode

### Running Locally

After building the project, you need to serve the `dist/` folder with a web server:

**Option 1 - Using Node.js (http-server):**
```bash
npm run build
npx http-server dist -p 8000
```
Then open http://localhost:8000 in your browser.

**Option 2 - Using Python:**
```bash
npm run build
cd dist
python -m http.server 8000
```
Then open http://localhost:8000 in your browser.

**Option 3 - Using any other web server:**
Point your web server to the `dist/` directory after running `npm run build`.

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
