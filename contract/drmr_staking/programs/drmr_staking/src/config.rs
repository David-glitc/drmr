use anchor_lang::prelude::*;

pub const PRIMARY_ADMIN: Pubkey = Pubkey::from_str_const("9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8");


#[account]
#[derive(InitSpace)]
pub struct StakingPool {
    /// Admins who can manage the pool (max 3)
    #[max_len(3)]
    pub admins: Vec<Pubkey>,
    pub drmr_mint: Pubkey,
    /// Maximum allowed epoch cycles for stake lock-up periods
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
    /// rewards still available in reward pool
    pub rewards_in_pool: u64,
    /// Pool active status
    pub is_active: bool,
    /// Pool creation timestamp
    pub created_at: u32,
    /// Last reward distribution timestamp
    pub last_reward_distribution: u32,
}


#[account]
#[derive(InitSpace)]
pub struct Staker {
    pub user: Pubkey,
    /// Currently staked amount (active tokens in pool, decreases on unstake)
    pub amount: u64,
    /// Number of epoch cycles staked
    pub stake_periods: u8,
    /// Stake start timestamp
    pub staked_at: u32,
    /// Stake end timestamp
    pub stake_end_time: u32,
    /// Last reward claim timestamp
    pub last_claim: u32,
    /// Total rewards claimed by this staker
    pub total_rewards_claimed: u64,
    /// available rewards in the reward vault that the user can claim
    pub available_rewards: u64,
    /// Lifetime cumulative total of tokens ever staked (never decreases, includes unstaked tokens)
    pub total_token_staked: u64,
}
