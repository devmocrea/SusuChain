import SusuChainJSON from "./abi.json";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

/** Full Solidity ABI for the SusuChain contract on Celo */
export const SUSUCHAIN_CELO_ABI = SusuChainJSON.abi;

/** Deployed SusuChain contract address on Celo Mainnet */
export const SUSUCHAIN_CELO_ADDRESS = "0x20B421Db767D3496E4489Db5C3122C1fD4625525";

/** Deployed Stacks contract principal */
export const STACKS_CONTRACT_ADDRESS = "SP2T02XBVN9RAZ4360DSWF3JCG79B1QY2NR21RB0Q";

/** Stacks contract name */
export const STACKS_CONTRACT_NAME = "susuchain";

// Re-export Stacks network helpers
import { STACKS_MAINNET } from "@stacks/network";
export const STACKS_NETWORK = STACKS_MAINNET;

// ──────────────────────────────────────────────
// TypeScript Interfaces
// ──────────────────────────────────────────────

/** Options for building a Stacks create-circle transaction */
export interface CreateCircleTxOptions {
  senderKey: string;
  name: string;
  contributionMicroSTX: number;
  members: string[];
  fee?: number;
  nonce?: number;
}

/** Options for building a Stacks contribute transaction */
export interface ContributeTxOptions {
  senderKey: string;
  circleId: number;
  fee?: number;
  nonce?: number;
}

/** Options for building a Stacks trigger-payout transaction */
export interface TriggerPayoutTxOptions {
  senderKey: string;
  circleId: number;
  fee?: number;
  nonce?: number;
}

/** Options for broadcasting a signed Stacks transaction */
export interface BroadcastTxOptions {
  transaction: StacksTransactionWire;
}

/** Options for building Celo createCircle params */
export interface CeloCreateCircleOptions {
  name: string;
  contributionWei: bigint;
  roundDurationDays: number;
  gracePeriodDays: number;
  penaltyFee: bigint;
  members: string[];
}

/** Options for building Celo contribute params */
export interface CeloContributeOptions {
  circleId: number;
  valueWei: bigint;
}

/** Options for building Celo hasPaid params */
export interface CeloHasPaidOptions {
  circleId: number;
  round: number;
  member: string;
}

/** Options for building Celo isMember params */
export interface CeloIsMemberOptions {
  circleId: number;
  user: string;
}

// ──────────────────────────────────────────────
// Stacks Imports
// ──────────────────────────────────────────────

// Browser-based helper functions for Stacks (requires Leather wallet injected provider)
import { openContractCall } from "@stacks/connect";
import {
  stringAsciiCV,
  uintCV,
  listCV,
  principalCV,
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
} from "@stacks/transactions";
import type { StacksTransactionWire, TxBroadcastResult } from "@stacks/transactions";

// ──────────────────────────────────────────────
// Stacks Browser Wallet Helpers
// ──────────────────────────────────────────────

/**
 * Open Leather wallet to call create-circle
 * @param name Savings circle name (max 50 chars)
 * @param contributionMicroSTX Contribution amount in microSTX (1 STX = 1,000,000 microSTX)
 * @param members List of Stacks SP... addresses (max 10 members)
 * @param onFinish Callback function on successful transaction broadcast
 */
export function callCreateCircle(
  name: string,
  contributionMicroSTX: number,
  members: string[],
  onFinish: (data: any) => void
) {
  openContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "create-circle",
    functionArgs: [
      stringAsciiCV(name.slice(0, 50)),
      uintCV(contributionMicroSTX),
      listCV(members.slice(0, 10).map((m) => principalCV(m))),
    ],
    network: STACKS_NETWORK,
    anchorMode: AnchorMode.Any,
    onFinish,
    onCancel: () => console.log("create-circle cancelled"),
  });
}

/**
 * Open Leather wallet to contribute to a circle
 * @param circleId The ID of the circle to contribute to
 * @param onFinish Callback function on successful transaction broadcast
 */
export function callContribute(
  circleId: number,
  onFinish: (data: any) => void
) {
  openContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "contribute",
    functionArgs: [uintCV(circleId)],
    network: STACKS_NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel: () => console.log("contribute cancelled"),
  });
}

/**
 * Open Leather wallet to trigger payout for a completed circle round
 * @param circleId The ID of the circle
 * @param onFinish Callback function on successful transaction broadcast
 */
export function callTriggerPayout(
  circleId: number,
  onFinish: (data: any) => void
) {
  openContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "trigger-payout",
    functionArgs: [uintCV(circleId)],
    network: STACKS_NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel: () => console.log("trigger-payout cancelled"),
  });
}

// ──────────────────────────────────────────────
// Stacks Server-Side Transaction Builders
// ──────────────────────────────────────────────

/**
 * Build and sign a create-circle transaction for server-side use
 * @param opts Transaction options including senderKey
 */
export async function buildCreateCircleTx(opts: CreateCircleTxOptions): Promise<StacksTransactionWire> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "create-circle",
    functionArgs: [
      stringAsciiCV(opts.name.slice(0, 50)),
      uintCV(opts.contributionMicroSTX),
      listCV(opts.members.slice(0, 10).map((m) => principalCV(m))),
    ],
    senderKey: opts.senderKey,
    network: STACKS_NETWORK,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

/**
 * Build and sign a contribute transaction for server-side use
 * @param opts Transaction options including senderKey and circleId
 */
export async function buildContributeTx(opts: ContributeTxOptions): Promise<StacksTransactionWire> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "contribute",
    functionArgs: [uintCV(opts.circleId)],
    senderKey: opts.senderKey,
    network: STACKS_NETWORK,
    postConditionMode: PostConditionMode.Allow,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

