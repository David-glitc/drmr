use anchor_lang::prelude::*;
use crate::config::StakingPool;

/// Close the staking pool account (for testing/cleanup purposes)
/// Only the admin can close the pool
pub fn close(_ctx: Context<Close>) -> Result<()> {
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
        has_one = admin @ crate::error::StakingError::Unauthorized
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// CHECK: Admin must sign to close the pool
    pub admin: Signer<'info>,
}