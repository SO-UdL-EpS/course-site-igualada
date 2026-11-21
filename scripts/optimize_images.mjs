#!/usr/bin/env node
/**
 * Optimise PNG figures across `assets/`, `blocs/`, and `course-info/`
 * without altering their pixel dimensions or file paths.
 *
 * Uses 8-bit indexed palette quantisation (quality 90, compressionLevel 9)
 * for diagram/slide PNGs and only overwrites a file when the re-encoded
 * output is at least 15 % smaller than the original.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const TARGET_DIRS = ["assets", "blocs", "course-info"];
const MIN_BYTES = 120 * 1024; // only touch PNGs > 120 KiB

function walkPngs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkPngs(full, out);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) out.push(full);
  }
  return out;
}

const files = TARGET_DIRS.flatMap(d => walkPngs(path.join(ROOT, d)));
let totalBefore = 0;
let totalAfter = 0;
let optimizedCount = 0;

for (const file of files) {
  const before = fs.statSync(file).size;
  totalBefore += before;
  if (before < MIN_BYTES) {
    totalAfter += before;
    continue;
  }
  try {
    const buf = await sharp(file)
      .png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 })
      .toBuffer();
    if (buf.length < before * 0.85) {
      fs.writeFileSync(file, buf);
      totalAfter += buf.length;
      optimizedCount++;
    } else {
      totalAfter += before;
    }
  } catch {
    totalAfter += before;
  }
}

const savedMiB = ((totalBefore - totalAfter) / (1024 * 1024)).toFixed(2);
const pct = totalBefore ? (((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1) : "0.0";
console.log(
  `Optimised ${optimizedCount}/${files.length} PNGs: ${(totalBefore / (1024 * 1024)).toFixed(2)} MiB -> ${(totalAfter / (1024 * 1024)).toFixed(2)} MiB (saved ${savedMiB} MiB, -${pct}%)`
);
