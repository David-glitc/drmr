use anchor_lang::prelude::*;

pub fn get_reward(_ctx: Context<GetReward>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct GetReward {}