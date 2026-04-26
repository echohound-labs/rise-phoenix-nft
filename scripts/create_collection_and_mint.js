// RISE Phoenix Collection - Create Collection and Mint NFTs on Solaris Prime
// Uses Collection Minter program: 52bbc2ZApmC7EVvXBvYwzCaAx49R6iB68Hq7oUMid1tj

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
  createCreateMasterEditionV3Instruction,
} from "@metaplex-foundation/mpl-token-metadata";
import * as fs from "fs";
import * as path from "path";

// Configuration
const RPC_URL = "https://rpc.mainnet.x1.xyz";
const COLLECTION_MINTER_PROGRAM = new PublicKey("52bbc2ZApmC7EVvXBvYwzCaAx49R6iB68Hq7oUMid1tj");
const MARKETPLACE_PROGRAM = new PublicKey("FHqyYq2kQAGZp9mmXt8NxGGn9NTK17nGJ3DeZnfM2DLT");

// Load wallet from environment or file
function loadWallet() {
  const keyPath = process.env.WALLET_KEY_PATH || "/home/jack/.config/solana/id.json";
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Wallet not found at ${keyPath}`);
  }
  const secretKey = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

// Create Collection
async function createCollection(connection, payer, config) {
  console.log("Creating RISE Phoenix Collection...");
  
  // Generate new collection mint
  const collectionMint = Keypair.generate();
  console.log(`Collection mint: ${collectionMint.publicKey.toBase58()}`);
  
  // Derive PDAs
  const [collectionAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_authority"), collectionMint.publicKey.toBuffer()],
    COLLECTION_MINTER_PROGRAM
  );
  
  const [minterConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("minter_config"), collectionMint.publicKey.toBuffer()],
    COLLECTION_MINTER_PROGRAM
  );
  
  const collectionMetadataPda = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  
  const collectionMasterEditionPda = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMint.publicKey.toBuffer(), Buffer.from("edition")],
    TOKEN_METADATA_PROGRAM_ID
  )[0];
  
  const payerAta = await getAssociatedTokenAddress(collectionMint.publicKey, payer.publicKey);
  
  // Build instruction data
  // Discriminator + name + symbol + uri + seller_fee_basis_points + creators + mint_mode + max_supply
  const nameBuffer = Buffer.from(config.name);
  const symbolBuffer = Buffer.from(config.symbol);
  const uriBuffer = Buffer.from(config.uri);
  
  const instructionData = Buffer.concat([
    Buffer.from([/* discriminator bytes - 8 bytes */]),
    Buffer.from([nameBuffer.length]), nameBuffer,
    Buffer.from([symbolBuffer.length]), symbolBuffer,
    Buffer.from([uriBuffer.length]), uriBuffer,
    Buffer.from(new Uint16Array([config.sellerFeeBasisPoints]).buffer), // u16 LE
    Buffer.from([config.creators.length]), // creators vec length
    ...config.creators.map(c => Buffer.concat([
      c.address.toBuffer(),
      Buffer.from([c.verified ? 1 : 0]),
      Buffer.from([c.share]),
    ])),
    Buffer.from([config.mintMode]), // 0=OwnerOnly, 1=Permissionless
    Buffer.from(new BigInt64Array([BigInt(config.maxSupply)]).buffer), // u64 LE
  ]);
  
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: collectionAuthorityPda, isSigner: false, isWritable: true },
    { pubkey: collectionMint.publicKey, isSigner: true, isWritable: true },
    { pubkey: payerAta, isSigner: false, isWritable: true },
    { pubkey: collectionMetadataPda, isSigner: false, isWritable: true },
    { pubkey: collectionMasterEditionPda, isSigner: false, isWritable: true },
    { pubkey: minterConfigPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  const createIx = new TransactionInstruction({
    keys,
    programId: COLLECTION_MINTER_PROGRAM,
    data: instructionData,
  });
  
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    createIx
  );
  
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, collectionMint]);
  console.log(`Collection created! TX: ${sig}`);
  
  return {
    collectionMint: collectionMint.publicKey,
    collectionAuthorityPda,
    minterConfigPda,
    collectionMetadataPda,
    collectionMasterEditionPda,
  };
}

// Mint NFT to Collection
async function mintNFT(connection, payer, collectionData, nftConfig, index) {
  console.log(`Minting NFT #${index + 1}...`);
  
  const nftMint = Keypair.generate();
  
  const [nftMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const [nftMasterEditionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), nftMint.publicKey.toBuffer(), Buffer.from("edition")],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const payerAta = await getAssociatedTokenAddress(nftMint.publicKey, payer.publicKey);
  
  // Build mint instruction
  const nameBuffer = Buffer.from(nftConfig.name);
  const symbolBuffer = Buffer.from(nftConfig.symbol);
  const uriBuffer = Buffer.from(nftConfig.uri);
  
  const instructionData = Buffer.concat([
    Buffer.from([/* discriminator */]),
    Buffer.from([nameBuffer.length]), nameBuffer,
    Buffer.from([symbolBuffer.length]), symbolBuffer,
    Buffer.from([uriBuffer.length]), uriBuffer,
    Buffer.from(new Uint16Array([nftConfig.sellerFeeBasisPoints]).buffer),
    Buffer.from([nftConfig.creators.length]),
    ...nftConfig.creators.map(c => Buffer.concat([
      c.address.toBuffer(),
      Buffer.from([c.verified ? 1 : 0]),
      Buffer.from([c.share]),
    ])),
  ]);
  
  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: collectionData.collectionMint, isSigner: false, isWritable: false },
    { pubkey: collectionData.collectionAuthorityPda, isSigner: false, isWritable: false },
    { pubkey: nftMint.publicKey, isSigner: true, isWritable: true },
    { pubkey: payerAta, isSigner: false, isWritable: true },
    { pubkey: nftMetadataPda, isSigner: false, isWritable: true },
    { pubkey: nftMasterEditionPda, isSigner: false, isWritable: true },
    { pubkey: collectionData.collectionMetadataPda, isSigner: false, isWritable: false },
    { pubkey: collectionData.collectionMasterEditionPda, isSigner: false, isWritable: false },
    { pubkey: collectionData.minterConfigPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  const mintIx = new TransactionInstruction({
    keys,
    programId: COLLECTION_MINTER_PROGRAM,
    data: instructionData,
  });
  
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    mintIx
  );
  
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, nftMint]);
  console.log(`NFT #${index + 1} minted! TX: ${sig}`);
  
  return {
    mint: nftMint.publicKey,
    signature: sig,
  };
}

