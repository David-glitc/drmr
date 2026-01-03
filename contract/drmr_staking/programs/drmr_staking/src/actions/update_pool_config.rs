use anchor_lang::prelude::*;

pub fn update_pool_config(_ctx: Context<UpdateConfig>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateConfig {}
