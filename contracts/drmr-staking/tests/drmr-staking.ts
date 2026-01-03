import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DRMRStaking } from "../target/types/drmr_staking";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createMint,
  mintTo,
} from "@solana/spl-token";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram,
  LAMPORTS_PER_SOL 
} from "@solana/web3";
import { expect } from "chai";

describe("drmr-staking", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DRMRStaking as Program<DRMRStaking>;
  
  // Test accounts
  const admin = provider.wallet;
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  
  let drmrMint: PublicKey;
  let poolPda: PublicKey;
  let stakingVaultPda: PublicKey;
  let rewardVaultPda: PublicKey;
  
  const stakeEpochCycles = new anchor.BN(29); // 29 epochs
  const rewardCycleSeconds = new anchor.BN(3600); // 1 hour
  const apyBps = 1000; // 10% APY

  before(async () => {
    // Airdrop SOL to test users
    await provider.connection.requestAirdrop(
      user1.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    await provider.connection.requestAirdrop(
      user2.publicKey,
      10 * LAMPORTS_PER_SOL
    );
    
    // Wait for airdrop confirmation
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Create DRMR token mint
    drmrMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      9 // 9 decimals
    );

    // Derive PDAs
    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_pool"), drmrMint.toBuffer()],
      program.programId
    );

    [stakingVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("staking_vault"), drmrMint.toBuffer()],
      program.programId
    );

    [rewardVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("reward_vault"), drmrMint.toBuffer()],
      program.programId
    );

    // Create token accounts for users
    const adminTokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      admin.publicKey
    );
    const user1TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user1.publicKey
    );
    const user2TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user2.publicKey
    );

    // Mint tokens to admin and users
    await mintTo(
      provider.connection,
      admin.payer,
      drmrMint,
      adminTokenAccount,
      admin.publicKey,
      1_000_000_000_000 // 1M tokens
    );

    await mintTo(
      provider.connection,
      admin.payer,
      drmrMint,
      user1TokenAccount,
      admin.publicKey,
      100_000_000_000 // 100k tokens
    );

    await mintTo(
      provider.connection,
      admin.payer,
      drmrMint,
      user2TokenAccount,
      admin.publicKey,
      100_000_000_000 // 100k tokens
    );
  });

  it("Initializes the staking pool", async () => {
    try {
      const tx = await program.methods
        .initialize(stakeEpochCycles, rewardCycleSeconds, apyBps)
        .accounts({
          pool: poolPda,
          admin: admin.publicKey,
          drmrMint: drmrMint,
          stakingVault: stakingVaultPda,
          rewardVault: rewardVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("Initialize transaction signature", tx);

      const pool = await program.account.stakingPool.fetch(poolPda);
      expect(pool.admin.toString()).to.equal(admin.publicKey.toString());
      expect(pool.drmrMint.toString()).to.equal(drmrMint.toString());
      expect(pool.stakeEpochCycles.toNumber()).to.equal(29);
      expect(pool.rewardCycleSeconds.toNumber()).to.equal(3600);
      expect(pool.apyBps).to.equal(1000);
      expect(pool.totalStaked.toNumber()).to.equal(0);
      expect(pool.totalStakers.toNumber()).to.equal(0);
      expect(pool.isActive).to.be.true;
    } catch (err) {
      console.error("Initialize error:", err);
      throw err;
    }
  });

  it("Deposits rewards to the pool", async () => {
    const depositAmount = new anchor.BN(10_000_000_000); // 10k tokens
    
    const adminTokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      admin.publicKey
    );

    const tx = await program.methods
      .depositRewards(depositAmount)
      .accounts({
        pool: poolPda,
        admin: admin.publicKey,
        from: adminTokenAccount,
        rewardVault: rewardVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    console.log("Deposit rewards transaction signature", tx);

    // Verify reward vault balance
    const rewardVaultInfo = await provider.connection.getTokenAccountBalance(rewardVaultPda);
    expect(rewardVaultInfo.value.amount).to.equal(depositAmount.toString());
  });

  it("Allows user to stake tokens", async () => {
    const stakeAmount = new anchor.BN(1_000_000_000); // 1k tokens
    const stakePeriods = 2; // 2 epochs

    const user1TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user1.publicKey
    );

    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user1.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .stake(stakeAmount, stakePeriods)
      .accounts({
        pool: poolPda,
        staker: stakerPda,
        user: user1.publicKey,
        userTokenAccount: user1TokenAccount,
        stakingVault: stakingVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc();

    console.log("Stake transaction signature", tx);

    // Verify staker account
    const staker = await program.account.staker.fetch(stakerPda);
    expect(staker.user.toString()).to.equal(user1.publicKey.toString());
    expect(staker.amount.toNumber()).to.equal(stakeAmount.toNumber());
    expect(staker.stakePeriods).to.equal(stakePeriods);

    // Verify pool stats
    const pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.totalStaked.toNumber()).to.equal(stakeAmount.toNumber());
    expect(pool.totalStakers.toNumber()).to.equal(1);
  });

  it("Allows multiple users to stake", async () => {
    const stakeAmount = new anchor.BN(500_000_000); // 500 tokens
    const stakePeriods = 3; // 3 epochs

    const user2TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user2.publicKey
    );

    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user2.publicKey.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .stake(stakeAmount, stakePeriods)
      .accounts({
        pool: poolPda,
        staker: stakerPda,
        user: user2.publicKey,
        userTokenAccount: user2TokenAccount,
        stakingVault: stakingVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    console.log("Stake transaction signature", tx);

    // Verify pool stats
    const pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.totalStaked.toNumber()).to.equal(1_500_000_000); // 1k + 500
    expect(pool.totalStakers.toNumber()).to.equal(2);
  });

  it("Allows users to claim rewards", async () => {
    // Wait a bit to accumulate rewards
    await new Promise(resolve => setTimeout(resolve, 2000));

    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user1.publicKey.toBuffer(),
      ],
      program.programId
    );

    const user1TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user1.publicKey
    );

    // Get balance before claim
    const balanceBefore = await provider.connection.getTokenAccountBalance(user1TokenAccount);

    const tx = await program.methods
      .claimRewards()
      .accounts({
        pool: poolPda,
        staker: stakerPda,
        user: user1.publicKey,
        userTokenAccount: user1TokenAccount,
        rewardVault: rewardVaultPda,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([user1])
      .rpc();

    console.log("Claim rewards transaction signature", tx);

    // Verify rewards were claimed
    const staker = await program.account.staker.fetch(stakerPda);
    expect(staker.totalRewardsClaimed.toNumber()).to.be.greaterThan(0);

    const pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.totalRewardsDistributed.toNumber()).to.be.greaterThan(0);
  });

  it("Prevents claiming rewards before reward cycle", async () => {
    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user2.publicKey.toBuffer(),
      ],
      program.programId
    );

    const user2TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user2.publicKey
    );

    try {
      await program.methods
        .claimRewards()
        .accounts({
          pool: poolPda,
          staker: stakerPda,
          user: user2.publicKey,
          userTokenAccount: user2TokenAccount,
          rewardVault: rewardVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();
      
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.toString()).to.include("RewardCycleNotReady");
    }
  });

  it("Allows admin to update config", async () => {
    const newApyBps = 1500; // 15% APY

    const tx = await program.methods
      .updateConfig(null, null, newApyBps)
      .accounts({
        pool: poolPda,
        admin: admin.publicKey,
      })
      .rpc();

    console.log("Update config transaction signature", tx);

    const pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.apyBps).to.equal(newApyBps);
  });

  it("Prevents non-admin from updating config", async () => {
    try {
      await program.methods
        .updateConfig(null, null, 2000)
        .accounts({
          pool: poolPda,
          admin: user1.publicKey,
        })
        .signers([user1])
        .rpc();
      
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.toString()).to.include("Unauthorized");
    }
  });

  it("Allows admin to pause/unpause pool", async () => {
    // Pause
    let tx = await program.methods
      .setActive(false)
      .accounts({
        pool: poolPda,
        admin: admin.publicKey,
      })
      .rpc();

    console.log("Set active (pause) transaction signature", tx);

    let pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.isActive).to.be.false;

    // Unpause
    tx = await program.methods
      .setActive(true)
      .accounts({
        pool: poolPda,
        admin: admin.publicKey,
      })
      .rpc();

    console.log("Set active (unpause) transaction signature", tx);

    pool = await program.account.stakingPool.fetch(poolPda);
    expect(pool.isActive).to.be.true;
  });

  it("Prevents unstaking before stake period ends", async () => {
    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user1.publicKey.toBuffer(),
      ],
      program.programId
    );

    const user1TokenAccount = await getAssociatedTokenAddress(
      drmrMint,
      user1.publicKey
    );

    try {
      await program.methods
        .unstake()
        .accounts({
          pool: poolPda,
          staker: stakerPda,
          user: user1.publicKey,
          userTokenAccount: user1TokenAccount,
          stakingVault: stakingVaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user1])
        .rpc();
      
      expect.fail("Should have thrown an error");
    } catch (err) {
      expect(err.toString()).to.include("StakePeriodNotEnded");
    }
  });

  it("Tracks staker information correctly", async () => {
    const [stakerPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("staker"),
        poolPda.toBuffer(),
        user1.publicKey.toBuffer(),
      ],
      program.programId
    );

    const staker = await program.account.staker.fetch(stakerPda);
    
    expect(staker.user.toString()).to.equal(user1.publicKey.toString());
    expect(staker.amount.toNumber()).to.equal(1_000_000_000);
    expect(staker.stakePeriods).to.equal(2);
    expect(staker.stakedAt.toNumber()).to.be.greaterThan(0);
    expect(staker.stakeEndTime.toNumber()).to.be.greaterThan(staker.stakedAt.toNumber());
    expect(staker.totalRewardsClaimed.toNumber()).to.be.greaterThan(0);
  });
});
