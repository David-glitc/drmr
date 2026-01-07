# Adding Metadata to Existing Token Mint

This guide explains how to add or update token metadata (name, symbol) for an **existing** token mint on Solana devnet.

## Quick Start

### Option 1: Using npm script (recommended)

1. **Set your mint address in `.env.local`**:
```bash
DRMR_MINT_ADDRESS=YourExistingMintAddressHere
```

2. **Install Metaplex** (if not already installed):
```bash
# From contract/drmr_staking folder
npm install @metaplex-foundation/js

# OR from project root (if already installed there)
# You can skip this step
```

3. **Run the script**:
```bash
npm run add-metadata
```

### Option 2: Direct command

```bash
# Set mint address as environment variable
DRMR_MINT_ADDRESS=<your-mint-address> npx ts-node scripts/add-token-metadata.ts

# OR pass as argument
npx ts-node scripts/add-token-metadata.ts <your-mint-address>
```

## What the Script Does

1. ✅ Checks if metadata already exists for your mint
2. ✅ If metadata exists: **Updates** it with name "DRMR" and symbol "DRMR"
3. ✅ If metadata doesn't exist: **Creates** new metadata with name "DRMR" and symbol "DRMR"
4. ✅ Uploads metadata JSON to Arweave (decentralized storage)
5. ✅ Creates/updates the on-chain metadata account

## Requirements

- **Mint Authority**: You need to be the mint authority (or use the wallet that created the mint)
- **SOL Balance**: Need SOL for transaction fees (~0.01-0.02 SOL)
- **Metaplex Library**: `@metaplex-foundation/js` must be installed

## Troubleshooting

### Error: "@metaplex-foundation/js not found"

**Solution**: Install it:
```bash
npm install @metaplex-foundation/js
```

Or if you have it in the main project, you can run the script from there:
```bash
cd ../..  # Go to project root
npx ts-node contract/drmr_staking/scripts/add-token-metadata.ts <mint-address>
```

### Error: "Mint authority does not match"

**Solution**: You need to use the wallet that has mint authority. This is usually:
- The wallet that created the mint
- The wallet set as `mintAuthority` when the mint was created

Check your mint authority:
```bash
solana account <mint-address> --output json | grep mintAuthority
```

### Error: "Insufficient funds"

**Solution**: Request an airdrop (script does this automatically) or add more SOL:
```bash
solana airdrop 2 <your-wallet-address>
```

### Metadata already exists but can't update

**Solution**: You need the **update authority** to update metadata. If you created the metadata, you should be the update authority. If not, you'll need to use the update authority wallet.

## What Happens After

Once metadata is added/updated:
- ✅ Token will appear as "DRMR" in Phantom wallet
- ✅ Token will show "DRMR" symbol in Solana Explorer
- ✅ Other wallets and tools will recognize the name
- ✅ Your staking contract will work the same (it only needs the mint address)

## Important Notes

- **Mint address doesn't change**: The mint address stays the same, only metadata is added/updated
- **Metadata is optional**: Your staking contract works fine without metadata - it only needs the mint address
- **Can update later**: You can run this script again to update the metadata (name, description, image, etc.)
- **Cost**: Creating/updating metadata costs a small amount of SOL (~0.01-0.02 SOL)

## Verification

After running the script, verify the metadata:

1. **Check in Solana Explorer**:
   - Go to: https://explorer.solana.com/address/<mint-address>?cluster=devnet
   - Look for "Token Metadata" section

2. **Check in Phantom Wallet**:
   - Add the token to your wallet
   - It should show as "DRMR" instead of "Unknown Token"

3. **Check via script**:
   ```bash
   # The script will output the metadata account address
   # You can verify it was created/updated
   ```

## Example Output

```
============================================================
📝 Adding Token Metadata for Existing Mint
============================================================

Wallet Address: YourWalletAddress...
Mint Address: YourMintAddress...
RPC URL: https://api.devnet.solana.com
Wallet Balance: 2.5 SOL

✅ Metaplex library found

📝 Checking for existing metadata...
ℹ️  No existing metadata found. Will create new metadata.

📝 Uploading metadata to Arweave...
✅ Metadata uploaded: https://arweave.net/...

📝 Creating new metadata account...
✅ Metadata created successfully!
   Metadata Account: MetadataAccountAddress...
   Transaction signature: TransactionSignature...

============================================================
🎉 Token Metadata Updated Successfully!
============================================================

Token Name: DRMR
Token Symbol: DRMR
Mint Address: YourMintAddress...

The token will now appear as 'DRMR' in wallets and explorers!
```

