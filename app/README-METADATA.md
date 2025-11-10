# Metadata Storage for Testing

## Quick Setup for Local Testing

### Option 1: Local HTTP Server (Recommended for Testing)

1. **Start the metadata server:**
   ```bash
   npm run metadata:server
   ```

2. **Create metadata JSON files** in `app/public/metadata/`:
   - Example: `budget-2026.json`
   - Example: `expense-travel.json`

3. **Use URLs in your forms:**
   - `http://localhost:3001/metadata/budget-2026.json`
   - `http://localhost:3001/metadata/expense-travel.json`

### Option 2: Simple JSON Hosting Services (Free for Testing)

- **JSONBin.io**: https://jsonbin.io (free tier available)
- **MyJSON**: https://myjson.com (simple JSON hosting)
- **GitHub Gist**: Host JSON files as gists

### Option 3: IPFS (Decentralized, Good for Testing)

- **Pinata**: https://pinata.cloud (free tier, IPFS pinning)
- **Web3.Storage**: https://web3.storage (free tier, IPFS)

### Option 4: Arweave Mainnet (Production)

For production, use Arweave mainnet:
- **Bundlr**: https://bundlr.network (easy Arweave uploads)
- **ArDrive**: https://ardrive.io (Arweave file storage)

## Metadata JSON Format

### Budget Collection Metadata
```json
{
  "name": "Budget 2026 Collection",
  "description": "Annual budget collection for fiscal year 2026",
  "image": "https://via.placeholder.com/512/6366f1/ffffff?text=Budget+2026",
  "attributes": [
    {
      "trait_type": "Year",
      "value": "2026"
    }
  ]
}
```

### Expense Item Metadata
```json
{
  "name": "Travel Expense",
  "description": "Travel and accommodation expenses",
  "image": "https://via.placeholder.com/512/10b981/ffffff?text=Travel",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Travel"
    },
    {
      "trait_type": "Approved Amount",
      "value": "500000000"
    }
  ]
}
```

## Example Workflow

1. Create a JSON file: `app/public/metadata/my-budget.json`
2. Start metadata server: `npm run metadata:server`
3. Use URL in form: `http://localhost:3001/metadata/my-budget.json`
4. The metadata will be stored in the NFT's URI field on-chain

