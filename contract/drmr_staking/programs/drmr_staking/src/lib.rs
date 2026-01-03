use anchor_lang::prelude::*;

pub mod actions;
use actions::*;

pub mod config;
pub mod error;

declare_id!("2FSVkeMorcnpGpsqVkMkLg7KtErkrm24HEcu2jDY7nFG");

#[program]
pub mod drmr_staking {
    use super::*;


    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        actions::initialize(ctx)
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        actions::stake(ctx)
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