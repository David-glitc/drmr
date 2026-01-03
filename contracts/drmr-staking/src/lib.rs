use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("DRMRStaking111111111111111111111111111111");

#[program]
pub mod drmr_staking {
    use super::*;

    /// Initialize the staking pool with admin settings
    pub fn initialize(
        ctx: Context<Initialize>,
        stake_epoch_cycles: u64, // Number of epochs for stake period (e.g., 29 days = ~29 epochs)
        reward_cycle_seconds: u64, // Reward cycle in seconds (1 hour to max epoch cycle)
        apy_bps: u16, // APY in basis points (e.g., 1000 = 10%)
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        require!(
            reward_cycle_seconds >= 3600 && reward_cycle_seconds <= stake_epoch_cycles * 432000,
            StakingError::InvalidRewardCycle
        );
        require!(apy_bps <= 10000, StakingError::InvalidApy); // Max 100% APY

        pool.admin = ctx.accounts.admin.key();
        pool.drmr_mint = ctx.accounts.drmr_mint.key();
        pool.stake_epoch_cycles = stake_epoch_cycles;
        pool.reward_cycle_seconds = reward_cycle_seconds;
        pool.apy_bps = apy_bps;
        pool.total_staked = 0;
        pool.total_stakers = 0;
        pool.total_rewards_distributed = 0;
        pool.is_active = true;
        pool.created_at = clock.unix_timestamp;
        pool.last_reward_distribution = clock.unix_timestamp;

        msg!("Pool initialized");
        msg!("Staking vault: {}", ctx.accounts.staking_vault.key());
        msg!("Reward vault: {}", ctx.accounts.reward_vault.key());

        msg!("Pool initialized with APY: {}%, Stake cycles: {}, Reward cycle: {}s", 
             apy_bps as f64 / 100.0, stake_epoch_cycles, reward_cycle_seconds);

        Ok(())
    }

    /// Update pool configuration (admin only)
    pub fn update_config(
        ctx: Context<UpdateConfig>,
        stake_epoch_cycles: Option<u64>,
        reward_cycle_seconds: Option<u64>,
        apy_bps: Option<u16>,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        if let Some(cycles) = stake_epoch_cycles {
            require!(
                cycles > 0 && cycles <= 365,
                StakingError::InvalidStakePeriod
            );
            pool.stake_epoch_cycles = cycles;
        }

        if let Some(seconds) = reward_cycle_seconds {
            require!(
                seconds >= 3600 && seconds <= pool.stake_epoch_cycles * 432000,
                StakingError::InvalidRewardCycle
            );
            pool.reward_cycle_seconds = seconds;
        }

        if let Some(apy) = apy_bps {
            require!(apy <= 10000, StakingError::InvalidApy);
            pool.apy_bps = apy;
        }

        msg!("Pool config updated");
        Ok(())
    }

    /// Deposit DRMR tokens to the reward pool (admin only)
    pub fn deposit_rewards(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
        let pool = &ctx.accounts.pool;
        
        require!(pool.is_active, StakingError::PoolInactive);

        // Transfer tokens to reward vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.from.to_account_info(),
                    to: ctx.accounts.reward_vault.to_account_info(),
                    authority: ctx.accounts.admin.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Deposited {} tokens to reward pool", amount);
        Ok(())
    }

    /// Stake DRMR tokens
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        stake_periods: u8, // Number of epoch cycles to stake (e.g., 2 epochs, 3 epochs)
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let staker = &mut ctx.accounts.staker;
        let clock = Clock::get()?;

        require!(pool.is_active, StakingError::PoolInactive);
        require!(amount > 0, StakingError::InvalidAmount);
        require!(
            stake_periods > 0 && stake_periods <= 12,
            StakingError::InvalidStakePeriod
        );

        // Transfer tokens from user to staking vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.staking_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, amount)?;

        // Calculate stake end time (epoch duration is ~432000 seconds)
        let epoch_duration: i64 = 432000;
        let stake_end_time = clock.unix_timestamp + (stake_periods as i64 * epoch_duration);

        // Update or create staker account
        let is_new_staker = staker.amount == 0;
        
        staker.user = ctx.accounts.user.key();
        staker.amount += amount;
        staker.stake_periods = stake_periods;
        staker.staked_at = clock.unix_timestamp;
        staker.stake_end_time = stake_end_time;
        staker.last_claim = clock.unix_timestamp;
        staker.total_rewards_claimed = 0;

        // Update pool stats
        pool.total_staked += amount;
        if is_new_staker {
            pool.total_stakers += 1;
        }

        msg!(
            "Staked {} tokens for {} epochs. Stake ends at: {}",
            amount,
            stake_periods,
            stake_end_time
        );

