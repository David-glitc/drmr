use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::config::{StakingPool, Staker};
use crate::error::StakingError;

pub fn stake(
    ctx: Context<Stake>,
    stake_amount: u64,
    stake_periods: u8,
) -> Result<()> {
    msg!("Staking {:?} for {:?}", stake_amount, stake_periods);
    let pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validate pool is active
    require!(pool.is_active, StakingError::PoolInactive);

    // Validate stake amount
    require!(stake_amount > 0, StakingError::InvalidAmount);

    // Validate stake periods (0 to max_stake_epoch_cycles)
    require!(
        stake_periods as u64 <= pool.stake_epoch_cycles,
        StakingError::InvalidStakePeriod
    );

    // Calculate stake end time
    // Each period = reward_cycle_seconds
    let stake_duration = (stake_periods as u64)
        .checked_mul(pool.reward_cycle_seconds)
        .ok_or(StakingError::MathOverflow)?;
    let stake_end_time = current_time
        .checked_add(stake_duration as i64)
        .ok_or(StakingError::MathOverflow)?;

    // Transfer tokens from user to pool
    // Token account validation (mint, owner) is handled by Anchor constraints
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.pool_token_account.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, stake_amount)?;

    // Initialize staker account (init constraint ensures this is first stake)
    staker.pool = pool.key();
    staker.user = ctx.accounts.user.key();
    staker.amount = stake_amount;
    staker.stake_periods = stake_periods;
    staker.staked_at = current_time;
    staker.stake_end_time = stake_end_time;
    staker.last_claim = current_time;
    staker.total_rewards_claimed = 0;

    // Update pool stats
    pool.total_stakers = pool
        .total_stakers
        .checked_add(1)
        .ok_or(StakingError::MathOverflow)?;

    // Update pool total staked
    pool.total_staked = pool
        .total_staked
        .checked_add(stake_amount)
        .ok_or(StakingError::MathOverflow)?;

    msg!(
        "Staked {} tokens for {} periods, ending at {}",
        stake_amount,
        stake_periods,
        stake_end_time
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(stake_amount: u64, stake_periods: u8)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        constraint = staking_pool.is_active @ StakingError::PoolInactive
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init,
        payer = user,
        space = Staker::INIT_SPACE,
        seeds = [b"staker", staking_pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    /// The user who is staking
    #[account(mut)]
    pub user: Signer<'info>,

    /// User's DRMR token account (source)
    #[account(
        mut,
        constraint = user_token_account.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount,
        constraint = user_token_account.owner == user.key() @ StakingError::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Pool's DRMR token account (destination)
    #[account(
        mut,
        constraint = pool_token_account.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount
    )]
    pub pool_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}