import { StacksMainnet } from "@stacks/network";
import {
  openContractCall,
} from "@stacks/connect";
import {
  stringAsciiCV,
  uintCV,
  listCV,
  principalCV,
  AnchorMode,
} from "@stacks/transactions";

export const STACKS_NETWORK = new StacksMainnet();

export const STACKS_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STACKS_CONTRACT_ADDRESS ?? "";

export const STACKS_CONTRACT_NAME =
  process.env.NEXT_PUBLIC_STACKS_CONTRACT_NAME ?? "susuchain";

// Open Leather wallet to call create-circle
// contributionMicroSTX: amount in microSTX (1 STX = 1_000_000 microSTX)
// members: array of Stacks SP... principal strings (max 10)
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

// Open Leather wallet to call contribute
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
    onFinish,
    onCancel: () => console.log("contribute cancelled"),
  });
}

// Open Leather wallet to call trigger-payout
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
    onFinish,
    onCancel: () => console.log("trigger-payout cancelled"),
  });
}
