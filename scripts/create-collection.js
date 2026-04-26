// create-collection.js - Create RISE Phoenix Collection on Solaris Prime
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction, sendAndConfirmTransaction, ComputeBudgetProgram, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import fs from "fs";

const RPC_URL = "https://rpc.mainnet.x1.xyz";
const COLLECTION_MINTER_PROGRAM = new PublicKey("52bbc2ZApmC7EVvXBvYwzCaAx49R6iB68Hq7oUMid1tj");
const RENT_SYSVAR = new PublicKey("SysvarRent111111111111111111111111111111111");

// Create Collection Minter discriminator (8 bytes)
// This would be the actual discriminator for the CreateCollection instruction
const CREATE_COLLECTION_DISCRIMINATOR = Buffer.from([/* Need actual discriminator from IDL */]);

async function main() {
  // Load wallet
  const secretKey = JSON.parse(fs.readFileSync(process.env.WALLET_KEY_PATH || `${process.env.HOME}/.config/solana/id.json`, "utf-8"));
  const payer = Keypair.fromSecretKey(new Uint8Array(secretKey));
  
  const connection = new Connection(RPC_URL, "confirmed");
  
  console.log("Payer:", payer.publicKey.toBase58());
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / 1e9, "XNT");
  
  if (balance < 0.1 * 1e9) {
    console.error("ERROR: Insufficient balance for collection creation");
    process.exit(1);
  }
  
  // Collection config
  const config = {
    name: "RISE Phoenix Series 1",
    symbol: "RISE",
    uri: "https://arweave.net/rise-collection-metadata.json", // Will need actual URI
    sellerFeeBasisPoints: 500, // 5%
    mintMode: 1, // Permissionless (0 = OwnerOnly)
    maxSupply: 100,
  };
  
  console.log("\nCreating collection...");
  console.log("Name:", config.name);
  console.log("Symbol:", config.symbol);
  console.log("Max Supply:", config.maxSupply);
  console.log("Mint Mode:", config.mintMode === 1 ? "Permissionless" : "OwnerOnly");
  
  // Generate collection mint
  const collectionMint = Keypair.generate();
  console.log("\nCollection Mint:", collectionMint.publicKey.toBase58());
  
  // Derive PDAs
  const [collectionAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("collection_authority"), collectionMint.publicKey.toBuffer()],
    COLLECTION_MINTER_PROGRAM
  );
  
  const [minterConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("minter_config"), collectionMint.publicKey.toBuffer()],
    COLLECTION_MINTER_PROGRAM
  );
  
  const [collectionMetadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const [collectionMasterEditionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), collectionMint.publicKey.toBuffer(), Buffer.from("edition")],
    TOKEN_METADATA_PROGRAM_ID
  );
  
  const payerAta = await getAssociatedTokenAddress(collectionMint.publicKey, payer.publicKey);
  
  // Build instruction data
  // Layout: discriminator + name_len + name + symbol_len + symbol + uri_len + uri + seller_fee + creators_len + creators + mint_mode + max_supply
  const nameBuf = Buffer.from(config.name);
  const symbolBuf = Buffer.from(config.symbol);
  const uriBuf = Buffer.from(config.uri);
  
  const data = Buffer.concat([
    Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), // Placeholder discriminator
    Buffer.from(new Uint32Array([nameBuf.length]).buffer), nameBuf,
    Buffer.from(new Uint32Array([symbolBuf.length]).buffer), symbolBuf,
    Buffer.from(new Uint32Array([uriBuf.length]).buffer), uriBuf,
    Buffer.from(new Uint16Array([config.sellerFeeBasisPoints]).buffer),
    Buffer.from([0]), // creators vec length (0 for now)
    Buffer.from([config.mintMode]),
    Buffer.from(new BigUint64Array([BigInt(config.maxSupply)]).buffer),
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
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
    { pubkey: TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
  ];
  
  const createIx = new TransactionInstruction({
    keys,
    programId: COLLECTION_MINTER_PROGRAM,
    data,
  });
  
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    createIx
  );
  
  console.log("\nSending transaction...");
  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [payer, collectionMint]);
    console.log("✅ Collection created!");
    console.log("TX:", sig);
    
    // Save collection data
    const collectionData = {
      collectionMint: collectionMint.publicKey.toBase58(),
      collectionAuthorityPda: collectionAuthorityPda.toBase58(),
      minterConfigPda: minterConfigPda.toBase58(),
      collectionMetadataPda: collectionMetadataPda.toBase58(),
      collectionMasterEditionPda: collectionMasterEditionPda.toBase58(),
      createdAt: new Date().toISOString(),
    };
    
    fs.writeFileSync("collection-data.json", JSON.stringify(collectionData, null, 2));
    console.log("\nCollection data saved to collection-data.json");
    
  } catch (err) {
    console.error("❌ Failed to create collection:", err.message);
    process.exit(1);
  }
}

main().catch(console.error);
