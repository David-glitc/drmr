# DRMR Staking Pool Initialization Guide

## Overview

The DRMR staking pool must be initialized on-chain before users can stake tokens. This guide explains how the initialization works and how to use the initialization script.

## Initialization Parameters

The `initialize` function takes two parameters:

1. **`apy_bps`** (u16): APY in basis points
   - `10000` = 100% APY
   - `1000` = 10% APY
   - `5000` = 50% APY
   - Maximum: `10000` (100%)

2. **`max_stake_epoch_cycles`** (u64): Maximum allowed epoch cycles for stake lock-up periods
   - This determines the maximum number of epoch cycles a user can stake for
   - Example: If set to `4`, users can stake for 1, 2, 3, or 4 epoch cycles
   - Minimum: `1`

## How APY is Used

### In the Contract

The `apy_bps` is stored in the `StakingPool` account and used in reward calculations:

```rust
// From get_reward.rs
// Formula: reward = (staked_amount * apy_bps * time_elapsed_seconds * PRECISION) / (BASIS_POINTS * seconds_per_year)
let reward_amount = calculate_reward(staker.amount, pool.apy_bps, time_elapsed_seconds)?;
```

### In the Frontend

The frontend fetches `apyBps` from the staking pool and displays it:

```typescript
// From app/(dashboard)/staking/page.tsx
{(stakingPool.apyBps / 100).toFixed(2)}%  // Converts basis points to percentage
```

**Current Display Location:**
- Line 451 in `app/(dashboard)/staking/page.tsx`
- Shows in the "DRMR Staking Pool Info" section when DRMR token type is selected

## Initialization Script

A script is provided to initialize the pool: `scripts/initialize-pool.ts`

### Usage

```bash
cd contract/drmr_staking
npx tsx scripts/initialize-pool.ts <apy_bps> <max_stake_epoch_cycles> [drmr_mint]
```

### Examples

**Initialize with 10% APY and max 4 epoch cycles:**
```bash
npx tsx scripts/initialize-pool.ts 1000 4
```

**Initialize with 25% APY and max 2 epoch cycles:**
```bash
npx tsx scripts/initialize-pool.ts 2500 2
```

**Initialize with custom mint address:**
```bash
npx tsx scripts/initialize-pool.ts 1000 4 3Ua7sSBXLb5Jg8S8MFYKfx1Jbuh9znYYewezJV3U3s1d
```

### Prerequisites

1. **Environment Setup:**
   - Set `ANCHOR_WALLET` in your environment or use Anchor's default wallet
   - Set `NEXT_PUBLIC_DRMR_MINT` in `.env.local` (or pass as third argument)
   - Ensure you have SOL for transaction fees

2. **Network Configuration:**
   - The script uses the network from `Anchor.toml`
   - Make sure you're connected to the correct network (devnet/mainnet)

### What the Script Does

1. Validates input parameters
2. Derives PDA addresses for:
   - Staking Pool
   - Stake Vault (holds staked tokens)
   - Reward Vault (holds reward tokens)
3. Checks if pool already exists (warns if it does)
4. Creates the initialization transaction
5. Displays transaction signature and explorer link

## Manual Initialization (Using Anchor CLI)

You can also initialize manually using Anchor:

```bash
anchor run initialize -- <apy_bps> <max_stake_epoch_cycles>
```

Or using the program directly:

```typescript
const tx = await program.methods
  .initialize(apyBps, new BN(maxStakeEpochCycles))
  .accounts({
    stakingPool: stakingPoolPDA,
    stakeVault: stakeVaultPDA,
    rewardVault: rewardVaultPDA,
    creator: wallet.publicKey,
    drmrMint: drmrMintPubkey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  })
  .rpc();
```

## Updating Pool Configuration

After initialization, you can update the pool configuration using the `update_pool_config` instruction:

```typescript
await program.methods
  .updatePoolConfig(
    null, // new_admin (optional)
    null, // new_stake_epoch_cycles (optional)
    null, // new_reward_cycle_seconds (optional)
    newApyBps, // new_apy_bps (optional)
    null  // new_is_active (optional)
  )
  .accounts({
    stakingPool: stakingPoolPDA,
    admin: adminWallet.publicKey,
  })
  .rpc();
```

**Note:** Only the admin (trusted_admin) can update the pool configuration.

## Current APY Display

The frontend automatically fetches and displays the current APY:

1. **Data Fetching:**
   - `useDrmrStaking` hook calls `fetchStakingPool()`
   - Fetches every 30 seconds (refetchInterval)

2. **Display:**
   - Shows in the staking modal when DRMR token type is selected
   - Format: `{(stakingPool.apyBps / 100).toFixed(2)}%`
   - Example: `apyBps = 1000` displays as `10.00%`

3. **Location:**
   - File: `app/(dashboard)/staking/page.tsx`
   - Line: ~451
   - Section: "DRMR Staking Pool Info"

## Troubleshooting

### Pool Already Exists
If you get an error that the pool already exists:
- Use `update_pool_config` to change parameters instead
- Or deploy to a different program ID

### Invalid APY
- APY must be between 0 and 10000 (0% to 100%)
- Check that you're using basis points, not percentage

### Insufficient Funds
- Ensure your wallet has SOL for transaction fees
- Initialization requires rent for creating accounts

## Summary

- **APY (`apy_bps`)**: Set during initialization, displayed in frontend, used in reward calculations
- **Max Stake Epoch Cycles**: Limits how long users can stake, set during initialization
- **Initialization**: Use the provided script or call the instruction manually
- **Updates**: Use `update_pool_config` instruction (admin only)

