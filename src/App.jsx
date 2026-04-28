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
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
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

const RISE_RECEIVER = new PublicKey('DBvfCPxj2gSo4dbHxwMrLRhy9fCmbHLrWJUDkUny8hBG');
const RISE_PROGRAM = new PublicKey('2TAHRJHb5WWuxTcXQLitwn5K6T2nZMe9papa3c3Ed8wg');
const MINT_STATE_PDA = new PublicKey('JSTXYDC4ATHBQbanzoEdkTyX3uYiuKfSdKiTE1eGyXv');
const TOKEN_METADATA_PROGRAM_ID = METADATA_PROGRAM_ID;
const METAPLEX_METADATA = METADATA_PROGRAM_ID;
const RPC = 'https://rpc.mainnet.x1.xyz';
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
      if (mintStateAccount && mintStateAccount.data.length >= 85) {
        const dv = new DataView(mintStateAccount.data.buffer || mintStateAccount.data);
        mintNumber = dv.getUint32(84, true);
      }

      const mintNumBytes = new Uint8Array(4);
      new DataView(mintNumBytes.buffer).setUint32(0, mintNumber, true);

      // Derive PDAs
      const mintRequestSeeds = [
        new TextEncoder().encode('mint_request'),
        wallet.publicKey.toBytes(),
        mintNumBytes,
      ];
      const [mintRequestPDA] = PublicKey.findProgramAddressSync(mintRequestSeeds, RISE_PROGRAM);

      // Create a new keypair for the NFT mint
      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;

      // Derive the minter's ATA for this NFT mint
      const minterAta = getAssociatedTokenAddressSync(nftMint, wallet.publicKey, false, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID);

      // Anchor discriminator for 'mint' instruction
      const mintDiscriminator = new Uint8Array([51, 57, 225, 47, 182, 146, 137, 166]);

      // Mint instruction — contract creates ATA via CPI if needed
      const ix = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },         // mint_state
          { pubkey: mintRequestPDA, isSigner: false, isWritable: true },         // mint_request
          { pubkey: nftMint, isSigner: true, isWritable: true },                 // nft_mint (keypair signer)
          { pubkey: minterAta, isSigner: false, isWritable: true },               // minter_ata
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },          // minter
          { pubkey: RISE_RECEIVER, isSigner: false, isWritable: true },           // treasury
          { pubkey: new PublicKey('SysvarC1ock11111111111111111111111111111111'), isSigner: false, isWritable: false }, // clock
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },  // system_program
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },       // token_program
          { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
        ],
        programId: RISE_PROGRAM,
        data: mintDiscriminator,
      });

      // Create Metaplex metadata for the NFT so wallets can display it
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), nftMint.toBuffer()],
        METADATA_PROGRAM_ID
      );

      const metadataIx = createCreateMetadataAccountV3Instruction(
        {
          metadata: metadataPDA,
          mint: nftMint,
          mintAuthority: wallet.publicKey,
          payer: wallet.publicKey,
          updateAuthority: wallet.publicKey,
        },
        {
          createMetadataAccountArgsV3: {
            data: {
              name: `RISE Phoenix #${mintNumber + 1}`,
              symbol: 'RISE',
              uri: 'https://rise-phoenix-x1.vercel.app/api/metadata/' + mintNumber,
              sellerFeeBasisPoints: 500,
              creators: [
                {
                  address: wallet.publicKey,
                  verified: false,
                  share: 100,
                },
              ],
              collection: null,
              uses: null,
            },
            isMutable: true,
            collectionDetails: null,
          },
        }
      );

      const tx = new Transaction().add(ix, metadataIx);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.partialSign(nftMintKeypair); // NFT mint keypair is a signer
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
              const palette = PALETTES[numId % PALETTES.length];
              phoenixNfts.push({
                mint: mint.toBase58(),
                name,
                symbol,
                uri,
                image,
                palette,
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
            <div className="gallery-tier-badge" style={{ color: nft.palette.accent }}>1 OF 1</div>
            <img src={nft.image} alt={nft.name} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>{nft.name}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.palette.name}</p>
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
  // Use sample images for site preview, full collection served from CDN
  const samples = [0,1,2,3,4,10,50,100,200,499];
  const IPFS = '/nft';
  if (samples.includes(id)) return `${IPFS}/${id}.jpg`;
  return `${IPFS}/${id}.jpg`;
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
            <div className="gallery-tier-badge" style={{ color: nft.palette.accent }}>1 OF 1</div>
            <img src={nft.image} alt={`Phoenix #${nft.number}`} className="gallery-img" />
            <div className="gallery-info">
              <h3 style={{ color: nft.palette.accent }}>RISE Phoenix #{nft.number}</h3>
              <p className="gallery-tier" style={{ color: nft.palette.accent }}>{nft.palette.name}</p>
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

  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

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
              <button className={`nav-btn ${page === 'mint' ? 'active' : ''}`} onClick={() => setPage('mint')}>🔥 Mint</button>
              <button className={`nav-btn ${page === 'gallery' ? 'active' : ''}`} onClick={() => setPage('gallery')}>🦅 Gallery</button>
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
              <h2>Three Tiers. Three Fires. One Legend.</h2>
              <p className="section-sub">Every phoenix is a 1-of-1 — but some burn brighter than others.</p>
              <div className="tier-cards">
                <div className="tier-card tier-ember">
                  <div className="tier-card-badge common">COMMON</div>
                  <img src="/ember-base.jpg" alt="Ember Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ff6b35' }}>EMBER</h3>
                    <p className="tier-card-desc">400 unique Fire Phoenixes. Each one burns a different color — from inferno red to acid green to deep violet. No two are alike.</p>
                    <div className="tier-card-stats">
                      <span>🔥 Common Tier</span>
                      <span>10 XNT</span>
                    </div>
                  </div>
                </div>
                <div className="tier-card tier-blaze">
                  <div className="tier-card-badge rare">RARE</div>
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
                  <div className="tier-card-badge legendary">LEGENDARY</div>
                  <img src="/genesis-base.jpg" alt="Genesis Phoenix" className="tier-card-img" />
                  <div className="tier-card-info">
                    <h3 style={{ color: '#ffdd00' }}>GENESIS</h3>
                    <p className="tier-card-desc">Only 25 ever minted. Golden cosmic phoenix with holographic frame — the most sought after in the collection.</p>
                    <div className="tier-card-stats">
                      <span>🔥 Legendary Tier</span>
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
            <section className="tiers-section" id="collection">
              <h2>500 Unique Phoenixes. Zero Duplicates.</h2>
              <p className="section-sub">3 tiers. 500 unique phoenixes. Every card burns a different color — Ember, Blaze, or Genesis. Powered by Geiger Entropy Oracle ☢️</p>
              <div className="tier-row">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="gacha-card" style={{ boxShadow: `0 0 30px ${["#ff4400","#0088ff","#ffcc00","#aa00ff","#00ff88"][i]}4D` }}>
                    <img src={["/nft/0.jpg","/nft/400.jpg","/nft/475.jpg","/nft/50.jpg","/nft/425.jpg"][i]} alt={`Phoenix sample ${i+1}`} style={{ width: '100%', borderRadius: 12, marginBottom: 12 }} />
                    <div className="gacha-rarity" style={{ color: ["#ff4400","#0088ff","#ffcc00","#aa00ff","#00ff88"][i] }}>1 OF 1</div>
                    <div className="gacha-name" style={{ color: ["#ff4400","#0088ff","#ffcc00","#aa00ff","#00ff88"][i] }}>{["Ember","Blaze","Genesis","Ember","Blaze"][i]}</div>
                    <div className="gacha-supply">{["Common Tier","Epic Tier","Legendary Tier","Common Tier","Epic Tier"][i]}</div>
                  </div>
                ))}
              </div>
              <div className="entropy-note">
                <span className="entropy-icon">☢️</span>
                <div>
                  <strong>Verifiable Randomness</strong>
                  <p>Mint order determined by the Geiger Entropy Oracle — quantum mechanical radioactive decay, locked by VDF, bound to X1 SlotHash. No one can predict, rig, or game which phoenix you get. <a href="https://github.com/echohound-labs/geiger-entropy-oracle" target="_blank" rel="noopener noreferrer">Read the docs →</a></p>
                </div>
              </div>
            </section>

            {/* Phoenix Vibe Preview */}
            <section className="vibe-section">
              <h2>Same Bird. Different Fire.</h2>
              <p className="section-sub">Every phoenix shares the same soul. Each one burns a different color in a different cosmos. 500 one-of-ones.</p>
              <div className="vibe-preview">
                <img src="/nft/0.jpg" alt="RISE Phoenix" className="vibe-img" />
              </div>
            </section>

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
                <img src="/nft/0.jpg" alt="RISE Phoenix" className="mint-hero-img" />
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
                                        <>
                      <div className="wallet-area"><WalletMultiButton /></div>
                      <MintButton onMintSuccess={() => setPage('gallery')} />
                    </>
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