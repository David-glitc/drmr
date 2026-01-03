use anchor_lang::prelude::*;

pub fn stake(_ctx: Context<Stake>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Stake {}
