// Generate SVG phoenix images for RISE NFTs
// Tier 1: Ember (orange), Tier 2: Blaze (pink), Tier 3: Genesis (gold)

const tierVisuals = {
  1: { name: 'Ember', primary: '#ff6b35', secondary: '#ff8c42', bg1: '#1a0a00', bg2: '#2d1200', glow: 'rgba(255,107,53,0.6)' },
  2: { name: 'Blaze', primary: '#ff4081', secondary: '#ff6eb4', bg1: '#2a0a2a', bg2: '#3d123d', glow: 'rgba(255,64,129,0.6)' },
  3: { name: 'Genesis', primary: '#ffd700', secondary: '#ffed4a', bg1: '#0a1a2a', bg2: '#1a2d3d', glow: 'rgba(255,215,0,0.7)' },
};

function generatePhoenixSVG(id, tier) {
  const v = tierVisuals[tier] || tierVisuals[1];
  const num = id + 1;
  // Unique visual variations per ID
  const hueShift = (id * 17) % 360;
  const wingAngle = 10 + (id % 5) * 5;
  const flameH = 170 + (id % 7) * 5;
  const bodyW = 32 + (id % 4) * 2;
  const seed = id * 1337;
  const particleCount = 3 + (id % 4);
  
  // Unique accent color per phoenix within tier
  const accentHue = (hueShift + (tier === 1 ? 15 : tier === 2 ? 300 : 50)) % 360;
  const accent = `hsl(${accentHue}, 80%, 65%)`;
  
  // Background stars/particles unique to each phoenix
  let stars = '';
  for (let i = 0; i < 8; i++) {
    const sx = ((seed * (i+1) * 7) % 580) + 10;
    const sy = ((seed * (i+1) * 13) % 560) + 10;
    const sr = 1 + (i % 3);
    stars += `<circle cx="${sx}" cy="${sy}" r="${sr}" fill="white" opacity="${0.1 + (i%3)*0.1}"/>`;
  }
  
  // Unique flame patterns
  let flames = '';
  for (let i = 0; i < particleCount; i++) {
    const fx = -30 + ((id * (i+1) * 37) % 60);
    const fy = 60 + ((id * (i+1) * 23) % 80);
    const fs = 3 + (id % 4);
    flames += `<circle cx="${fx}" cy="${fy}" r="${fs}" fill="${accent}" opacity="0.3"/>`;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="${v.bg2}"/>
      <stop offset="100%" stop-color="${v.bg1}"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="45%" r="35%">
      <stop offset="0%" stop-color="${v.glow}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <linearGradient id="phoenix" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${v.primary}"/>
      <stop offset="100%" stop-color="${v.secondary}"/>
    </linearGradient>
    <filter id="blur">
      <feGaussianBlur stdDeviation="8"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="600" height="600" fill="url(#bg)"/>
  <!-- Stars -->
  ${stars}
  
  <!-- Glow -->
  <ellipse cx="300" cy="270" rx="180" ry="200" fill="url(#glow)"/>
  
  <!-- Phoenix body -->
  <g transform="translate(300,300)">
    <!-- Wings with unique angle -->
    <path d="M0,-120 C-40,-140 -120,-100 -140,-30 C-150,10 -130,60 -80,80 C-60,90 -40,85 -20,70" 
          fill="url(#phoenix)" opacity="0.9" transform="rotate(-${wingAngle/2}, 0, 0)"/>
    <path d="M0,-120 C40,-140 120,-100 140,-30 C150,10 130,60 80,80 C60,90 40,85 20,70" 
          fill="url(#phoenix)" opacity="0.9" transform="rotate(${wingAngle/2}, 0, 0)"/>
    
    <!-- Body -->
    <ellipse cx="0" cy="0" rx="${bodyW}" ry="70" fill="${v.primary}" opacity="0.95"/>
    
    <!-- Head -->
    <circle cx="0" cy="-80" r="22" fill="${v.primary}"/>
    
    <!-- Flame crest (unique height) -->
    <path d="M0,-110 C-5,-130 -8,-155 -3,-${flameH} C0,-${flameH-10} 5,-${flameH-25} 3,-${flameH-40} C8,-${flameH-20} 12,-${flameH-5} 15,-${flameH+10} C12,-${flameH-15} 8,-${flameH-35} 6,-120" 
          fill="${v.secondary}" opacity="0.8"/>
    
    <!-- Unique accent flames -->
    ${flames}
    
    <!-- Tail flames -->
    <path d="M0,60 C-15,80 -25,120 -20,160 C-18,140 -10,110 -5,90" 
          fill="${v.secondary}" opacity="0.7"/>
    <path d="M0,60 C15,80 25,120 20,160 C18,140 10,110 5,90" 
          fill="${v.secondary}" opacity="0.7"/>
    <path d="M0,60 C0,100 5,150 0,190 C-5,150 0,100 0,90" 
          fill="${accent}" opacity="0.5"/>
    
    <!-- Eyes -->
    <circle cx="-6" cy="-82" r="3" fill="white" opacity="0.9"/>
    <circle cx="6" cy="-82" r="3" fill="white" opacity="0.9"/>
    <circle cx="-5" cy="-82" r="1.5" fill="${v.bg1}"/>
    <circle cx="7" cy="-82" r="1.5" fill="${v.bg1}"/>
  </g>
  
  <!-- Big number -->
  <text x="300" y="490" text-anchor="middle" font-family="monospace" font-size="72" font-weight="900" fill="${v.primary}" opacity="0.15" letter-spacing="-2">#${num}</text>
  
  <!-- Text -->
  <text x="300" y="520" text-anchor="middle" font-family="monospace" font-size="28" font-weight="bold" fill="${v.primary}" letter-spacing="4">RISE</text>
  <text x="300" y="555" text-anchor="middle" font-family="monospace" font-size="16" fill="${v.primary}" opacity="0.7">${v.name} #${num}</text>
  <text x="300" y="580" text-anchor="middle" font-family="monospace" font-size="11" fill="white" opacity="0.4">X1 Network</text>
  
  <!-- Border -->
  <rect x="8" y="8" width="584" height="584" rx="12" fill="none" stroke="${v.primary}" stroke-width="2" opacity="0.3"/>
</svg>`;
}

export default function handler(req, res) {
  const { id } = req.query;
  const numId = parseInt(id, 10);
  
  if (isNaN(numId) || numId < 0 || numId >= 500) {
    return res.status(404).json({ error: 'Invalid token ID' });
  }

  // Same tier logic as metadata endpoint
  let tier;
  if (numId < 400) tier = 1;
  else if (numId < 475) tier = 2;
  else tier = 3;

  const svg = generatePhoenixSVG(numId, tier);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.status(200).send(svg);
}