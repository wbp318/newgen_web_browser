/**
 * Rasterizes assets/icon.svg into the platform icon files electron-builder expects.
 * Run via `npm run build:icons`. Hooked into `predist` so installer builds get fresh icons.
 */
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const png2icons = require('png2icons');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'assets', 'icon.svg');
const OUT_DIR = path.join(ROOT, 'build');
const OUT_PNG = path.join(OUT_DIR, 'icon.png');
const OUT_ICO = path.join(OUT_DIR, 'icon.ico');
const OUT_ICNS = path.join(OUT_DIR, 'icon.icns');

async function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`Missing source SVG: ${SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const png = await sharp(SRC, { density: 384 })
    .resize(1024, 1024, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  fs.writeFileSync(OUT_PNG, png);

  const ico = png2icons.createICO(png, png2icons.BICUBIC, 0, false);
  if (!ico) throw new Error('Failed to generate ICO');
  fs.writeFileSync(OUT_ICO, ico);

  const icns = png2icons.createICNS(png, png2icons.BICUBIC, 0);
  if (!icns) throw new Error('Failed to generate ICNS');
  fs.writeFileSync(OUT_ICNS, icns);

  for (const f of [OUT_PNG, OUT_ICO, OUT_ICNS]) {
    console.log(`wrote ${path.relative(ROOT, f)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
