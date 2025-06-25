// /home/lbartolessi/Workspaces/Eventuality/vite.config.ts
import { defineConfig } from 'vite';
// Recommended for resolving entry paths
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      // Define multiple entry points for the library build
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'), // Main library entry point
        demo: path.resolve(__dirname, 'examples/node/demo.ts'), // Demo entry point
      },
      // Global variable names for UMD builds (not strictly needed if UMD is removed, but good practice for potential future use)
      name: 'EventualityEventbus', // This name will be used for the 'index' entry if UMD was enabled
      // Define output formats (only ES for simplicity)
      formats: ['es'],
      // Use a function to define filenames based on the format and entry name
      fileName: (format, entryName) => {
        // For ES module consumers, output directly with .js extension
        return `${entryName}.js`; // e.g., index.js, demo.js
      },
    },
    rollupOptions: {
      // Make sure to externalize deps that shouldn't be bundled
      // into your library
      // e.g., ['vue']
      external: [],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        // e.g., { vue: 'Vue' }
        globals: {},
      },
    },
    outDir: 'dist',
    // Cleans the dist directory before building
    emptyOutDir: true,
  },
  // Type generation is handled by the 'tsc' command in your package.json's build script,
  // so the Vite plugin for type generation is removed to avoid redundancy.
  // No additional Vite configuration is typically needed to serve `examples`
  // if they are set up as a separate Vite application or static site.
});
