use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use crate::config::StakingPool;
use crate::error::StakingError;

/// Admin function to fund the reward vault with tokens
/// This must be called by the pool admin to pre-fund rewards for stakers
/// 
/// The reward_vault must have sufficient balance to cover all expected rewards
/// Formula: required_funding = (total_expected_staked * apy_bps * period_seconds) / (10000 * seconds_per_year)
pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    let pool = &ctx.accounts.staking_pool;
    
    // Validate pool is active
    require!(pool.is_active, StakingError::PoolInactive);
    
    // Validate amount is greater than zero
    require!(amount > 0, StakingError::InvalidAmount);
    
    // Transfer tokens from admin's token account to reward_vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.admin_token_account.to_account_info(),
        to: ctx.accounts.reward_vault.to_account_info(),
        authority: ctx.accounts.admin.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;
    
    msg!("Funded reward vault with {} tokens", amount);
    msg!("New reward vault balance: {}", ctx.accounts.reward_vault.amount + amount);
    
    Ok(())
}

#[derive(Accounts)]
pub struct FundRewards<'info> {
    #[account(
        seeds = [b"staking_pool"],
        bump,
        constraint = staking_pool.is_active @ StakingError::PoolInactive,
        constraint = staking_pool.admins.contains(&admin.key()) @ StakingError::Unauthorized
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// The admin who is funding the rewards
    /// Must be the pool admin
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// DRMR mint account
    /// CHECK: Validated against staking_pool.drmr_mint
    pub drmr_mint: AccountInfo<'info>,
    
    /// Admin's DRMR token account (source)
    #[account(
        mut,
        associated_token::mint = drmr_mint,
        associated_token::authority = admin,
        constraint = drmr_mint.key() == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    /// Reward vault: PDA-owned token account to hold reward tokens
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
