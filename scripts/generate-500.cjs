#!/usr/bin/env node
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE_IMG = path.join(__dirname, '..', 'public', 'base-phoenix.jpg');
const OUT_DIR = path.join(__dirname, '..', 'public', 'nft');
const TOTAL = 500;

const PALETTES = [
  ['#1a0a00', '#ff4400', 'Inferno'],
  ['#0a001a', '#8800ff', 'Void'],
  ['#001a0a', '#00ff88', 'Emerald'],
  ['#1a000a', '#ff0088', 'Neon Rose'],
  ['#0a0a1a', '#0088ff', 'Deep Blue'],
  ['#1a1a00', '#ffaa00', 'Solar'],
  ['#0a1a1a', '#00ffff', 'Frost'],
  ['#1a0a1a', '#ff00ff', 'Plasma'],
  ['#001a1a', '#00ffaa', 'Toxic'],
  ['#1a0a0a', '#ff6644', 'Magma'],
  ['#0a0010', '#aa00ff', 'Ultraviolet'],
  ['#00100a', '#44ff00', 'Acid'],
  ['#100a00', '#ff8800', 'Amber'],
  ['#000a1a', '#4488ff', 'Ocean'],
  ['#1a0000', '#ff2222', 'Blood Fire'],
  ['#0a0a00', '#cccc00', 'Gold Dust'],
  ['#0a000a', '#ff44aa', 'Sakura'],
  ['#001a00', '#00ff44', 'Matrix'],
  ['#00001a', '#4444ff', 'Midnight'],
  ['#1a1a0a', '#ffdd00', 'Crown'],
  ['#0a1a00', '#88ff00', 'Lime Lightning'],
  ['#1a000a', '#ff4488', 'Crimson Pulse'],
  ['#000a0a', '#00aaff', 'Arctic'],
  ['#0a0a1a', '#aa44ff', 'Nebula'],
  ['#10000a', '#ff0066', 'Red Shift'],
  ['#00100a', '#00ffcc', 'Aurora'],
  ['#0a1000', '#ffcc00', 'Phoenix Gold'],
  ['#00001a', '#6644ff', 'Cosmic'],
  ['#1a0a00', '#ff8844', 'Dawn'],
  ['#001a1a', '#44ffcc', 'Teal Storm'],
];

const BG_PATTERNS = ['radial', 'vignette', 'burst', 'dual', 'solid'];

function hashTokenId(id) {
  return (id * 2654435761) >>> 0;
}

function pickPalette(id) {
  return PALETTES[hashTokenId(id) % PALETTES.length];
}

function pickPattern(id) {
  return BG_PATTERNS[(hashTokenId(id) >>> 8) % BG_PATTERNS.length];
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1,3), 16),
    g: parseInt(hex.slice(3,5), 16),
    b: parseInt(hex.slice(5,7), 16),
  };
}

