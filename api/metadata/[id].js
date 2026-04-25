// Tier-specific metadata for RISE Phoenix NFTs
// Ember (tier 1): 0-79% chance, 400 max
// Blaze (tier 2): 80-94% chance, 75 max  
// Genesis (tier 3): 95-99% chance, 25 max

const tierMeta = {
  1: {
    name: 'Ember Phoenix',
    color: '#ff6b35',
    bg: '#1a0a00',
    description: 'A fiery phoenix rises from the ashes. Ember tier — the spirit of relentless rebirth.',
    attributes: [
      { trait_type: 'Tier', value: 'Ember' },
      { trait_type: 'Rarity', value: 'Ember' },
      { trait_type: 'Max Supply', value: 400 },
      { trait_type: 'Element', value: 'Fire' },
    ],
  },
  2: {
    name: 'Blaze Phoenix',
    color: '#ff4081',
    bg: '#2a0a2a',
    description: 'A blaze phoenix — forged in infernal heat. Rare and fierce.',
    attributes: [
      { trait_type: 'Tier', value: 'Blaze' },
      { trait_type: 'Rarity', value: 'Blaze' },
      { trait_type: 'Max Supply', value: 75 },
      { trait_type: 'Element', value: 'Inferno' },
    ],
  },
  3: {
    name: 'Genesis Phoenix',
    color: '#ffd700',
    bg: '#0a1a2a',
    description: 'The Genesis Phoenix — the origin of all flame. Legendary and immortal.',
    attributes: [
      { trait_type: 'Tier', value: 'Genesis' },
      { trait_type: 'Rarity', value: 'Genesis' },
      { trait_type: 'Max Supply', value: 25 },
      { trait_type: 'Element', value: 'Primordial' },
    ],
  },
};

export default function handler(req, res) {
  const { id } = req.query;
  const numId = parseInt(id, 10);
  
  if (isNaN(numId) || numId < 0 || numId >= 500) {
    return res.status(404).json({ error: 'Invalid token ID' });
  }

  // Deterministic tier based on token ID (matches contract logic approximately)
  // The actual tier is determined on-chain by hash, but for metadata we assign based on ranges
  // This is a visual placeholder — the on-chain MintRequest stores the actual tier
  let tier;
  if (numId < 400) tier = 1;      // Ember
  else if (numId < 475) tier = 2;  // Blaze  
  else tier = 3;                    // Genesis

  const meta = tierMeta[tier];

  res.status(200).json({
    name: `${meta.name} #${numId + 1}`,
    symbol: 'RISE',
    description: meta.description,
    const tierNum = numId < 400 ? 1 : numId < 475 ? 2 : 3;
    const imageFile = tierNum === 1 ? 'phoenix-ember.jpg' : tierNum === 2 ? 'phoenix-blaze.jpg' : 'phoenix-genesis.jpg';
    image: `https://rise-phoenix-fix.vercel.app/${imageFile}`,
    external_url: 'https://rise-phoenix-fix.vercel.app',
    attributes: [
      ...meta.attributes,
      { trait_type: 'Number', value: numId + 1 },
      { display_type: 'number', trait_type: 'Generation', value: 1 },
    ],
    properties: {
      category: 'image',
      files: [
        { uri: `https://rise-phoenix-fix.vercel.app/${imageFile}`, type: 'image/jpeg' },
      ],
      creators: [
        { address: 'DBvfCPxj2gSo4dbHxwMrLRhy9fCmbHLrWJUDkUny8hBG', share: 100 },
      ],
    },
  });
}