use anchor_lang::prelude::*;

pub fn withdraw(_ctx: Context<Withdraw>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Withdraw {}