import * as anchor from "@coral-xyz/anchor";
import { 
  getAssociatedTokenAddress,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { 
  Keypair, 
  Connection, 
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
require("dotenv").config({ path: ".env.local" });

async function createTokenMint() {
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
  
  console.log("Wallet Address:", walletKeypair.publicKey.toString());
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
  
  // Create mint keypair
  const mintKeypair = Keypair.generate();
  console.log("\n📝 Creating token mint...");
  console.log("Mint Address:", mintKeypair.publicKey.toString());
  
  // Get rent exemption for mint
  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create the mint
  const mintAddress = await createMint(
    connection,
    walletKeypair,           // Payer
    walletKeypair.publicKey, // Mint authority (can mint more tokens)
    walletKeypair.publicKey, // Freeze authority (can freeze accounts, null to disable)
    9,                       // Decimals (9 is standard, like SOL)
    mintKeypair,             // Mint keypair
    undefined,                // Confirmed commitment
    TOKEN_PROGRAM_ID
  );
  
  console.log("✅ Token mint created:", mintAddress.toString());
  
  // Create associated token account for the wallet
  console.log("\n📝 Creating associated token account...");
  const associatedTokenAddress = await getAssociatedTokenAddress(
    mintAddress,
    walletKeypair.publicKey
  );
  
  // Check if ATA already exists
  const ataInfo = await connection.getAccountInfo(associatedTokenAddress);
  if (!ataInfo) {
    await createAssociatedTokenAccount(
      connection,
      walletKeypair,
      mintAddress,
      walletKeypair.publicKey
    );
    console.log("✅ Associated token account created:", associatedTokenAddress.toString());
  } else {
    console.log("✅ Associated token account already exists:", associatedTokenAddress.toString());
  }
  
  // Mint 1,000,000,000 tokens (1 billion with 9 decimals = 1,000,000,000,000,000,000 raw units)
  const amountToMint = 1_000_000_000; // 1 billion tokens
  const rawAmount = amountToMint * Math.pow(10, 9); // Convert to raw units (9 decimals)
  
  console.log(`\n📝 Minting ${amountToMint.toLocaleString()} tokens...`);
  console.log(`Raw amount: ${rawAmount.toLocaleString()} (with 9 decimals)`);
  
  const mintTx = await mintTo(
    connection,
    walletKeypair,              // Payer
    mintAddress,                // Mint address
    associatedTokenAddress,     // Destination token account
    walletKeypair,              // Mint authority
    rawAmount,                  // Amount in raw units
    [],                         // Multi-signers (none needed)
    undefined,                  // Confirmed commitment
    TOKEN_PROGRAM_ID
  );
  
  console.log("✅ Tokens minted!");
  console.log("Transaction signature:", mintTx);
  
  // Verify the balance
  const tokenBalance = await connection.getTokenAccountBalance(associatedTokenAddress);
  console.log("\n✅ Token Balance:", tokenBalance.value.uiAmount?.toLocaleString(), "tokens");
  console.log("   Raw Balance:", tokenBalance.value.amount);
  
  // Save mint info to file
  const mintInfo = {
    mintAddress: mintAddress.toString(),
    mintAuthority: walletKeypair.publicKey.toString(),
    associatedTokenAddress: associatedTokenAddress.toString(),
    decimals: 9,
    totalSupply: amountToMint,
    network: "devnet",
    createdAt: new Date().toISOString(),
  };
  
  const outputPath = path.join(__dirname, "..", "mint-info.json");
  fs.writeFileSync(outputPath, JSON.stringify(mintInfo, null, 2));
  console.log("\n💾 Mint info saved to:", outputPath);
  
  console.log("\n" + "=".repeat(60));
  console.log("🎉 Token Mint Created Successfully!");
  console.log("=".repeat(60));
  console.log("\nMint Address:", mintAddress.toString());
  console.log("Token Account:", associatedTokenAddress.toString());
  console.log("Total Supply:", amountToMint.toLocaleString(), "tokens");
  console.log("\nYou can now use this mint address in your staking contract!");
  console.log("\nAdd to .env.local:");
  console.log(`DRMR_MINT_ADDRESS=${mintAddress.toString()}`);
  
  return mintAddress;
}

// Run the script
createTokenMint()
  .then((mintAddress) => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });

