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


function useMintStats() {
  const { connection } = useConnection();
  const [stats, setStats] = useState({ total: 0, ember: 0, blaze: 0, genesis: 0, loaded: false });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const acc = await connection.getAccountInfo(MINT_STATE_PDA);
        if (!acc || acc.data.length < 12) return;
        const total = acc.data[8] | (acc.data[9] << 8) | (acc.data[10] << 16) | (acc.data[11] << 24);
        const ember = Math.min(total, 400);
        const blaze = Math.max(0, Math.min(total - 400, 75));
        const genesis = Math.max(0, total - 475);
        if (!cancelled) setStats({ total, ember, blaze, genesis, loaded: true });
      } catch(e) {}
    })();
    return () => { cancelled = true; };
  }, [connection]);
  return stats;
}

function MintReveal({ mintNumber, onClose, onViewGallery }) {
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
        <button className="reveal-close" onClick={() => { onClose(); onViewGallery && onViewGallery(); }} style={{ background: palette.accent }}>🦅 View in Gallery</button>
      </div>
    </div>
  );
}

function MintButton({ onMintSuccess, onViewGallery }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [step, setStep] = useState('idle'); // idle | requesting | waiting | fulfilling | done
  const [error, setError] = useState(null);
  const [revealNumber, setRevealNumber] = useState(null);
  const [txSig, setTxSig] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const GEIGER_PROGRAM = new PublicKey('2dQf9uaCzXewrDNLttmtzQmc3SmqfAHz3qahKQjtGQyY');
  const METADATA_PROGRAM_PUBKEY = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

  const [oracleStatePDA] = PublicKey.findProgramAddressSync([Buffer.from('oracle_state')], GEIGER_PROGRAM);
  const [entropyPoolPDA] = PublicKey.findProgramAddressSync([Buffer.from('entropy_pool')], GEIGER_PROGRAM);

  const pollRandomness = useCallback(async (randomnessRequestPDA) => {
    let attempts = 0;
    const maxAttempts = 60; // 120 seconds max
    setCountdown(120);
    
    const interval = setInterval(() => {
      setCountdown(c => Math.max(0, c - 2));
    }, 2000);

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 2000));
      attempts++;
      try {
        const acc = await connection.getAccountInfo(randomnessRequestPDA);
        if (!acc) continue;
        const data = acc.data;
        // offset 72 = discriminator(8) + requester(32) + user_seed(32)
        const status = data[104];
        if (status === 1) { // Fulfilled
          clearInterval(interval);
          return data.slice(72, 104); // result bytes
        }
      } catch(e) { /* keep polling */ }
    }
    clearInterval(interval);
    throw new Error('Randomness timed out — try again');
  }, [connection]);

  const mint = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setError(null);
    setRevealNumber(null);

    try {
      // ── STEP 1: Request Randomness ──
      setStep('requesting');

      const [pendingMintPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pending_mint'), wallet.publicKey.toBuffer()],
        RISE_PROGRAM
      );

      // Derive randomness request PDA
      const mintStateAccount = await connection.getAccountInfo(MINT_STATE_PDA);
      const oracleAcc = await connection.getAccountInfo(oracleStatePDA);
      // total_requests is at offset 8+4+32+8+8 = 60 in OracleState
      const totalRequests = oracleAcc ? 
        Number(oracleAcc.data.readBigUInt64LE(60)) : 0;

      const [randomnessRequestPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('rand_request'),
          wallet.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new BigUint64Array([BigInt(totalRequests)]).buffer))
        ],
        GEIGER_PROGRAM
      );

      // request_mint discriminator
      const requestDiscriminator = Buffer.from([130, 38, 27, 69, 46, 211, 135, 145]);

      const requestIx = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: pendingMintPDA, isSigner: false, isWritable: true },
          { pubkey: oracleStatePDA, isSigner: false, isWritable: true },
          { pubkey: entropyPoolPDA, isSigner: false, isWritable: false },
          { pubkey: randomnessRequestPDA, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: RISE_PROGRAM,
        data: requestDiscriminator,
      });

      const tx1 = new Transaction().add(requestIx);
      const { blockhash: bh1 } = await connection.getLatestBlockhash();
      tx1.recentBlockhash = bh1;
      tx1.feePayer = wallet.publicKey;
      const signed1 = await wallet.signTransaction(tx1);
      const sig1 = await connection.sendRawTransaction(signed1.serialize());
      await connection.confirmTransaction(sig1, 'confirmed');

      // ── STEP 2: Wait for Geiger to fulfill ──
      setStep('waiting');
      const resultBytes = await pollRandomness(randomnessRequestPDA);

      // ── STEP 3: Fulfill Mint ──
      setStep('fulfilling');

      const nftMintKeypair = Keypair.generate();
      const nftMint = nftMintKeypair.publicKey;
      const [metadataPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), METADATA_PROGRAM_PUBKEY.toBuffer(), nftMint.toBuffer()],
        METADATA_PROGRAM_PUBKEY
      );
      const minterAta = getAssociatedTokenAddressSync(nftMint, wallet.publicKey);

      // fulfill_mint discriminator  
      const fulfillDiscriminator = Buffer.from([57, 64, 56, 56, 44, 114, 224, 165]);

      const fulfillIx = new TransactionInstruction({
        keys: [
          { pubkey: MINT_STATE_PDA, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: pendingMintPDA, isSigner: false, isWritable: true },
          { pubkey: randomnessRequestPDA, isSigner: false, isWritable: false },
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
        data: fulfillDiscriminator,
      });

      const tx2 = new Transaction().add(fulfillIx);
      const { blockhash: bh2 } = await connection.getLatestBlockhash();
      tx2.recentBlockhash = bh2;
      tx2.feePayer = wallet.publicKey;
      tx2.partialSign(nftMintKeypair);
      const signed2 = await wallet.signTransaction(tx2);
      const sig2 = await connection.sendRawTransaction(signed2.serialize());
      await connection.confirmTransaction(sig2, 'confirmed');

      // Get mint number from result bytes
      const random_u32 = resultBytes[0] | (resultBytes[1] << 8) | (resultBytes[2] << 16) | (resultBytes[3] << 24);
      const mintStateAcc = await connection.getAccountInfo(MINT_STATE_PDA);
      const totalMinted = mintStateAcc.data[8] | (mintStateAcc.data[9] << 8) | (mintStateAcc.data[10] << 16) | (mintStateAcc.data[11] << 24);
      const mintNumber = (totalMinted - 1 + (random_u32 % totalMinted)) % 500;

      setTxSig(sig2);
      setRevealNumber(mintNumber);
      setStep('done');
      if (onMintSuccess) onMintSuccess();

    } catch (e) {
      setError(e.message?.slice(0, 300) || 'Transaction failed');
      setStep('idle');
    }
  }, [wallet, connection, pollRandomness]);

  if (!wallet.connected) return null;

  const buttonLabel = {
    idle: `🔥 Mint — ${MINT_PRICE} XNT`,
    requesting: '☢️ Requesting Randomness...',
    waiting: `⏳ Geiger Generating... ${countdown}s`,
    fulfilling: '🔥 Minting Your Phoenix...',
    done: '✅ Minted!',
  }[step];

  return (
    <div className="mint-area">
      <MintReveal mintNumber={revealNumber} onClose={() => { setRevealNumber(null); setStep('idle'); }} onViewGallery={onViewGallery} />
      
      {(step === 'waiting' || step === 'requesting' || step === 'fulfilling') && (
        <div className="geiger-waiting">
          <div className="geiger-pulse">☢️</div>
          <div className="geiger-steps">
            <div className={`geiger-step ${step === 'requesting' ? 'active' : step !== 'idle' ? 'done' : ''}`}>
              <span className="geiger-step-icon">1</span>
              <span>Randomness Requested</span>
            </div>
            <div className="geiger-step-line" />
            <div className={`geiger-step ${step === 'waiting' ? 'active' : step === 'fulfilling' || step === 'done' ? 'done' : ''}`}>
              <span className="geiger-step-icon">2</span>
              <span>☢️ Geiger Decay Event</span>
            </div>
            <div className="geiger-step-line" />
            <div className={`geiger-step ${step === 'fulfilling' ? 'active' : step === 'done' ? 'done' : ''}`}>
              <span className="geiger-step-icon">3</span>
              <span>Quantum Reveal</span>
            </div>
          </div>
          {step === 'waiting' && (
            <>
              <p style={{color:'var(--text2)', fontSize:'.9rem', margin:'.75rem 0 .25rem'}}>
                Waiting for radioactive decay event on-chain...
              </p>
              <p className="geiger-countdown">{countdown}s</p>
              <div className="geiger-bar"><div className="geiger-bar-fill" style={{width: `${((120-countdown)/120)*100}%`}}/></div>
              <p style={{color:'var(--text2)', fontSize:'.75rem', marginTop:'.5rem', opacity:.6}}>
                Your NFT number is being determined by physical quantum randomness — verifiable on-chain
              </p>
            </>
          )}
          {step === 'fulfilling' && (
            <p style={{color:'var(--accent)', fontWeight:700, marginTop:'1rem'}}>🔥 Minting your phoenix...</p>
          )}
        </div>
      )}

      <button className="mint-btn" onClick={mint} disabled={step !== 'idle' && step !== 'done'}>
        {buttonLabel}
      </button>

      {txSig && step === 'done' && (
        <p className="mint-success">
          ✅ Minted! Tx:{' '}
          <a href={`https://explorer.x1.xyz/tx/${txSig}`} target="_blank" rel="noopener noreferrer">
            {txSig.slice(0, 12)}...
          </a>
        </p>
      )}
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
        if (!mintStateAccount || mintStateAccount.data.length < 12) {
          setLoading(false);
          return;
        }
        const dv = new DataView(mintStateAccount.data.buffer || mintStateAccount.data);
        const totalMinted = dv.getUint32(8, true);
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


function MintStats() {
  const stats = useMintStats();
  const remaining = 500 - stats.total;
  const emberLeft = 400 - stats.ember;
  const blazeLeft = 75 - stats.blaze;
  const genesisLeft = 25 - stats.genesis;
  return (
    <div className="mint-stats-block">
      <div className="mint-specs">
        <div className="mint-spec"><span className="mint-spec-label">Collection</span><span className="mint-spec-value">Series 1</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Minted</span><span className="mint-spec-value" style={{color:'var(--accent)'}}>{stats.loaded ? `${stats.total} / 500` : '...'}</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Price</span><span className="mint-spec-value">10 XNT</span></div>
        <div className="mint-spec"><span className="mint-spec-label">Remaining</span><span className="mint-spec-value" style={{color:'#22c55e'}}>{stats.loaded ? remaining : '...'}</span></div>
      </div>
      {stats.loaded && (
        <div className="tier-progress">
          <div className="tier-prog-row">
            <span style={{color:'#ff6b35'}}>🔥 Ember</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.ember/400)*100}%`, background:'#ff6b35'}}/></div>
            <span style={{color:'#ff6b35'}}>{emberLeft} left</span>
          </div>
          <div className="tier-prog-row">
            <span style={{color:'#8800ff'}}>⚡ Blaze</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.blaze/75)*100}%`, background:'#8800ff'}}/></div>
            <span style={{color:'#8800ff'}}>{blazeLeft} left</span>
          </div>
          <div className="tier-prog-row">
            <span style={{color:'#ffdd00'}}>✨ Genesis</span>
            <div className="tier-prog-bar"><div className="tier-prog-fill" style={{width:`${(stats.genesis/25)*100}%`, background:'#ffdd00'}}/></div>
            <span style={{color:'#ffdd00'}}>{genesisLeft} left</span>
          </div>
        </div>
      )}
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
                  <MintStats />
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
                    <MintButton onMintSuccess={() => {}} onViewGallery={() => setPage('gallery')} />
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