import { useState, useMemo, useCallback, Component, useEffect } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import {
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  PublicKey,
  Keypair,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { createCreateMetadataAccountV3Instruction, PROGRAM_ID as METADATA_PROGRAM_ID } from '@metaplex-foundation/mpl-token-metadata';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

class ErrorBoundary extends Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#ff6b35', background: '#0a0a0f', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <h1>🔥 Something went wrong</h1>
          <p style={{ color: '#aaa', maxWidth: 500 }}>{this.state.error?.message || 'Unknown error'}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 20, padding: '0.75rem 2rem', background: '#ff6b35', color: '#fff', border: 'none', borderRadius: 50, fontSize: 16, cursor: 'pointer' }}>Reload Page</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Network config — switch NETWORK to 'mainnet' for production
const NETWORK = 'testnet';

const CONFIG = {
  testnet: {
    rpc: 'https://rpc.testnet.x1.xyz',
    program: '5QUVVnm1duiRazqa69KW9ZQhCCZcg5GBUKkUn5avA8Gb',
    mintState: 'GyBELkR4XF4o297rGyZXgk1ESjPfVzLkWT4tuLJ8VVJk',
    treasury: 'DBvfCPxj2gSo4dbHxwMrLRhy9fCmbHLrWJUDkUny8hBG',
  },
  mainnet: {
    rpc: 'https://rpc.mainnet.x1.xyz',
    program: '5QUVVnm1duiRazqa69KW9ZQhCCZcg5GBUKkUn5avA8Gb',
    mintState: 'GyBELkR4XF4o297rGyZXgk1ESjPfVzLkWT4tuLJ8VVJk',
    treasury: 'DBvfCPxj2gSo4dbHxwMrLRhy9fCmbHLrWJUDkUny8hBG',
  },
};

const RISE_RECEIVER = new PublicKey(CONFIG[NETWORK].treasury);
const RISE_PROGRAM = new PublicKey(CONFIG[NETWORK].program);
const MINT_STATE_PDA = new PublicKey(CONFIG[NETWORK].mintState);
const TOKEN_METADATA_PROGRAM_ID = METADATA_PROGRAM_ID;
const METAPLEX_METADATA = METADATA_PROGRAM_ID;
const RPC = CONFIG[NETWORK].rpc;
const MINT_PRICE = 10;

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

function MintReveal({ mintNumber, onClose }) {
  if (mintNumber === null) return null;
  const palette = PALETTES[mintNumber % PALETTES.length];
  const IPFS_BASE = '/nft';
  const imgUrl = `${IPFS_BASE}/${mintNumber}.jpg`;

  return (
    <div className="reveal-overlay" onClick={onClose}>
      <div className="reveal-modal" onClick={(e) => e.stopPropagation()} style={{ boxShadow: `0 0 80px ${palette.accent}80, 0 0 160px ${palette.accent}33` }}>
        <div className="reveal-badge" style={{ color: palette.accent, borderColor: palette.accent }}>1 OF 1</div>
        <h2 className="reveal-title" style={{ color: palette.accent }}>RISE Phoenix #{mintNumber + 1}</h2>
        <img src={imgUrl} alt={`Phoenix #${mintNumber + 1}`} className="reveal-img" />
        <div className="reveal-tier-info" style={{ color: palette.accent }}>
          <span className="reveal-tier-name">{palette.name}</span> · <span>Unique 1-of-1</span>
        </div>
        <p className="reveal-desc" style={{ color: palette.accent }}>Same bird. Different fire. This phoenix is one of 500 — no two alike.</p>
        <button className="reveal-close" onClick={onClose} style={{ background: palette.accent }}>🦅 View in Gallery</button>
      </div>
    </div>
  );
}

