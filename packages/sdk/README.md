# susuchain-sdk 🏦

The official Software Development Kit (SDK) for **SusuChain**, a decentralized multi-chain Community Savings Circle (Susu/ROSCA) protocol built on Celo and Stacks.

This SDK allows developers to easily query, create, and interact with SusuChain savings circles on both the Celo and Stacks networks.

## Installation

Install the SDK alongside its peer dependencies:

```bash
npm install susuchain-sdk viem @stacks/network @stacks/transactions @stacks/connect
```

> **Note:** `@stacks/connect` is an optional peer dependency — only required for browser wallet helpers.

## Features

- **Multi-Chain ABI & Addresses**: Instantly access Solidity ABIs and mainnet contract addresses for both Celo and Stacks.
- **Stacks Browser Helpers**: Pre-packaged wallet triggers to easily call `create-circle`, `contribute`, and `trigger-payout` using the Leather wallet.
- **Stacks Server-Side Builders**: Construct and sign Stacks transactions with a private key for backend or scripting environments.
- **Stacks Read-Only Helpers**: Query on-chain Stacks state (`get-circle`, `get-circle-count`, `has-member-paid`, `is-member`) from Node.js.
- **Celo Transaction Param Builders**: Generate ready-to-use contract call parameter objects for viem wallet clients (both read and write operations).
- **TypeScript Interfaces**: Fully typed option interfaces for all builders.

## Usage

This SDK natively supports both **ES Modules (ESM)** and **CommonJS (CJS)** module systems.

### Importing the SDK

#### Using ES Modules (import)
```typescript
import { SUSUCHAIN_CELO_ADDRESS, STACKS_CONTRACT_NAME } from 'susuchain-sdk';
```

#### Using CommonJS (require)
```javascript
const { SUSUCHAIN_CELO_ADDRESS, STACKS_CONTRACT_NAME } = require('susuchain-sdk');
```

### Celo Integration (Viem)

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

### Celo Server-Side Transactions (Write)

Build contract call parameters and pass them to a viem wallet client:

```typescript
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { celo } from 'viem/chains';
import { buildCeloCreateCircleParams, buildCeloContributeParams } from 'susuchain-sdk';

const account = privateKeyToAccount('0x...');
const wallet = createWalletClient({ account, chain: celo, transport: http() });

// Create a savings circle
const createParams = buildCeloCreateCircleParams({
  name: 'My Circle',
  contributionWei: 1000000000000000000n, // 1 CELO
  roundDurationDays: 30,
  gracePeriodDays: 3,
  penaltyFee: 0n,
  members: ['0xAbc...', '0xDef...'],
});
const hash = await wallet.writeContract(createParams);

// Contribute to a circle
const contributeParams = buildCeloContributeParams({
  circleId: 0,
  valueWei: 1000000000000000000n,
});
const txHash = await wallet.writeContract(contributeParams);

// Withdraw pending payouts
const withdrawParams = buildCeloWithdrawParams();
await wallet.writeContract(withdrawParams);
```

### Celo Server-Side Read Operations

Use param builders with a viem public client to query on-chain state:

```typescript
import { createPublicClient, http } from 'viem';
import { celo } from 'viem/chains';
import {
  buildCeloGetCircleParams,
  buildCeloCircleCountParams,
  buildCeloIsMemberParams,
  buildCeloHasPaidParams,
  buildCeloGetMemberCountParams,
  buildCeloRoundBalanceParams,
  buildCeloPendingWithdrawalsParams,
} from 'susuchain-sdk';

const client = createPublicClient({ chain: celo, transport: http() });

// Get total circle count
const count = await client.readContract(buildCeloCircleCountParams());

// Get circle details
const circle = await client.readContract(buildCeloGetCircleParams(0));

// Check membership
const isMember = await client.readContract(
  buildCeloIsMemberParams({ circleId: 0, user: '0xAbc...' })
);

// Check payment status
const hasPaid = await client.readContract(
  buildCeloHasPaidParams({ circleId: 0, round: 0, member: '0xAbc...' })
);

// Get member count
const memberCount = await client.readContract(buildCeloGetMemberCountParams(0));

// Get round balance
const balance = await client.readContract(buildCeloRoundBalanceParams(0));

// Check pending withdrawals
const pending = await client.readContract(
  buildCeloPendingWithdrawalsParams('0xAbc...')
);
```

### Stacks Integration (Leather Wallet)

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

### Stacks Server-Side Transactions

Build, sign, and broadcast Stacks transactions from Node.js:

