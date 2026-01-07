import * as anchor from "@coral-xyz/anchor";
import { 
  Connection, 
  PublicKey,
  Keypair,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
require("dotenv").config({ path: ".env.local" });

/**
 * Script to add or update token metadata for an existing mint
 * 
 * Usage:
 *   DRMR_MINT_ADDRESS=<your-mint-address> npx ts-node scripts/add-token-metadata.ts
 * 
 * Or set in .env.local:
 *   DRMR_MINT_ADDRESS=<your-mint-address>
 */

async function addTokenMetadata() {
  // Get mint address from environment or command line
  const mintAddressStr = process.env.DRMR_MINT_ADDRESS || process.argv[2];
  
  if (!mintAddressStr) {
    console.error("❌ Error: Mint address required!");
    console.error("\nUsage:");
    console.error("  DRMR_MINT_ADDRESS=<mint-address> npx ts-node scripts/add-token-metadata.ts");
    console.error("  OR set DRMR_MINT_ADDRESS in .env.local");
    console.error("  OR pass as argument: npx ts-node scripts/add-token-metadata.ts <mint-address>");
    process.exit(1);
  }

  let mintAddress: PublicKey;
  try {
    mintAddress = new PublicKey(mintAddressStr);
  } catch (error) {
    console.error("❌ Error: Invalid mint address:", mintAddressStr);
    process.exit(1);
  }

  // Setup connection
  const rpcUrl = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
  const connection = new Connection(rpcUrl, "confirmed");
  
  // Get wallet from Anchor config or use default
  const walletPath = process.env.ANCHOR_WALLET || 
    (process.env.HOME ? `${process.env.HOME}/.config/solana/id.json` : "~/.config/solana/id.json");
  
  // Expand ~ to home directory
  const expandedPath = walletPath.startsWith("~") 
    ? walletPath.replace("~", process.env.HOME || "")
    : walletPath;
  
  const walletKeypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(expandedPath, "utf-8")))
  );
  
  console.log("=".repeat(60));
  console.log("📝 Adding Token Metadata for Existing Mint");
  console.log("=".repeat(60));
  console.log("\nWallet Address:", walletKeypair.publicKey.toString());
  console.log("Mint Address:", mintAddress.toString());
  console.log("RPC URL:", rpcUrl);
  
  // Check balance
  const balance = await connection.getBalance(walletKeypair.publicKey);
  console.log("Wallet Balance:", balance / anchor.web3.LAMPORTS_PER_SOL, "SOL");
  
  if (balance < 0.1 * anchor.web3.LAMPORTS_PER_SOL) {
    console.log("\n⚠️  Low balance! Requesting airdrop...");
    const airdropSig = await connection.requestAirdrop(
      walletKeypair.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSig);
    console.log("✅ Airdrop received!");
  }

  // Check if Metaplex is available
  let Metaplex: any;
  let keypairIdentity: any;
  
  try {
    const metaplexModule = require("@metaplex-foundation/js");
    Metaplex = metaplexModule.Metaplex;
    keypairIdentity = metaplexModule.keypairIdentity;
    console.log("\n✅ Metaplex library found");
  } catch (error) {
    console.error("\n❌ Error: @metaplex-foundation/js not found!");
    console.error("\nTo install Metaplex:");
    console.error("  npm install @metaplex-foundation/js");
    console.error("  OR from project root:");
    console.error("  cd ../.. && npm install @metaplex-foundation/js");
    console.error("\nNote: You can also use the frontend's Metaplex installation");
    console.error("  by running this script from the project root where it's already installed.");
    process.exit(1);
  }

  try {
    // For devnet, we'll use a data URI to avoid Arweave funding issues
    // This embeds the metadata directly in the URI (base64 encoded JSON)
    // For production/mainnet, you'd want to use real storage (Arweave, IPFS, etc.)
    const metaplex = Metaplex.make(connection)
      .use(keypairIdentity(walletKeypair));
    
    console.log("ℹ️  Using data URI for devnet (avoids Arweave funding issues)");

    // Check if metadata already exists
    console.log("\n📝 Checking for existing metadata...");
    let metadataAccount;
    try {
      metadataAccount = await metaplex.nfts().findByMint({ mintAddress });
      console.log("✅ Found existing metadata account:", metadataAccount.address.toString());
      console.log("   Current name:", metadataAccount.name);
      console.log("   Current symbol:", metadataAccount.symbol);
    } catch (error: any) {
      if (error.message?.includes("AccountNotFound") || error.message?.includes("not found")) {
        console.log("ℹ️  No existing metadata found. Will create new metadata.");
        metadataAccount = null;
      } else {
        throw error;
      }
    }

    // Create minimal metadata JSON (to keep URI short)
    const metadata = {
      name: "DRMR",
      symbol: "DRMR",
      description: "DRMR Token",
    };

    // For devnet, we'll use a placeholder URI that's short enough
    // The actual metadata will be stored on-chain in the metadata account
    // Wallets will read the name/symbol directly from the on-chain account, not the URI
    console.log("\n📝 Creating metadata URI (using placeholder for devnet)...");
    
    // Use a very short placeholder URI - the name and symbol are stored on-chain anyway
    // This is just a placeholder to satisfy the program requirement
    const uri = "https://drmr.dev/metadata.json";
    console.log("✅ Using placeholder URI:", uri);
    console.log("   Note: Name and symbol are stored on-chain, URI is just a placeholder");

    if (metadataAccount) {
      // Update existing metadata
      console.log("\n📝 Updating existing metadata...");
      const { response } = await metaplex.nfts().update({
        nftOrSft: metadataAccount,
        name: "DRMR",
        symbol: "DRMR",
        uri: uri,
      });

      console.log("✅ Metadata updated successfully!");
      console.log("   Transaction signature:", response.signature);
    } else {
      // Create new metadata
      console.log("\n📝 Creating new metadata account...");
      
      // Get mint info to check mint authority
      const mintInfo = await connection.getParsedAccountInfo(mintAddress);
      if (!mintInfo.value) {
        throw new Error("Mint account not found");
      }
      
      const parsedMintInfo = mintInfo.value.data as any;
      const mintAuthority = parsedMintInfo.parsed.info.mintAuthority;
      
      if (!mintAuthority) {
        console.warn("⚠️  Warning: Mint authority is null. You may not be able to create metadata.");
        console.warn("   The mint authority must match your wallet to create metadata.");
      } else if (mintAuthority !== walletKeypair.publicKey.toString()) {
        console.warn("⚠️  Warning: Mint authority does not match your wallet.");
        console.warn(`   Mint Authority: ${mintAuthority}`);
        console.warn(`   Your Wallet: ${walletKeypair.publicKey.toString()}`);
        console.warn("   You may need to use the mint authority wallet to create metadata.");
      }

      const { nft, response } = await metaplex.nfts().create({
        uri: uri,
        name: "DRMR",
        symbol: "DRMR",
        mintAddress: mintAddress,
        mintAuthority: walletKeypair,
        updateAuthority: walletKeypair,
        sellerFeeBasisPoints: 0, // No royalties for fungible tokens
        isMutable: true, // Allow updates to metadata
        tokenStandard: 0, // Fungible token standard
      });

      console.log("✅ Metadata created successfully!");
      console.log("   Metadata Account:", nft.metadataAddress.toString());
      console.log("   Transaction signature:", response.signature);
    }

    console.log("\n" + "=".repeat(60));
    console.log("🎉 Token Metadata Updated Successfully!");
    console.log("=".repeat(60));
    console.log("\nToken Name: DRMR");
    console.log("Token Symbol: DRMR");
    console.log("Mint Address:", mintAddress.toString());
    console.log("\nThe token will now appear as 'DRMR' in wallets and explorers!");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message || error);
    
    if (error.message?.includes("mintAuthority")) {
      console.error("\n💡 Tip: Make sure you're using the wallet that has mint authority.");
      console.error("   Or the wallet that created the mint.");
    }
    
    if (error.message?.includes("insufficient funds")) {
      console.error("\n💡 Tip: Make sure you have enough SOL for transaction fees.");
    }
    
    if (error.message?.includes("Arweave") || error.message?.includes("bundler") || error.message?.includes("funding tx")) {
      console.error("\n💡 Arweave upload failed. This is common on devnet.");
      console.error("   The script now uses mockStorage to avoid this issue.");
      console.error("   If you still see this error, try running the script again.");
    }
    
    process.exit(1);
  }
}

// Run the script
addTokenMetadata()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  });