/**
 * Build and sign a trigger-payout transaction for server-side use
 * @param opts Transaction options including senderKey and circleId
 */
export async function buildTriggerPayoutTx(opts: TriggerPayoutTxOptions): Promise<StacksTransactionWire> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "trigger-payout",
    functionArgs: [uintCV(opts.circleId)],
    senderKey: opts.senderKey,
    network: STACKS_NETWORK,
    postConditionMode: PostConditionMode.Allow,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

/**
 * Broadcast a signed Stacks transaction to the network
 * @param opts Options containing the signed transaction
 */
export async function broadcastTx(opts: BroadcastTxOptions): Promise<TxBroadcastResult> {
  const result = await broadcastTransaction({
    transaction: opts.transaction,
    network: STACKS_NETWORK,
  });
  return result;
}

// ──────────────────────────────────────────────
// Stacks Read-Only Call Builders
// ──────────────────────────────────────────────

/**
 * Call the read-only get-circle function on the Stacks contract
 * @param circleId The ID of the circle to query
 * @param senderAddress The Stacks address of the sender (for read-only calls)
 */
export async function readGetCircle(circleId: number, senderAddress: string) {
  return fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "get-circle",
    functionArgs: [uintCV(circleId)],
    senderAddress,
    network: STACKS_NETWORK,
  });
}

/**
 * Call the read-only get-circle-count function on the Stacks contract
 * @param senderAddress The Stacks address of the sender (for read-only calls)
 */
export async function readGetCircleCount(senderAddress: string) {
  return fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "get-circle-count",
    functionArgs: [],
    senderAddress,
    network: STACKS_NETWORK,
  });
}

/**
 * Call the read-only has-member-paid function on the Stacks contract
 * @param circleId The circle ID
 * @param round The round number
 * @param member The Stacks principal address of the member
 * @param senderAddress The Stacks address of the sender (for read-only calls)
 */
export async function readHasMemberPaid(
  circleId: number,
  round: number,
  member: string,
  senderAddress: string
) {
  return fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "has-member-paid",
    functionArgs: [uintCV(circleId), uintCV(round), principalCV(member)],
    senderAddress,
    network: STACKS_NETWORK,
  });
}

/**
 * Call the read-only is-member function on the Stacks contract
 * @param circleId The circle ID
 * @param user The Stacks principal address to check
 * @param senderAddress The Stacks address of the sender (for read-only calls)
 */
export async function readIsMember(
  circleId: number,
  user: string,
  senderAddress: string
) {
  return fetchCallReadOnlyFunction({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "is-member",
    functionArgs: [uintCV(circleId), principalCV(user)],
    senderAddress,
    network: STACKS_NETWORK,
  });
}

// ──────────────────────────────────────────────
// Celo Transaction Parameter Builders
// ──────────────────────────────────────────────

/**
 * Build viem-compatible params for createCircle on the Celo contract
 * @param opts Circle creation options
 */
export function buildCeloCreateCircleParams(opts: CeloCreateCircleOptions) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "createCircle" as const,
    args: [
      opts.name,
      opts.contributionWei,
      BigInt(opts.roundDurationDays),
      BigInt(opts.gracePeriodDays),
      opts.penaltyFee,
      opts.members as `0x${string}`[],
    ],
  };
}

/**
 * Build viem-compatible params for contribute on the Celo contract
 * @param opts Contribute options including circleId and value
 */
export function buildCeloContributeParams(opts: CeloContributeOptions) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "contribute" as const,
    args: [BigInt(opts.circleId)],
    value: opts.valueWei,
  };
}

/**
 * Build viem-compatible params for withdraw on the Celo contract.
 * Withdraws any pending payouts that failed during automatic distribution.
 */
export function buildCeloWithdrawParams() {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "withdraw" as const,
    args: [],
  };
}

/**
 * Build viem-compatible params for reading circle details via getCircle
 * @param circleId The circle ID to query
 */
export function buildCeloGetCircleParams(circleId: number) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "getCircle" as const,
    args: [BigInt(circleId)],
  };
}

/**
 * Build viem-compatible params for checking if an address is a circle member
 * @param opts Options including circleId and user address
 */
export function buildCeloIsMemberParams(opts: CeloIsMemberOptions) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "isMember" as const,
    args: [BigInt(opts.circleId), opts.user as `0x${string}`],
  };
}

/**
 * Build viem-compatible params for getting the member count of a circle
 * @param circleId The circle ID to query
 */
export function buildCeloGetMemberCountParams(circleId: number) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "getMemberCount" as const,
    args: [BigInt(circleId)],
  };
}

/**
 * Build viem-compatible params for checking if a member has paid in a specific round
 * @param opts Options including circleId, round, and member address
 */
export function buildCeloHasPaidParams(opts: CeloHasPaidOptions) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "hasPaid" as const,
    args: [BigInt(opts.circleId), BigInt(opts.round), opts.member as `0x${string}`],
  };
}

/**
 * Build viem-compatible params for reading the total circle count
 */
export function buildCeloCircleCountParams() {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "circleCount" as const,
    args: [],
  };
}

/**
 * Build viem-compatible params for reading the round balance of a circle
 * @param circleId The circle ID to query
 */
export function buildCeloRoundBalanceParams(circleId: number) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "roundBalance" as const,
    args: [BigInt(circleId)],
  };
}

/**
 * Build viem-compatible params for reading pending withdrawals for an address
 * @param account The address to check for pending withdrawals
 */
export function buildCeloPendingWithdrawalsParams(account: string) {
  return {
    address: SUSUCHAIN_CELO_ADDRESS as `0x${string}`,
    abi: SUSUCHAIN_CELO_ABI,
    functionName: "pendingWithdrawals" as const,
    args: [account as `0x${string}`],
  };
}