        Ok(())
    }

    /// Unstake DRMR tokens (only after stake period ends)
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let staker = &mut ctx.accounts.staker;
        let clock = Clock::get()?;

        require!(pool.is_active, StakingError::PoolInactive);
        require!(staker.amount > 0, StakingError::NoStake);
        require!(
            clock.unix_timestamp >= staker.stake_end_time,
            StakingError::StakePeriodNotEnded
        );

        let amount = staker.amount;

        // Transfer tokens back to user
        let seeds = &[
            b"staking_pool",
            pool.drmr_mint.as_ref(),
            &[ctx.bumps.pool],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staking_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            amount,
        )?;

        // Update pool stats
        pool.total_staked -= amount;
        pool.total_stakers -= 1;

        // Reset staker account
        staker.amount = 0;
        staker.stake_periods = 0;
        staker.staked_at = 0;
        staker.stake_end_time = 0;
        staker.last_claim = 0;
        staker.total_rewards_claimed = 0;

        msg!("Unstaked {} tokens", amount);
        Ok(())
    }

    /// Claim staking rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let staker = &mut ctx.accounts.staker;
        let clock = Clock::get()?;

        require!(pool.is_active, StakingError::PoolInactive);
        require!(staker.amount > 0, StakingError::NoStake);
        require!(
            clock.unix_timestamp >= staker.last_claim + pool.reward_cycle_seconds as i64,
            StakingError::RewardCycleNotReady
        );

        // Calculate rewards based on APY and time elapsed
        let time_elapsed = clock.unix_timestamp - staker.last_claim;
        let annual_reward = (staker.amount as u128)
            .checked_mul(pool.apy_bps as u128)
            .ok_or(StakingError::MathOverflow)? / 10000;
        
        let reward = (annual_reward as i64)
            .checked_mul(time_elapsed)
            .ok_or(StakingError::MathOverflow)? / 31536000; // seconds in a year

        require!(reward > 0, StakingError::NoRewardsAvailable);

        // Check if reward vault has enough tokens
        let reward_vault_balance = ctx.accounts.reward_vault.amount;
        require!(
            reward as u64 <= reward_vault_balance,
            StakingError::InsufficientRewards
        );

        // Transfer rewards to user
        let seeds = &[
            b"staking_pool",
            pool.drmr_mint.as_ref(),
            &[ctx.bumps.pool],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.reward_vault.to_account_info(),
                    to: ctx.accounts.user_token_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer,
            ),
            reward as u64,
        )?;

        // Update staker and pool stats
        staker.last_claim = clock.unix_timestamp;
        staker.total_rewards_claimed += reward as u64;
        pool.total_rewards_distributed += reward as u64;

        msg!("Claimed {} tokens in rewards", reward);
        Ok(())
    }

    /// Emergency pause/unpause (admin only)
    pub fn set_active(ctx: Context<SetActive>, is_active: bool) -> Result<()> {
        ctx.accounts.pool.is_active = is_active;
        msg!("Pool active status set to: {}", is_active);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + StakingPool::LEN,
        seeds = [b"staking_pool", drmr_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: Mint address validation
    pub drmr_mint: AccountInfo<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = drmr_mint,
        token::authority = pool,
        seeds = [b"staking_vault", drmr_mint.key().as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        token::mint = drmr_mint,
        token::authority = pool,
        seeds = [b"reward_vault", drmr_mint.key().as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump,
        has_one = admin @ StakingError::Unauthorized
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositRewards<'info> {
    #[account(
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump,
        has_one = admin @ StakingError::Unauthorized
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub from: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"reward_vault", pool.drmr_mint.as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + Staker::LEN,
        seeds = [b"staker", pool.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub staker: Account<'info, Staker>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"staking_vault", pool.drmr_mint.as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"staker", pool.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = user @ StakingError::Unauthorized
    )]
    pub staker: Account<'info, Staker>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"staking_vault", pool.drmr_mint.as_ref()],
        bump
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"staker", pool.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = user @ StakingError::Unauthorized
    )]
    pub staker: Account<'info, Staker>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"reward_vault", pool.drmr_mint.as_ref()],
        bump
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SetActive<'info> {
    #[account(
        mut,
        seeds = [b"staking_pool", pool.drmr_mint.as_ref()],
        bump,
        has_one = admin @ StakingError::Unauthorized
    )]
    pub pool: Account<'info, StakingPool>,

    pub admin: Signer<'info>,
}

#[account]
pub struct StakingPool {
    pub admin: Pubkey,
    pub drmr_mint: Pubkey,
    pub stake_epoch_cycles: u64,      // Number of epochs for stake period
    pub reward_cycle_seconds: u64,   // Reward cycle in seconds
    pub apy_bps: u16,                 // APY in basis points (10000 = 100%)
    pub total_staked: u64,            // Total amount staked
    pub total_stakers: u64,           // Total number of stakers
    pub total_rewards_distributed: u64, // Total rewards distributed
    pub is_active: bool,              // Pool active status
    pub created_at: i64,              // Pool creation timestamp
    pub last_reward_distribution: i64, // Last reward distribution timestamp
}

impl StakingPool {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 2 + 8 + 8 + 8 + 1 + 8 + 8;
}

#[account]
pub struct Staker {
    pub user: Pubkey,
    pub amount: u64,                  // Staked amount
    pub stake_periods: u8,           // Number of epoch cycles staked
    pub staked_at: i64,              // Stake start timestamp
    pub stake_end_time: i64,         // Stake end timestamp
    pub last_claim: i64,             // Last reward claim timestamp
    pub total_rewards_claimed: u64,  // Total rewards claimed by this staker
}

impl Staker {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 8 + 8 + 8;
}

#[error_code]
pub enum StakingError {
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid reward cycle")]
    InvalidRewardCycle,
    #[msg("Invalid APY")]
    InvalidApy,
    #[msg("Invalid stake period")]
    InvalidStakePeriod,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Pool is inactive")]
    PoolInactive,
    #[msg("No stake found")]
    NoStake,
    #[msg("Stake period has not ended")]
    StakePeriodNotEnded,
    #[msg("Reward cycle not ready")]
    RewardCycleNotReady,
    #[msg("No rewards available")]
    NoRewardsAvailable,
    #[msg("Insufficient rewards in pool")]
    InsufficientRewards,
    #[msg("Math overflow")]
    MathOverflow,
}
