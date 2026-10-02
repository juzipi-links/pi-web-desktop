import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sharp = require('/home/juzipi/.local/lib/node_modules/@agegr/pi-web/node_modules/sharp');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcPng = path.join(rootDir, 'assets', 'icon.png');
const outIco = path.join(rootDir, 'assets', 'icon.ico');
const outBuildIco = path.join(rootDir, 'build', 'icon.ico');
const outTrayIco = path.join(rootDir, 'assets', 'tray.ico');

async function createIco(sourcePng, outputPath, sizes = [256, 128, 64, 48, 32, 16]) {
  const images = [];
  for (const size of sizes) {
    const pngBuffer = await sharp(sourcePng)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    images.push({ size, buffer: pngBuffer });
  }

  // Header: 6 bytes
  // Count: images.length
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(images.length, 4); // number of images

  let offset = 6 + images.length * 16;
  const dirEntries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 0); // width
    entry.writeUInt8(img.size >= 256 ? 0 : img.size, 1); // height
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bit count
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  const outBuffer = Buffer.concat([
    header,
    ...dirEntries,
    ...images.map(img => img.buffer)
  ]);

  fs.writeFileSync(outputPath, outBuffer);
  console.log(`Generated: ${outputPath} (${outBuffer.length} bytes, sizes: ${sizes.join(', ')})`);
}

async function main() {
  await createIco(srcPng, outIco);
  fs.copyFileSync(outIco, outBuildIco);
  await createIco(srcPng, outTrayIco, [32, 16]);
  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
