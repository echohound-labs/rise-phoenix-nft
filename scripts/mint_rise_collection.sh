#!/bin/bash
# RISE Phoenix Collection Minting Script
# Uses Solaris Prime Collection Minter on X1 Mainnet

set -e

RPC_URL="https://rpc.mainnet.x1.xyz"
COLLECTION_MINTER="52bbc2ZApmC7EVvXBvYwzCaAx49R6iB68Hq7oUMid1tj"
METADATA_PROGRAM="metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"

echo "RISE Phoenix Collection Minting"
echo "================================"
echo ""

# Check for wallet
if [ -z "$RISE_WALLET" ]; then
    WALLET_PATH="${HOME}/.config/solana/id.json"
else
    WALLET_PATH="$RISE_WALLET"
fi

if [ ! -f "$WALLET_PATH" ]; then
    echo "ERROR: Wallet not found at $WALLET_PATH"
    echo "Set RISE_WALLET env var or create wallet at default path"
    exit 1
fi

PAYER=$(solana-keygen pubkey "$WALLET_PATH")
echo "Payer: $PAYER"
echo ""

# Check balance
echo "Checking balance..."
solana balance "$PAYER" --url "$RPC_URL"
echo ""

# Step 1: Upload images to IPFS
# For now, we'll use a placeholder - in production, upload to Pinata/NFT.Storage
COLLECTION_URI="https://arweave.net/collection-metadata-placeholder"

echo "Step 1: Create Collection"
echo "Collection Name: RISE Phoenix Series 1"
echo "Symbol: RISE"
echo "Max Supply: 100"
echo ""

# Note: This would require a Node.js script to create the collection
# For now, show the command structure
cat << 'EOF'

To create the collection on-chain, run:

node scripts/create_collection.js \
  --name "RISE Phoenix Series 1" \
  --symbol "RISE" \
  --uri "https://arweave.net/collection-metadata.json" \
  --seller-fee 500 \
  --max-supply 100 \
  --mint-mode permissionless

Then to mint each NFT:

node scripts/mint_nft.js \
  --collection <COLLECTION_MINT> \
  --name "RISE Phoenix #001" \
  --symbol "RISE" \
  --uri "https://arweave.net/nft-001-metadata.json" \
  --seller-fee 500

EOF

echo ""
echo "Images ready: $(ls ../series1/handcrafted/ | wc -l) of 100"
echo ""
echo "Next steps:"
echo "1. Upload all 100 images to IPFS/Arweave"
echo "2. Create collection metadata JSON"
echo "3. Create 100 NFT metadata JSONs"
echo "4. Run create_collection.js to deploy"
echo "5. Run mint_nft.js for each NFT"
