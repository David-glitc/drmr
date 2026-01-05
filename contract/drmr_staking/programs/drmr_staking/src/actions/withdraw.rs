use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::config::{StakingPool, Staker};
use crate::error::StakingError;

pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let pool = &ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    
    // Validate pool is active
    require!(pool.is_active, StakingError::PoolInactive);
    
    // Validate user has available rewards to withdraw
    require!(staker.available_rewards > 0, StakingError::NoRewardsAvailable);
    
    // Get the withdrawal amount (all available rewards)
    let withdrawal_amount = staker.available_rewards;
    
    // Validate reward vault has sufficient balance
    require!(
        ctx.accounts.reward_vault.amount >= withdrawal_amount,
        StakingError::InsufficientRewards
    );
    
    // Get account info and key before mutable borrows
    let pool_key = pool.key();
    let staking_pool_account_info = ctx.accounts.staking_pool.to_account_info();
    
    // Transfer tokens from reward_vault to user's token account
    // reward_vault is PDA-owned by staking_pool, so we need signer seeds
    let reward_vault_seeds = &[
        b"reward_vault",
        pool_key.as_ref(),
        &[ctx.bumps.reward_vault],
    ];
    let reward_vault_signer = &[&reward_vault_seeds[..]];

    // Transfer from the reward vault to the user's account
    let cpi_accounts = Transfer {
        from: ctx.accounts.reward_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: staking_pool_account_info,
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, reward_vault_signer);
    token::transfer(cpi_ctx, withdrawal_amount)?;
    
    // Reset available rewards to zero after withdrawal
    staker.available_rewards = 0;
    
    // Decrease rewards_in_pool when rewards are withdrawn from reward_vault
    let pool = &mut ctx.accounts.staking_pool;
    pool.rewards_in_pool = pool
        .rewards_in_pool
        .checked_sub(withdrawal_amount)
        .ok_or(StakingError::MathOverflow)?;
    
    msg!("Withdrew {} reward tokens", withdrawal_amount);
    
    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
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
    
    /// The user who is withdrawing rewards
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
    
    /// Reward vault: PDA-owned token account holding reward tokens (source)
    #[account(
        mut,
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump,
        constraint = reward_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}