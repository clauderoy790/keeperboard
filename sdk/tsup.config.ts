import { defineConfig } from 'tsup';
import { execSync } from 'child_process';

const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: false, // Never generate source maps
  minify: isProduction,
  onSuccess: async () => {
    if (!isProduction) {
      console.log('Dev build - skipping obfuscation');
      return;
    }

    console.log('Production build - applying obfuscation...');

    // Run obfuscation script
    execSync('node scripts/obfuscate.js', { stdio: 'inherit' });
  },
});
