# DRMR Staking Contract

A Solana-based staking contract built with Anchor Framework that allows users to stake DRMR tokens and earn rewards based on APY (Annual Percentage Yield).

## Overview

The DRMR Staking contract enables users to:
- **Stake** DRMR tokens for a specified lock-up period
- **Claim rewards** periodically based on their staked amount and APY
- **Withdraw** accumulated rewards to their wallet
- **Unstake** tokens after the lock-up period ends
- **Admin** can update pool configuration

## Architecture

### Key Components

1. **StakingPool** - Main pool account storing global staking configuration
2. **Staker** - Per-user account tracking individual staking data
3. **Stake Vault** - PDA-owned token account holding all staked tokens
4. **Reward Vault** - PDA-owned token account holding reward tokens (intermediate storage)

### Data Structures

#### StakingPool
```rust
pub struct StakingPool {
    pub admin: Pubkey,                      // Pool administrator
    pub drmr_mint: Pubkey,                 // DRMR token mint address
    pub stake_epoch_cycles: u64,           // Max allowed lock-up periods
    pub reward_cycle_seconds: u64,          // Reward calculation cycle (86400 = 1 day)
    pub apy_bps: u16,                      // APY in basis points (10000 = 100%)
    pub total_staked: u64,                  // Total tokens currently staked
    pub total_stakers: u64,                 // Total number of unique stakers
    pub total_rewards_distributed: u64,     // Lifetime total rewards distributed
    pub rewards_in_pool: u64,               // Rewards currently in reward vault
    pub is_active: bool,                   // Pool active status
    pub created_at: i64,                   // Pool creation timestamp
    pub last_reward_distribution: i64,     // Last reward distribution timestamp
}
```

#### Staker
```rust
pub struct Staker {
    pub pool: Pubkey,                      // Associated staking pool
    pub user: Pubkey,                      // Staker's wallet address
    pub amount: u64,                       // Currently staked amount (active)
    pub stake_periods: u8,                 // Lock-up period in cycles
    pub staked_at: i64,                    // Stake start timestamp
    pub stake_end_time: i64,               // Stake unlock timestamp
    pub last_claim: i64,                   // Last reward claim timestamp
    pub total_rewards_claimed: u64,       // Lifetime total rewards claimed
    pub available_rewards: u64,           // Rewards available for withdrawal
    pub total_token_staked: u64,           // Lifetime cumulative staked (never decreases)
}
```

## Contract Flow

### 1. Initialization Flow

```
┌─────────────┐
│  Creator    │
└──────┬──────┘
       │
       │ initialize(apy_bps, max_stake_epoch_cycles)
       ▼
┌─────────────────────────────────────────────────┐
│  Creates:                                       │
│  • StakingPool PDA                              │
│  • Stake Vault PDA (token account)              │
│  • Reward Vault PDA (token account)             │
│  • Sets admin = trusted_admin PDA              │
│  • Initializes pool configuration               │
└─────────────────────────────────────────────────┘
```

**Function: `initialize`**
- **Purpose**: Creates a new staking pool
- **Who can call**: Anyone (creator pays for account creation)
- **What it does**:
  - Creates `StakingPool` PDA account
  - Creates `stake_vault` PDA token account
  - Creates `reward_vault` PDA token account
  - Sets admin to `trusted_admin` PDA
  - Initializes pool configuration (APY, cycles, etc.)
  - Sets pool as active

---

### 2. Staking Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ stake(amount, periods)
       ▼
┌─────────────────────────────────────────────────┐
│  1. Validates:                                  │
│     • Pool is active                            │
│     • Amount > 0                                │
│     • Periods <= max_stake_epoch_cycles         │
│                                                  │
│  2. Transfers tokens:                           │
│     User Token Account → Stake Vault            │
│                                                  │
│  3. Creates/Updates Staker account:             │
│     • First stake: Creates new Staker PDA       │
│     • Subsequent: Updates existing Staker       │
│     • Updates stake_end_time                    │
│     • Increments pool.total_staked              │
└─────────────────────────────────────────────────┘
```

**Function: `stake`**
- **Purpose**: Stake DRMR tokens for a lock-up period
- **Who can call**: Any user
- **Parameters**:
  - `stake_amount`: Amount of tokens to stake
  - `stake_periods`: Lock-up period (0 = no lock-up)
- **What it does**:
  - Validates pool is active and parameters
  - Transfers tokens from user → `stake_vault`
  - Creates or updates `Staker` PDA account
  - Calculates `stake_end_time` based on periods
  - Updates pool `total_staked` and `total_stakers`
  - Tracks lifetime `total_token_staked`

---

### 3. Reward Claiming Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ get_reward() [Every 5+ minutes]
       ▼
┌─────────────────────────────────────────────────┐
│  1. Validates:                                  │
│     • Pool is active                            │
│     • User has active stake                     │
│     • 5+ minutes since last claim               │
│                                                  │
│  2. Calculates rewards:                         │
│     Formula: (amount * APY * time) / year      │
│                                                  │
│  3. Transfers rewards:                          │
│     Stake Vault → Reward Vault                  │
│                                                  │
│  4. Updates state:                               │
│     • staker.available_rewards += reward         │
│     • staker.total_rewards_claimed += reward     │
│     • staker.last_claim = now                   │
│     • pool.rewards_in_pool += reward             │
│     • pool.total_rewards_distributed += reward   │
└─────────────────────────────────────────────────┘
```

