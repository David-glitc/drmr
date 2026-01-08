use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};
use anchor_spl::associated_token::AssociatedToken;
use crate::error::StakingError;

/// Helper function to transfer funds and close token vaults
/// This can be reused by both close() and close_token() functions
pub fn close_token_vaults<'info>(
    stake_vault: &Account<'info, TokenAccount>,
    reward_vault: &Account<'info, TokenAccount>,
    admin_token_account: &Account<'info, TokenAccount>,
    admin: &AccountInfo<'info>,
    program_pda_info: &AccountInfo<'info>,
    _staking_pool_key: &Pubkey, // Not used, but kept for API consistency
    staking_pool_bump: u8, // Bump for staking_pool PDA (owner of vaults)
    _stake_vault_bump: u8, // Not used, but kept for API consistency
    _reward_vault_bump: u8, // Not used, but kept for API consistency
    token_program: &AccountInfo<'info>,
    close_accounts: bool, // Whether to close the accounts or just transfer funds
) -> Result<(u64, u64)> {
    let stake_vault_balance = stake_vault.amount;
    let reward_vault_balance = reward_vault.amount;
    
    // The vaults are owned by the staking_pool PDA, so we need to sign with staking_pool seeds
    // Sign with staking_pool PDA (owner of the vaults)
    let staking_pool_seeds: &[&[u8]] = &[
        b"staking_pool",
        &[staking_pool_bump],
    ];
    let staking_pool_signer = &[staking_pool_seeds];
    
    // Transfer all funds from stake_vault to admin
    if stake_vault_balance > 0 {
        let cpi_accounts = Transfer {
            from: stake_vault.to_account_info(),
            to: admin_token_account.to_account_info(),
            authority: program_pda_info.clone(),
        };
        let cpi_program = token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_pool_signer);
        token::transfer(cpi_ctx, stake_vault_balance)?;
        msg!("✅ Transferred {} tokens from STAKE_VAULT to admin", stake_vault_balance);
    } else {
        msg!("⚠️  Stake vault was empty (0 tokens)");
    }
    
    // Transfer all funds from reward_vault to admin
    if reward_vault_balance > 0 {
        let cpi_accounts = Transfer {
            from: reward_vault.to_account_info(),
            to: admin_token_account.to_account_info(),
            authority: program_pda_info.clone(),
        };
        let cpi_program = token_program.clone();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_pool_signer);
        token::transfer(cpi_ctx, reward_vault_balance)?;
        msg!("✅ Transferred {} tokens from REWARD_VAULT to admin", reward_vault_balance);
    } else {
        msg!("⚠️  Reward vault was empty (0 tokens)");
    }
    
    // Close token accounts if requested
    if close_accounts {
        // Close stake_vault token account
        {
            let cpi_accounts = CloseAccount {
                account: stake_vault.to_account_info(),
                destination: admin.clone(),
                authority: program_pda_info.clone(),
            };
            let cpi_program = token_program.clone();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_pool_signer);
            token::close_account(cpi_ctx)?;
            msg!("✅ Closed stake_vault token account");
        }
        
        // Close reward_vault token account
        {
            let cpi_accounts = CloseAccount {
                account: reward_vault.to_account_info(),
                destination: admin.clone(),
                authority: program_pda_info.clone(),
            };
            let cpi_program = token_program.clone();
            let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, staking_pool_signer);
            token::close_account(cpi_ctx)?;
            msg!("✅ Closed reward_vault token account");
        }
    }
    
    Ok((stake_vault_balance, reward_vault_balance))
}

