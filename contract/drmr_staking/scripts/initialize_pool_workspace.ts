/**
 * Script to initialize the DRMR staking pool - Workspace Approach
 * 
 * Usage:
 *   npx tsx scripts/initialize-pool-workspace.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]
 */

// Set environment variables BEFORE importing anchor
require("dotenv").config({ path: ".env.local" });

// Set ANCHOR_PROVIDER_URL if not already set
if (!process.env.ANCHOR_PROVIDER_URL) {
  process.env.ANCHOR_PROVIDER_URL = process.env.ANCHOR_PROVIDER_URL || "https://api.devnet.solana.com";
}

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { DrmrStaking } from "../target/types/drmr_staking";

// Program ID from Anchor.toml or environment
const PROGRAM_ID = new PublicKey("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/initialize-pool-workspace.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]");
    process.exit(1);
  }

  const apyBps = parseInt(args[0]);
  const maxStakeEpochCycles = parseInt(args[1]);
  const drmrMintAddress = args[2] || process.env.NEXT_PUBLIC_DRMR_MINT;

  // Validate inputs
  if (isNaN(apyBps) || apyBps < 0 || apyBps > 10000) {
    console.error("Error: apy_bps must be between 0 and 10000 (10000 = 100%)");
    process.exit(1);
  }

  if (isNaN(maxStakeEpochCycles) || maxStakeEpochCycles < 1) {
    console.error("Error: max_stake_epoch_cycles must be at least 1");
    process.exit(1);
  }

  if (!drmrMintAddress) {
    console.error("Error: DRMR mint address not provided and NEXT_PUBLIC_DRMR_MINT not set");
    process.exit(1);
  }

  console.log("🚀 Initializing DRMR Staking Pool (Workspace Approach)...");
  console.log(`   APY: ${(apyBps / 100).toFixed(2)}% (${apyBps} basis points)`);
  console.log(`   Max Stake Epoch Cycles: ${maxStakeEpochCycles}`);
  console.log(`   DRMR Mint: ${drmrMintAddress}`);
  console.log(`   Program ID: ${PROGRAM_ID.toBase58()}\n`);

  try {
    // Try to use workspace
    anchor.setProvider(anchor.AnchorProvider.env());
    const program = anchor.workspace.drmrStaking as Program<DrmrStaking>;
    const provider = anchor.AnchorProvider.env();
    
    console.log("✅ Using Anchor workspace\n");

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

    console.log("📋 Derived Addresses:");
    console.log(`   Staking Pool: ${stakingPoolPDA.toBase58()}`);
    console.log(`   Stake Vault: ${stakeVaultPDA.toBase58()}`);
    console.log(`   Reward Vault: ${rewardVaultPDA.toBase58()}\n`);

    // Check if pool already exists
    try {
      const existingPool = await program.account.stakingPool.fetch(stakingPoolPDA);
      console.warn("⚠️  WARNING: Staking pool already exists!");
      console.log(`   Current APY: ${(existingPool.apyBps / 100).toFixed(2)}%`);
      console.log(`   Current Max Epoch Cycles: ${existingPool.stakeEpochCycles.toString()}\n`);
    } catch (err) {
      console.log("✓ Pool doesn't exist yet, proceeding with initialization...\n");
    }

    const drmrMint = new PublicKey(drmrMintAddress);
    const creator = provider.wallet;

    console.log("📝 Creating initialization transaction...");

    const tx = await program.methods
      .initialize(apyBps, new BN(maxStakeEpochCycles))
      .accounts({
        stakingPool: stakingPoolPDA,
        stakeVault: stakeVaultPDA,
        rewardVault: rewardVaultPDA,
        creator: creator.publicKey,
        drmrMint: drmrMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log("✅ Staking pool initialized successfully!");
    console.log(`   Transaction: ${tx}`);
  } catch (error: any) {
    console.error("❌ Workspace approach failed:", error.message);
    throw error;
  }
}

main()
  .then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

