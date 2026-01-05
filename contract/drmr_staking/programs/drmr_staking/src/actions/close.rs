use anchor_lang::prelude::*;
use crate::config::StakingPool;
use crate::error::StakingError;

/// Close the staking pool account (for testing/cleanup purposes)
/// Only the admin can close the pool
pub fn close(ctx: Context<Close>) -> Result<()> {
    let close_admin = ctx.accounts.admin.key();
    let staking_pool_admin = ctx.accounts.staking_pool.admin;
    require!(close_admin == staking_pool_admin, StakingError::Unauthorized);
    msg!("Closing staking pool account");
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
    
    /// CHECK: Admin must sign to close the pool
    pub admin: Signer<'info>,
}