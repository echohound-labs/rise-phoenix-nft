import { useState, useCallback } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
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
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  MINT_SIZE,
} from '@solana/spl-token';
import '@solana/wallet-adapter-react-ui/styles.css';
import './App.css';

const RISE_RECEIVER = new PublicKey('G3YeRfM65HuWkLQztPcGSudoR37gNHvaeXqYn79Ac3x7');
const RISE_PROGRAM = new PublicKey('2TAHRJHb5WWuxTcXQLitwn5K6T2nZMe9papa3c3Ed8wg');
const MINT_STATE_PDA = new PublicKey('JSTXYDC4ATHBQbanzoEdkTyX3uYiuKfSdKiTE1eGyXv');
const RPC = 'https://rpc.mainnet.x1.xyz';
const MINT_PRICE = 10;

const TIERS = [
  {
    name: 'Ember',
    rarity: 'Common',
    chance: '80%',
    supply: 400,
    desc: 'Same fire, different color. Unique phoenix, common rarity.',
    color: '#ff6b35',
    glow: 'rgba(255,107,53,.3)',
  },
  {
    name: 'Blaze',
    rarity: 'Rare',
    chance: '15%',
    supply: 75,
    desc: 'Same bird, rarer burn. Enhanced glow effects, unique palette.',
    color: '#7c3aed',
    glow: 'rgba(124,58,237,.3)',
  },
  {
    name: 'Genesis',
    rarity: 'Legendary',
    chance: '5%',
    supply: 25,
    desc: 'The rarest flame. Galaxy-core phoenix, one-of-25 ever.',
    color: '#ffd700',
    glow: 'rgba(255,215,0,.4)',
  },
];

const COLOR_VARIANTS = [
  { name: 'Solar Gold', bg: '#1a0a2e', accent: '#ffd700', glow: 'rgba(255,215,0,.4)' },
  { name: 'Crimson Blaze', bg: '#2a0a0a', accent: '#ff3333', glow: 'rgba(255,51,51,.4)' },
  { name: 'Void Violet', bg: '#0a0a2e', accent: '#9b59b6', glow: 'rgba(155,89,182,.4)' },
  { name: 'Neon Cyan', bg: '#0a1a2e', accent: '#00e5ff', glow: 'rgba(0,229,255,.4)' },
  { name: 'Emerald Flame', bg: '#0a2a1a', accent: '#00e676', glow: 'rgba(0,230,118,.4)' },
  { name: 'Phantom Pink', bg: '#2a0a2a', accent: '#ff4081', glow: 'rgba(255,64,129,.4)' },
  { name: 'Arctic White', bg: '#0a1a2a', accent: '#e0e0e0', glow: 'rgba(224,224,224,.3)' },
  { name: 'Inferno Orange', bg: '#1a0a00', accent: '#ff6b35', glow: 'rgba(255,107,53,.4)' },
];

