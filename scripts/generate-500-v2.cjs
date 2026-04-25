// Generate 500 unique NFT images from DGN KING's card art
// Ember: #0-399, Blaze: #400-474, Genesis: #475-499
// Each gets a unique color tint overlay via sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'public', 'nft');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const EMBER_BASE = path.join(__dirname, '..', 'public', 'ember-base.jpg');
const BLAZE_BASE = path.join(__dirname, '..', 'public', 'blaze-base.jpg');
const GENESIS_BASE = path.join(__dirname, '..', 'public', 'genesis-base.jpg');

// Color variants per tier - unique tint overlays
// Ember: warm fire colors (reds, oranges, ambers)
const EMBER_COLORS = [
  { name: 'Crimson Fire', r: 220, g: 40, b: 20 },
  { name: 'Blood Orange', r: 200, g: 60, b: 10 },
  { name: 'Amber Glow', r: 230, g: 120, b: 20 },
  { name: 'Scarlet Blaze', r: 210, g: 30, b: 30 },
  { name: 'Burnt Sienna', r: 180, g: 80, b: 30 },
  { name: 'Deep Cherry', r: 170, g: 20, b: 40 },
  { name: 'Solar Flare', r: 240, g: 150, b: 30 },
  { name: 'Molten Core', r: 200, g: 50, b: 10 },
  { name: 'Copper Ember', r: 190, g: 100, b: 40 },
  { name: 'Inferno Red', r: 230, g: 30, b: 15 },
  { name: 'Rust Flame', r: 180, g: 70, b: 25 },
  { name: 'Tangerine', r: 230, g: 130, b: 25 },
  { name: 'Mahogany Fire', r: 160, g: 40, b: 30 },
  { name: 'Vermillion', r: 240, g: 50, b: 20 },
  { name: 'Ember Rose', r: 200, g: 60, b: 60 },
  { name: 'Lava Rock', r: 170, g: 40, b: 20 },
  { name: 'Fire Opal', r: 220, g: 80, b: 40 },
  { name: 'Dragon Breath', r: 210, g: 50, b: 25 },
  { name: 'Sunset Forge', r: 230, g: 100, b: 30 },
  { name: 'Volcanic Ash', r: 160, g: 50, b: 30 },
];

// Blaze: cosmic/electric colors (purples, blues, magentas)
const BLAZE_COLORS = [
  { name: 'Cosmic Violet', r: 140, g: 30, b: 200 },
  { name: 'Electric Indigo', r: 80, g: 40, b: 220 },
  { name: 'Nebula Purple', r: 120, g: 20, b: 180 },
  { name: 'Plasma Pink', r: 200, g: 40, b: 180 },
  { name: 'Dark Magenta', r: 170, g: 20, b: 140 },
  { name: 'Ultraviolet', r: 100, g: 30, b: 230 },
  { name: 'Storm Indigo', r: 70, g: 50, b: 200 },
  { name: 'Void Purple', r: 90, g: 20, b: 170 },
  { name: 'Lightning Blue', r: 60, g: 100, b: 230 },
  { name: 'Quantum Violet', r: 130, g: 40, b: 210 },
  { name: 'Mystic Lilac', r: 160, g: 60, b: 190 },
  { name: 'Deep Cosmos', r: 80, g: 20, b: 160 },
  { name: 'Arc Flash', r: 100, g: 80, b: 220 },
  { name: 'Phantom Violet', r: 110, g: 30, b: 190 },
  { name: 'Prism Indigo', r: 90, g: 60, b: 200 },
];

// Genesis: divine/legendary colors (golds, whites, rainbows)
const GENESIS_COLORS = [
  { name: 'Divine Gold', r: 255, g: 210, b: 50 },
  { name: 'Starfire', r: 255, g: 240, b: 200 },
  { name: 'Rose Gold', r: 230, g: 170, b: 140 },
  { name: 'Celestial White', r: 230, g: 230, b: 250 },
  { name: 'Holographic', r: 200, g: 200, b: 255 },
];

const OPACITY = 0.15; // Tint overlay strength - enough to shift color but keep card art visible

async function generateVariant(basePath, id, colorObj) {
  try {
    const base = sharp(basePath);
    const { width, height } = await base.metadata();

    // Create color overlay
    const overlay = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: {
          r: colorObj.r,
          g: colorObj.g,
          b: colorObj.b,
          alpha: OPACITY
        }
      }
    }).png().toBuffer();

    await base
      .composite([{
        input: overlay,
        blend: 'over'
      }])
      .jpeg({ quality: 85 })
      .toFile(path.join(OUT, `${id}.jpg`));

    return true;
  } catch (e) {
    console.error(`Error generating #${id}: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Generating 500 NFTs with tier-based color variants...');
  let count = 0;

  // Ember: 0-399 (400 NFTs)
  for (let i = 0; i < 400; i++) {
    const colorObj = EMBER_COLORS[i % EMBER_COLORS.length];
    const ok = await generateVariant(EMBER_BASE, i, colorObj);
    if (ok) count++;
    if (i % 50 === 0) console.log(`  ${i}/500...`);
  }

  // Blaze: 400-474 (75 NFTs)
  for (let i = 400; i < 475; i++) {
    const colorObj = BLAZE_COLORS[(i - 400) % BLAZE_COLORS.length];
    const ok = await generateVariant(BLAZE_BASE, i, colorObj);
    if (ok) count++;
  }

  // Genesis: 475-499 (25 NFTs)
  for (let i = 475; i < 500; i++) {
    const colorObj = GENESIS_COLORS[(i - 475) % GENESIS_COLORS.length];
    const ok = await generateVariant(GENESIS_BASE, i, colorObj);
    if (ok) count++;
  }

  // Generate manifest
  const manifest = [];
  for (let i = 0; i < 500; i++) {
    let tier, colorObj;
    if (i < 400) {
      tier = 'Ember';
      colorObj = EMBER_COLORS[i % EMBER_COLORS.length];
    } else if (i < 475) {
      tier = 'Blaze';
      colorObj = BLAZE_COLORS[(i - 400) % BLAZE_COLORS.length];
    } else {
      tier = 'Genesis';
      colorObj = GENESIS_COLORS[(i - 475) % GENESIS_COLORS.length];
    }
    manifest.push({
      id: i,
      number: i + 1,
      tier,
      variant: colorObj.name,
      file: `${i}.jpg`
    });
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Done! ${count}/500 NFTs generated + manifest`);
  console.log(`Output: ${OUT}`);
}

main().catch(console.error);