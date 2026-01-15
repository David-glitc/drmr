use anchor_lang::prelude::*;

pub mod actions;
use actions::*;

pub mod config;
pub mod global;
pub mod error;

declare_id!("GKv7kHGYrdB8jdPjueV7uHn9zpowF9gcbEHdXJVD9uEp");

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
        add_admin: Option<Pubkey>,
        remove_admin: Option<Pubkey>,
        new_stake_epoch_cycles: Option<u64>,
        new_reward_cycle_seconds: Option<u64>,
        new_apy_bps: Option<u16>,
        new_is_active: Option<bool>,
    ) -> Result<()> {
        actions::update_pool_config(
            ctx,
            add_admin,
            remove_admin,
            new_stake_epoch_cycles,
            new_reward_cycle_seconds,
            new_apy_bps,
            new_is_active,
        )
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()>{
        actions::fund_rewards(ctx, amount)
    }

    pub fn close(ctx: Context<Close>) -> Result<()> {
        actions::close(ctx)
    }
}

