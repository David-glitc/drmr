use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::config::{StakingPool, Staker};
use crate::error::StakingError;
use crate::global::{BASIS_POINTS, PRECISION};

/// Reward calculation interval: 5 minutes in seconds
const REWARD_INTERVAL_SECONDS: u64 = 300; // 5 minutes
/// Seconds in a year (365.25 days to account for leap years)
const SECONDS_PER_YEAR: u64 = 31_557_600;

/// Helper function to calculate rewards based on staked amount, APY, and time elapsed
/// Calculates rewards using high precision to avoid rounding errors
/// 
/// Formula: reward = (staked_amount * apy_bps * time_elapsed_seconds * PRECISION) / (BASIS_POINTS * seconds_per_year)
/// 
/// Example calculation:
/// - staked_amount = 4000 tokens
/// - apy_bps = 4000 (40% APY, since BASIS_POINTS = 10000 = 100%)
/// - time_elapsed_seconds = 86400 (24 hours)
/// 
/// Step-by-step:
/// 1. numerator = 4000 * 4000 * 86400 * 1_000_000_000 
///             = 1,382,400,000,000,000,000,000
/// 2. denominator = 10_000 * 31_557_600 
///                = 315,576,000,000
/// 3. reward_with_precision = 1,382,400,000,000,000,000,000 / 315,576,000,000 
///                          = 4,380,561,259
/// 4. reward = 4,380,561,259 / 1_000_000_000 
///          = 4.380561259 tokens (with integer division: 4 tokens)
/// 5. Final result (u64): 4 tokens (rounded down)
/// 
/// Verification: 4000 tokens at 40% APY for 1 year = 1600 tokens
/// For 24 hours: 1600 * (86400 / 31,557,600) ≈ 4.38 tokens ✓
/// 
/// # Arguments
/// * `staked_amount` - Amount currently staked
/// * `apy_bps` - APY in basis points (BASIS_POINTS = 10000 = 100%)
/// * `time_elapsed_seconds` - Time elapsed since last claim in seconds
/// 
/// # Returns
/// Calculated reward amount, or error on overflow
fn calculate_reward(
    staked_amount: u64,
    apy_bps: u16,
    time_elapsed_seconds: u64,
) -> Result<u64> {
    // Ensure we have a stake
    if staked_amount == 0 {
        return Ok(0);
    }

    // Calculate rewards with high precision to avoid rounding errors
    // Formula: (staked_amount * apy_bps * time_elapsed * PRECISION) / (BASIS_POINTS * seconds_per_year)
    let apy_bps_u64 = apy_bps as u64;
    
    // Numerator: staked_amount * apy_bps * time_elapsed_seconds * PRECISION
    // This maintains precision during division
    let numerator = staked_amount
        .checked_mul(apy_bps_u64)
        .ok_or(StakingError::MathOverflow)?
        .checked_mul(time_elapsed_seconds)
        .ok_or(StakingError::MathOverflow)?
        .checked_mul(PRECISION)
        .ok_or(StakingError::MathOverflow)?;

    // Denominator: BASIS_POINTS * seconds_per_year
    let denominator = BASIS_POINTS
        .checked_mul(SECONDS_PER_YEAR)
        .ok_or(StakingError::MathOverflow)?;

    // Calculate reward with precision: numerator / denominator
    // This gives us reward * PRECISION
    let reward_with_precision = numerator
        .checked_div(denominator)
        .ok_or(StakingError::MathOverflow)?;

    // Divide by PRECISION to get final reward amount
    let reward = reward_with_precision
        .checked_div(PRECISION)
        .ok_or(StakingError::MathOverflow)?;

    Ok(reward)
}

/// ### This should be called by the front end every 5 minutes or so
pub fn get_reward(ctx: Context<GetReward>) -> Result<()> {
    let pool = &ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

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

    // Get account info before mutable borrows
    let pool_key = pool.key();
    let staking_pool_account_info = ctx.accounts.staking_pool.to_account_info();

    // Check if stake_vault has sufficient balance to cover rewards
    require!(
        ctx.accounts.stake_vault.amount >= reward_amount,
        StakingError::InsufficientRewards
    );

    // Transfer rewards from stake_vault to reward_vault
    // Both vaults are PDA-owned by staking_pool, so we need signer seeds for stake_vault
    let stake_vault_seeds = &[
        b"stake_vault",
        pool_key.as_ref(),
        &[ctx.bumps.stake_vault],
    ];
    let stake_vault_signer = &[&stake_vault_seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: staking_pool_account_info,
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, stake_vault_signer);
    token::transfer(cpi_ctx, reward_amount)?;

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
        constraint = staker.pool == staking_pool.key() @ StakingError::Unauthorized,
        constraint = staker.user == user.key() @ StakingError::Unauthorized
    )]
    pub staker: Account<'info, Staker>,

    /// The user who is claiming rewards
    #[account(mut)]
    pub user: Signer<'info>,

    /// Stake vault: PDA-owned token account holding staked tokens (source for rewards)
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump,
        constraint = stake_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    /// Reward vault: PDA-owned token account holding reward tokens (destination)
    /// Rewards are transferred here and can be withdrawn later via withdraw function
    #[account(
        mut,
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump,
        constraint = reward_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}