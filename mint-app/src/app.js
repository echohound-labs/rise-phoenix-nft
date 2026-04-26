const COLLECTION_SIZE = 500;
const MINT_PRICE = 0.1;
let wallet = null;
let selected = null;
let gallery = [];

// Generate random gallery samples
function initGallery() {
  gallery = Array.from({length: 12}, () => Math.floor(Math.random() * COLLECTION_SIZE) + 1);
  renderGallery();
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  grid.innerHTML = gallery.map(id => `
    <div class="nft-card ${selected === id ? 'selected' : ''}" data-id="${id}">
      <img src="/images/${id}.png" alt="RISE Phoenix #${id}" />
      <div class="nft-overlay">
        <span class="nft-id">#${id.toString().padStart(3, '0')}</span>
      </div>
    </div>
  `).join('');
  
  grid.querySelectorAll('.nft-card').forEach(card => {
    card.addEventListener('click', () => selectNFT(parseInt(card.dataset.id)));
  });
}

function selectNFT(id) {
  selected = selected === id ? null : id;
  renderGallery();
  renderMintBar();
}

function renderMintBar() {
  const bar = document.getElementById('mint-bar');
  if (!selected) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'block';
  document.getElementById('mint-preview-img').src = `/images/${selected}.png`;
  document.getElementById('mint-name').textContent = `RISE Phoenix #${selected.toString().padStart(3, '0')}`;
}

async function connectWallet() {
  try {
    if (window.phantom?.solana) {
      const resp = await window.phantom.solana.connect();
      wallet = resp.publicKey.toString();
      document.getElementById('connect-btn').textContent = wallet.slice(0, 6) + '...' + wallet.slice(-4);
      document.getElementById('connect-btn').classList.add('connected');
    } else if (window.solflare) {
      const resp = await window.solflare.connect();
      wallet = resp.publicKey.toString();
      document.getElementById('connect-btn').textContent = wallet.slice(0, 6) + '...' + wallet.slice(-4);
      document.getElementById('connect-btn').classList.add('connected');
    } else {
      alert('Please install Phantom or Solflare wallet');
    }
  } catch (e) {
    console.error('Connect failed:', e);
  }
}

async function mintNFT() {
  if (!selected || !wallet) return;
  
  const btn = document.getElementById('mint-action-btn');
  btn.disabled = true;
  btn.textContent = 'Minting...';
  
  try {
    // This is where you'd call the actual NFT mint program
    // For now, just a demo transaction
    alert(`This would mint RISE Phoenix #${selected} for ${MINT_PRICE} XNT`);
    btn.textContent = 'Minted!';
  } catch (e) {
    alert('Mint failed: ' + e.message);
    btn.textContent = `Mint for ${MINT_PRICE} XNT`;
    btn.disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initGallery();
  
  document.getElementById('connect-btn').addEventListener('click', connectWallet);
  document.getElementById('mint-action-btn').addEventListener('click', mintNFT);
  
  // Initial render
  document.getElementById('app').innerHTML = `
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="header-left">
          <span class="logo-icon">🔥</span>
          <h1 class="logo-text">RISE Phoenix</h1>
        </div>
        <div class="header-right">
          <span class="mint-count">0/${COLLECTION_SIZE} Minted</span>
          <button id="connect-btn" class="connect-btn">Connect Wallet</button>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero">
      <h2>Rise From The Flames</h2>
      <p>500 unique dark fantasy phoenixes. Each one different. Each one yours.</p>
      <div class="tags">
        <span class="tag">🔥 ${MINT_PRICE} XNT</span>
        <span class="tag">🎨 6 Traits</span>
        <span class="tag">⚡ 500 Unique</span>
      </div>
    </section>

    <!-- Gallery -->
    <section class="gallery-section">
      <div class="gallery-content">
        <h3 class="gallery-title">The Collection</h3>
        <div id="gallery-grid" class="gallery-grid"></div>
      </div>
    </section>

    <!-- Mint Bar -->
    <div id="mint-bar" class="mint-bar" style="display: none;">
      <div class="mint-bar-content">
        <div class="mint-preview">
          <img id="mint-preview-img" src="" alt="" />
          <div>
            <div class="mint-label">Selected</div>
            <div id="mint-name" class="mint-name"></div>
          </div>
        </div>
        <button id="mint-action-btn" class="mint-btn">Mint for ${MINT_PRICE} XNT</button>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>Built on X1 Network • Powered by Solaris Prime</p>
    </footer>
  `;
  
  // Re-attach listeners after render
  document.getElementById('connect-btn').addEventListener('click', connectWallet);
  document.getElementById('mint-action-btn').addEventListener('click', mintNFT);
  renderGallery();
});
