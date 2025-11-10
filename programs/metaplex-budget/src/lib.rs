use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};
use mpl_token_metadata::{
    instructions::{
        CreateMetadataAccountV3, CreateMasterEditionV3,
        CreateMetadataAccountV3InstructionArgs, CreateMasterEditionV3InstructionArgs,
    },
    types::{Collection, DataV2},
    ID as TOKEN_METADATA_PROGRAM_ID,
};
declare_id!("Hz5ZKTWQMRRcCGwMEjnqcQrLEkTp5E8qD2zZKPFxCmXf");

#[program]
pub mod metaplex_budget {
    use super::*;

    /// Creates a budget collection as a NonFungible NFT
    pub fn create_budget_collection(
        ctx: Context<CreateBudgetCollection>,
        name: String,
        symbol: String,
        uri: String,
        year: u16,
    ) -> Result<()> {
        // Mint 1 NFT token to the collection holder
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.collection_mint.to_account_info(),
                    to: ctx.accounts.collection_token_account.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            1,
        )?;

        // Create metadata account for the collection
        let collection_data = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };
        
        let create_metadata_accounts_v3_ix = CreateMetadataAccountV3 {
            metadata: ctx.accounts.metadata_account.key(),
            mint: ctx.accounts.collection_mint.key(),
            mint_authority: ctx.accounts.payer.key(),
            payer: ctx.accounts.payer.key(),
            update_authority: (ctx.accounts.payer.key(), true),
            system_program: anchor_lang::solana_program::system_program::ID,
            rent: Some(anchor_lang::solana_program::sysvar::rent::ID),
        }
        .instruction(CreateMetadataAccountV3InstructionArgs {
            data: collection_data,
            is_mutable: true,
            collection_details: None,
        });

        // Invoke the instruction
        // The Token Metadata Program account must be explicitly included
        anchor_lang::solana_program::program::invoke(
            &create_metadata_accounts_v3_ix,
            &[
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.collection_mint.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
            ],
        )?;

        // Create master edition
        let create_master_edition_ix = CreateMasterEditionV3 {
            edition: ctx.accounts.master_edition.key(),
            mint: ctx.accounts.collection_mint.key(),
            update_authority: ctx.accounts.payer.key(),
            mint_authority: ctx.accounts.payer.key(),
            payer: ctx.accounts.payer.key(),
            metadata: ctx.accounts.metadata_account.key(),
            token_program: ctx.accounts.token_program.key(),
            system_program: anchor_lang::solana_program::system_program::ID,
            rent: Some(anchor_lang::solana_program::sysvar::rent::ID),
        }
        .instruction(CreateMasterEditionV3InstructionArgs {
            max_supply: Some(0), // max_supply = 0 means no printing
        });

        // Invoke the instruction
        anchor_lang::solana_program::program::invoke(
            &create_master_edition_ix,
            &[
                ctx.accounts.master_edition.to_account_info(),
                ctx.accounts.collection_mint.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.metadata_account.to_account_info(),
                ctx.accounts.collection_token_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
            ],
        )?;

        // Initialize budget PDA
        let budget = &mut ctx.accounts.budget_pda;
        budget.authority = ctx.accounts.payer.key();
        budget.collection_mint = ctx.accounts.collection_mint.key();
        budget.year = year;
        budget.expense_count = 0;
        budget.bump = ctx.bumps.budget_pda;

        Ok(())
    }

    /// Creates an expense item as a FungibleAsset token in the collection
    pub fn create_expense(
        ctx: Context<CreateExpense>,
        expense_name: String,
        expense_type: String,
        uri: String,
        approved_amount: u64,
        variance_pct: u8,
    ) -> Result<()> {
        require!(variance_pct <= 100, BudgetError::InvalidVariance);
        require!(approved_amount > 0, BudgetError::InvalidAmount);

        // Extract values before mutable borrow
        let collection_mint = ctx.accounts.budget_pda.collection_mint;
        let expense_count = ctx.accounts.budget_pda.expense_count;
        let budget_authority = ctx.accounts.budget_pda.authority;
        let budget_key = ctx.accounts.budget_pda.key();
        let budget_pda_info = ctx.accounts.budget_pda.to_account_info();
        
        let budget = &mut ctx.accounts.budget_pda;
        let expense_seeds = &[
            b"expense",
            collection_mint.as_ref(),
            &expense_count.to_le_bytes(),
            &[ctx.bumps.expense_pda],
        ];

        // Mint approved_amount tokens to the expense ATA
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.expense_mint.to_account_info(),
                    to: ctx.accounts.expense_ata.to_account_info(),
                    authority: ctx.accounts.expense_pda.to_account_info(),
                },
                &[expense_seeds],
            ),
            approved_amount,
        )?;

        // Create metadata for the expense token
        // Metaplex symbol field has a maximum length of 10 characters
        let symbol = if expense_type.len() > 10 {
            expense_type.chars().take(10).collect::<String>()
        } else {
            expense_type.clone()
        };

        let expense_data = DataV2 {
            name: expense_name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: Some(Collection {
                verified: false,
                key: ctx.accounts.collection_mint.key(),
            }),
            uses: None,
        };
        
        let create_metadata_ix = CreateMetadataAccountV3 {
            metadata: ctx.accounts.expense_metadata.key(),
            mint: ctx.accounts.expense_mint.key(),
            mint_authority: ctx.accounts.expense_pda.key(),
            payer: ctx.accounts.payer.key(),
            update_authority: (ctx.accounts.expense_pda.key(), true),
            system_program: anchor_lang::solana_program::system_program::ID,
            rent: Some(anchor_lang::solana_program::sysvar::rent::ID),
        }
        .instruction(CreateMetadataAccountV3InstructionArgs {
            data: expense_data,
            is_mutable: true,
            collection_details: None,
        });

        // Invoke the instruction
        anchor_lang::solana_program::program::invoke_signed(
            &create_metadata_ix,
            &[
                ctx.accounts.expense_metadata.to_account_info(),
                ctx.accounts.expense_mint.to_account_info(),
                ctx.accounts.expense_pda.to_account_info(),
                ctx.accounts.payer.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.rent.to_account_info(),
                ctx.accounts.token_metadata_program.to_account_info(),
            ],
            &[expense_seeds],
        )?;

        // Note: Collection verification is commented out due to delegate_record issues with VerifyCollectionV1
        // The collection is set in the metadata (verified: false) and can be verified in a separate transaction
        // if needed. For now, we'll skip verification during creation to avoid the delegate_record account issue.
        
        // TODO: Implement collection verification in a separate instruction or fix delegate_record handling
        // VerifyCollectionV1 requires a delegate_record account even when set to None, which causes issues.
        // 
        // Option 1: Verify collection in a separate transaction after creation
        // Option 2: Use a different verification method that doesn't require delegate records
        // Option 3: Set up proper delegate record handling
        
        // For now, the collection is set in the metadata with verified: false
        // This allows the expense to be created and verified later if needed

        // Initialize expense PDA
        let expense = &mut ctx.accounts.expense_pda;
        expense.budget = budget_key;
        expense.mint = ctx.accounts.expense_mint.key();
        expense.expense_type = expense_type;
        expense.approved_amount = approved_amount;
        expense.spent = 0;
        expense.variance_pct = variance_pct;
        expense.bump = ctx.bumps.expense_pda;

        // Increment expense count
        budget.expense_count = budget.expense_count.checked_add(1).unwrap();

        Ok(())
    }

    /// Spends from an expense by burning tokens and transferring USDC
    pub fn spend(
        ctx: Context<Spend>,
        amount: u64,
    ) -> Result<()> {
        // Extract values before mutable borrow
        let expense_pda_info = ctx.accounts.expense_pda.to_account_info();
        let budget_key = ctx.accounts.expense_pda.budget;
        let expense_bump = ctx.accounts.expense_pda.bump;
        
        let expense = &mut ctx.accounts.expense_pda;
        
        // Calculate maximum allowed spending with variance
        let max_allowed = expense
            .approved_amount
            .checked_mul(100 + expense.variance_pct as u64)
            .ok_or(BudgetError::MathOverflow)?
            .checked_div(100)
            .ok_or(BudgetError::MathOverflow)?;

        let new_spent = expense
            .spent
            .checked_add(amount)
            .ok_or(BudgetError::MathOverflow)?;

        require!(new_spent <= max_allowed, BudgetError::OverBudget);

        // Use expense seeds matching the Spend account struct validation
        let expense_seeds = &[
            b"expense",
            budget_key.as_ref(),
            &[expense_bump],
        ];

        // Burn expense tokens
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.expense_mint.to_account_info(),
                    from: ctx.accounts.expense_ata.to_account_info(),
                    authority: expense_pda_info,
                },
                &[expense_seeds],
            ),
            amount,
        )?;

        // Transfer equivalent USDC from treasury to operational account
        let usdc_amount = amount
            .checked_mul(1_000_000)
            .ok_or(BudgetError::MathOverflow)?;

        // Note: Treasury authority seeds would need to be defined separately
        // For now, assuming treasury_authority is a signer or has its own seeds
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.treasury_usdc_ata.to_account_info(),
                    to: ctx.accounts.operational_usdc_ata.to_account_info(),
                    authority: ctx.accounts.treasury_authority.to_account_info(),
                },
            ),
            usdc_amount,
        )?;

        // Update spent amount
        expense.spent = new_spent;

        Ok(())
    }
}