/// Close only the token accounts (stake_vault and reward_vault)
/// This function does NOT require the staking_pool account to exist
/// Useful for closing orphaned vaults after staking_pool has been closed
/// Only the trusted admin can close the vaults
pub fn close_token(ctx: Context<CloseToken>) -> Result<()> {
    // Use the same trusted admin as initialize
    // let trusted_admin = Pubkey::from_str_const("9ptLw6PHCEhaJw5kEjpQ6eTDwsPoqLM3E64gtzo2Fe8");
    // require!(
    //     ctx.accounts.admin.key() == trusted_admin,
    //     StakingError::Unauthorized
    // );
    
    // Derive staking_pool PDA key for seed validation (account doesn't need to exist)
    let staking_pool_key = ctx.accounts.staking_pool_key.key();
    
    // Validate that both vaults use the same mint and it matches the provided mint
    require!(
        ctx.accounts.stake_vault.mint == ctx.accounts.drmr_mint.key(),
        StakingError::InvalidMint
    );
    require!(
        ctx.accounts.reward_vault.mint == ctx.accounts.drmr_mint.key(),
        StakingError::InvalidMint
    );
    require!(
        ctx.accounts.stake_vault.mint == ctx.accounts.reward_vault.mint,
        StakingError::InvalidMint
    );
    
    msg!("=== CLOSING TOKEN VAULTS ===");
    msg!("Admin: {}", ctx.accounts.admin.key());
    msg!("Staking Pool Key (derived): {}", staking_pool_key);
    msg!("Stake Vault: {}", ctx.accounts.stake_vault.key());
    msg!("Reward Vault: {}", ctx.accounts.reward_vault.key());
    msg!("Admin Token Account (Destination): {}", ctx.accounts.admin_token_account.key());
    msg!("---------------------------------");
    msg!("Initial Stake Vault Balance: {} tokens", ctx.accounts.stake_vault.amount);
    msg!("Initial Reward Vault Balance: {} tokens", ctx.accounts.reward_vault.amount);
    msg!("---------------------------------");
    
    // Get the program PDA account info for signing (owner of the vaults)
    let program_pda_info = ctx.accounts.staking_pool_key.to_account_info();
    
    // Use the helper function to transfer funds and close accounts
    let (stake_balance, reward_balance) = close_token_vaults(
        &ctx.accounts.stake_vault,
        &ctx.accounts.reward_vault,
        &ctx.accounts.admin_token_account,
        &ctx.accounts.admin.to_account_info(),
        &program_pda_info,
        &staking_pool_key,
        ctx.bumps.staking_pool_key, // Bump for staking_pool PDA
        ctx.bumps.stake_vault,
        ctx.bumps.reward_vault,
        &ctx.accounts.token_program.to_account_info(),
        true, // Close accounts
    )?;
    
    // Summary
    msg!("=== CLOSE SUMMARY ===");
    msg!("Stake vault → Admin: {} tokens", stake_balance);
    msg!("Reward vault → Admin: {} tokens", reward_balance);
    msg!("Total transferred: {} tokens", stake_balance.saturating_add(reward_balance));
    msg!("Token vaults closed successfully");
    
    Ok(())
}

#[derive(Accounts)]
pub struct CloseToken<'info> {
    /// Staking pool PDA key (derived, account doesn't need to exist)
    /// Used only for seed validation to derive vault PDAs
    /// CHECK: This is just the PDA key, not the account itself
    #[account(
        seeds = [b"staking_pool"],
        bump
    )]
    pub staking_pool_key: AccountInfo<'info>,
    
    /// Stake vault: PDA-owned token account holding staked tokens
    #[account(
        mut,
        seeds = [b"stake_vault", staking_pool_key.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    /// Reward vault: PDA-owned token account holding reward tokens
    #[account(
        mut,
        seeds = [b"reward_vault", staking_pool_key.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    /// CHECK: Only trusted admin can close vaults
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// DRMR mint account (from vaults, used for admin token account)
    /// CHECK: Validated that both vaults use the same mint
    pub drmr_mint: AccountInfo<'info>,
    
    /// Admin's DRMR token account (destination for remaining funds)
    /// Automatically derived and created if needed
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = drmr_mint,
        associated_token::authority = admin
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}