**Function: `get_reward`**
- **Purpose**: Claim accrued rewards (should be called every 5+ minutes)
- **Who can call**: Users with active stakes
- **What it does**:
  - Validates minimum 5 minutes since last claim
  - Calculates rewards based on:
    - Current staked amount
    - Pool APY (in basis points)
    - Time elapsed since last claim
  - Transfers rewards from `stake_vault` → `reward_vault`
  - Updates `staker.available_rewards` (withdrawable amount)
  - Updates `pool.rewards_in_pool` (tracking total in vault)
  - Updates `last_claim` timestamp

**Reward Calculation Formula**:
```
reward = (staked_amount * apy_bps * time_elapsed_seconds * PRECISION) / (BASIS_POINTS * seconds_per_year)
```

---

### 4. Reward Withdrawal Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ withdraw()
       ▼
┌─────────────────────────────────────────────────┐
│  1. Validates:                                  │
│     • Pool is active                            │
│     • User has available_rewards > 0            │
│     • Reward vault has sufficient balance        │
│                                                  │
│  2. Transfers rewards:                          │
│     Reward Vault → User Token Account           │
│                                                  │
│  3. Updates state:                               │
│     • staker.available_rewards = 0              │
│     • pool.rewards_in_pool -= withdrawal_amount │
└─────────────────────────────────────────────────┘
```

**Function: `withdraw`**
- **Purpose**: Withdraw accumulated rewards to user's wallet
- **Who can call**: Users with `available_rewards > 0`
- **What it does**:
  - Validates user has available rewards
  - Transfers all `available_rewards` from `reward_vault` → user's token account
  - Resets `staker.available_rewards` to 0
  - Decreases `pool.rewards_in_pool` by withdrawal amount

---

### 5. Unstaking Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ unstake(amount)
       ▼
┌─────────────────────────────────────────────────┐
│  1. Validates:                                  │
│     • Pool is active                            │
│     • User has sufficient stake                 │
│     • Lock-up period has ended (if applicable)  │
│                                                  │
│  2. Transfers tokens:                           │
│     Stake Vault → User Token Account            │
│                                                  │
│  3. Updates state:                               │
│     • staker.amount -= unstake_amount            │
│     • pool.total_staked -= unstake_amount       │
│     • total_token_staked unchanged (lifetime)   │
└─────────────────────────────────────────────────┘
```

**Function: `unstake`**
- **Purpose**: Unstake tokens after lock-up period
- **Who can call**: Users with active stakes
- **Parameters**:
  - `unstake_amount`: Amount to unstake
- **What it does**:
  - Validates lock-up period has ended (if `stake_periods > 0`)
  - Transfers tokens from `stake_vault` → user's token account
  - Decreases `staker.amount` (active stake)
  - Decreases `pool.total_staked`
  - Note: `total_token_staked` is NOT decreased (lifetime cumulative)

---

### 6. Admin Configuration Flow

```
┌─────────────┐
│    Admin    │
└──────┬──────┘
       │
       │ update_pool_config(...)
       ▼
┌─────────────────────────────────────────────────┐
│  Updates (optional parameters):                 │
│  • admin                                        │
│  • stake_epoch_cycles                           │
│  • reward_cycle_seconds                         │
│  • apy_bps                                      │
│  • is_active                                    │
└─────────────────────────────────────────────────┘
```

**Function: `update_pool_config`**
- **Purpose**: Update pool configuration
- **Who can call**: Pool admin only
- **Parameters** (all optional):
  - `new_admin`: New admin address
  - `new_stake_epoch_cycles`: Max lock-up periods
  - `new_reward_cycle_seconds`: Reward cycle duration
  - `new_apy_bps`: New APY (max 10000 = 100%)
  - `new_is_active`: Pool active status
