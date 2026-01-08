import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { DrmrStaking } from "../target/types/drmr_staking";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint } from "@solana/spl-token";

// Load environment variables from .env.local file
require("dotenv").config({ path: ".env.local" });

describe("drmr_staking", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.drmrStaking as Program<DrmrStaking>;
  const provider = anchor.AnchorProvider.env();

  it("Is initialized!", async () => {
    // Derive the staking pool PDA
    const [stakingPoolPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool")],
      program.programId
    );

    // Derive the stake vault PDA
    const [stakeVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake_vault"), stakingPoolPDA.toBuffer()],
      program.programId
    );

    // Derive the reward vault PDA
    const [rewardVaultPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), stakingPoolPDA.toBuffer()],
      program.programId
    );

    // Use the provider's wallet (already has SOL)
    const creator = provider.wallet;

    // Create a real mint for testing
    const mintKeypair = Keypair.generate();
    const drmrMint = await createMint(
      provider.connection,
      (creator as any).payer || (creator as any).keypair || Keypair.fromSecretKey(new Uint8Array(0)), // Fallback
      creator.publicKey, // Mint authority
      null, // Freeze authority (null = no freeze)
      9, // Decimals
      mintKeypair, // Mint keypair
      undefined,
      TOKEN_PROGRAM_ID
    );

    // u16 can be a number, u64 must be BN
    const apy = 1000;
    const max_stake_epoch_cycles = new BN(2);

    // Execute initialize with all required accounts (Anchor converts snake_case to camelCase)
    const tx = await program.methods
      .initialize(apy, max_stake_epoch_cycles)
      .accounts({
        stakingPool: stakingPoolPDA,
        stakeVault: stakeVaultPDA,
        rewardVault: rewardVaultPDA,
        creator: creator.publicKey,
        drmrMint: drmrMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .rpc();
    
    console.log("Your transaction signature", tx);
  });
});
