// RISE Phoenix NFT Metadata — Served from IPFS
const IPFS = 'https://bafybeibmrfdvd5zcf3rb4ot7tpdombbnwqglnrbgeybo62rasfqa3ixwoa.ipfs.w3s.link';

const PALETTES = [
  { name: 'Inferno', accent: '#ff4400' },
  { name: 'Void', accent: '#8800ff' },
  { name: 'Emerald', accent: '#00ff88' },
  { name: 'Neon Rose', accent: '#ff0088' },
  { name: 'Deep Blue', accent: '#0088ff' },
  { name: 'Solar', accent: '#ffaa00' },
  { name: 'Frost', accent: '#00ffff' },
  { name: 'Plasma', accent: '#ff00ff' },
  { name: 'Toxic', accent: '#00ffaa' },
  { name: 'Magma', accent: '#ff6644' },
  { name: 'Ultraviolet', accent: '#aa00ff' },
  { name: 'Acid', accent: '#44ff00' },
  { name: 'Amber', accent: '#ff8800' },
  { name: 'Ocean', accent: '#4488ff' },
  { name: 'Blood Fire', accent: '#ff2222' },
  { name: 'Gold Dust', accent: '#cccc00' },
  { name: 'Sakura', accent: '#ff44aa' },
  { name: 'Matrix', accent: '#00ff44' },
  { name: 'Midnight', accent: '#4444ff' },
  { name: 'Crown', accent: '#ffdd00' },
  { name: 'Lime Lightning', accent: '#88ff00' },
  { name: 'Crimson Pulse', accent: '#ff4488' },
  { name: 'Arctic', accent: '#00aaff' },
  { name: 'Nebula', accent: '#aa44ff' },
  { name: 'Red Shift', accent: '#ff0066' },
  { name: 'Aurora', accent: '#00ffcc' },
  { name: 'Phoenix Gold', accent: '#ffcc00' },
  { name: 'Cosmic', accent: '#6644ff' },
  { name: 'Dawn', accent: '#ff8844' },
  { name: 'Teal Storm', accent: '#44ffcc' },
];

export default function handler(req, res) {
  const { id } = req.query;
  const numId = parseInt(id, 10);

  if (isNaN(numId) || numId < 0 || numId >= 500) {
    return res.status(404).json({ error: 'Invalid token ID' });
  }

  let tier, tierName, tierDesc;
  if (numId < 400) {
    tier = 'Ember';
    tierDesc = 'A fiery phoenix rises from the ashes. Ember tier — the spirit of relentless rebirth.';
  } else if (numId < 475) {
    tier = 'Blaze';
    tierDesc = 'A blaze phoenix — forged in infernal heat. Rare and fierce.';
  } else {
    tier = 'Genesis';
    tierDesc = 'The Genesis Phoenix — the origin of all flame. Legendary and immortal.';
  }

  const palette = PALETTES[numId % PALETTES.length];

  res.status(200).json({
    name: `RISE Phoenix #${numId + 1}`,
    symbol: 'RISE',
    description: `${tierDesc} Palette: ${palette.name}. Every phoenix is a 1-of-1 — same bird, different fire.`,
    image: `${IPFS}/${numId}.jpg`,
    external_url: 'https://rise-phoenix-x1.vercel.app',
    attributes: [
      { trait_type: 'Tier', value: tier },
      { trait_type: 'Palette', value: palette.name },
      { trait_type: 'Number', value: numId + 1 },
      { trait_type: 'Rarity', value: numId < 400 ? 'Common' : numId < 475 ? 'Rare' : 'Legendary' },
      { trait_type: 'Max Supply', value: numId < 400 ? 400 : numId < 475 ? 75 : 25 },
      { trait_type: 'Element', value: numId < 400 ? 'Fire' : numId < 475 ? 'Inferno' : 'Primordial' },
      { display_type: 'number', trait_type: 'Generation', value: 1 },
    ],
    properties: {
      category: 'image',
      files: [{ uri: `${IPFS}/${numId}.jpg`, type: 'image/jpeg' }],
      creators: [{ address: 'DBvfCPxj2gSo4dbHxwMrLRhy9fCmbHLrWJUDkUny8hBG', share: 100 }],
    },
  });
}