use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::config::StakingPool;
use crate::error::StakingError;
use crate::actions::close_token::close_token_vaults;

/// Emergency close: Transfers all funds to admin and closes all accounts
/// Only the admin can close the pool
/// All tokens from stake_vault and reward_vault are sent to admin_token_account
pub fn close(ctx: Context<Close>) -> Result<()> {
    let close_admin = ctx.accounts.admin.key();
    let staking_pool_admin = ctx.accounts.staking_pool.admin;
    require!(close_admin == staking_pool_admin, StakingError::Unauthorized);
    
    let pool_key = ctx.accounts.staking_pool.key();
    let staking_pool_account_info = ctx.accounts.staking_pool.to_account_info();
    
    // Log initial balances for manual distribution tracking
    msg!("=== EMERGENCY CLOSE: Vault Balances ===");
    msg!("Stake vault: {}", ctx.accounts.stake_vault.key());
    msg!("Reward vault: {}", ctx.accounts.reward_vault.key());
    msg!("Admin token account: {}", ctx.accounts.admin_token_account.key());
    msg!("---------------------------------");
    
    // Use the helper function to transfer funds from vaults to admin
    // Note: We set close_accounts = false because Anchor's 'close = admin' constraint
    // will automatically close the accounts after this function completes
    let (stake_balance, reward_balance) = close_token_vaults(
        &ctx.accounts.stake_vault,
        &ctx.accounts.reward_vault,
        &ctx.accounts.admin_token_account,
        &ctx.accounts.admin.to_account_info(),
        &staking_pool_account_info,
        &pool_key,
        ctx.bumps.staking_pool, // Bump for staking_pool PDA
        ctx.bumps.stake_vault,
        ctx.bumps.reward_vault,
        &ctx.accounts.token_program.to_account_info(),
        false, // Don't close accounts here - Anchor's 'close = admin' will handle it
    )?;
    
    // Summary for manual distribution
    msg!("=== TRANSFER SUMMARY ===");
    msg!("Stake vault → Admin: {} tokens", stake_balance);
    msg!("Reward vault → Admin: {} tokens", reward_balance);
    msg!("Total transferred: {} tokens", stake_balance.saturating_add(reward_balance));
    msg!("Emergency close complete: All funds transferred to admin, closing staking pool and vaults");
    // Note: The vaults and staking_pool will be automatically closed by Anchor
    // due to the 'close = admin' constraints in the account struct
    Ok(())
}

#[derive(Accounts)]
pub struct Close<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        close = admin, // Close the account and send rent to admin
        has_one = admin @ StakingError::Unauthorized
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// Stake vault: PDA-owned token account holding staked tokens
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump,
        close = admin, // Close the account and send rent to admin
        constraint = stake_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    /// Reward vault: PDA-owned token account holding reward tokens
    #[account(
        mut,
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump,
        close = admin, // Close the account and send rent to admin
        constraint = reward_vault.mint == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    /// CHECK: Admin must sign to close the pool
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// DRMR mint account
    /// CHECK: Validated against staking_pool.drmr_mint
    pub drmr_mint: AccountInfo<'info>,
    
    /// Admin's DRMR token account (destination for remaining funds)
    /// Automatically derived and created if needed
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = drmr_mint,
        associated_token::authority = admin,
        constraint = drmr_mint.key() == staking_pool.drmr_mint @ StakingError::InvalidMint
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}