function MintButton() {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [txSig, setTxSig] = useState(null);
  const [error, setError] = useState(null);
  const [minted, setMinted] = useState(0);

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

      const ix = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },         // mint_state
          { pubkey: mintRequestPDA, isSigner: false, isWritable: true },         // mint_request
          { pubkey: nftMint, isSigner: false, isWritable: true },                // nft_mint
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

      const tx = new Transaction().add(ix);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;
      tx.partialSign(nftMintKeypair); // NFT mint keypair is a signer
      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(sig, 'confirmed');
      setTxSig(sig);
      setMinted((m) => m + 1);
    } catch (e) {
      setError(e.message?.slice(0, 300) || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  if (!wallet.connected) return null;

  return (
    <div className="mint-area">
      <button className="mint-btn" onClick={mint} disabled={loading}>
        {loading ? 'Minting...' : `🔥 Mint — ${MINT_PRICE} XNT`}
      </button>
      {txSig && (
        <p className="mint-success">
          ✅ Minted! Tx:{' '}
          <a href={`https://explorer.x1.xyz/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
            {txSig.slice(0, 12)}...
          </a>
        </p>
      )}
      {minted > 0 && <p className="mint-count">🔥 You've minted {minted} phoenix{minted > 1 ? 'es' : ''}</p>}
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
            <li><strong>Randomized Mint.</strong> The tier of your NFT (Ember/Blaze/Genesis) is determined by on-chain randomness from the Geiger Entropy Oracle. Results are unpredictable and final.</li>
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
      {COLOR_VARIANTS.map((v, i) => (
        <div
          key={i}
          className="color-swatch"
          style={{ background: v.bg, boxShadow: `0 0 20px ${v.glow}, inset 0 0 30px ${v.glow}` }}
        >
          <div className="swatch-accent" style={{ background: v.accent }} />
          <span className="swatch-name" style={{ color: v.accent }}>{v.name}</span>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const wallets = useCallback(() => [
    new BackpackWalletAdapter(),
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ], []);

  const handleAgree = () => {
    setAgreed(true);
    setShowDisclaimer(false);
  };

  return (
    <ConnectionProvider endpoint={RPC}>
      <WalletProvider wallets={wallets()} autoConnect>
        <WalletModalProvider>
          <div className="app">
            {/* Hero */}
            <section className="hero">
              <div className="particles">{Array.from({ length: 20 }).map((_, i) => <span key={i} className="particle" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 6}s`, animationDuration: `${4 + Math.random() * 4}s` }} />)}</div>
              <div className="hero-content">
                <span className="hero-badge">X1 Network · Series 1 of 3 · Powered by Geiger Entropy Oracle ☢️</span>
                <h1>RISE Phoenix</h1>
                <p>500 unique phoenixes. Same bird, different fire. Mint for 10 XNT — on-chain randomness decides your tier. Ember, Blaze, or Genesis?</p>
                <div className="stats">
                  <div className="stat"><div className="stat-num">500</div><div className="stat-label">Total NFTs</div></div>
                  <div className="stat"><div className="stat-num">10</div><div className="stat-label">XNT Per Mint</div></div>
                  <div className="stat"><div className="stat-num">☢️</div><div className="stat-label">Geiger Random</div></div>
                  <div className="stat"><div className="stat-num">100%</div><div className="stat-label">→ Buy & Burn</div></div>
                </div>
                <a href="#mint" className="cta">Mint Your Phoenix ↓</a>
              </div>
            </section>

            {/* Gacha Tiers */}
            <section className="tiers-section" id="tiers">
              <h2>One Mint. Three Possible Outcomes.</h2>
              <p className="section-sub">On-chain randomness from radioactive decay decides your tier. Every mint is a reveal.</p>
              <div className="tier-row">
                {TIERS.map((t) => (
                  <div key={t.name} className="gacha-card" style={{ boxShadow: `0 0 30px ${t.glow}` }}>
                    <div className="gacha-rarity" style={{ color: t.color }}>{t.rarity}</div>
                    <div className="gacha-name" style={{ color: t.color }}>{t.name}</div>
                    <div className="gacha-chance">
                      <span className="gacha-pct" style={{ color: t.color }}>{t.chance}</span>
                      <span className="gacha-label">chance</span>
                    </div>
                    <div className="gacha-supply">{t.supply} of 500</div>
                    <p className="gacha-desc">{t.desc}</p>
                  </div>
                ))}
              </div>
              <div className="entropy-note">
                <span className="entropy-icon">☢️</span>
                <div>
                  <strong>Verifiable Randomness</strong>
                  <p>Tier determination uses the Geiger Entropy Oracle — quantum mechanical radioactive decay, locked by VDF, bound to X1 SlotHash, mixed into SHA256 chained pool. No one can predict, rig, or game the outcome. <a href="https://github.com/echohound-labs/geiger-entropy-oracle" target="_blank" rel="noopener noreferrer">Read the docs →</a></p>
                </div>
              </div>
            </section>

            {/* Phoenix Vibe Preview */}
            <section className="vibe-section">
              <h2>Same Bird. Different Fire.</h2>
              <p className="section-sub">Every phoenix shares the same cyber-mystic soul. Each one burns a different color in a different cosmos.</p>
              <div className="vibe-preview">
                <img src="/phoenix-vibe.jpg" alt="RISE Phoenix" className="vibe-img" />
              </div>
              <ColorShowcase />
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
                  <div className="engine-step">☢️ <br/>Geiger Oracle<br/>Decides Tier</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-step">💰 <br/>$RISE<br/>Collected</div>
                  <div className="engine-arrow">→</div>
                  <div className="engine-split">
                    <div className="engine-step burn">🔥 30%<br/>Buy & Burn</div>
                    <div className="engine-step lp">💧 70%<br/>→ Liquidity</div>
                  </div>
                </div>
                <p className="engine-note">Supply decreases · Liquidity increases · Randomness is verifiable</p>
              </div>
            </section>

            {/* Mint Section */}
            <section className="mint-section" id="mint">
              <h2>Mint Your Phoenix — Series 1</h2>
              <p className="section-sub">10 XNT · 500 total · Random tier · Powered by Geiger Entropy ☢️</p>
              <div className="mint-card">
                <img src="/phoenix-vibe.jpg" alt="RISE Phoenix" className="mint-hero-img" />
                <div className="mint-info">
                  <div className="mint-specs">
                    <div className="mint-spec"><span className="mint-spec-label">Collection</span><span className="mint-spec-value">Series 1</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Supply</span><span className="mint-spec-value">500</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Price</span><span className="mint-spec-value">10 XNT</span></div>
                    <div className="mint-spec"><span className="mint-spec-label">Randomness</span><span className="mint-spec-value">☢️ Geiger Oracle</span></div>
                  </div>
                  <ul className="mint-perks">
                    <li>80% chance → Ember (common) · 15% → Blaze (rare) · 5% → Genesis (legendary)</li>
                    <li>Every phoenix is 1-of-1 — different colors, different cosmos</li>
                    <li>Tier determined by quantum radioactive decay on-chain — verifiable, not manipulable</li>
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
                      <MintButton />
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

            {/* Footer */}
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

export default App;