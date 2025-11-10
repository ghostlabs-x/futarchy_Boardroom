Budget 2026 Collection (NonFungible NFT)
 ├─ Metadata Account (PDA from Collection Mint)
 │  └─ Collection struct: verified=true, key=CollectionV1, update_authority=Your Wallet
 │  └─ Data: name="Budget 2026", symbol="BUD26", uri="arweave://permanent-json-with-year-seq"
 │  └─ Token Standard: NonFungible (supply=1, decimals=0, mint_auth=Master Edition PDA)
 └─ Master Edition Account (PDA): max_supply=None (no printing needed)

Expense Sub-Items (FungibleAsset Tokens, verified in collection)
 ├─ Expense Mint #1 (e.g., "Travel")
 │  ├─ Metadata Account (PDA): 
 │  │  └─ Collection: verified=true, points to Budget 2026 mint
 │  │  └─ Data: name="Travel Expense", type="Travel", uri="arweave://expense-json"
 │  │  └─ Additional attrs: approved_amount=500000000 (500 USDC in lamports, 6 decimals)
 │  │  └─ Token Standard: FungibleAsset (decimals=0 for countable units)
 │  ├─ Associated Token Account (ATA): owned by Expense PDA, balance=approved_amount
 │  └─ Your Program PDA: owns ATA, governs burns → USDC transfers
 ├─ Expense Mint #2 (e.g., "Salaries") ... (repeat per Expense)
 └─ ... up to N Expenses (e.g., 10-20 per annual budget)

