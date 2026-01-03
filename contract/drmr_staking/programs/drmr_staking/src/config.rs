use anchor_lang::prelude::*;

#[account]
pub struct StakingPool {
    pub admin: Pubkey,
    pub drmr_mint: Pubkey,
    /// Number of epochs for stake period
    pub stake_epoch_cycles: u64,
    /// Reward cycle in seconds
    pub reward_cycle_seconds: u64,
    /// APY in basis points (10000 = 100%)
    pub apy_bps: u16,
    /// Total amount staked
    pub total_staked: u64,
    /// Total number of stakers
    pub total_stakers: u64,
    /// Total rewards distributed
    pub total_rewards_distributed: u64,
    /// Pool active status
    pub is_active: bool,
    /// Pool creation timestamp
    pub created_at: i64,
    /// Last reward distribution timestamp
    pub last_reward_distribution: i64,
}

impl StakingPool {
    pub const LEN: usize = 8 + // discriminator
        32 + // admin
        32 + // drmr_mint
        8 +  // stake_epoch_cycles
        8 +  // reward_cycle_seconds
        2 +  // apy_bps
        8 +  // total_staked
        8 +  // total_stakers
        8 +  // total_rewards_distributed
        1 +  // is_active
        8 +  // created_at
        8; // last_reward_distribution
}

#[account]
pub struct Staker {
    pub user: Pubkey,
    /// Staked amount
    pub amount: u64,
    /// Number of epoch cycles staked
    pub stake_periods: u8,
    /// Stake start timestamp
    pub staked_at: i64,
    /// Stake end timestamp
    pub stake_end_time: i64,
    /// Last reward claim timestamp
    pub last_claim: i64,
    /// Total rewards claimed by this staker
    pub total_rewards_claimed: u64,
}

impl Staker {
    pub const LEN: usize = 8 + // discriminator
        32 + // user
        8 +  // amount
        1 +  // stake_periods
        8 +  // staked_at
        8 +  // stake_end_time
        8 +  // last_claim
        8; // total_rewards_claimed
}
