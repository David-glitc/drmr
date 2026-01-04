use anchor_lang::prelude::*;

pub mod actions;
use actions::*;

pub mod config;
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

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        actions::unstake(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        actions::withdraw(ctx)
    }

    pub fn get_reward(ctx: Context<GetReward>) -> Result<()> {
        actions::get_reward(ctx)
    }

    pub fn update_pool_config(ctx: Context<UpdateConfig>) -> Result<()> {
        actions::update_pool_config(ctx)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        actions::close(ctx)
    }
}

