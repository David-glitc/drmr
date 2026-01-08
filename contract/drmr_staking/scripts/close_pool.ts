/**
 * Script to close the DRMR staking pool (emergency close)
 * 
 * This will:
 * - Transfer all tokens from stake_vault to admin's token account
 * - Transfer all tokens from reward_vault to admin's token account
 * - Close all accounts (staking_pool, stake_vault, reward_vault)
 * 
 * Usage:
 *   npx tsx scripts/close_pool.ts [drmr_mint]
 * 
 * Example:
 *   npx tsx scripts/close_pool.ts
 *   npx tsx scripts/close_pool.ts <mint_address>
 * 
 * Note: Only the pool admin can close the pool
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { DrmrStaking } from "../target/types/drmr_staking";

// Load environment variables from .env.local
require("dotenv").config({ path: ".env.local" });

// Program ID from Anchor.toml or environment
const PROGRAM_ID = new PublicKey("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const drmrMintAddress = args[0] || process.env.NEXT_PUBLIC_DRMR_MINT;

  if (!drmrMintAddress) {
    console.error("Error: DRMR mint address not provided and NEXT_PUBLIC_DRMR_MINT not set");
    console.error("Usage: npx tsx scripts/close_pool.ts [drmr_mint]");
    console.error("Example: npx tsx scripts/close_pool.ts");
    process.exit(1);
  }

  const drmrMint = new PublicKey(drmrMintAddress);

  console.log("⚠️  EMERGENCY CLOSE: Closing DRMR Staking Pool");
  console.log(`   DRMR Mint: ${drmrMint.toBase58()}`);
  console.log(`   Program ID: ${PROGRAM_ID.toBase58()}\n`);

  // Setup provider
  let provider: anchor.Provider;
  
  try {
    provider = anchor.AnchorProvider.env();
  } catch (error: any) {
    if (error.message?.includes("ANCHOR_PROVIDER_URL")) {
      console.log("ℹ️  ANCHOR_PROVIDER_URL not set, using default devnet connection...");
      
      const rpcUrl = process.env.ANCHOR_PROVIDER_URL || clusterApiUrl("devnet");
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

  // Use workspace like frontend/tests do - automatically loads IDL
  const program = anchor.workspace.drmrStaking as Program<DrmrStaking>;
  
  if (!program) {
    throw new Error("Failed to load program from workspace. Make sure IDL is generated.");
  }
  
  console.log("✅ Program loaded from workspace\n");

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

  // Get admin wallet (the signer)
  const admin = provider.wallet.publicKey;

  // Get admin's associated token account
  const adminTokenAccount = await getAssociatedTokenAddress(
    drmrMint,
    admin,
    false, // allowOwnerOffCurve
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  console.log("📋 Account Addresses:");
  console.log(`   Staking Pool: ${stakingPoolPDA.toBase58()}`);
  console.log(`   Stake Vault: ${stakeVaultPDA.toBase58()}`);
  console.log(`   Reward Vault: ${rewardVaultPDA.toBase58()}`);
  console.log(`   Admin: ${admin.toBase58()}`);
  console.log(`   Admin Token Account: ${adminTokenAccount.toBase58()}\n`);

  // Check if pool exists
  try {
    const pool = await program.account.stakingPool.fetch(stakingPoolPDA);
    console.log("✅ Staking pool found");
    console.log(`   Pool Admin: ${pool.admin.toBase58()}`);
    console.log(`   Current Admin: ${admin.toBase58()}`);
    
    if (!pool.admin.equals(admin)) {
      console.error(`\n❌ ERROR: You are not the pool admin!`);
      console.error(`   Pool admin: ${pool.admin.toBase58()}`);
      console.error(`   Your wallet: ${admin.toBase58()}`);
      process.exit(1);
    }

    // Check vault balances
    const stakeVaultInfo = await provider.connection.getTokenAccountBalance(stakeVaultPDA);
    const rewardVaultInfo = await provider.connection.getTokenAccountBalance(rewardVaultPDA);
    
    const stakeBalance = stakeVaultInfo.value.amount;
    const rewardBalance = rewardVaultInfo.value.amount;
    const totalBalance = BigInt(stakeBalance) + BigInt(rewardBalance);

    console.log(`\n💰 Vault Balances:`);
    console.log(`   Stake Vault: ${stakeBalance} tokens`);
    console.log(`   Reward Vault: ${rewardBalance} tokens`);
    console.log(`   Total: ${totalBalance.toString()} tokens\n`);

    if (totalBalance === BigInt(0)) {
      console.log("⚠️  Warning: Both vaults are empty. Proceeding with close anyway...\n");
    }

  } catch (error: any) {
    console.error("❌ Error fetching pool:", error.message);
    console.error("   The staking pool may not exist or may have already been closed.");
    process.exit(1);
  }

  // Confirm before proceeding
  console.log("⚠️  WARNING: This will:");
  console.log("   1. Transfer ALL tokens from stake_vault to admin");
  console.log("   2. Transfer ALL tokens from reward_vault to admin");
  console.log("   3. Close all accounts (staking_pool, stake_vault, reward_vault)");
  console.log("   4. This action is IRREVERSIBLE!\n");
  
  // In a real script, you might want to add a confirmation prompt here
  // For now, we'll proceed automatically

  try {
    console.log("🚀 Executing close transaction...\n");
    
    const tx = await program.methods
      .close()
      .accounts({
        stakingPool: stakingPoolPDA,
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

    console.log("✅ Close transaction successful!");
    console.log(`   Transaction signature: ${tx}`);
    console.log(`\n📊 Check the transaction logs for transfer details:`);
    console.log(`   https://solscan.io/tx/${tx}`);
    console.log(`   (or your preferred Solana explorer)\n`);
    
    // Wait a bit and verify vaults are closed
    console.log("⏳ Waiting for confirmation...");
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      await program.account.stakingPool.fetch(stakingPoolPDA);
      console.log("⚠️  Warning: Pool account still exists (may need more confirmations)");
    } catch {
      console.log("✅ Pool account successfully closed");
    }

  } catch (error: any) {
    console.error("\n❌ Close transaction failed:", error.message);
    if (error.logs) {
      console.error("\nTransaction logs:");
      error.logs.forEach((log: string) => console.error(`   ${log}`));
    }
    process.exit(1);
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });

