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
const entrypoints = [
  path.join(srcDir, 'background.ts'),
  path.join(srcDir, 'content.ts'),
  path.join(srcDir, 'injected.ts')
];

// Check if entrypoints exist
entrypoints.forEach(file => {
    if (!fs.existsSync(file)) {
        console.error(`Error: Entrypoint not found: ${file}`);
        process.exit(1);
    }
});

const result = await build({
  entrypoints,
  outdir: outDir,
  target: 'browser',
  format: 'esm',
  splitting: false, // Keep individual files for simplicity in manifest mapping
});

if (!result.success) {
  console.error("Build failed:", result.logs);
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
