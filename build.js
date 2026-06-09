import { build } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const __dirname = resolve();

async function runBuilds() {
  console.log('Starting production builds...');

  // Ensure dist folder exists
  if (!existsSync('dist')) {
    mkdirSync('dist');
  }

  // 1. Build Popup (React app)
  console.log('Building Popup UI...');
  await build({
    configFile: false,
    plugins: [
      react(),
      tailwindcss()
    ],
    root: resolve(__dirname, 'src/popup'),
    base: './',
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html')
        }
      }
    }
  });

  // 2. Build Background Service Worker
  console.log('Building Background Service Worker...');
  await build({
    configFile: false,
    build: {
      emptyOutDir: false,
      outDir: resolve(__dirname, 'dist'),
      lib: {
        entry: resolve(__dirname, 'src/background/index.ts'),
        formats: ['iife'],
        name: 'background',
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          extend: true
        }
      }
    }
  });

  // 3. Build Content Script (CSS and JS)
  console.log('Building Content Script...');
  await build({
    configFile: false,
    plugins: [
      tailwindcss()
    ],
    build: {
      emptyOutDir: false,
      outDir: resolve(__dirname, 'dist'),
      lib: {
        entry: resolve(__dirname, 'src/content/index.ts'),
        formats: ['iife'],
        name: 'content',
        fileName: () => 'content.js',
      },
      cssCodeSplit: false,
      rollupOptions: {
        output: {
          extend: true,
          assetFileNames: (assetInfo) => {
            // Force the output CSS name to be content.css
            if (assetInfo.name === 'style.css' || assetInfo.name === 'index.css') {
              return 'content.css';
            }
            return assetInfo.name;
          }
        }
      }
    }
  });

  // 4. Copy manifest.json and icons
  console.log('Copying static assets (manifest, icons)...');
  copyFileSync(
    resolve(__dirname, 'src/manifest.json'),
    resolve(__dirname, 'dist/manifest.json')
  );

  // Copy icons folder if it exists
  const distIconsDir = resolve(__dirname, 'dist/icons');
  if (!existsSync(distIconsDir)) {
    mkdirSync(distIconsDir, { recursive: true });
  }

  const icons = ['icon16.png', 'icon32.png', 'icon48.png', 'icon128.png'];
  for (const icon of icons) {
    const srcPath = resolve(__dirname, `src/icons/${icon}`);
    if (existsSync(srcPath)) {
      copyFileSync(srcPath, resolve(__dirname, `dist/icons/${icon}`));
    }
  }

  console.log('Build system completed successfully!');
}

runBuilds().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
