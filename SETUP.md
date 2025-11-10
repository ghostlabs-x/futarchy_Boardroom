# Quick Setup Guide

This guide will help you get the Metaplex Budget Manager up and running quickly.

## Step 1: Install Prerequisites

### Solana CLI
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### Anchor CLI
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.29.0
avm use 0.29.0
```

### Node.js Dependencies
```bash
npm install
cd app
npm install
cd ..
```

## Step 2: Configure Solana

### Create a Wallet (if you don't have one)
```bash
solana-keygen new
```

### Configure for Devnet
```bash
solana config set --url devnet
```

### Airdrop SOL for Testing
```bash
solana airdrop 2
```

## Step 3: Build & Deploy

### Build the Program
```bash
anchor build
```

### Get Your Program ID
```bash
solana address -k target/deploy/metaplex_budget-keypair.json
```

### Update Program ID
Replace the program ID in:
1. `Anchor.toml` (under `[programs.devnet]`)
2. `programs/metaplex-budget/src/lib.rs` (in `declare_id!()`)
3. `app/src/utils/constants.ts`

### Rebuild After ID Update
```bash
anchor build
```

### Deploy to Devnet
```bash
anchor deploy --provider.cluster devnet
```

## Step 4: Run Tests

```bash
anchor test
```

## Step 5: Start the Frontend

```bash
cd app
npm run dev
```

Open `http://localhost:3000` in your browser.

## Step 6: Use the Application

1. **Connect Wallet**: Click the wallet button and connect Phantom/Solflare
2. **Create Budget**: Fill in the left form to create a budget collection
3. **Create Expenses**: Copy the collection mint and use it to create expenses

## Troubleshooting

### "Insufficient funds" Error
```bash
solana airdrop 2
```

### Program Deployment Failed
- Make sure you updated the program ID in all locations
- Rebuild: `anchor build`
- Try again: `anchor deploy`

### Frontend Shows Wrong Network
Check `app/src/contexts/WalletContextProvider.tsx` - should use `WalletAdapterNetwork.Devnet`

### IDL Not Found
```bash
anchor build
# IDL should be in target/idl/metaplex_budget.json
```

### Can't Connect Wallet
- Make sure you have a Solana wallet extension installed (Phantom, Solflare, etc.)
- Wallet must be on Devnet network

## Development Workflow

### Making Changes to Program
```bash
# 1. Edit programs/metaplex-budget/src/lib.rs
# 2. Build
anchor build

# 3. Test locally
anchor test

# 4. Deploy
anchor deploy

# 5. Frontend will automatically use new IDL from target/idl/
```

### Making Changes to Frontend
```bash
cd app
# Edit files in app/src/
# Changes auto-reload with hot module replacement
```

## Local Development (Optional)

For faster iteration, use localnet:

### Terminal 1: Start Validator
```bash
solana-test-validator
```

### Terminal 2: Deploy & Test
```bash
anchor deploy --provider.cluster localnet
anchor test --skip-local-validator
```

### Terminal 3: Frontend
```bash
cd app
# Update WalletContextProvider to use localnet
npm run dev
```

## Next Steps

- Read the full [README.md](./README.md) for architecture details
- Check the design document [design.md](./design.md)
- Explore the test file: `tests/metaplex-budget.ts`
- Customize the UI in `app/src/`

## Getting Help

- Anchor errors: Check [Anchor docs](https://www.anchor-lang.com/)
- Solana issues: Check [Solana docs](https://docs.solana.com/)
- Metaplex questions: Check [Metaplex docs](https://docs.metaplex.com/)

Happy building! 🚀

