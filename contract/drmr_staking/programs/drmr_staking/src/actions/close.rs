use anchor_lang::prelude::*;

pub fn close(_ctx: Context<Close>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Close {}
