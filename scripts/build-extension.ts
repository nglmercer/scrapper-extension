import { build } from "bun";
import { createManifest } from "./manifest.config";
import fs from "fs";
import path from "path";

const platform = process.argv[2] as 'chrome' | 'firefox';

if (!['chrome', 'firefox'].includes(platform)) {
  console.error('Please specify platform: chrome or firefox');
  process.exit(1);
}

const outDir = `dist/platforms/${platform}`;
// Use absolute path for robustness or relative from CWD
const srcDir = `src/platforms/${platform}/extension`;

console.log(`Building extension for ${platform}...`);

// Ensure output directory exists
if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });

// Build steps
// Build steps
// Background - ESM (Service Worker / Module)
const bgResult = await build({
  entrypoints: [path.join(srcDir, 'background.ts')],
  outdir: outDir,
  target: 'browser',
  format: 'esm',
  naming: '[name].js', // background.js
});

if (!bgResult.success) {
  console.error("Background Build failed:", bgResult.logs);
  process.exit(1);
}

// Content scripts & Injected - IIFE (Isolated/Global scope safe)
const contentResult = await build({
  entrypoints: [
      path.join(srcDir, 'content.ts'),
      path.join(srcDir, 'injected.ts')
  ],
  outdir: outDir,
  target: 'browser',
  format: 'iife', 
  naming: '[name].js', // content.js, injected.js
});

if (!contentResult.success) {
  // Fallback to ESM if IIFE fails (older Bun versions might verify support) 
  // or just error out. 
  // Note: If 'iife' is not supported, this will fail. 
  // Assuming recent Bun version.
  console.error("Content/Injected Build failed:", contentResult.logs);
  process.exit(1);
}



// Generate Manifest
const manifest = createManifest(platform);
fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Popup build
await build({
  entrypoints: [path.join('src/popup/index.ts')],
  outdir: outDir,
  target: 'browser', 
  format: 'esm',
  naming: 'popup.js' // Explicitly name it
});

// Copy popup assets
const popupAssets = [
  { src: 'src/popup/index.html', dest: 'popup.html' },
  { src: 'src/popup/style.css', dest: 'style.css' }
];

popupAssets.forEach(asset => {
    if (fs.existsSync(asset.src)) {
        fs.copyFileSync(asset.src, path.join(outDir, asset.dest));
    } else {
        console.warn(`Warning: Asset ${asset.src} not found.`);
    }
});

// Copy icons
if (fs.existsSync('icons')) {
    fs.cpSync('icons', path.join(outDir, 'icons'), { recursive: true });
}

console.log(`Build complete for ${platform}! Output in ${outDir}`);
