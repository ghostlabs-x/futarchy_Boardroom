# Architecture Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Metaplex Budget Manager                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   Next.js Frontend   │◄───────►│  Solana Blockchain   │
│                      │         │                      │
│  - Wallet Adapter    │         │  - Anchor Program    │
│  - Budget Forms      │         │  - Metaplex MPL      │
│  - Expense Forms     │         │  - Token Program     │
└──────────────────────┘         └──────────────────────┘
         │                                   │
         └───────────────┬───────────────────┘
                         │
                    Web3.js & Anchor
```

## Data Flow

### Creating a Budget Collection

```
User Input (Frontend)
    │
    ├─ Name: "Budget 2026"
    ├─ Symbol: "BUD26"
    ├─ URI: "https://arweave.net/..."
    └─ Year: 2026
    │
    ▼
Generate Collection Mint (Keypair)
    │
    ▼
Derive PDAs
    ├─ Budget PDA: seeds=[b"budget", collection_mint]
    ├─ Metadata: Metaplex PDA
    └─ Master Edition: Metaplex PDA
    │
    ▼
Call Program Instruction: create_budget_collection
    │
    ├─ Mint 1 NFT token
    ├─ Create metadata account (Metaplex CPI)
    ├─ Create master edition (Metaplex CPI)
    └─ Initialize Budget PDA
    │
    ▼
Result: Budget Collection Created
    ├─ Collection Mint: Public Key
    ├─ Budget PDA: Public Key
    └─ On-chain NFT with metadata
```

### Creating an Expense Item

```
User Input (Frontend)
    │
    ├─ Collection Mint: (from previous step)
    ├─ Expense Name: "Travel Expense"
    ├─ Expense Type: "Travel"
    ├─ Approved Amount: 500000000
    └─ Variance %: 10
    │
    ▼
Fetch Budget PDA
    └─ Get expense_count
    │
    ▼
Derive Expense PDA
    └─ seeds=[b"expense", collection_mint, expense_count]
    │
    ▼
Generate Expense Mint (Keypair)
    │
    ▼
Call Program Instruction: create_expense
    │
    ├─ Mint approved_amount tokens to expense ATA
    ├─ Create expense metadata (Metaplex CPI)
    ├─ Verify in collection (Metaplex CPI)
    ├─ Initialize Expense PDA
    └─ Increment budget.expense_count
    │
    ▼
Result: Expense Item Created
    ├─ Expense Mint: Public Key
    ├─ Expense PDA: Public Key
    ├─ Expense ATA: Contains approved_amount tokens
    └─ Verified in collection
```

### Spending from Expense (Future UI)

```
User Action: Spend 100 tokens
    │
    ▼
Fetch Expense PDA
    ├─ Check: spent + amount <= approved_amount * (1 + variance_pct/100)
    └─ If valid, proceed
    │
    ▼
Call Program Instruction: spend
    │
    ├─ Burn 100 tokens from expense ATA
    ├─ Transfer equivalent USDC from treasury to operational
    └─ Update expense.spent += 100
    │
    ▼
Result: Spending Recorded
    ├─ Expense tokens burned
    ├─ USDC transferred
    └─ On-chain spending tracked
```

## Account Relationships

```
BudgetPDA
├─ authority: Pubkey          → Wallet that created budget
├─ collection_mint: Pubkey    → NFT collection mint
├─ year: u16                  → Fiscal year (e.g., 2026)
├─ expense_count: u32         → Number of expenses created
└─ bump: u8                   → PDA bump seed

         │
         │ has many
         ▼

ExpensePDA (1..N)
├─ budget: Pubkey             → Parent budget PDA
├─ mint: Pubkey               → Expense token mint
├─ expense_type: String       → Category (e.g., "Travel")
├─ approved_amount: u64       → Budget allocation
├─ spent: u64                 → Amount spent so far
├─ variance_pct: u8           → Allowed overspend % (0-100)
└─ bump: u8                   → PDA bump seed
```

## Token Standards

### Budget Collection (NonFungible NFT)

```
Collection Mint
├─ Supply: 1
├─ Decimals: 0
├─ Mint Authority: Revoked (Master Edition PDA)
└─ Freeze Authority: Update Authority

Metadata Account
├─ Name: "Budget 2026"
├─ Symbol: "BUD26"
├─ URI: "https://arweave.net/..."
├─ Update Authority: Creator
└─ Token Standard: NonFungible

