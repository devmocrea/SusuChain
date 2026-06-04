import SusuChainJSON from "./abi.json";

// Celo exports
export const SUSUCHAIN_CELO_ABI = SusuChainJSON.abi;
export const SUSUCHAIN_CELO_ADDRESS = "0x20B421Db767D3496E4489Db5C3122C1fD4625525";

// Stacks exports
export const STACKS_CONTRACT_ADDRESS = "SP2T02XBVN9RAZ4360DSWF3JCG79B1QY2NR21RB0Q";
export const STACKS_CONTRACT_NAME = "susuchain";

// Re-export Stacks network helpers
import { STACKS_MAINNET } from "@stacks/network";
export const STACKS_NETWORK = STACKS_MAINNET;

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
} from "@stacks/transactions";
import type { StacksTransactionWire, TxBroadcastResult } from "@stacks/transactions";

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

export async function buildCreateCircleTx(opts: {
  senderKey: string;
  name: string;
  contributionMicroSTX: number;
  members: string[];
  fee?: number;
  nonce?: number;
}): Promise<StacksTransactionWire> {
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
    anchorMode: AnchorMode.Any,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

export async function buildContributeTx(opts: {
  senderKey: string;
  circleId: number;
  fee?: number;
  nonce?: number;
}): Promise<StacksTransactionWire> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "contribute",
    functionArgs: [uintCV(opts.circleId)],
    senderKey: opts.senderKey,
    network: STACKS_NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

export async function buildTriggerPayoutTx(opts: {
  senderKey: string;
  circleId: number;
  fee?: number;
  nonce?: number;
}): Promise<StacksTransactionWire> {
  const tx = await makeContractCall({
    contractAddress: STACKS_CONTRACT_ADDRESS,
    contractName: STACKS_CONTRACT_NAME,
    functionName: "trigger-payout",
    functionArgs: [uintCV(opts.circleId)],
    senderKey: opts.senderKey,
    network: STACKS_NETWORK,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
    fee: opts.fee,
    nonce: opts.nonce,
  });
  return tx;
}

export async function broadcastTx(opts: {
  transaction: StacksTransactionWire;
}): Promise<TxBroadcastResult> {
  const result = await broadcastTransaction({
    transaction: opts.transaction,
    network: STACKS_NETWORK,
  });
  return result;
}

