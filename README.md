# SusuChain 🏦

**A decentralized, multi-chain Community Savings Circle (Susu/ROSCA) protocol built on Celo and Stacks.**

SusuChain modernizes traditional community savings by bringing transparency, security, and automation to rotating savings circles. Users can pool funds together with friends or community members and rotate payouts every cycle, completely trustlessly.

## 🌟 Key Features

- **Multi-Chain Support**: Native support for both **Celo** (optimized for mobile/MiniPay) and **Stacks** (Bitcoin L2).
- **Celo MiniPay Integration**: Engineered specifically to run flawlessly inside the Opera MiniPay wallet, allowing users to save using ultra-fast, low-fee Celo transactions. Includes robust handling for MiniPay's fee-abstraction mechanisms.
- **Stacks / Leather Wallet Integration**: Deep integration with the Stacks ecosystem for users who prefer Bitcoin-secured smart contracts via the Leather wallet.
- **Automated Payouts (Celo)**: Smart contracts on Celo automatically trigger and route payouts the exact moment the final round contribution is received.
- **Trustless & Decentralized**: No central authority holds the funds. Smart contracts strictly enforce contribution tracking, round management, and payout distribution.

## 🏗 Architecture

SusuChain is a monorepo managed by [Turborepo](https://turbo.build/) containing:

- `apps/web`: The unified Next.js 14 frontend application that serves both the Celo MiniPay mobile experience and the Stacks desktop experience.
- `apps/contracts`: Hardhat environment containing the Celo EVM Solidity smart contracts.
- `apps/stacks`: Clarinet environment containing the Stacks Clarity smart contracts.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/)
- [Leather Wallet](https://leather.io/) (for Stacks)
- Opera MiniPay (for Celo mobile testing)

### Installation

1. Install all monorepo dependencies:
   ```bash
   pnpm install
   ```

2. Configure environment variables:
   Ensure your `.env.local` inside `apps/web` is configured with the correct contract addresses:
   ```env
   NEXT_PUBLIC_SUSUCHAIN_CELO_ADDRESS=0x...
   NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS=SP...
   NEXT_PUBLIC_STACKS_CONTRACT_NAME=susuchain
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser. (Note: For the Celo experience, tunnel this URL via ngrok and open it inside the MiniPay browser).

## 🛠 Smart Contract Management

### Celo (EVM)
The Celo smart contracts are located in `apps/contracts`.
- Compile contracts: `pnpm contracts:compile`
- Deploy to Celo Mainnet: `npx hardhat ignition deploy ignition/modules/SusuChain.ts --network celo`

### Stacks (Clarity)
The Stacks smart contracts are located in `apps/stacks`.
- Check syntax & types: `cd apps/stacks && clarinet check`
- Run test suites: `cd apps/stacks && clarinet test`

## 💻 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Celo Web3**: Viem, Wagmi
- **Stacks Web3**: `@stacks/connect`, `@stacks/network`, `@stacks/transactions`
- **Smart Contracts**: Solidity (Hardhat), Clarity (Clarinet)
- **Tooling**: Turborepo, PNPM

## 📄 License

This project is open-source and available under the MIT License.