// Account Structs

#[derive(Accounts)]
#[instruction(name: String, symbol: String, uri: String, year: u16)]
pub struct CreateBudgetCollection<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + BudgetPDA::INIT_SPACE,
        seeds = [b"budget", collection_mint.key().as_ref()],
        bump
    )]
    pub budget_pda: Account<'info, BudgetPDA>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = payer,
        mint::freeze_authority = payer,
    )]
    pub collection_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = collection_mint,
        associated_token::authority = payer,
    )]
    pub collection_token_account: Account<'info, TokenAccount>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub metadata_account: UncheckedAccount<'info>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
    
    /// CHECK: Token Metadata Program - required for Metaplex CPI calls
    #[account(address = TOKEN_METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
#[instruction(
    expense_name: String,
    expense_type: String,
    uri: String,
    approved_amount: u64,
    variance_pct: u8
)]
pub struct CreateExpense<'info> {
    #[account(
        mut,
        seeds = [b"budget", budget_pda.collection_mint.as_ref()],
        bump = budget_pda.bump,
        has_one = authority @ BudgetError::Unauthorized,
    )]
    pub budget_pda: Account<'info, BudgetPDA>,

    #[account(
        init,
        payer = payer,
        space = 8 + ExpensePDA::INIT_SPACE,
        seeds = [
            b"expense",
            budget_pda.collection_mint.as_ref(),
            &budget_pda.expense_count.to_le_bytes()
        ],
        bump
    )]
    pub expense_pda: Account<'info, ExpensePDA>,

    #[account(
        init,
        payer = payer,
        mint::decimals = 0,
        mint::authority = expense_pda,
    )]
    pub expense_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = payer,
        associated_token::mint = expense_mint,
        associated_token::authority = expense_pda,
    )]
    pub expense_ata: Account<'info, TokenAccount>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub expense_metadata: UncheckedAccount<'info>,

    pub collection_mint: Account<'info, Mint>,

    /// CHECK: Validated by Metaplex
    #[account(mut)]
    pub collection_metadata: UncheckedAccount<'info>,

    /// CHECK: Validated by Metaplex
    pub collection_master_edition: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,

    /// CHECK: Token Metadata Program - required for Metaplex CPI calls
    #[account(address = TOKEN_METADATA_PROGRAM_ID)]
    pub token_metadata_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Spend<'info> {
    #[account(
        mut,
        seeds = [
            b"expense",
            expense_pda.budget.as_ref(),
            // Note: Would need expense_index stored in ExpensePDA for proper seeds
        ],
        bump = expense_pda.bump,
    )]
    pub expense_pda: Account<'info, ExpensePDA>,

    #[account(mut)]
    pub expense_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = expense_mint,
        associated_token::authority = expense_pda,
    )]
    pub expense_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub operational_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: Treasury authority PDA
    pub treasury_authority: UncheckedAccount<'info>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// Data Structs

#[account]
#[derive(InitSpace)]
pub struct BudgetPDA {
    pub authority: Pubkey,
    pub collection_mint: Pubkey,
    pub year: u16,
    pub expense_count: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ExpensePDA {
    pub budget: Pubkey,
    pub mint: Pubkey,
    #[max_len(50)]
    pub expense_type: String,
    pub approved_amount: u64,
    pub spent: u64,
    pub variance_pct: u8,
    pub bump: u8,
}

// Errors

#[error_code]
pub enum BudgetError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Over budget limit")]
    OverBudget,
    #[msg("Invalid variance percentage")]
    InvalidVariance,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Math overflow")]
    MathOverflow,
}

