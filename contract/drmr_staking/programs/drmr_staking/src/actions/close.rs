use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::config::{StakingPool, PRIMARY_ADMIN};
use crate::error::StakingError;
use crate::actions::close_token::close_token_vaults;

#[inline(never)]
pub fn close(ctx: Context<Close>) -> Result<()> {
    // Any admin can trigger close
    let signer = ctx.accounts.admin.key();
    require!(ctx.accounts.staking_pool.admins.contains(&signer), StakingError::Unauthorized);
    
    let pool_key = ctx.accounts.staking_pool.key();
    let staking_pool_account_info = ctx.accounts.staking_pool.to_account_info();
    
    msg!("=== EMERGENCY CLOSE ===");
    msg!("Triggered by: {}", signer);
    
    // Transfer all tokens to primary admin's token account
    close_token_vaults(
        &ctx.accounts.stake_vault,
        &ctx.accounts.reward_vault,
        &ctx.accounts.primary_admin_token_account,
        &ctx.accounts.primary_admin.to_account_info(),
        &staking_pool_account_info,
        &pool_key,
        ctx.bumps.staking_pool,
        ctx.bumps.stake_vault,
        ctx.bumps.reward_vault,
        &ctx.accounts.token_program.to_account_info(),
        false,
    )?;
    
   Ok(())
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        close = primary_admin, 
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump,
        close = primary_admin,
        constraint = stake_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump,
        close = primary_admin,
        constraint = reward_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    /// Any admin can sign to trigger close
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// Primary admin receives all tokens and rent (validated against PRIMARY_ADMIN constant)
    /// CHECK: Validated by constraint
    #[account(
        mut,
        constraint = primary_admin.key() == PRIMARY_ADMIN @ StakingError::Unauthorized
    )]
    pub primary_admin: SystemAccount<'info>,
    
    /// CHECK: Validated against staking_pool.drmr_mint
    pub drmr_mint: AccountInfo<'info>,
    
    /// Primary admin's token account - receives all tokens
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = drmr_mint,
        associated_token::authority = primary_admin,
        constraint = drmr_mint.key() == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub primary_admin_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}