# Metaplex Budget Manager

A Solana program and web application for managing budgets and expenses using Metaplex NFT collections. This project creates budget collections as NonFungible NFTs and expense items as FungibleAsset tokens, all verified within the collection.

## Architecture Overview

### Budget Collections (NonFungible NFTs)
- **Token Standard**: NonFungible (supply=1, decimals=0)
- **Master Edition**: No printing (max_supply=0)
- **Metadata**: Collection-verified with year tracking
- **Purpose**: Represents an annual budget container

### Expense Items (FungibleAsset Tokens)
- **Token Standard**: FungibleAsset (decimals=0)
- **Collection**: Verified as part of budget collection
- **Metadata**: Contains expense type and approved amounts
- **Token Supply**: Equals approved budget allocation
- **Purpose**: Individual expense line items within a budget

### Spending Mechanism
1. **Burn tokens** from expense ATA to record spending
2. **Transfer USDC** from treasury to operational account
3. **Track variance** with configurable overspend limits
4. **Real-time monitoring** of budget utilization

## Project Structure

```
MD_Bx/
├── programs/
│   └── metaplex-budget/
│       ├── src/
│       │   └── lib.rs          # Anchor program
│       └── Cargo.toml
├── tests/
│   └── metaplex-budget.ts      # Integration tests
├── app/                         # Next.js frontend
│   ├── src/
│   │   ├── app/                # Pages
│   │   ├── components/         # React components
│   │   ├── contexts/           # Wallet context
│   │   ├── hooks/              # Custom hooks
│   │   └── utils/              # Utilities
│   └── package.json
├── Anchor.toml                  # Anchor config
├── Cargo.toml                   # Workspace config
└── package.json                 # Root package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Rust 1.70+
- Solana CLI 1.16+
- Anchor CLI 0.29.0+

### Installation

1. **Clone the repository**
   ```bash
   cd MD_Bx
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install frontend dependencies
   cd app
   npm install
   cd ..
   ```

3. **Build the Anchor program**
   ```bash
   anchor build
   ```

4. **Generate TypeScript types**
   ```bash
   anchor build
   # IDL will be generated in target/idl/
   # Types will be in target/types/
   ```

### Development

#### Local Development (Localnet)

1. **Start local validator**
   ```bash
   solana-test-validator
   ```

2. **Deploy the program**
   ```bash
   anchor deploy
   ```

3. **Run tests**
   ```bash
   anchor test
   ```

4. **Start the frontend**
   ```bash
   cd app
   npm run dev
   ```

5. **Open browser**
   Navigate to `http://localhost:3000`

#### Devnet Development

1. **Update Anchor.toml to use devnet**
   ```toml
   [provider]
   cluster = "Devnet"
   ```

2. **Airdrop SOL to your wallet**
   ```bash
   solana airdrop 2 --url devnet
   ```

3. **Deploy to devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. **Update frontend to use devnet** (already configured in WalletContextProvider)

5. **Start frontend**
   ```bash
   cd app
   npm run dev
   ```

## Usage Guide

### Creating a Budget Collection

1. Connect your Solana wallet (Phantom, Solflare, or Backpack)
2. Fill in the "Create Budget Collection" form:
   - **Budget Name**: e.g., "Budget 2026"
   - **Symbol**: e.g., "BUD26"
   - **Metadata URI**: Arweave or IPFS link to JSON metadata
   - **Year**: Fiscal year (e.g., 2026)
3. Click "Create Budget Collection"
4. Approve the transaction in your wallet
5. **Save the Collection Mint address** from the console logs

### Creating Expense Items

1. Copy the Collection Mint address from the previous step
2. Fill in the "Create Expense Item" form:
   - **Collection Mint Address**: Paste the collection mint
   - **Expense Name**: e.g., "Travel Expense"
   - **Expense Type**: e.g., "Travel"
   - **Metadata URI**: Arweave or IPFS link to expense metadata
   - **Approved Amount**: Budget allocation in tokens (e.g., 500000000)
   - **Variance Percentage**: Allowed overspend % (e.g., 10 = 110% max)
3. Click "Create Expense"
4. Approve the transaction in your wallet

### Spending from Expenses (Future Enhancement)

The `spend` instruction is implemented in the program but not yet in the UI. It will:
1. Burn expense tokens equal to the spend amount
2. Transfer equivalent USDC from treasury to operational account
3. Track total spent and enforce variance limits

## Program Instructions

### `create_budget_collection`
Creates a new budget collection as a NonFungible NFT with Master Edition.

**Parameters:**
- `name`: String - Budget name
- `symbol`: String - Token symbol
- `uri`: String - Metadata URI
- `year`: u16 - Fiscal year

### `create_expense`
Creates an expense item as a FungibleAsset token verified in the collection.

**Parameters:**
- `expense_name`: String - Expense name
- `expense_type`: String - Category/type
- `uri`: String - Metadata URI
- `approved_amount`: u64 - Budget allocation
- `variance_pct`: u8 - Allowed overspend percentage (0-100)

### `spend`
Burns expense tokens and transfers USDC from treasury to operational account.

**Parameters:**
- `amount`: u64 - Amount to spend

## Program Accounts

### BudgetPDA
```rust
pub struct BudgetPDA {
    pub authority: Pubkey,          // Budget owner
    pub collection_mint: Pubkey,    // Collection NFT mint
    pub year: u16,                  // Fiscal year
    pub expense_count: u32,         // Number of expenses
    pub bump: u8,                   // PDA bump seed
}
```

### ExpensePDA
```rust
pub struct ExpensePDA {
    pub budget: Pubkey,             // Parent budget PDA
    pub mint: Pubkey,               // Expense token mint
    pub expense_type: String,       // Category
    pub approved_amount: u64,       // Budget allocation
    pub spent: u64,                 // Amount spent so far
    pub variance_pct: u8,           // Allowed overspend %
    pub bump: u8,                   // PDA bump seed
}
```

## Testing

Run the test suite:

```bash
anchor test
```

The tests cover:
- ✅ Creating budget collections
- ✅ Creating expense items
- ⏳ Spending from expenses (placeholder)

## Frontend Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Wallet**: Solana Wallet Adapter
- **Blockchain**: Anchor/Solana Web3.js
- **Notifications**: React Hot Toast

## Environment Variables

Create `app/.env.local`:

```env
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_PROGRAM_ID=Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS
```

## Roadmap

- [x] Budget collection creation
- [x] Expense item creation
- [x] Basic UI with wallet connection
- [ ] Spend functionality in UI
- [ ] Budget/expense listing and viewing
- [ ] Real-time spending tracking
- [ ] USDC integration for treasury
- [ ] Budget analytics dashboard
- [ ] Multi-sig support for spending
- [ ] Automated budget reports

## Resources

- [Solana Documentation](https://docs.solana.com/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Metaplex Docs](https://docs.metaplex.com/)
- [MetaDAO Frontend](https://github.com/metaDAOproject/meta-dao-frontend) (inspiration)

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a PR.

## Support

For questions or issues, please open a GitHub issue or reach out to the team.