Master Edition
├─ Max Supply: 0 (no printing)
└─ Supply: 1
```

### Expense Item (FungibleAsset)

```
Expense Mint
├─ Supply: approved_amount
├─ Decimals: 0
├─ Mint Authority: Expense PDA
└─ Freeze Authority: None

Metadata Account
├─ Name: "Travel Expense"
├─ Symbol: expense_type
├─ URI: "https://arweave.net/..."
├─ Update Authority: Expense PDA
├─ Token Standard: FungibleAsset
└─ Collection: { verified: true, key: collection_mint }

Associated Token Account (ATA)
├─ Mint: expense_mint
├─ Owner: Expense PDA
├─ Amount: approved_amount (initially)
└─ Amount: decreases as tokens are burned (spent)
```

## Program Derived Addresses (PDAs)

### Budget PDA
```rust
seeds = [b"budget", collection_mint.as_ref()]
```

### Expense PDA
```rust
seeds = [
    b"expense",
    collection_mint.as_ref(),
    expense_count.to_le_bytes().as_ref()
]
```

### Metaplex Metadata Account
```rust
seeds = [
    b"metadata",
    TOKEN_METADATA_PROGRAM_ID.as_ref(),
    mint.as_ref()
]
program_id = TOKEN_METADATA_PROGRAM_ID
```

### Metaplex Master Edition
```rust
seeds = [
    b"metadata",
    TOKEN_METADATA_PROGRAM_ID.as_ref(),
    mint.as_ref(),
    b"edition"
]
program_id = TOKEN_METADATA_PROGRAM_ID
```

## Security Considerations

### Access Control
- ✅ Budget authority checks on expense creation
- ✅ PDA ownership validation
- ✅ Signer verification on all mutations

### Economic Security
- ✅ Variance limits prevent unlimited overspending
- ✅ Token burning ensures spending is irreversible
- ✅ Separate treasury and operational accounts

### Data Integrity
- ✅ Collection verification prevents fake expenses
- ✅ Immutable master edition prevents NFT duplication
- ✅ On-chain metadata ensures transparency

## Future Enhancements

### Multi-Signature Support
```
Treasury Authority PDA
├─ Required Signers: N of M
├─ Threshold: Configurable
└─ Timelock: Optional delay
```

### Budget Rollovers
```
Rollover Mechanism
├─ Transfer unspent amounts to next year
├─ Auto-create new budget collection
└─ Link previous/next budgets
```

### Real-Time Monitoring
```
Event System
├─ Budget Created Event
├─ Expense Created Event
├─ Spending Event
└─ Variance Threshold Event
```

### Analytics Dashboard
```
Metrics
├─ Total allocated vs spent
├─ Expense category breakdown
├─ Variance utilization
└─ Historical trends
```

## Integration Points

### USDC Treasury
- Program expects USDC token accounts for treasury and operational
- 1:1,000,000 conversion ratio (1 expense token = 1 USDC)
- Configurable in future versions

### Off-Chain Metadata
- Budget JSON: Name, year, description, image
- Expense JSON: Type, approved_amount, category, tags
- Stored on Arweave or IPFS

### Monitoring & Indexing
- Use Solana transaction logs
- Index with The Graph or custom indexer
- Real-time WebSocket subscriptions

## Testing Strategy

### Unit Tests
- ✅ Budget collection creation
- ✅ Expense item creation
- ⏳ Spending with variance checks
- ⏳ Error cases (over budget, unauthorized, etc.)

### Integration Tests
- ⏳ Full workflow: Create budget → Add expenses → Spend
- ⏳ Multi-expense budgets
- ⏳ USDC integration

### Frontend Tests
- ⏳ Component rendering
- ⏳ Wallet connection
- ⏳ Transaction flow

## Deployment Checklist

- [ ] Update program ID in all files
- [ ] Deploy to devnet and test
- [ ] Set up USDC treasury accounts
- [ ] Configure operational wallet
- [ ] Test with real transactions
- [ ] Deploy frontend to Vercel/similar
- [ ] Set up monitoring/alerts
- [ ] Deploy to mainnet
- [ ] Verify program on Solscan
- [ ] Publish documentation

## Resources

- Program ID: `Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS`
- Metaplex Token Metadata: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`
- Token Program: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- Associated Token Program: `ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL`

