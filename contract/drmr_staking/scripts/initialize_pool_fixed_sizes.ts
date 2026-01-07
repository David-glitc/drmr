/**
 * Script to initialize the DRMR staking pool - Fixed Size Calculation
 * 
 * Usage:
 *   npx tsx scripts/initialize-pool-fixed-sizes.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, clusterApiUrl } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import { DrmrStaking } from "../target/types/drmr_staking";
require("dotenv").config({ path: ".env.local" });

// Program ID from Anchor.toml or environment
const PROGRAM_ID = new PublicKey("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

// Calculate exact sizes based on Rust structs with InitSpace
// StakingPool: 8 (discriminator) + 32 (admin) + 32 (drmr_mint) + 8 + 8 + 2 + 8 + 8 + 8 + 8 + 1 + 8 + 8 = 131
// Staker: 8 (discriminator) + 32 (pool) + 32 (user) + 8 + 1 + 8 + 8 + 8 + 8 + 8 + 8 = 129
const ACCOUNT_SIZES: { [key: string]: number } = {
  StakingPool: 131,
  Staker: 129,
};

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error("Usage: npx tsx scripts/initialize-pool-fixed-sizes.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]");
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

  console.log("🚀 Initializing DRMR Staking Pool (Fixed Sizes Approach)...");
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
    console.log("ℹ️  Loading IDL with fixed sizes...");
    const idlPath = path.join(__dirname, "..", "target", "idl", "drmr_staking.json");
    const idlJson = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    
    // Add size to accounts using pre-calculated values
    const accountsWithSize = (idlJson.accounts || []).map((acc: any) => {
      const size = ACCOUNT_SIZES[acc.name];
      if (size) {
        return { ...acc, size };
      }
      return acc;
    });
    
    const idlWithSizes: anchor.Idl = {
      ...idlJson,
      accounts: accountsWithSize,
    };
    
    console.log("✅ IDL loaded with sizes:", accountsWithSize.map((a: any) => `${a.name}: ${a.size}`).join(", "));
    console.log("");
    
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
    console.error("❌ Fixed sizes approach failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
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

