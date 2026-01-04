use anchor_lang::prelude::*;

pub fn unstake(_ctx: Context<Unstake>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Unstake {}