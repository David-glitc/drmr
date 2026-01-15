use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::config::{StakingPool, Staker};
use crate::error::StakingError;
use crate::global::BASIS_POINTS;

/// Reward calculation interval: 5 minutes in seconds
const REWARD_INTERVAL_SECONDS: u64 = 300; // 5 minutes
/// Seconds in a year (365.25 days to account for leap years)
const SECONDS_PER_YEAR: u64 = 31_557_600;

/// Helper function to calculate rewards based on staked amount, APY, and time elapsed
/// Uses u128 for intermediate calculations to avoid overflow with large token amounts
/// 
/// Formula: reward = (staked_amount * apy_bps * time_elapsed_seconds) / (BASIS_POINTS * seconds_per_year)
/// 
/// Example calculation (with 9 decimal token):
/// - staked_amount = 4000 tokens = 4,000,000,000,000 (4e12 with 9 decimals)
/// - apy_bps = 4000 (40% APY, since BASIS_POINTS = 10000 = 100%)
/// - time_elapsed_seconds = 86400 (24 hours)
/// 
/// Step-by-step (using u128):
/// 1. numerator = 4,000,000,000,000 * 4000 * 86400 = 1,382,400,000,000,000,000,000 (1.38e21)
/// 2. denominator = 10,000 * 31,557,600 = 315,576,000,000
/// 3. reward = 1,382,400,000,000,000,000,000 / 315,576,000,000 = 4,380,561,643,835
/// 4. Final result: ~4.38 tokens (with 9 decimals)
/// 
/// Verification: 4000 tokens at 40% APY for 1 year = 1600 tokens
/// For 24 hours: 1600 * (86400 / 31,557,600) ≈ 4.38 tokens ✓
/// 
/// # Arguments
/// * `staked_amount` - Amount currently staked (includes token decimals)
/// * `apy_bps` - APY in basis points (BASIS_POINTS = 10000 = 100%)
/// * `time_elapsed_seconds` - Time elapsed since last claim in seconds
/// 
/// # Returns
/// Calculated reward amount (with same decimals as input), or error on overflow
fn calculate_reward(
    staked_amount: u64,
    apy_bps: u16,
    time_elapsed_seconds: u64,
) -> Result<u64> {
    // Ensure we have a stake
    if staked_amount == 0 {
        return Ok(0);
    }

    // Calculate rewards with high precision using u128 to avoid overflow
    // Formula: (staked_amount * apy_bps * time_elapsed_seconds) / (BASIS_POINTS * seconds_per_year)
    // 
    // Using u128 because with SPL tokens (9 decimals):
    // - staked_amount can be ~10^18 (billions of tokens with decimals)
    // - multiplied by apy_bps (~10^4) and time (~10^7 for a year)
    // - this exceeds u64 max (~1.8e19)
    
    let staked_amount_u128 = staked_amount as u128;
    let apy_bps_u128 = apy_bps as u128;
    let time_elapsed_u128 = time_elapsed_seconds as u128;
    let basis_points_u128 = BASIS_POINTS as u128;
    let seconds_per_year_u128 = SECONDS_PER_YEAR as u128;
    
    // Numerator: staked_amount * apy_bps * time_elapsed_seconds
    let numerator = staked_amount_u128
        .checked_mul(apy_bps_u128)
        .ok_or(StakingError::MathOverflow)?
        .checked_mul(time_elapsed_u128)
        .ok_or(StakingError::MathOverflow)?;

    // Denominator: BASIS_POINTS * seconds_per_year
    let denominator = basis_points_u128
        .checked_mul(seconds_per_year_u128)
        .ok_or(StakingError::MathOverflow)?;

    // Calculate reward: numerator / denominator
    let reward_u128 = numerator
        .checked_div(denominator)
        .ok_or(StakingError::MathOverflow)?;

    // Convert back to u64 (safe because reward should be much smaller than staked amount)
    let reward = u64::try_from(reward_u128)
        .map_err(|_| StakingError::MathOverflow)?;

    Ok(reward)
}

