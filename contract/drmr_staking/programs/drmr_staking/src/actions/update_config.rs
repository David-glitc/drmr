use anchor_lang::prelude::*;
use crate::config::StakingPool;
use crate::error::StakingError;

pub fn update_pool_config(
    ctx: Context<UpdateConfig>,
    new_admin: Option<Pubkey>,
    new_stake_epoch_cycles: Option<u64>,
    new_reward_cycle_seconds: Option<u64>,
    new_apy_bps: Option<u16>,
    new_is_active: Option<bool>,
) -> Result<()> {
    let pool = &mut ctx.accounts.staking_pool;
    let admin_signer = ctx.accounts.admin.key();

    // Validate admin: Check if signer is the current admin
    // Admin can be either:
    // 1. A PDA (trusted_admin) - we check if the signer key matches pool.admin
    // 2. A regular account - we check if the signer key matches pool.admin
    require!(
        admin_signer == pool.admin,
        StakingError::Unauthorized
    );

    // Update admin if provided
    if let Some(admin) = new_admin {
        pool.admin = admin;
        msg!("Admin updated to: {}", admin);
    }

    // Update stake_epoch_cycles if provided
    if let Some(cycles) = new_stake_epoch_cycles {
        require!(cycles > 0, StakingError::InvalidStakePeriod);
        pool.stake_epoch_cycles = cycles;
        msg!("Stake epoch cycles updated to: {}", cycles);
    }

    // Update reward_cycle_seconds if provided
    if let Some(seconds) = new_reward_cycle_seconds {
        require!(seconds > 0, StakingError::InvalidRewardCycle);
        pool.reward_cycle_seconds = seconds;
        msg!("Reward cycle seconds updated to: {}", seconds);
    }

    // Update APY if provided
    if let Some(apy) = new_apy_bps {
        require!(apy <= 10000, StakingError::InvalidApy); // Max 100% (10000 basis points)
        pool.apy_bps = apy;
        msg!("APY updated to: {} basis points", apy);
    }

    // Update is_active if provided
    if let Some(active) = new_is_active {
        pool.is_active = active;
        msg!("Pool active status updated to: {}", active);
    }

    msg!("Pool configuration updated successfully");
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool"],
        bump,
        // Admin can be either a PDA or a regular account
        // We validate this in the function by checking if the signer matches the admin
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// The admin who is updating the pool configuration
    /// Can be either:
    /// 1. The trusted_admin PDA (seeds = [b"trusted_admin"])
    /// 2. A regular account that matches pool.admin
    #[account(mut)]
    pub admin: Signer<'info>,
}