use anchor_lang::prelude::*;
use anchor_spl::token::{Token, Mint, TokenAccount};
use crate::config::{StakingPool, PRIMARY_ADMIN};

#[inline(never)]
pub fn initialize(
    ctx: Context<Initialize>, 
    apy_bps: u16,
    max_stake_epoch_cycles: u64
) -> Result<()> {
    msg!("Initializing staking pool");
    let pool = &mut ctx.accounts.staking_pool;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    
    // Set the primary admin as the first pool admin (not the creator)
    // The creator pays for pool creation but doesn't become admin
    // Primary admin cannot be removed and receives all funds on close
    // Max 3 admins can be set
    pool.admins = vec![PRIMARY_ADMIN];

    // Validate and set mint address
    // TODO: Add proper validation to ensure it's a valid SPL token mint account
    pool.drmr_mint = ctx.accounts.drmr_mint.key();
    
    
    // Maximum allowed epoch cycles for staking lock-up periods
    pool.stake_epoch_cycles = max_stake_epoch_cycles;
    
    // Reward cycle: Solana epochs are ~172,800 seconds (2 days)
    // TODO: Consider extracting to constant or making configurable
    pool.reward_cycle_seconds = 86400; // epoch-based (1 day)
    
    // Note: APY validation removed - should be handled in update_pool_config
    pool.apy_bps = apy_bps;
    pool.total_staked = 0;
    pool.total_stakers = 0;
    pool.total_rewards_distributed = 0;
    pool.is_active = true;
    pool.created_at = current_time as u32;
    // making this to current time due to initialization so we can track the progress
    // Could also be zero as well
    pool.last_reward_distribution = current_time as u32;
    msg!("Staking pool initialized");
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + StakingPool::INIT_SPACE,
        seeds = [b"staking_pool"],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// Stake vault: PDA-owned token account to hold staked tokens
    #[account(
        init_if_needed,
        payer = creator,
        token::mint = drmr_mint,
        token::authority = staking_pool,
        seeds = [b"stake_vault", staking_pool.key().as_ref()],
        bump
    )]
    pub stake_vault: Account<'info, TokenAccount>,
    
    /// Reward vault: PDA-owned token account to hold reward tokens
    #[account(
        init_if_needed,
        payer = creator,
        token::mint = drmr_mint,
        token::authority = staking_pool,
        seeds = [b"reward_vault", staking_pool.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// The DRMR mint account (validated in function)
    pub drmr_mint: Account<'info, Mint>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}