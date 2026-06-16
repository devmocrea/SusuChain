import {
  SUSUCHAIN_CELO_ADDRESS,
  STACKS_CONTRACT_NAME,
  buildCreateCircleTx,
  buildContributeTx,
  buildTriggerPayoutTx,
  broadcastTx,
  buildCeloCreateCircleParams,
  buildCeloContributeParams,
} from "./dist/index.mjs";

if (SUSUCHAIN_CELO_ADDRESS !== "0x20B421Db767D3496E4489Db5C3122C1fD4625525") {
  throw new Error("Invalid Celo contract address exported in ES Module");
}
if (STACKS_CONTRACT_NAME !== "susuchain") {
  throw new Error("Invalid Stacks contract name exported in ES Module");
}

const builders = {
  buildCreateCircleTx,
  buildContributeTx,
  buildTriggerPayoutTx,
  broadcastTx,
  buildCeloCreateCircleParams,
  buildCeloContributeParams,
};

for (const [name, fn] of Object.entries(builders)) {
  if (typeof fn !== "function") {
    throw new Error(`Expected ${name} to be a function, got ${typeof fn}`);
  }
}

console.log("ES Module exports validated successfully.");
