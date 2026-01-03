# DRMR Token Staking Pool

A robust Solana program for staking DRMR tokens with configurable reward cycles, APY, and stake periods.

## Features

- **Admin Controls**: Set admin at deploy time, configure pool parameters
- **Flexible Staking**: Stake for multiple epoch cycles (1-12 epochs)
- **Reward Distribution**: Configurable reward cycles (1 hour to max epoch cycle)
- **APY Management**: Set and update APY for the pool
- **Comprehensive Tracking**: Track total staked, total stakers, total rewards distributed
- **Staker Management**: View individual staker information including stake amounts and periods
- **Emergency Controls**: Pause/unpause functionality for admin

## Program Structure

### Accounts

#### StakingPool
- `admin`: Pool administrator
- `drmr_mint`: DRMR token mint address
- `stake_epoch_cycles`: Number of epochs for stake period (e.g., 29 days = ~29 epochs)
- `reward_cycle_seconds`: Reward cycle in seconds (min 1 hour, max epoch cycle)
- `apy_bps`: APY in basis points (10000 = 100%)
- `total_staked`: Total amount staked
- `total_stakers`: Total number of stakers
- `total_rewards_distributed`: Total rewards distributed
- `is_active`: Pool active status
- `created_at`: Pool creation timestamp
- `last_reward_distribution`: Last reward distribution timestamp

#### Staker
- `user`: Staker's public key
- `amount`: Staked amount
- `stake_periods`: Number of epoch cycles staked
- `staked_at`: Stake start timestamp
- `stake_end_time`: Stake end timestamp
- `last_claim`: Last reward claim timestamp
- `total_rewards_claimed`: Total rewards claimed by this staker

## Instructions

### Initialize
Initialize the staking pool with admin settings.

```rust
pub fn initialize(
    ctx: Context<Initialize>,
    stake_epoch_cycles: u64,
    reward_cycle_seconds: u64,
    apy_bps: u16,
) -> Result<()>
```

### Update Config
Update pool configuration (admin only).

```rust
pub fn update_config(
    ctx: Context<UpdateConfig>,
    stake_epoch_cycles: Option<u64>,
    reward_cycle_seconds: Option<u64>,
    apy_bps: Option<u16>,
) -> Result<()>
```

### Deposit Rewards
Deposit DRMR tokens to the reward pool (admin only).

```rust
pub fn deposit_rewards(ctx: Context<DepositRewards>, amount: u64) -> Result<()>
```

### Stake
Stake DRMR tokens for a specified number of epoch cycles.

```rust
pub fn stake(
    ctx: Context<Stake>,
    amount: u64,
    stake_periods: u8,
) -> Result<()>
```

### Unstake
Unstake DRMR tokens after stake period ends.

```rust
pub fn unstake(ctx: Context<Unstake>) -> Result<()>
```

### Claim Rewards
Claim staking rewards based on APY and time elapsed.

```rust
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()>
```

### Set Active
Emergency pause/unpause functionality (admin only).

```rust
pub fn set_active(ctx: Context<SetActive>, is_active: bool) -> Result<()>
```

## Setup

### Prerequisites

- Rust 1.70+
- Solana CLI 1.18+
- Anchor 0.30.0+

### Installation

```bash
# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Build the program
anchor build

# Run tests
anchor test
```

### Deployment

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet
anchor deploy --provider.cluster mainnet
```

## Testing

The test suite includes comprehensive tests for:
- Pool initialization
- Reward deposits
- Staking functionality
- Multiple stakers
- Reward claiming
- Config updates
- Admin controls
- Error handling

Run tests with:
```bash
anchor test
```

## Security Considerations

- Admin controls are enforced at the program level
- Staking periods are enforced - unstaking only allowed after period ends
- Reward cycles are enforced - claiming only allowed after cycle completes
- Math overflow protection
- Input validation for all parameters
- Emergency pause functionality

## Error Codes

- `Unauthorized`: Action requires admin privileges
- `InvalidRewardCycle`: Reward cycle outside valid range
- `InvalidApy`: APY exceeds maximum (100%)
- `InvalidStakePeriod`: Invalid stake period
- `InvalidAmount`: Invalid amount
- `PoolInactive`: Pool is currently paused
- `NoStake`: No stake found for user
- `StakePeriodNotEnded`: Cannot unstake before period ends
- `RewardCycleNotReady`: Cannot claim rewards before cycle completes
- `NoRewardsAvailable`: No rewards available to claim
- `InsufficientRewards`: Insufficient rewards in pool
- `MathOverflow`: Math overflow occurred

## License

MIT
