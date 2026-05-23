# susuchain-sdk 🏦

The official Software Development Kit (SDK) for **SusuChain**, a decentralized multi-chain Community Savings Circle (Susu/ROSCA) protocol built on Celo and Stacks.

This SDK allows developers to easily query, create, and interact with SusuChain savings circles on both the Celo and Stacks networks.

## Installation

Install the SDK alongside its peer dependencies:

```bash
npm install susuchain-sdk viem @stacks/network @stacks/transactions @stacks/connect
```

## Features

- **Multi-Chain ABI & Addresses**: Instantly access Solidity ABIs and mainnet contract addresses for both Celo and Stacks.
- **Stacks Browser Helpers**: Pre-packaged wallet triggers to easily call `create-circle`, `contribute`, and `trigger-payout` using the Leather wallet.

## Usage

### 🟡 Celo Integration (Viem)

You can easily interact with the SusuChain smart contract on Celo using `viem`:

```typescript
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import { SUSUCHAIN_CELO_ABI, SUSUCHAIN_CELO_ADDRESS } from 'susuchain-sdk';

const client = createPublicClient({
  chain: celo,
  transport: http(),
});

// Read circle details
async function getCircleDetails(circleId: number) {
  const circle = await client.readContract({
    address: SUSUCHAIN_CELO_ADDRESS,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: 'getCircle',
    args: [BigInt(circleId)],
  });
  return circle;
}
```

### 🟠 Stacks Integration (Leather Wallet)

Trigger Stacks smart contract interactions directly inside any web app:

```typescript
import { callCreateCircle, callContribute } from 'susuchain-sdk';

// Create a savings circle
callCreateCircle(
  "My Savings Circle", 
  10_000_000, // 10 STX (in microSTX)
  ["SP2T02XBVN9RAZ4360DSWF3JCG79B1QY2NR21RB0Q", "SP3..."], 
  (data) => {
    console.log("Circle created! TxID:", data.txId);
  }
);

// Contribute to a circle
callContribute(0, (data) => {
  console.log("Contributed! TxID:", data.txId);
});
```

## Exported Constants

### Celo
- `SUSUCHAIN_CELO_ABI`: The full Solidity contract ABI.
- `SUSUCHAIN_CELO_ADDRESS`: The deployed contract address on Celo Mainnet.

### Stacks
- `STACKS_CONTRACT_ADDRESS`: The deployed Stacks principal address on Mainnet.
- `STACKS_CONTRACT_NAME`: The contract name (`"susuchain"`).
- `STACKS_NETWORK`: The Stacks network configuration object (Mainnet).

## Tracking

This release satisfies clean ES Modules and CommonJS packaging guidelines in alignment with issue #27.

## License

MIT
