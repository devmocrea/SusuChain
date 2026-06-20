import { STACKS_MAINNET } from "@stacks/network";
import { openContractCall } from "@stacks/connect";
import {
  stringAsciiCV,
  uintCV,
  listCV,
  principalCV,
  AnchorMode,
  PostConditionMode,
  fetchCallReadOnlyFunction,
  cvToJSON,
} from "@stacks/transactions";

export const STACKS_NETWORK = STACKS_MAINNET;

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
    postConditionMode: PostConditionMode.Allow,
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
    postConditionMode: PostConditionMode.Allow,
    onFinish,
    onCancel: () => console.log("trigger-payout cancelled"),
  });
}

export interface StacksCircleDetails {
  name: string;
  contribution: bigint;
  members: string[];
  currentRound: bigint;
  active: boolean;
}

// Query circle details on Stacks
export async function fetchStacksCircle(
  circleId: number,
  senderAddress: string
): Promise<StacksCircleDetails | null> {
  try {
    const response = await fetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACT_ADDRESS,
      contractName: STACKS_CONTRACT_NAME,
      functionName: "get-circle",
      functionArgs: [uintCV(circleId)],
      senderAddress,
      network: STACKS_NETWORK,
    });

    const json = cvToJSON(response);

    // Map CV response parsing
    if (!json || json.type !== 8 || !json.value || json.value.type !== 12) {
      return null;
    }

    const tuple = json.value.value;
    const name = tuple.name.value;
    const contribution = BigInt(tuple.contribution.value);
    const members = tuple.members.value.map((m: any) => m.value);
    const currentRound = BigInt(tuple["current-round"].value);
    const active = tuple.active.value;

    return {
      name,
      contribution,
      members,
      currentRound,
      active,
    };
  } catch (err) {
    console.error("fetchStacksCircle failed:", err);
    throw err;
  }
}

// Query if member paid in Stacks circle for a round
export async function fetchStacksMemberPaid(
  circleId: number,
  round: number,
  member: string,
  senderAddress: string
): Promise<boolean> {
  try {
    const response = await fetchCallReadOnlyFunction({
      contractAddress: STACKS_CONTRACT_ADDRESS,
      contractName: STACKS_CONTRACT_NAME,
      functionName: "has-member-paid",
      functionArgs: [uintCV(circleId), uintCV(round), principalCV(member)],
      senderAddress,
      network: STACKS_NETWORK,
    });

    const json = cvToJSON(response);
    if (!json) return false;
    return json.value === true;
  } catch (err) {
    console.error("fetchStacksMemberPaid failed:", err);
    return false;
  }
}
