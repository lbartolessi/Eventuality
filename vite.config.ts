// /home/lbartolessi/Workspaces/Eventuality/vite.config.ts
import { defineConfig } from 'vite';
// Recommended for resolving entry paths
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      // Point to your main entry file for the library
      entry: path.resolve(__dirname, 'src/index.ts'),
      // Global variable name for UMD build
      name: 'EventualityEventbus',
      // Define output formats and their respective file names
      formats: ['es', 'umd'],
      fileName: (format) => {
        if (format === 'es') {
          // Output for ES module consumers
          return 'index.js';
        }
        // For UMD or other formats, you can use a different naming scheme
        return `eventuality.${format}.js`;
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
