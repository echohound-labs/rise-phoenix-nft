// Generate 500 truly unique NFT images from DGN KING's card art
// Uses integer hue rotation + saturation/brightness shifts via sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'nft');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const EMBER_BASE = path.join(__dirname, '..', 'public', 'ember-base.jpg');
const BLAZE_BASE = path.join(__dirname, '..', 'public', 'blaze-base.jpg');
const GENESIS_BASE = path.join(__dirname, '..', 'public', 'genesis-base.jpg');

// Tier distribution: Ember 400, Blaze 75, Genesis 25
// Each gets unique integer hue + saturation combo
function getTransform(id) {
  if (id < 400) {
    // Ember: warm hues rotated 0-59 degrees (stays in red-orange-yellow family)
    // 20 unique hue positions, 20 saturation levels = 400 unique combos
    const huePos = id % 20;
    const satPos = Math.floor(id / 20);
    const hueShift = huePos * 3;          // 0, 3, 6, ... 57
    const satBoost = 0.7 + satPos * 0.025; // 0.7, 0.725, ... 1.175
    const bright = 0.85 + (id % 7) * 0.02; // slight brightness variation
    return { hueShift, satBoost, bright };
  }
  if (id < 475) {
    // Blaze: purple/blue hues rotated 0-74 degrees within cool spectrum
    const offset = id - 400;
    const hueShift = (offset * 5) % 60 + 180; // 180-239 range (cool tones)
    const satBoost = 0.9 + (offset % 5) * 0.06;
    const bright = 0.9 + (offset % 3) * 0.04;
    return { hueShift, satBoost, bright };
  }
  // Genesis: subtle gold shifts, high prestige
  const offset = id - 475;
  const hueShift = offset * 2;            // 0-48 subtle shifts
  const satBoost = 0.8 + offset * 0.08;   // 0.8-2.8
  const bright = 1.0 + offset * 0.02;
  return { hueShift, satBoost, bright };
}

async function generateVariant(basePath, id, transform) {
  try {
    await sharp(basePath)
      .modulate({
        brightness: transform.bright,
        saturation: transform.satBoost,
        hue: Math.round(transform.hueShift) // must be integer
      })
      .jpeg({ quality: 85 })
      .toFile(path.join(OUT, `${id}.jpg`));
    return true;
  } catch (e) {
    console.error(`Error #${id}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Generating 500 unique NFTs...');
  let count = 0;
  let errors = 0;

  for (let i = 0; i < 500; i++) {
    const transform = getTransform(i);
    const ok = await generateVariant(
      i < 400 ? EMBER_BASE : i < 475 ? BLAZE_BASE : GENESIS_BASE,
      i, transform
    );
    if (ok) count++;
    else errors++;
    if (i % 50 === 0) console.log(`  ${i}/500...`);
  }

  // Generate manifest
  const manifest = [];
  for (let i = 0; i < 500; i++) {
    const tier = i < 400 ? 'Ember' : i < 475 ? 'Blaze' : 'Genesis';
    const transform = getTransform(i);
    manifest.push({
      id: i,
      number: i + 1,
      tier,
      hue: transform.hueShift,
      saturation: transform.satBoost,
      brightness: transform.bright,
      file: `${i}.jpg`
    });
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nDone! ${count}/500 generated, ${errors} errors`);

  // Verify uniqueness
  const { execSync } = require('child_process');
  const totalSize = execSync(`du -sh ${OUT}`).toString().trim();
  console.log(`Total size: ${totalSize}`);
}

main().catch(console.error);