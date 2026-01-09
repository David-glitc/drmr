use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::config::{StakingPool, Staker};
use crate::error::StakingError;

pub fn unstake(ctx: Context<Unstake>, unstake_amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Get account info before mutable borrows
    let staking_pool_account_info = ctx.accounts.staking_pool.to_account_info();
    let staked_amount = ctx.accounts.staker.amount;

    // Validate pool is active
    require!(
        ctx.accounts.staking_pool.is_active,
        StakingError::PoolInactive
    );

    // Validate unstake amount is greater than zero
    require!(unstake_amount > 0, StakingError::InvalidAmount);

    // Validate user has an active stake
    require!(staked_amount > 0, StakingError::NoStake);

    // Ensure the user's stake is greater or equal to what the user wants to unstake
    require!(staked_amount >= unstake_amount, StakingError::InsufficientStake);

    // Validate stake period has ended (if there was a lock-up period)
    if ctx.accounts.staker.stake_periods > 0 {
        require!(
            current_time >= ctx.accounts.staker.stake_end_time,
            StakingError::StakePeriodNotEnded
        );
    }

    let pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;

    // Transfer tokens from stake vault to user
    // stake_vault is owned by staking_pool PDA, so we need to sign with staking_pool seeds
    let staking_pool_seeds: &[&[u8]] = &[
        b"staking_pool",
        &[ctx.bumps.staking_pool],
    ];
    let staking_pool_signer = &[staking_pool_seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.stake_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: staking_pool_account_info,
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_pool_signer);
    token::transfer(cpi_ctx, unstake_amount)?;

    // Update staker: Decreases by number of tokens removed from the pool
    // Note: total_token_staked is NOT decreased (it's a lifetime cumulative total)
    staker.amount = staker
    .amount
    .checked_sub(unstake_amount)
    .ok_or(StakingError::InvalidAmount)?;

    // Update pool: decrease total_staked
    pool.total_staked = pool
        .total_staked
        .checked_sub(unstake_amount)
        .ok_or(StakingError::MathOverflow)?;

    msg!("Unstaked {} tokens", unstake_amount);

    Ok(())
}

#[derive(Accounts)]
pub struct Unstake<'info> {
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

    /// The user who is unstaking
    #[account(mut)]
    pub user: Signer<'info>,

    /// DRMR mint account
    /// CHECK: Validated against staking_pool.drmr_mint
    pub drmr_mint: AccountInfo<'info>,

    /// User's DRMR token account (destination) - Associated Token Account
    /// Automatically derived and created if needed
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = drmr_mint,
        associated_token::authority = user,
        constraint = drmr_mint.key() == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Stake vault: PDA-owned token account holding staked tokens (source)
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump,
        constraint = stake_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub stake_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}