function generateBgSvg(width, height, bgColor, tintRgb, pattern, tokenId) {
  const bg = hexToRgb(bgColor);
  let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;

  switch (pattern) {
    case 'radial':
      svg += `<defs><radialGradient id="rg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="rgb(${bg.r},${bg.g},${bg.b})" stop-opacity="1"/>
      </radialGradient></defs><rect width="100%" height="100%" fill="url(#rg)"/>`;
      break;
    case 'vignette':
      svg += `<defs><radialGradient id="rg" cx="50%" cy="50%" r="60%">
        <stop offset="0%" stop-color="rgb(${bg.r+30},${bg.g+30},${bg.b+30})"/>
        <stop offset="70%" stop-color="rgb(${bg.r},${bg.g},${bg.b})"/>
        <stop offset="100%" stop-color="rgb(${Math.max(bg.r-20,0)},${Math.max(bg.g-20,0)},${Math.max(bg.b-20,0)})"/>
      </radialGradient></defs><rect width="100%" height="100%" fill="url(#rg)"/>`;
      break;
    case 'burst': {
      svg += `<rect width="100%" height="100%" fill="rgb(${bg.r},${bg.g},${bg.b})"/>`;
      const cx = width/2, cy = height/2;
      for (let i = 0; i < 24; i++) {
        const angle = (i * 15) * Math.PI / 180;
        svg += `<line x1="${cx}" y1="${cy}" x2="${cx+Math.cos(angle)*width}" y2="${cy+Math.sin(angle)*height}" stroke="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" stroke-opacity="0.08" stroke-width="3"/>`;
      }
      svg += `<circle cx="${cx}" cy="${cy}" r="200" fill="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" fill-opacity="0.15"/>`;
      break;
    }
    case 'dual':
      svg += `<defs><linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" stop-opacity="0.3"/>
        <stop offset="50%" stop-color="rgb(${bg.r},${bg.g},${bg.b})"/>
        <stop offset="100%" stop-color="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" stop-opacity="0.2"/>
      </linearGradient></defs><rect width="100%" height="100%" fill="url(#lg)"/>`;
      break;
    default:
      svg += `<rect width="100%" height="100%" fill="rgb(${bg.r},${bg.g},${bg.b})"/>`;
      for (let i = 0; i < 60; i++) {
        const x = hashTokenId(tokenId * 100 + i) % width;
        const y = hashTokenId(tokenId * 200 + i) % height;
        svg += `<circle cx="${x}" cy="${y}" r="1" fill="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" fill-opacity="0.1"/>`;
      }
      break;
  }

  // Ember/particle effects
  for (let i = 0; i < 15; i++) {
    const px = hashTokenId(tokenId * 300 + i) % width;
    const py = hashTokenId(tokenId * 400 + i) % height;
    const r = 1 + (hashTokenId(tokenId * 500 + i) % 3);
    svg += `<circle cx="${px}" cy="${py}" r="${r}" fill="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" fill-opacity="0.2"/>`;
  }

  svg += '</svg>';
  return Buffer.from(svg);
}

async function generateNFT(tokenId) {
  const width = 1024, height = 1024;
  const palette = pickPalette(tokenId);
  const pattern = pickPattern(tokenId);
  const tintRgb = hexToRgb(palette[1]);

  const bgBuffer = generateBgSvg(width, height, palette[0], tintRgb, pattern, tokenId);

  const phoenixBuf = await sharp(BASE_IMG)
    .resize(width, height, { fit: 'cover' })
    .toBuffer();

  const tintSvg = Buffer.from(`<svg width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="rgb(${tintRgb.r},${tintRgb.g},${tintRgb.b})" opacity="0.18"/>
  </svg>`);

  return sharp(bgBuffer)
    .composite([
      { input: phoenixBuf, blend: 'over' },
      { input: tintSvg, blend: 'over' },
    ])
    .jpeg({ quality: 92 })
    .toBuffer();
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!fs.existsSync(BASE_IMG)) { console.error('Base image not found:', BASE_IMG); process.exit(1); }

  console.log(`Generating ${TOTAL} unique NFTs...`);

  for (let id = 0; id < TOTAL; id++) {
    try {
      const buf = await generateNFT(id);
      fs.writeFileSync(path.join(OUT_DIR, `${id}.jpg`), buf);
      if (id % 50 === 0) console.log(`  ${id}/${TOTAL}...`);
    } catch (err) {
      console.error(`Error #${id}:`, err.message);
    }
  }

  // Manifest
  const manifest = [];
  for (let id = 0; id < TOTAL; id++) {
    const p = pickPalette(id);
    manifest.push({ id, name: `RISE Phoenix #${id+1}`, palette: p[2], pattern: pickPattern(id), bgColor: p[0], tintColor: p[1] });
  }
  fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`Done! ${TOTAL} NFTs + manifest in ${OUT_DIR}`);
}

main().catch(console.error);