// Main execution
async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const payer = loadWallet();
  
  console.log(`Payer: ${payer.publicKey.toBase58()}`);
  console.log(`Balance: ${await connection.getBalance(payer.publicKey) / 1e9} XNT`);
  
  // Collection config
  const collectionConfig = {
    name: "RISE Phoenix Series 1",
    symbol: "RISE",
    uri: "https://rise-nft.xyz/metadata/collection.json", // Will need to be hosted
    sellerFeeBasisPoints: 500, // 5% royalty
    creators: [
      { address: payer.publicKey, verified: true, share: 100 },
    ],
    mintMode: 1, // Permissionless
    maxSupply: 100,
  };
  
  // Create collection
  const collectionData = await createCollection(connection, payer, collectionConfig);
  
  // Save collection data
  fs.writeFileSync(
    "/home/jack/newtheo/workspace-cyberdyne/rise-nft/scripts/collection_data.json",
    JSON.stringify({
      collectionMint: collectionData.collectionMint.toBase58(),
      collectionAuthorityPda: collectionData.collectionAuthorityPda.toBase58(),
      minterConfigPda: collectionData.minterConfigPda.toBase58(),
      collectionMetadataPda: collectionData.collectionMetadataPda.toBase58(),
      collectionMasterEditionPda: collectionData.collectionMasterEditionPda.toBase58(),
    }, null, 2)
  );
  
  console.log("\nCollection data saved to collection_data.json");
  console.log("Next: Upload images to IPFS and mint NFTs");
}

main().catch(console.error);