- **What it does**:
  - Validates caller is current admin
  - Updates specified configuration fields
  - Validates new values (e.g., APY <= 10000)

---

## Complete Token Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    STAKING LIFECYCLE                         │
└─────────────────────────────────────────────────────────────┘

1. STAKE
   User Wallet → Stake Vault
   [Tokens locked in vault]

2. GET_REWARD (Periodic - every 5+ minutes)
   Stake Vault → Reward Vault
   [Rewards accumulated in reward vault]
   [User's available_rewards increases]

3. WITHDRAW (When user wants to claim)
   Reward Vault → User Wallet
   [Rewards sent to user]
   [available_rewards reset to 0]

4. UNSTAKE (After lock-up period)
   Stake Vault → User Wallet
   [Original staked tokens returned]
```

## Vault System

### Stake Vault
- **Purpose**: Holds all staked tokens
- **Authority**: StakingPool PDA
- **Seeds**: `["stake_vault", staking_pool.key()]`
- **Flow**:
  - Receives tokens from users during `stake()`
  - Sends tokens to `reward_vault` during `get_reward()`
  - Sends tokens back to users during `unstake()`

### Reward Vault
- **Purpose**: Intermediate storage for reward tokens
- **Authority**: StakingPool PDA
- **Seeds**: `["reward_vault", staking_pool.key()]`
- **Flow**:
  - Receives rewards from `stake_vault` during `get_reward()`
  - Sends rewards to users during `withdraw()`
  - Tracks total via `pool.rewards_in_pool`

## Key Concepts

### Lock-up Periods
- Users can stake with a lock-up period (`stake_periods`)
- Each period = `reward_cycle_seconds` (default: 86400 = 1 day)
- Tokens cannot be unstaked until `stake_end_time`
- Lock-up period extends if user stakes more with longer period

### Reward Calculation
- Rewards accrue continuously based on staked amount
- Calculated using high-precision math to avoid rounding errors
- Minimum claim interval: 5 minutes (`REWARD_INTERVAL_SECONDS`)
- Formula accounts for:
  - Current staked amount
  - Pool APY (basis points)
  - Time elapsed since last claim

### Two-Step Reward System
1. **`get_reward()`**: Calculates and transfers rewards to `reward_vault`
   - Updates `available_rewards` (user's claimable amount)
   - Can be called multiple times to accumulate rewards

2. **`withdraw()`**: Transfers `available_rewards` to user's wallet
   - Withdraws all accumulated rewards at once
   - Resets `available_rewards` to 0

### Lifetime Tracking
- `total_token_staked`: Never decreases, tracks all tokens ever staked
- `total_rewards_claimed`: Never decreases, tracks all rewards ever claimed
- `amount`: Current active stake (increases/decreases with stake/unstake)

## Account PDAs

### StakingPool
- **Seeds**: `["staking_pool"]`
- **Bump**: Auto-derived

### Staker
- **Seeds**: `["staker", staking_pool.key(), user.key()]`
- **Bump**: Auto-derived
- **One per user per pool**

### Stake Vault
- **Seeds**: `["stake_vault", staking_pool.key()]`
- **Bump**: Auto-derived
- **Token Account**: PDA-owned

### Reward Vault
- **Seeds**: `["reward_vault", staking_pool.key()]`
- **Bump**: Auto-derived
- **Token Account**: PDA-owned

### Trusted Admin
- **Seeds**: `["trusted_admin"]`
- **Bump**: Auto-derived
- **Set as pool admin during initialization**

## Function Summary

| Function | Purpose | Who Can Call | Key Actions |
|----------|---------|--------------|-------------|
| `initialize` | Create staking pool | Anyone | Creates pool, vaults, sets admin |
| `stake` | Stake tokens | Users | Transfers tokens, creates/updates staker |
| `get_reward` | Claim rewards | Stakers | Calculates & transfers rewards to reward vault |
| `withdraw` | Withdraw rewards | Stakers | Transfers rewards from vault to user |
| `unstake` | Unstake tokens | Stakers | Returns staked tokens after lock-up |
| `update_pool_config` | Update config | Admin only | Updates pool settings |
| `close` | Close pool | Admin only | Closes pool account (testing) |

## Environment Variables

See `.env.local.example` for configuration. The contract uses:
- `ANCHOR_PROVIDER_URL`: RPC endpoint
- `ANCHOR_WALLET`: Wallet keypair path
- Custom variables can be added and accessed via `process.env`

## Testing

Run tests with:
```bash
anchor test
```

Tests are located in `tests/drmr_staking.ts` and use the Anchor test framework.

