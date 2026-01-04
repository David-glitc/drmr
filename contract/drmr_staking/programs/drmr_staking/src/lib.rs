use anchor_lang::prelude::*;

declare_id!("FfmtpodpDxLvyWvNi7B6NmpVx1m2LjLm2wK8jZRaTYvX");

#[program]
pub mod drmr_staking {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
