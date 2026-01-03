use anchor_lang::prelude::*;

pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
    Ok(())
}

#[derive(Accounts)]
pub struct Initialize {}
