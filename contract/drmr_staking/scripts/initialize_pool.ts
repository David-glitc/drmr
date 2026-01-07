/**
 * Script to initialize the DRMR staking pool
 * 
 * Usage:
 *   npx tsx scripts/initialize-pool.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]
 * 
 * Example:
 *   npx tsx scripts/initialize-pool.ts 1000 4
 *   (Sets APY to 10% (1000 basis points) and max stake period to 4 epoch cycles)
 * 
 * Note: APY is in basis points (10000 = 100%)
 *       - 1000 = 10% APY
 *       - 2000 = 20% APY
 *       - 5000 = 50% APY
 *       - 10000 = 100% APY (maximum)
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
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
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/initialize-pool.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]");
    console.error("\nExample:");
    console.error("  npx tsx scripts/initialize-pool.ts 1000 4");
    console.error("  (Sets APY to 10% and max stake period to 4 epoch cycles)");
    console.error("\nNote: APY is in basis points (10000 = 100%)");
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
    console.error("Please provide it as the third argument or set NEXT_PUBLIC_DRMR_MINT in .env.local");
    process.exit(1);
  }

  console.log("🚀 Initializing DRMR Staking Pool...");
  console.log(`   APY: ${(apyBps / 100).toFixed(2)}% (${apyBps} basis points)`);
  console.log(`   Max Stake Epoch Cycles: ${maxStakeEpochCycles}`);
  console.log(`   DRMR Mint: ${drmrMintAddress}`);
  console.log(`   Program ID: ${PROGRAM_ID.toBase58()}\n`);

  // Setup provider - handle missing ANCHOR_PROVIDER_URL
  let provider: anchor.AnchorProvider;
  
  try {
    provider = anchor.AnchorProvider.env();
  } catch (error: any) {
    if (error.message?.includes("ANCHOR_PROVIDER_URL")) {
      // Create provider manually if env var is missing
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

  // Load IDL and create program manually
  // Anchor's workspace requires ANCHOR_PROVIDER_URL to be set at import time,
  // so we'll manually load the IDL and add size information
  console.log("ℹ️  Loading IDL...");
  const idlPath = path.join(__dirname, "..", "target", "idl", "drmr_staking.json");
  const idlJson = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  
  // Calculate account sizes from type definitions and add to accounts
  // Anchor 0.32.1 requires size property for account deserialization
  const accountsWithSize = (idlJson.accounts || []).map((acc: any) => {
    const typeDef = (idlJson.types || []).find((t: any) => t.name === acc.name);
    if (typeDef && typeDef.type && typeDef.type.kind === "struct") {
      // Calculate size: 8 bytes discriminator + sum of field sizes
      let size = 8; // discriminator
      const fields = typeDef.type.fields || [];
      for (const field of fields) {
        const fieldType = field.type;
        if (fieldType === "u8") size += 1;
        else if (fieldType === "u16") size += 2;
        else if (fieldType === "u32") size += 4;
        else if (fieldType === "u64" || fieldType === "i64") size += 8;
        else if (fieldType === "bool") size += 1;
        else if (fieldType === "pubkey" || fieldType === "publicKey") size += 32;
        else if (typeof fieldType === "object") {
          if (fieldType.vec) {
            // Vector type - can't calculate exact size, use a reasonable default
            size += 4; // length prefix
          } else if (fieldType.option) {
            // Option type - 1 byte for Some/None + size of inner type
            size += 1;
            const innerType = fieldType.option;
            if (innerType === "u8") size += 1;
            else if (innerType === "u16") size += 2;
            else if (innerType === "u32") size += 4;
            else if (innerType === "u64" || innerType === "i64") size += 8;
            else if (innerType === "pubkey" || innerType === "publicKey") size += 32;
          }
        }
      }
      return { ...acc, size };
    }
    // If no type definition found, return account as-is (Anchor might handle it)
    return acc;
  });
  
  // Create IDL with accounts that have size information
  const idlWithSizes: anchor.Idl = {
    ...idlJson,
    accounts: accountsWithSize,
  };
  
  // Debug: log account structures
  console.log("📊 Account structures:", JSON.stringify(accountsWithSize, null, 2));
  
  // Create program with IDL that includes size information
  const program = new Program(
    idlWithSizes,
    PROGRAM_ID,
    provider
  ) as Program<DrmrStaking>;

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
    console.log(`   Current Max Epoch Cycles: ${existingPool.stakeEpochCycles.toString()}`);
    console.log("\n   If you want to update the pool configuration, use the update_pool_config instruction instead.");
    console.log("   This script will fail if the pool already exists.\n");
  } catch (err) {
    // Pool doesn't exist, which is what we want
    console.log("✓ Pool doesn't exist yet, proceeding with initialization...\n");
  }

  const drmrMint = new PublicKey(drmrMintAddress);
  const creator = provider.wallet;

  console.log("📝 Creating initialization transaction...");

  try {
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
    console.log(`\n   You can view it on Solana Explorer:`);
    console.log(`   https://explorer.solana.com/tx/${tx}?cluster=${provider.connection.rpcEndpoint.includes('devnet') ? 'devnet' : 'mainnet-beta'}`);
  } catch (err) {
    console.error("❌ Failed to initialize staking pool:");
    if (err instanceof Error) {
      console.error(`   ${err.message}`);
    } else {
      console.error(err);
    }
    process.exit(1);
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

