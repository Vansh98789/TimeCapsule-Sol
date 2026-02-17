use anchor_lang::prelude::*;
use anchor_lang::system_program;


declare_id!("54ZFDozFNDgK8xWMaq7jZYRyKvWQmdN64DaLWtDxw3d5");


#[program]
pub mod my_time_capsule {
    use super::*;

    pub fn init_user(ctx: Context<InitUser>) -> Result<()> {
        let user_state = &mut ctx.accounts.user_state;
        user_state.owner = ctx.accounts.user.key();
        user_state.count = 0;
        Ok(())
    }

    pub fn create_capsule(
        ctx: Context<CreateCapsule>,
        cid: String,
        reward_amount: u64,
        unlock_time: i64,
        is_private: bool,
        title:String,
        description:String,
    ) -> Result<()> {
        require!(reward_amount > 0, ErrorCode::InvalidAmount);
        require!(
            unlock_time > Clock::get()?.unix_timestamp,
            ErrorCode::InvalidTime
        );

        let capsule = &mut ctx.accounts.capsule;
        let user_state = &mut ctx.accounts.user_state;

        capsule.creator = ctx.accounts.user.key();
        capsule.unlock_time = unlock_time;
        capsule.title=title;
        capsule.description=description;
        capsule.cid = cid;
        capsule.reward_amount = reward_amount;
        capsule.is_unlocked = false;
        capsule.is_private = is_private;
        capsule.bump = ctx.bumps.capsule;
        capsule.index = user_state.count;

        let cpi_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.capsule.to_account_info(),
            },
        );
        system_program::transfer(cpi_ctx, reward_amount)?;

        user_state.count += 1;

        Ok(())
    }

    pub fn unlock_capsule(ctx: Context<UnlockCapsule>) -> Result<()> {
        let capsule = &mut ctx.accounts.capsule;

        require!(
            capsule.unlock_time <= Clock::get()?.unix_timestamp,
            ErrorCode::InvalidTime
        );
        require!(!capsule.is_unlocked, ErrorCode::AlreadyUnlocked);

        if capsule.is_private {
            require!(
                ctx.accounts.opener.key() == capsule.creator,
                ErrorCode::InvalidOpener
            );
        }

        // PDA signer seeds
        let seeds = &[
            b"capsule",
            capsule.creator.as_ref(),
            &capsule.index.to_le_bytes(),
            &[capsule.bump],
        ];
        let signer = &[&seeds[..]];

        let reward = capsule.reward_amount;

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: capsule.to_account_info(),
                to: ctx.accounts.opener.to_account_info(),
            },
            signer,
        );

        system_program::transfer(cpi_ctx, reward)?;

        capsule.reward_amount = 0;
        capsule.is_unlocked = true;

        Ok(())
    }

    pub fn delete_capsule(ctx: Context<DeleteCapsule>) -> Result<()> {
        let capsule = &ctx.accounts.capsule;

        require!(
            capsule.creator == ctx.accounts.user.key(),
            ErrorCode::Unauthorized
        );
        require!(capsule.is_unlocked, ErrorCode::NotUnlocked);

        Ok(())
    }
}

#[account]
pub struct UserState {
    pub owner: Pubkey,
    pub count: u64,
}

#[account]
pub struct CapsuleState {
    pub creator: Pubkey,
    pub unlock_time: i64,
    pub cid: String,
    pub reward_amount: u64,
    title:String,
    description:String,
    pub is_unlocked: bool,
    pub is_private: bool,
    pub bump: u8,
    pub index: u64,
}

#[derive(Accounts)]
pub struct InitUser<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8,
        seeds = [b"user_state", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateCapsule<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + 8 + 4 + 200 + 8 + 1 + 1 + 1 + 8 + 4 + 100 + 4 + 300,
        seeds = [b"capsule", user.key().as_ref(), &user_state.count.to_le_bytes()],
        bump
    )]
    pub capsule: Account<'info, CapsuleState>,
    
    #[account(
        mut,
        seeds = [b"user_state", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlockCapsule<'info> {
    #[account(
        mut,
        seeds = [b"capsule", capsule.creator.as_ref(), &capsule.index.to_le_bytes()],
        bump = capsule.bump
    )]
    pub capsule: Account<'info, CapsuleState>,

    #[account(mut)]
    pub opener: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DeleteCapsule<'info> {
    #[account(
    mut,
    seeds = [b"capsule", capsule.creator.as_ref(), &capsule.index.to_le_bytes()],
    bump = capsule.bump,
    close = user
)]
    pub capsule: Account<'info, CapsuleState>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Reward amount must be greater than 0")]
    InvalidAmount,
    #[msg("Invalid time")]
    InvalidTime,
    #[msg("Invalid opener")]
    InvalidOpener,
    #[msg("Capsule already unlocked")]
    AlreadyUnlocked,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Capsule not unlocked yet")]
    NotUnlocked,
}