function MintButton({ onMintSuccess }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState(null);
  const [error, setError] = useState(null);
  const [minted, setMinted] = useState(0);
  const [revealNumber, setRevealNumber] = useState(null);

  const mint = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setLoading(true);
    setError(null);
    setTxSig(null);
    try {
      // Read total_minted from MintState
      const mintStateAccount = await connection.getAccountInfo(MINT_STATE_PDA);
      let mintNumber = 0;
      if (mintStateAccount && mintStateAccount.data.length >= 8) {
        const data = mintStateAccount.data;
        mintNumber = data[8] | (data[9] << 8) | (data[10] << 16) | (data[11] << 24);
      }

      // Generate new NFT mint keypair
      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;

      // Derive metadata PDA
      const METADATA_PROGRAM_PUBKEY = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), METADATA_PROGRAM_PUBKEY.toBuffer(), nftMint.toBuffer()],
        METADATA_PROGRAM_PUBKEY
      );

      // Derive minter ATA
      const minterAta = getAssociatedTokenAddressSync(nftMint, wallet.publicKey);

      // Build Anchor discriminator for mint_phoenix
      const discriminator = Buffer.from([208, 178, 215, 136, 161, 240, 220, 24]);

      // Build instruction data
      const data = discriminator;

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: nftMint, isSigner: true, isWritable: true },
          { pubkey: minterAta, isSigner: false, isWritable: true },
          { pubkey: metadataPDA, isSigner: false, isWritable: true },
          { pubkey: RISE_RECEIVER, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: METADATA_PROGRAM_PUBKEY, isSigner: false, isWritable: false },
          { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
        ],
        programId: RISE_PROGRAM,
        data,
      });

      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.partialSign(nftMintKeypair);
      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      setTxSig(sig);
      setMinted((m) => m + 1);
      setRevealNumber(mintNumber);
      if (onMintSuccess) onMintSuccess();
    } catch (e) {
      setError(e.message?.slice(0, 300) || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  if (!wallet.connected) return null;

  return (
    <div className="mint-area">
      <MintReveal mintNumber={revealNumber} onClose={() => setRevealNumber(null)} />
      <button className="mint-btn" onClick={mint} disabled={loading}>
        {loading ? '🔥 Minting...' : `🔥 Mint — ${MINT_PRICE} XNT`}
      </button>
      {txSig && !revealNumber && revealNumber !== 0 && (
        <p className="mint-success">
          ✅ Minted! Tx:{' '}
          <a href={`https://explorer.x1.xyz/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
            {txSig.slice(0, 12)}...
          </a>
        </p>
      )}
      {minted > 1 && <p className="mint-count">🔥 You've minted {minted} phoenixes</p>}
      {error && <p className="mint-error">❌ {error}</p>}
    </div>
  );
}

function DisclaimerModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>⚠️ Disclaimer</h2>
        <div className="modal-body">
          <p><strong>Last updated: April 25, 2026</strong></p>
          <p>By accessing this website and participating in the RISE Phoenix NFT mint, you acknowledge and agree to the following:</p>
          <ol>
            <li><strong>No Financial Advice.</strong> Nothing on this website constitutes financial, investment, legal, or tax advice.</li>
            <li><strong>High Risk.</strong> Cryptocurrency and NFTs are highly volatile and speculative. You may lose all funds spent.</li>
            <li><strong>No Guarantees.</strong> The project makes no guarantees regarding token value, liquidity, returns, or market performance.</li>
            <li><strong>Not a Security.</strong> RISE Phoenix NFTs are not securities, investment contracts, or financial instruments. They are digital collectibles.</li>
            <li><strong>1-of-1 Mint.</strong> Each phoenix is unique — different color palette and background. Your specific phoenix is determined by on-chain randomness from the Geiger Entropy Oracle. Results are unpredictable and final.</li>
            <li><strong>Regulatory Risk.</strong> Regulations vary by jurisdiction. Ensure compliance with local laws before participating.</li>
            <li><strong>Smart Contract Risk.</strong> Smart contracts may contain bugs or vulnerabilities. Participation is at your own risk.</li>
            <li><strong>No Refunds.</strong> All mints are final. No refunds once a transaction is confirmed on-chain.</li>
            <li><strong>Independent Project.</strong> RISE Phoenix is not endorsed by, affiliated with, or sponsored by the X1 Network Foundation, Degen Launchpad, or any exchange.</li>
            <li><strong>Age Requirement.</strong> You must be at least 18 years old to participate.</li>
            <li><strong>Limitation of Liability.</strong> The creators disclaim all liability for any damages arising from your participation.</li>
          </ol>
          <p>By clicking "I Agree," you confirm that you have read, understood, and accept all terms above.</p>
        </div>
        <div className="modal-actions">
          <button className="modal-btn agree" onClick={onClose}>I Agree</button>
        </div>
      </div>
    </div>
  );
}

function ColorShowcase() {
  return (
    <div className="color-grid">
      {PALETTES.map((v, i) => (
        <div
          key={i}
          className="color-swatch"
          style={{ background: '#0a0a1a', boxShadow: `0 0 20px ${v.accent}, inset 0 0 30px ${v.accent}33` }}
        >
          <div className="swatch-accent" style={{ background: v.accent }} />
          <span className="swatch-name" style={{ color: v.accent }}>{v.name}</span>
        </div>
      ))}
    </div>
  );
}

function NFTGallery() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [nfts, setNfts] = useState([]);
  const [loadingNfts, setLoadingNfts] = useState(false);

  useEffect(() => {
    if (!wallet.publicKey) { setNfts([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingNfts(true);
      try {
        // Get all token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID });
        const phoenixNfts = [];
        for (const ta of tokenAccounts.value) {
          const info = ta.account.data.parsed.info;
          // Only look at NFTs (amount = 1, decimals = 0)
          if (info.tokenAmount?.amount !== '1' || info.tokenAmount?.decimals !== 0) continue;
          const mint = new PublicKey(info.mint);
          try {
            // Fetch Metaplex metadata
            const [metadataPDA] = PublicKey.findProgramAddressSync(
              [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
              TOKEN_METADATA_PROGRAM_ID
            );
            const metaAccount = await connection.getAccountInfo(metadataPDA);
            if (!metaAccount) continue;
            // Parse metadata — skip first 8 bytes (discriminator) + 4 bytes (key length) + key
            const data = metaAccount.data;
            let offset = 65; // skip to name field
            const nameLen = data.readUInt32LE(offset); offset += 4;
            const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0+$/, ''); offset += nameLen;
            const symbolLen = data.readUInt32LE(offset); offset += 4;
            const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0+$/, ''); offset += symbolLen;
            const uriLen = data.readUInt32LE(offset); offset += 4;
            const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0+$/, '');
            if (symbol === 'RISE' || name.startsWith('RISE Phoenix')) {
              // Try to fetch JSON metadata for image
              let image = `${'/nft'}/0.jpg`;
              try {
                const res = await fetch(uri);
                const json = await res.json();
                if (json.image) image = json.image;
              } catch (e) { /* use defaults */ }
              // Extract number from name for palette
              const numMatch = name.match(/#(\d+)/);
              const numId = numMatch ? parseInt(numMatch[1]) - 1 : 0;
              const tierName = numId < 400 ? "Ember" : numId < 475 ? "Blaze" : "Genesis";
              const palette = PALETTES[numId % PALETTES.length];
              phoenixNfts.push({
                mint: mint.toBase58(),
                name,
                symbol,
                uri,
                image,
                palette,
                tierName,
              });
            }
          } catch (e) { continue; }
        }
        if (!cancelled) setNfts(phoenixNfts);
      } catch (e) { /* ignore */ }
      finally { if (!cancelled) setLoadingNfts(false); }
    })();
    return () => { cancelled = true; };
  }, [wallet.publicKey, connection]);

  if (!wallet.connected) return null;
  if (loadingNfts) return (
    <div className="gallery-section">
      <h2>🦅 Your Phoenixes</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>Loading your NFTs...</p>
    </div>
  );
  if (nfts.length === 0) return null;

  return (
    <div className="gallery-section" id="gallery">
      <h2>🦅 Your Phoenixes</h2>
      <p className="section-sub">{nfts.length} phoenix{nfts.length > 1 ? 'es' : ''} in your wallet</p>
      <div className="gallery-grid">
        {nfts.map((nft) => (
          <div key={nft.mint} className="gallery-card" style={{ boxShadow: `0 0 25px ${nft.palette.accent}4D` }}>
            
            <img src={nft.image} alt={nft.name} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>{nft.name}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.tierName} Tier</p>
              <a href={`https://explorer.x1.xyz/address/${nft.mint}`} target="_blank" rel="noopener noreferrer" className="gallery-link">
                View on Explorer ↗
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function phoenixImg(id) {
  return `/nft/${id}.jpg`;
}

function AllGallery() {
  const { connection } = useConnection();
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mintStateAccount = await connection.getAccountInfo(MINT_STATE_PDA);
        if (!mintStateAccount || mintStateAccount.data.length < 85) {
          setLoading(false);
          return;
        }
        const dv = new DataView(mintStateAccount.data.buffer || mintStateAccount.data);
        const totalMinted = dv.getUint32(84, true);
        if (totalMinted === 0) { if (!cancelled) { setLoading(false); setNfts([]); } return; }

        const items = [];
        for (let i = 0; i < totalMinted; i++) {
          const palette = PALETTES[i % PALETTES.length];
          items.push({
            id: i,
            number: i + 1,
            palette,
            image: phoenixImg(i),
          });
        }
        if (!cancelled) setNfts(items);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [connection]);

  if (loading) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>Loading all minted phoenixes...</p>
    </div>
  );
  if (error) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#ff6b35', textAlign: 'center' }}>Error: {error}</p>
    </div>
  );
  if (nfts.length === 0) return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p style={{ color: '#8888aa', textAlign: 'center' }}>No phoenixes minted yet. Be the first!</p>
    </div>
  );

  return (
    <div className="gallery-page">
      <h2>🦅 Phoenix Gallery</h2>
      <p className="section-sub">All {nfts.length} minted phoenix{nfts.length !== 1 ? 'es' : ''} — every one is a 1-of-1</p>
      <div className="gallery-grid all-gallery-grid">
        {nfts.map((nft) => (
          <div key={nft.id} className="gallery-card" style={{ boxShadow: `0 0 25px ${nft.palette.accent}4D` }}>
            
            <img src={nft.image} alt={`Phoenix #${nft.number}`} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>RISE Phoenix #{nft.number}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.tierName} Tier</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [page, setPage] = useState('mint');

  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  const handleAgree = () => {
    setAgreed(true);
    setShowDisclaimer(false);
  };

  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <div className="app">
            <nav className="top-nav">
              <div className="nav-brand">🔥 RISE Phoenix</div>
              <div className="nav-links">
                <button className={`nav-btn ${page === 'mint' ? 'active' : ''}`} onClick={() => setPage('mint')}>Mint</button>
                <button className={`nav-btn ${page === 'gallery' ? 'active' : ''}`} onClick={() => setPage('gallery')}>Gallery</button>
              </div>
              <div className="nav-wallet"><WalletMultiButton /></div>
            </nav>
            {page === 'gallery' && <AllGallery />}
            {page === 'mint' && <>
            {/* Hero */}
            <section className="hero">
              <div className="particles">{Array.from({ length: 20 }).map((_, i) => <span key={i} className="particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 4}s` }} />)}</div>
              <div className="hero-content">
                <span className="hero-badge">X1 Network · Series 1 of 3 · Powered by Geiger Entropy Oracle ☢️</span>
                <h1>RISE Phoenix</h1>
                <p>500 unique 1-of-1 phoenixes. Same bird, different fire, different color, different cosmos. Mint for 10 XNT. Every single one is one-of-a-kind.</p>
                <div className="stats">
                  <div className="stat"><div className="stat-num">500</div><div className="stat-label">Total NFTs</div></div>
                  <div className="stat"><div className="stat-num">10</div><div className="stat-label">XNT Per Mint</div></div>
                  <div className="stat"><div className="stat-num">☢️</div><div className="stat-label">Geiger Random</div></div>
                  <div className="stat"><div className="stat-num">100%</div><div className="stat-label">→ Buy & Burn</div></div>
                </div>
                <a href="#mint" className="cta">Mint Your Phoenix ↓</a>
              </div>
            </section>

            {/* Tier Showcase — Ember / Blaze / Genesis */}
            <section className="tier-showcase" id="tiers">
              <h2>Three Tiers. Three Phoenixes. One Legend.</h2>
              <p className="section-sub">Every phoenix is a 1-of-1 — but some burn brighter than others.</p>
              <div className="tier-cards">
                <div className="tier-card tier-ember">
                  
                  <img src="/ember-base.jpg" alt="Ember Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ff6b35' }}>EMBER</h3>
                    <p className="tier-card-desc">400 unique Fire Phoenixes. Each one burns a different color — from inferno red to acid green to deep violet. No two are alike.</p>
                    <div className="tier-card-stats">
                      <span>🔥 Rare Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
                <div className="tier-card tier-blaze">
                  
                  <img src="/blaze-base.jpg" alt="Blaze Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#8800ff' }}>BLAZE</h3>
                    <p className="tier-card-desc">75 rare Storm Phoenixes cracking with electric energy. Blue lightning, steel frame, pure power.</p>
                    <div className="tier-card-stats">
                      <span>⚡ Epic Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
                <div className="tier-card tier-genesis">
                  
                  <img src="/genesis-base.jpg" alt="Genesis Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ffdd00' }}>GENESIS</h3>
                    <p className="tier-card-desc">Only 25 ever minted. Golden cosmic phoenix with holographic frame — the most sought after in the collection.</p>
                    <div className="tier-card-stats">
                      <span>✨ Legendary Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="entropy-note" style={{ marginTop: '2rem' }}>
                <span className="entropy-icon">☢️</span>
                <div>
                  <strong>Which one will you get?</strong>
                  <p>Mint order is determined by the Geiger Entropy Oracle — quantum randomness you can verify on-chain. You don't choose the fire. The fire chooses you.</p>
                </div>
              </div>
            </section>

            {/* Collection */}




            {/* Tokenomics */}
            <section className="tokenomics" id="tokenomics">
              <h2>$RISE Tokenomics</h2>
              <p className="section-sub">1,000,000,000 total supply · Built to shrink</p>
              <div className="token-grid">
                <div className="token-card">
                  <div className="token-pct">20%</div>
                  <div className="token-label">Burned</div>
                  <div className="token-detail">200M RISE permanently removed. Front-loaded W1–W4. Creates immediate scarcity.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">10%</div>
                  <div className="token-label">Airdrop</div>
                  <div className="token-detail">100M RISE distributed W4–W12. Rewards early supporters.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">10%</div>
                  <div className="token-label">NFT / Liquidity Engine</div>
                  <div className="token-detail">100M RISE powers NFT ecosystem. 30% of mints → burn. 70% → LP.</div>
                </div>
                <div className="token-card">
                  <div className="token-pct">60%</div>
                  <div className="token-label">Degen Launch Pad + LP</div>
                  <div className="token-detail">600M RISE for launchpad and liquidity pools.</div>
                </div>
              </div>
              <div className="burn-progress">
                <h3>Burn Progress</h3>
                <div className="progress-bar"><div className="progress-fill" style={{ width: '40%' }}>80M / 200M burned</div></div>
                <p className="burn-status">🔥 8% of total supply already burned · 12% remaining in Phase 1</p>
              </div>
              <div className="nft-engine">
                <h3>NFT Mint Engine</h3>
                <div className="engine-flow">
                  <div className="engine-step">🪙 <br/>You Mint<br/>a Phoenix</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-step">☢️ <br/>Geiger Oracle<br/>Assigns #</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-step">💰 <br/>$RISE<br/>Collected</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-split">
                    <div className="engine-step burn">🔥 30%<br/>Buy & Burn</div>
                    <div className="engine-step lp">💧 70%<br/>→ Liquidity</div>
                  </div>
                </div>
                <p className="engine-note">Supply decreases · Liquidity increases · Every phoenix is 1-of-1</p>
              </div>
            </section>

            {/* Mint Section */}
            <section className="mint-section" id="mint">
              <h2>Mint Your Phoenix — Series 1</h2>
              <p className="section-sub">10 XNT · 500 total · Every phoenix is 1-of-1 · Powered by Geiger Entropy ☢️</p>
              <div className="mint-card">
                <img src="/nft/475.jpg" alt="RISE Phoenix" className="mint-hero-img" />
                <div className="mint-info">
                  <div className="mint-specs">
                    <div className="mint-spec"><span className="mint-spec-label">Collection</span><span className="mint-spec-value">Series 1</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Supply</span><span className="mint-spec-value">500</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Price</span><span className="mint-spec-value">10 XNT</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Randomness</span><span className="mint-spec-value">☢️ Geiger Oracle</span></div>
                  </div>
                  <ul className="mint-perks">
                    <li>Every phoenix is a 1-of-1 — 3 tiers, 500 unique color variants, zero duplicates</li>
                    <li>Mint order determined by quantum radioactive decay on-chain — verifiable, not manipulable</li>
                    <li>100% of mint revenue → buy back and burn RISE</li>
                  </ul>
                  {!agreed ? (
                    <div className="disclaimer-banner">
                      <p>⚠️ You must accept the disclaimer before minting.</p>
                      <button className="disclaimer-btn" onClick={() => setShowDisclaimer(true)}>Read Disclaimer</button>
                    </div>
                  ) : (
                    <MintButton onMintSuccess={() => {}} />
                  )}
                </div>
              </div>
            </section>

            {/* Buyback */}
            <section className="buyback">
              <h2>100% → Buy & Burn RISE</h2>
              <p>Every XNT from minting goes to the buyback wallet. It buys RISE on the open market and burns it. No team allocation. Pure deflationary pressure.</p>
              <div className="buyback-flow">
                <div className="buyback-step"><div className="buyback-step-icon">🪙</div><div className="buyback-step-text">You Mint<br/>a Phoenix</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">💰</div><div className="buyback-step-text">XNT →<br/>Buyback Wallet</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">🔥</div><div className="buyback-step-text">Buys RISE<br/>on DEX</div></div>
                <div className="buyback-arrow">→</div>
                <div className="buyback-step"><div className="buyback-step-icon">☠️</div><div className="buyback-step-text">RISE<br/>Burned Forever</div></div>
              </div>
            </section>

            </>}
            {page === 'mint' && <NFTGallery />}
            <footer>
              <p className="footer-disclaimer">⚠️ RISE Phoenix NFTs are digital collectibles, not securities. Tier determination is random and final. No guarantees of value. By using this site you accept the <a href="#" onClick={(e) => { e.preventDefault(); setShowDisclaimer(true); }}>full disclaimer</a>.</p>
              <p>RISE Phoenix Collection · Series 1 of 3 · X1 Network · DGN 🦅🔥☢️</p>
            </footer>

            <DisclaimerModal open={showDisclaimer} onClose={handleAgree} />
          </div>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}