/// This should be called by the front end every 5 minutes or so
pub fn get_reward(ctx: Context<GetReward>) -> Result<()> {
    let pool = &ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp as u32;

    // Validate pool is active
    require!(pool.is_active, StakingError::PoolInactive);

    // Validate user has an active stake
    // Not necessary there should be an active stake
    require!(staker.amount > 0, StakingError::NoStake);

    // Calculate time elapsed since last claim
    let time_elapsed_seconds = current_time
        .checked_sub(staker.last_claim)
        .ok_or(StakingError::MathOverflow)? as u64;

    // Require at least 5 minutes (one reward interval) has passed
    require!(
        time_elapsed_seconds >= REWARD_INTERVAL_SECONDS,
        StakingError::RewardCycleNotReady
    );

    // Calculate rewards based on current staked amount
    let reward_amount = calculate_reward(staker.amount, pool.apy_bps, time_elapsed_seconds)?;

    // Validate reward amount is greater than zero
    require!(reward_amount > 0, StakingError::NoRewardsAvailable);

    // IMPORTANT: Rewards come from the REWARD_VAULT, not the STAKE_VAULT
    // The reward_vault must be PRE-FUNDED by the admin/treasury
    // This prevents User A's rewards from draining User B's staked principal
    //
    // Flow:
    // 1. Admin funds reward_vault with tokens for rewards
    // 2. Users stake to stake_vault (their principal is safe)
    // 3. get_reward moves calculated rewards from reward_vault to user's available_rewards
    // 4. withdraw moves available_rewards from reward_vault to user's wallet
    // 5. unstake moves principal from stake_vault to user's wallet
    
    // Check if reward_vault has sufficient balance to cover rewards
    // Account for already-reserved rewards (rewards_in_pool tracks rewards claimed but not yet withdrawn)
    let available_in_vault = ctx.accounts.reward_vault.amount
        .saturating_sub(pool.rewards_in_pool);
    
    require!(
        available_in_vault >= reward_amount,
        StakingError::InsufficientRewards
    );

    // Update staker's available rewards (no transfer yet - just accounting)
    // The actual tokens stay in reward_vault until withdraw() is called

    // update the total rewards claimed
    staker.total_rewards_claimed = staker
    .total_rewards_claimed
    .checked_add(reward_amount)
    .ok_or(StakingError::MathOverflow)?;

    // update the total available rewards
    staker.available_rewards = staker
    .available_rewards
    .checked_add(reward_amount)
    .ok_or(StakingError::MathOverflow)?;

    // Update staker: set last_claim to current time and accumulate total rewards claimed
    staker.last_claim = current_time;

    // Update pool: accumulate total rewards distributed and increase rewards in pool
    let pool = &mut ctx.accounts.staking_pool;
    pool.total_rewards_distributed = pool
        .total_rewards_distributed
        .checked_add(reward_amount)
        .ok_or(StakingError::MathOverflow)?;
    
    // Increase rewards_in_pool when rewards are transferred to reward_vault
    pool.rewards_in_pool = pool
        .rewards_in_pool
        .checked_add(reward_amount)
        .ok_or(StakingError::MathOverflow)?;

    msg!(
        "Claimed {} rewards for {} staked tokens over {} seconds",
        reward_amount,
        staker.amount,
        time_elapsed_seconds
    );

    Ok(())
}

#[derive(Accounts)]
pub struct GetReward<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        constraint = staking_pool.is_active @ StakingError::PoolInactive
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"staker", staking_pool.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = staker.user == user.key() @ StakingError::Unauthorized
    )]
    pub staker: Account<'info, Staker>,

    /// The user who is claiming rewards
    #[account(mut)]
    pub user: Signer<'info>,

    /// Reward vault: PDA-owned token account holding reward tokens
    /// IMPORTANT: This vault must be PRE-FUNDED by the admin/treasury
    /// Rewards are tracked in staker.available_rewards until withdrawn
    #[account(
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump,
        constraint = reward_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}