```typescript
import { buildCreateCircleTx, buildContributeTx, broadcastTx } from 'susuchain-sdk';

// Build and sign a create-circle transaction
const tx = await buildCreateCircleTx({
  senderKey: 'your-private-key-hex',
  name: 'Backend Circle',
  contributionMicroSTX: 5_000_000,
  members: ['SP2T02...', 'SP3...'],
  fee: 2000,
});

// Broadcast the signed transaction
const result = await broadcastTx({ transaction: tx });
console.log('Broadcast result:', result);
```

### Stacks Read-Only Queries

Query on-chain Stacks state from server-side Node.js:

```typescript
import {
  readGetCircle,
  readGetCircleCount,
  readHasMemberPaid,
  readIsMember,
} from 'susuchain-sdk';

const senderAddress = 'SP2T02XBVN9RAZ4360DSWF3JCG79B1QY2NR21RB0Q';

// Get circle details
const circle = await readGetCircle(0, senderAddress);

// Get total circle count
const count = await readGetCircleCount(senderAddress);

// Check if a member has paid
const hasPaid = await readHasMemberPaid(0, 0, 'SP3...', senderAddress);

// Check membership
const isMember = await readIsMember(0, 'SP3...', senderAddress);
```

## Exported Constants

### Celo
- `SUSUCHAIN_CELO_ABI`: The full Solidity contract ABI.
- `SUSUCHAIN_CELO_ADDRESS`: The deployed contract address on Celo Mainnet.

### Stacks
- `STACKS_CONTRACT_ADDRESS`: The deployed Stacks principal address on Mainnet.
- `STACKS_CONTRACT_NAME`: The contract name (`"susuchain"`).
- `STACKS_NETWORK`: The Stacks network configuration object (Mainnet).

## Exported Functions

### Browser Helpers (Stacks)
- `callCreateCircle(name, contributionMicroSTX, members, onFinish)`: Open Leather wallet to create a circle.
- `callContribute(circleId, onFinish)`: Open Leather wallet to contribute.
- `callTriggerPayout(circleId, onFinish)`: Open Leather wallet to trigger payout.

### Server-Side Builders (Stacks)
- `buildCreateCircleTx(opts)`: Build and sign a `create-circle` transaction.
- `buildContributeTx(opts)`: Build and sign a `contribute` transaction.
- `buildTriggerPayoutTx(opts)`: Build and sign a `trigger-payout` transaction.
- `broadcastTx(opts)`: Broadcast a signed transaction to the Stacks network.

### Read-Only Helpers (Stacks)
- `readGetCircle(circleId, senderAddress)`: Query circle details.
- `readGetCircleCount(senderAddress)`: Query total circle count.
- `readHasMemberPaid(circleId, round, member, senderAddress)`: Check payment status.
- `readIsMember(circleId, user, senderAddress)`: Check membership.

### Parameter Builders — Write (Celo)
- `buildCeloCreateCircleParams(opts)`: Returns viem-compatible params for `createCircle`.
- `buildCeloContributeParams(opts)`: Returns viem-compatible params for `contribute`.
- `buildCeloWithdrawParams()`: Returns viem-compatible params for `withdraw`.

### Parameter Builders — Read (Celo)
- `buildCeloGetCircleParams(circleId)`: Returns params for `getCircle`.
- `buildCeloIsMemberParams(opts)`: Returns params for `isMember`.
- `buildCeloGetMemberCountParams(circleId)`: Returns params for `getMemberCount`.
- `buildCeloHasPaidParams(opts)`: Returns params for `hasPaid`.
- `buildCeloCircleCountParams()`: Returns params for `circleCount`.
- `buildCeloRoundBalanceParams(circleId)`: Returns params for `roundBalance`.
- `buildCeloPendingWithdrawalsParams(account)`: Returns params for `pendingWithdrawals`.

## Exported TypeScript Interfaces

- `CreateCircleTxOptions`: Options for Stacks `buildCreateCircleTx`.
- `ContributeTxOptions`: Options for Stacks `buildContributeTx`.
- `TriggerPayoutTxOptions`: Options for Stacks `buildTriggerPayoutTx`.
- `BroadcastTxOptions`: Options for `broadcastTx`.
- `CeloCreateCircleOptions`: Options for `buildCeloCreateCircleParams`.
- `CeloContributeOptions`: Options for `buildCeloContributeParams`.
- `CeloHasPaidOptions`: Options for `buildCeloHasPaidParams`.
- `CeloIsMemberOptions`: Options for `buildCeloIsMemberParams`.

## Tracking

This release satisfies clean ES Modules and CommonJS packaging guidelines in alignment with issues #25 and #27.

## License

MIT
