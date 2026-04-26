// mint-nft.js - Mint NFT to RISE Collection on Solaris Prime
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, ComputeBudgetProgram, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";

const RPC_URL = "https://rpc.mainnet.x1.xyz";
const COLLECTION_MINTER_PROGRAM = new PublicKey("52bbc2ZApmC7EVvXBvYwzCaAx49R6iB68Hq7oUMid1tj");
const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111");

async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const collectionMint = args.find(a => a.startsWith("--collection="))?.split("=")[1];
  const name = args.find(a => a.startsWith("--name="))?.split("=")[1];
  const uri = args.find(a => a.startsWith("--uri="))?.split("=")[1];
  const symbol = args.find(a => a.startsWith("--symbol="))?.split("=")[1] || "RISE";
  const sellerFee = parseInt(args.find(a => a.startsWith("--seller-fee="))?.split("=")[1] || "500");
  
  if (!collectionMint || !name || !uri) {
    console.log("Usage: node mint-nft.js --collection=<MINT> --name=<NAME> --uri=<URI> [--symbol=RISE] [--seller-fee=500]");
    process.exit(1);
  }
  
  // Load wallet
  const secretKey = JSON.parse(fs.readFileSync(process.env.WALLET_KEY_PATH || `${process.env.HOME}/.config/solana/id.json`, "utf-8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  console.log("Payer:", payer.publicKey.toBase58());
  console.log("\nMinting NFT:");
  console.log("  Collection:", collectionMint);
  console.log("  Name:", name);
  console.log("  URI:", uri);
  
  // Load collection data
  const collectionData = JSON.parse(fs.readFileSync("collection-data.json", "utf-8"));
  
  // Generate NFT mint
  const nftMint = Keypair.generate();
  console.log("\nNFT Mint:", nftMint.publicKey.toBase58());
  
  // Derive PDAs
  const collectionMintPubkey = new PublicKey(collectionMint);
  const collectionAuthorityPda = new PublicKey(collectionData.collectionAuthorityPda);
  const minterConfigPda = new PublicKey(collectionData.minterConfigPda);
  const collectionMetadataPda = new PublicKey(collectionData.collectionMetadataPda);
  const collectionMasterEditionPda = new PublicKey(collectionData.collectionMasterEditionPda);
  
  const [nftMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const [nftMasterEditionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const payerAta = await getAssociatedTokenAddress(nftMint.publicKey, payer.publicKey);
  
  // Build instruction data
  const nameBuf = Buffer.from(name);
  const symbolBuf = Buffer.from(symbol);
  const uriBuf = Buffer.from(uri);
  
  const data = Buffer.concat([
    Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]), // Placeholder discriminator for MintToCollection
    Buffer.from(new Uint32Array([nameBuf.length]).buffer), nameBuf,
    Buffer.from(new Uint32Array([symbolBuf.length]).buffer), symbolBuf,
    Buffer.from(new Uint32Array([uriBuf.length]).buffer), uriBuf,
    Buffer.from(new Uint16Array([sellerFee]).buffer),
    Buffer.from([0]), // creators vec length
  ]);
  
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: collectionMintPubkey, isSigner: false, isWritable: false },
    { pubkey: collectionAuthorityPda, isSigner: false, isWritable: false },
    { pubkey: nftMint.publicKey, isSigner: true, isWritable: true },
    { pubkey: payerAta, isSigner: false, isWritable: true },
    { pubkey: nftMetadataPda, isSigner: false, isWritable: true },
    { pubkey: nftMasterEditionPda, isSigner: false, isWritable: true },
    { pubkey: collectionMetadataPda, isSigner: false, isWritable: false },
    { pubkey: collectionMasterEditionPda, isSigner: false, isWritable: false },
    { pubkey: minterConfigPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  const mintIx = new TransactionInstruction({
    keys,
    programId: COLLECTION_MINTER_PROGRAM,
    data,
  });
  
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    mintIx
  );
  
  console.log("\nSending transaction...");
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, nftMint]);
    console.log("✅ NFT minted!");
    console.log("TX:", sig);
    console.log("Mint:", nftMint.publicKey.toBase58());
  } catch (err) {
    console.error("❌ Failed to mint NFT:", err.message);
    process.exit(1);
  }
}

main().catch(console.error);
