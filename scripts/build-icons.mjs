import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const source = 'assets/branding/moviemarks-icon.svg';
await mkdir('public/icons', { recursive: true });
await mkdir('artifacts/branding', { recursive: true });
const original = await sharp(source).metadata();
assert.equal(original.width, original.height, 'İkon kaynağı kare olmalı.');
assert(original.hasAlpha, 'Şeffaf köşeler korunmalı.');
const files = [];
for (const size of [16, 32, 48, 128, 256, 512]) {
  const path = `public/icons/icon-${size}.png`;
  await sharp(source).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path);
  const meta = await sharp(path).metadata();
  assert.equal(meta.width, size); assert.equal(meta.height, size); assert(meta.hasAlpha);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert(data[3] < 10, 'Köşe alfa kanalı şeffaf olmalı.');
  assert(data[(Math.floor(size / 2) * size + Math.floor(size / 2)) * info.channels + 3] >= 245, 'Orta kısım yeterince opak olmalı.');
  const gold = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const pixel = (y * size + x) * info.channels;
    if (data[pixel] > 180 && data[pixel + 1] > 120 && data[pixel + 2] < 175 && data[pixel + 3] > 150) gold.push([x, y]);
  }
  const glyphWidth = Math.max(...gold.map(p => p[0])) - Math.min(...gold.map(p => p[0])) + 1;
  const glyphHeight = Math.max(...gold.map(p => p[1])) - Math.min(...gold.map(p => p[1])) + 1;
  assert(glyphWidth >= size * .55 && glyphHeight >= size * .7, 'Küçük boyutta ana işaret yeterince büyük olmalı.');
  files.push({ path, size, alpha: meta.hasAlpha, glyphWidth, glyphHeight });
}
const tiles = await Promise.all([16,32,48,128].map(async (size, index) => ({ input: await sharp(`public/icons/icon-${size}.png`).resize(size * 2, size * 2, { kernel:'nearest' }).toBuffer(), left: 22 + index * 160, top: 28 })));
await sharp({ create: { width: 800, height: 310, channels: 4, background: '#e9edf4' } }).composite(tiles).png().toFile('artifacts/branding/icon-size-check.png');
await writeFile('artifacts/branding/validation.json', JSON.stringify({ source, width: original.width, height: original.height, files }, null, 2));
console.log('6 ikon boyutu, kare ölçüler ve alfa kanalı doğrulandı.');
