/**
 * Script to initialize the DRMR staking pool - Fetch IDL from Chain
 * 
 * Usage:
 *   npx tsx scripts/initialize-pool-fetch-idl.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import { DrmrStaking } from "../target/types/drmr_staking";
require("dotenv").config({ path: ".env.local" });

// Program ID from Anchor.toml or environment
const PROGRAM_ID = new PublicKey("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/initialize-pool-fetch-idl.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]");
    process.exit(1);
  }

  const apyBps = parseInt(args[0]);
  const maxStakeEpochCycles = parseInt(args[1]);
  const drmrMintAddress = args[2] || process.env.NEXT_PUBLIC_DRMR_MINT;

  if (isNaN(apyBps) || apyBps < 0 || apyBps > 10000) {
    console.error("Error: apy_bps must be between 0 and 10000");
    process.exit(1);
  }

  if (isNaN(maxStakeEpochCycles) || maxStakeEpochCycles < 1) {
    console.error("Error: max_stake_epoch_cycles must be at least 1");
    process.exit(1);
  }

  if (!drmrMintAddress) {
    console.error("Error: DRMR mint address not provided");
    process.exit(1);
  }

  console.log("🚀 Initializing DRMR Staking Pool (Fetch IDL Approach)...");
  console.log(`   APY: ${(apyBps / 100).toFixed(2)}% (${apyBps} basis points)`);
  console.log(`   Max Stake Epoch Cycles: ${maxStakeEpochCycles}`);
  console.log(`   DRMR Mint: ${drmrMintAddress}\n`);

  // Setup connection and wallet
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
  
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  
  anchor.setProvider(provider);

  try {
    console.log("ℹ️  Fetching IDL from chain...");
    // Try to fetch IDL from chain
    const idl = await Program.fetchIdl(PROGRAM_ID, provider);
    
    if (!idl) {
      throw new Error("Could not fetch IDL from chain. Program may not be deployed.");
    }
    
    console.log("✅ IDL fetched from chain\n");
    
    const program = new Program(idl, PROGRAM_ID, provider) as Program<DrmrStaking>;

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
    console.error("❌ Fetch IDL approach failed:", error.message);
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

