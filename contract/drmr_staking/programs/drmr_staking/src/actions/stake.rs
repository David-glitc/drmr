use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
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

    // Transfer tokens from user to stake vault
    // User is the authority (transferring FROM their account), so no signer seeds needed
    // The stake_vault is the destination and doesn't require signing to receive tokens
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.stake_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, stake_amount)?;

    // Check if this is the first stake (no currently active stake)
    // Note: amount = currently staked, total_token_staked = lifetime cumulative total
    let is_first_stake = staker.amount == 0;

    if is_first_stake {
        // First stake: Initialize all fields
        staker.pool = pool.key();
        staker.user = ctx.accounts.user.key();
        // amount = currently active stake (will decrease on unstake)
        staker.amount = stake_amount;
        staker.stake_periods = stake_periods;
        staker.staked_at = current_time;
        staker.stake_end_time = stake_end_time;
        // Initialize last_claim to current_time so rewards start accruing from now
        // This will be updated in get_rewards when rewards are claimed
        staker.last_claim = current_time;
        staker.total_rewards_claimed = 0;
        staker.available_rewards = 0;
        // total_token_staked = lifetime cumulative total (never decreases)
        staker.total_token_staked = stake_amount;

        // Only increment total_stakers on first stake
        pool.total_stakers = pool
            .total_stakers
            .checked_add(1)
            .ok_or(StakingError::MathOverflow)?;
    } else {
        // Subsequent stake: Accumulate values
        // Add to currently active stake (amount decreases on unstake, increases on stake)
        staker.amount = staker
            .amount
            .checked_add(stake_amount)
            .ok_or(StakingError::MathOverflow)?;
        
        // Update stake end time to the later of current or new end time
        // This ensures the lock-up period extends if the new stake has a longer period
        if stake_end_time > staker.stake_end_time {
            staker.stake_end_time = stake_end_time;
            // Update stake_periods to match the longest lock-up period
            staker.stake_periods = stake_periods;
        }
        
        // Accumulate lifetime total (never decreases, tracks all tokens ever staked)
        staker.total_token_staked = staker
            .total_token_staked
            .checked_add(stake_amount)
            .ok_or(StakingError::MathOverflow)?;
        
        // Don't reset last_claim or total_rewards_claimed - preserve existing values
        // Don't increment total_stakers - user already counted
    }

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
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        constraint = staking_pool.is_active @ StakingError::PoolInactive
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Staker::INIT_SPACE,
        seeds = [b"staker", staking_pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    /// The user who is staking
    #[account(mut)]
    pub user: Signer<'info>,

    /// DRMR mint account
    /// CHECK: Validated against staking_pool.drmr_mint
    pub drmr_mint: AccountInfo<'info>,

    /// User's DRMR token account (source) - Associated Token Account
    /// Automatically derived and created if needed
    /// init_if_needed automatically makes the account mutable
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = drmr_mint,
        associated_token::authority = user,
        constraint = drmr_mint.key() == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Stake vault: PDA-owned token account to hold staked tokens
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump,
        constraint = stake_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidAmount
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}