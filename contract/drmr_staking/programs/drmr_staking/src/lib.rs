use anchor_lang::prelude::*;

pub mod actions;
use actions::*;

pub mod config;
pub mod global;
pub mod error;

declare_id!("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

#[program]
pub mod drmr_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, apy_bps: u16, max_stake_epoch_cycles: u64) -> Result<()> {
        actions::initialize(ctx, apy_bps, max_stake_epoch_cycles)
    }

    pub fn stake(ctx: Context<Stake>, stake_amount: u64, stake_periods: u8) -> Result<()> {
        actions::stake(ctx, stake_amount, stake_periods)
    }

    pub fn unstake(ctx: Context<Unstake>, unstake_amount: u64) -> Result<()> {
        actions::unstake(ctx, unstake_amount)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        actions::withdraw(ctx)
    }

    pub fn get_reward(ctx: Context<GetReward>) -> Result<()> {
        actions::get_reward(ctx)
    }

    pub fn update_pool_config(
        ctx: Context<UpdateConfig>,
        new_admin: Option<Pubkey>,
        new_stake_epoch_cycles: Option<u64>,
        new_reward_cycle_seconds: Option<u64>,
        new_apy_bps: Option<u16>,
        new_is_active: Option<bool>,
    ) -> Result<()> {
        actions::update_pool_config(
            ctx,
            new_admin,
            new_stake_epoch_cycles,
            new_reward_cycle_seconds,
            new_apy_bps,
            new_is_active,
        )
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        actions::close(ctx)
    }

    pub fn close_token(ctx: Context<CloseToken>) -> Result<()> {
        actions::close_token(ctx)
    }
}

