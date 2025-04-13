use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

// Use the program ID you deployed
declare_id!("HP7u3dYePXyVSNy6f5yG9dbjYUnygVtXvB37NhMyZFyr");

#[program]
pub mod pay2ping_escrow {
    use super::*;

    // Initialize the escrow account and vault token account.
    pub fn initialize(ctx: Context<Initialize>, backend_authority: Pubkey) -> Result<()> {
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.backend_authority = backend_authority;
        escrow_account.initializer = ctx.accounts.initializer.key();
        escrow_account.amount = 0; // Initialize amount, maybe for tracking deposits later

        msg!("Escrow account initialized: {}", escrow_account.key());
        msg!("Vault token account created: {}", ctx.accounts.vault_token_account.key());
        msg!("Escrow Initializer: {}", escrow_account.initializer);
        msg!("Backend Authority: {}", escrow_account.backend_authority);
        Ok(())
    }

    // Deposit USDC into the escrow vault token account.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount); // Ensure non-zero deposit

        // CPI context for token transfer
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_token_account.to_account_info(),
            to: ctx.accounts.vault_token_account.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(), // Depositor signs for their account
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Perform the transfer
        token::transfer(cpi_ctx, amount)?;
        msg!("Deposited {} tokens into vault {}", amount, ctx.accounts.vault_token_account.key());

        // Update the escrow's tracked amount safely (mutable borrow here is fine)
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.amount = escrow_account
            .amount
            .checked_add(amount)
            .ok_or(ErrorCode::Overflow)?;
        msg!("Escrow amount updated to: {}", escrow_account.amount);

        Ok(())
    }

    // Release funds from the vault token account to a recipient.
    // Only the backend authority can perform this.
    pub fn release_funds(ctx: Context<ReleaseFunds>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::ZeroAmount); // Ensure non-zero release

        // Authorization check is handled by the constraint on escrow_account in the struct definition

        // Check if sufficient funds are available (using checked_sub for safety)
        // Immutable borrow of escrow_account here is okay
        require!(
            ctx.accounts.escrow_account.amount >= amount,
            ErrorCode::InsufficientFunds
        );

        // CPI context for token transfer
        // Immutable borrow of escrow_account here is okay
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.escrow_account.to_account_info(), // Authority is the escrow PDA
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();

        // Use CpiContext::new. Anchor handles PDA signing automatically because
        // escrow_account is defined with seeds/bump in the ReleaseFunds struct.
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        // Perform the transfer
        token::transfer(cpi_ctx, amount)?;
        msg!("Released {} tokens from vault {} to recipient {}", amount, ctx.accounts.vault_token_account.key(), ctx.accounts.recipient_token_account.key());

        // --- Mutable borrow starts AFTER the CPI ---
        // Now it's safe to borrow mutably as the immutable borrows for the CPI are finished.
        let escrow_account = &mut ctx.accounts.escrow_account;
        escrow_account.amount = escrow_account
            .amount
            .checked_sub(amount)
            .ok_or(ErrorCode::Overflow)?; // Overflow here indicates underflow
         msg!("Escrow amount updated to: {}", escrow_account.amount);
         // --- Mutable borrow ends here ---

        Ok(())
    }
}

// ----------------------------------------------------
// ACCOUNT STRUCTS
// ----------------------------------------------------

#[account]
#[derive(Default)]
pub struct EscrowAccount {
    pub backend_authority: Pubkey, // The authority allowed to release funds
    pub initializer: Pubkey,       // The user who initialized the escrow
    pub amount: u64,               // Tracks the amount deposited
}

// ----------------------------------------------------
// CONTEXTS
// ----------------------------------------------------

#[derive(Accounts)]
#[instruction(backend_authority: Pubkey)]
pub struct Initialize<'info> {
    /// The escrow account (PDA) that holds metadata.
    /// Seeds: ["escrow", initializer.key]
    #[account(
        init,
        payer = initializer,
        space = 8 + 32 + 32 + 8,
        seeds = [b"escrow", initializer.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// The vault token account (PDA) created for holding USDC.
    /// Seeds: ["vault", escrow_account.key]
    #[account(
        init,
        payer = initializer,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump,
        token::mint = usdc_mint,
        token::authority = escrow_account // Escrow PDA is the authority over the vault
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// The USDC mint account (verifies the mint used for the vault).
    #[account(constraint = usdc_mint.is_initialized)]
    pub usdc_mint: Account<'info, Mint>,

    /// The user initializing the escrow, pays for account creation.
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// System Program needed for account creation (init).
    pub system_program: Program<'info, System>,

    /// Token Program needed for initializing token accounts (init).
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct Deposit<'info> {
    /// The escrow account metadata. Needs to be mutable to update amount.
    #[account(mut)]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// The user depositing funds. Must sign the transaction.
    pub depositor: Signer<'info>,

    /// The depositor's USDC token account (from where funds are taken).
    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key(),
        constraint = depositor_token_account.mint == vault_token_account.mint
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    /// The vault's USDC token account (where funds are sent).
    /// Needs to be mutable for the transfer.
    #[account(
        mut,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump // Use the bump stored when vault was initialized
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Token Program needed for the transfer CPI.
    pub token_program: Program<'info, Token>,
}


#[derive(Accounts)]
pub struct ReleaseFunds<'info> {
    /// The escrow account metadata. Needs to be mutable to update amount.
    /// Also needs seeds/bump defined here for Anchor to sign CPIs using it as authority.
    #[account(
        mut, // Still needs to be mutable overall because we modify amount later
        seeds = [b"escrow", escrow_account.initializer.as_ref()],
        bump, // Anchor finds and verifies the bump
        // Constraint to ensure the backend signer matches the authority stored in the escrow
        constraint = escrow_account.backend_authority == backend_signer.key() @ ErrorCode::Unauthorized
    )]
    pub escrow_account: Account<'info, EscrowAccount>,

    /// The vault's token account holding USDC. Mutable for the transfer.
    /// Seeds constraint ensures this vault belongs to the escrow account.
    #[account(
        mut,
        seeds = [b"vault", escrow_account.key().as_ref()],
        bump // Use the bump stored when vault was initialized
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// The backend authority must sign to release funds.
    pub backend_signer: Signer<'info>,

    /// The recipient's USDC token account (where funds are sent).
    /// Must be mutable for the transfer.
    #[account(
        mut,
        constraint = recipient_token_account.mint == vault_token_account.mint // Ensure correct mint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    /// Token Program needed for the transfer CPI.
    pub token_program: Program<'info, Token>,
}

// ----------------------------------------------------
// ERRORS
// ----------------------------------------------------

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow occurred.")]
    Overflow,
    #[msg("Caller is not authorized to perform this action.")]
    Unauthorized,
    #[msg("Amount must be greater than zero.")]
    ZeroAmount,
    #[msg("Insufficient funds in escrow vault.")]
    InsufficientFunds,
}

