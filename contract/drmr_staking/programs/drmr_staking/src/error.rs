use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Unauthorized User")]
    Unauthorized,
    #[msg("Invalid MiNt account")]
    InvalidMint,
    #[msg("Unstake amount > Staked balance")]
    InsufficientStake,
    #[msg("Invalid reward cycle")]
    InvalidRewardCycle,
    #[msg("Invalid APY")]
    InvalidApy,
    #[msg("Invalid stake period")]
    InvalidStakePeriod,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Pool is inactive")]
    PoolInactive,
    #[msg("No stake found")]
    NoStake,
    #[msg("Stake period has not ended")]
    StakePeriodNotEnded,
    #[msg("Reward cycle not ready")]
    RewardCycleNotReady,
    #[msg("No rewards available")]
    NoRewardsAvailable,
    #[msg("Insufficient rewards in pool")]
    InsufficientRewards,
    #[msg("Math overflow")]
    MathOverflow,
}