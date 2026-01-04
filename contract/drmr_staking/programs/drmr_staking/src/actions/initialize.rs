use anchor_lang::prelude::*;
use crate::config::StakingPool;

pub fn initialize(
    ctx: Context<Initialize>, 
    apy_bps: u16,
    max_stake_epoch_cycles: u64
) -> Result<()> {
    msg!("Initializing staking pool");
    let pool = &mut ctx.accounts.staking_pool;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;
    
    // Derive the trusted admin PDA address
    // All pools will have this trusted admin as their admin
    let (trusted_admin_pda, _bump) = Pubkey::find_program_address(
        &[b"trusted_admin"],
        ctx.program_id,
    );
    
    // Set the trusted admin PDA as the pool admin (not the creator)
    // The creator pays for pool creation but doesn't become admin
    pool.admin = trusted_admin_pda;

    // TODO: Validate mint address instead of using default
    // Should verify it's a valid SPL token mint account
    pool.drmr_mint = Pubkey::default();
    
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
    pool.created_at = current_time;
    // making this to current time due to initialization so we can track the progress
    // Could also be zero as well
    pool.last_reward_distribution = current_time;
    msg!("Staking pool initialized");
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = creator,
        space = StakingPool::INIT_SPACE,
        seeds = [b"staking_pool"],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,
    
    /// Anyone can create a pool - they pay for the account creation
    /// But they don't become the admin (trusted_admin is the admin)
    #[account(mut)]
    pub creator: Signer<'info>,
    
    /// CHECK: The DRMR mint account
    pub drmr_mint: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}