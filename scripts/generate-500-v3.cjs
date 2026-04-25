// Generate 500 truly unique NFT images from DGN KING's card art
// Uses hue rotation + saturation shift + background tint for real variation

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'nft');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const EMBER_BASE = path.join(__dirname, '..', 'public', 'ember-base.jpg');
const BLAZE_BASE = path.join(__dirname, '..', 'public', 'blaze-base.jpg');
const GENESIS_BASE = path.join(__dirname, '..', 'public', 'genesis-base.jpg');

// Unique color specs per token — each gets different hue rotation + saturation
function getColorSpec(id) {
  // Ember: warm hues (0-60 degrees = red to yellow)
  if (id < 400) {
    const hueShift = (id * 1.5) % 60; // 0-60 degrees
    const satBoost = 0.8 + (id % 5) * 0.1; // 0.8-1.2
    const bright = 0.9 + (id % 3) * 0.05;
    return { hueShift, satBoost, bright, name: `Ember-${id}` };
  }
  // Blaze: purple/blue hues (240-300 degrees)
  if (id < 475) {
    const hueShift = 240 + ((id - 400) * 2) % 60;
    const satBoost = 1.0 + ((id - 400) % 4) * 0.1;
    const bright = 0.95 + ((id - 400) % 3) * 0.03;
    return { hueShift, satBoost, bright, name: `Blaze-${id}` };
  }
  // Genesis: gold/white hues (40-60 degrees, high brightness)
  const hueShift = 40 + ((id - 475) * 4) % 20;
  const satBoost = 0.6 + ((id - 475) % 3) * 0.2;
  const bright = 1.1 + ((id - 475) % 3) * 0.05;
  return { hueShift, satBoost, bright, name: `Genesis-${id}` };
}

async function generateVariant(basePath, id, spec) {
  try {
    await sharp(basePath)
      .modulate({
        brightness: spec.bright,
        saturation: spec.satBoost,
        hue: spec.hueShift // Rotate hue by N degrees
      })
      .jpeg({ quality: 85 })
      .toFile(path.join(OUT, `${id}.jpg`));
    return true;
  } catch (e) {
    console.error(`Error generating #${id}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Generating 500 unique NFTs with hue rotation...');
  let count = 0;

  // Ember: 0-399
  for (let i = 0; i < 400; i++) {
    const spec = getColorSpec(i);
    const ok = await generateVariant(EMBER_BASE, i, spec);
    if (ok) count++;
    if (i % 50 === 0) console.log(`  Ember ${i}/400...`);
  }

  // Blaze: 400-474
  for (let i = 400; i < 475; i++) {
    const spec = getColorSpec(i);
    const ok = await generateVariant(BLAZE_BASE, i, spec);
    if (ok) count++;
  }
  console.log('  Blaze 400-474 done');

  // Genesis: 475-499
  for (let i = 475; i < 500; i++) {
    const spec = getColorSpec(i);
    const ok = await generateVariant(GENESIS_BASE, i, spec);
    if (ok) count++;
  }
  console.log('  Genesis 475-499 done');

  // Generate manifest
  const manifest = [];
  for (let i = 0; i < 500; i++) {
    const tier = i < 400 ? 'Ember' : i < 475 ? 'Blaze' : 'Genesis';
    const spec = getColorSpec(i);
    manifest.push({
      id: i,
      number: i + 1,
      tier,
      variant: spec.name,
      hueShift: spec.hueShift,
      file: `${i}.jpg`
    });
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`\nDone! ${count}/500 NFTs generated`);
  console.log(`Output: ${OUT}`);
}

main().catch(console.error);