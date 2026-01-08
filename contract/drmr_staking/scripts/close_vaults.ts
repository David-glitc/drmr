/**
 * Script to close stake_vault and reward_vault token accounts only
 * 
 * Use this when the staking_pool is already closed but vaults still exist.
 * This uses the program's close_token function which:
 * - Transfers all tokens from vaults to admin
 * - Closes the token accounts
 * - Does NOT require staking_pool account to exist
 * 
 * Usage:
 *   npx tsx scripts/close_vaults.ts [drmr_mint]
 * 
 * Example:
 *   npx tsx scripts/close_vaults.ts
 *   npx tsx scripts/close_vaults.ts <mint_address>
 * 
 * Note: Only the trusted admin can close vaults
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import * as fs from "fs";
import { DrmrStaking } from "../target/types/drmr_staking";

require("dotenv").config({ path: ".env.local" });

const PROGRAM_ID = new PublicKey("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

async function main() {
  const args = process.argv.slice(2);
  const drmrMintAddress = args[0] || process.env.NEXT_PUBLIC_DRMR_MINT;

  if (!drmrMintAddress) {
    console.error("Error: DRMR mint address not provided");
    console.error("Usage: npx tsx scripts/close_vaults.ts [drmr_mint]");
    process.exit(1);
  }

  const drmrMint = new PublicKey(drmrMintAddress);

  console.log("🔧 Closing Stake and Reward Vaults");
  console.log(`   DRMR Mint: ${drmrMint.toBase58()}\n`);

  // Setup provider
  let provider: anchor.Provider;
  
  try {
    provider = anchor.AnchorProvider.env();
  } catch (error: any) {
    if (error.message?.includes("ANCHOR_PROVIDER_URL")) {
      const rpcUrl = process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");
      const connection = new Connection(rpcUrl, "confirmed");
      
      const walletPath = process.env.ANCHOR_WALLET || 
        (process.env.HOME ? `${process.env.HOME}/.config/solana/id.json` : "~/.config/solana/id.json");
      
      const expandedPath = walletPath.startsWith("~") 
        ? walletPath.replace("~", process.env.HOME || "")
        : walletPath;
      
      const walletKeypair = Keypair.fromSecretKey(
        new Uint8Array(JSON.parse(fs.readFileSync(expandedPath, "utf-8")))
      );
      
      const wallet = {
        publicKey: walletKeypair.publicKey,
        signTransaction: async (tx: any) => {
          tx.sign(walletKeypair);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          txs.forEach(tx => tx.sign(walletKeypair));
          return txs;
        },
      } as anchor.Wallet;
      
      provider = new anchor.AnchorProvider(connection, wallet, {
        commitment: "confirmed",
      });
      
      console.log(`   Using RPC: ${rpcUrl}`);
      console.log(`   Wallet: ${walletKeypair.publicKey.toBase58()}\n`);
    } else {
      throw error;
    }
  }
  
  anchor.setProvider(provider);
  const program = anchor.workspace.drmrStaking as Program<DrmrStaking>;

  // Derive PDAs
  const [stakingPoolPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool")],
    PROGRAM_ID
  );

  const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_vault"), stakingPoolPDA.toBuffer()],
    PROGRAM_ID
  );

  const [rewardVaultPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("reward_vault"), stakingPoolPDA.toBuffer()],
    PROGRAM_ID
  );

  const admin = provider.wallet.publicKey;
  const adminTokenAccount = await getAssociatedTokenAddress(
    drmrMint,
    admin,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("📋 Account Addresses:");
  console.log(`   Staking Pool (closed): ${stakingPoolPDA.toBase58()}`);
  console.log(`   Stake Vault: ${stakeVaultPDA.toBase58()}`);
  console.log(`   Reward Vault: ${rewardVaultPDA.toBase58()}`);
  console.log(`   Admin: ${admin.toBase58()}\n`);

  // Check vault balances and mints
  let stakeBalance = BigInt(0);
  let rewardBalance = BigInt(0);
  let stakeVaultMint: PublicKey | null = null;
  let rewardVaultMint: PublicKey | null = null;
  
  try {
    const stakeAccount = await getAccount(provider.connection, stakeVaultPDA);
    stakeBalance = stakeAccount.amount;
    stakeVaultMint = stakeAccount.mint;
    console.log(`💰 Stake Vault Balance: ${stakeBalance.toString()} tokens`);
    console.log(`   Mint: ${stakeVaultMint.toBase58()}`);
  } catch (e: any) {
    console.log("⚠️  Stake vault doesn't exist or is already closed");
  }
  
  try {
    const rewardAccount = await getAccount(provider.connection, rewardVaultPDA);
    rewardBalance = rewardAccount.amount;
    rewardVaultMint = rewardAccount.mint;
    console.log(`💰 Reward Vault Balance: ${rewardBalance.toString()} tokens`);
    console.log(`   Mint: ${rewardVaultMint.toBase58()}\n`);
  } catch (e: any) {
    console.log("⚠️  Reward vault doesn't exist or is already closed\n");
  }
  
  // Check if mints match
  if (stakeVaultMint || rewardVaultMint) {
    const existingMint = stakeVaultMint || rewardVaultMint;
    if (existingMint && !existingMint.equals(drmrMint)) {
      console.log("⚠️  MINT MISMATCH DETECTED!");
      console.log(`   Existing vault mint: ${existingMint.toBase58()}`);
      console.log(`   Provided mint: ${drmrMint.toBase58()}`);
      console.log("\n   This is why initialization is failing.");
      console.log("   The vaults were created with a different mint address.");
      console.log("\n   Solutions:");
      console.log(`   1. Use the existing mint: ${existingMint.toBase58()}`);
      console.log("   2. Close the vaults first using this script (close_token function)");
      console.log("   3. Then re-initialize with your desired mint\n");
    }
  }

  // Use the close_token function (doesn't require staking_pool to exist)
  console.log("🚀 Attempting to close vaults using close_token instruction...");
  
  try {
    const tx = await (program.methods as any)
      .closeToken()
      .accounts({
        stakingPoolKey: stakingPoolPDA,
        stakeVault: stakeVaultPDA,
        rewardVault: rewardVaultPDA,
        admin: admin,
        drmrMint: drmrMint,
        adminTokenAccount: adminTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    
    console.log(`✅ Vaults closed successfully!`);
    console.log(`   Transaction Signature: ${tx}`);
    console.log(`\n📊 View transaction:`);
    console.log(`   https://solana.fm/tx/${tx}?cluster=devnet`);
    console.log(`   (or your preferred Solana explorer)\n`);
    
    // Verify closure
    console.log("⏳ Verifying vault closure...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await getAccount(provider.connection, stakeVaultPDA);
      console.log("⚠️  Warning: Stake vault still exists (may need more confirmations)");
    } catch (err: any) {
      if (err.message?.includes("could not find account")) {
        console.log("✅ Stake vault successfully closed");
      }
    }
    
    try {
      await getAccount(provider.connection, rewardVaultPDA);
      console.log("⚠️  Warning: Reward vault still exists (may need more confirmations)");
    } catch (err: any) {
      if (err.message?.includes("could not find account")) {
        console.log("✅ Reward vault successfully closed");
      }
    }
    
  } catch (error: any) {
    console.error(`❌ Error closing vaults: ${error.message}`);
    if (error.logs) {
      console.error("\nTransaction logs:");
      error.logs.forEach((log: string) => console.error(`   ${log}`));
    }
    
    if (error.message?.includes("Unauthorized")) {
      console.log("\n💡 Note: Only the trusted admin can close vaults.");
      console.log("   Make sure you're using the correct wallet (trusted admin).");
    } else if (error.message?.includes("InvalidMint")) {
      console.log("\n💡 Note: The provided mint must match the vaults' mint.");
      if (stakeVaultMint || rewardVaultMint) {
        const existingMint = stakeVaultMint || rewardVaultMint;
        console.log(`   Use mint: ${existingMint?.toBase58()}`);
      }
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
