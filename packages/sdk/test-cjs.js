const {
  SUSUCHAIN_CELO_ADDRESS,
  SUSUCHAIN_CELO_ABI,
  STACKS_CONTRACT_NAME,
  STACKS_CONTRACT_ADDRESS,
  // Stacks server-side builders
  buildCreateCircleTx,
  buildContributeTx,
  buildTriggerPayoutTx,
  broadcastTx,
  // Stacks read-only builders
  readGetCircle,
  readGetCircleCount,
  readHasMemberPaid,
  readIsMember,
  // Celo param builders
  buildCeloCreateCircleParams,
  buildCeloContributeParams,
  buildCeloWithdrawParams,
  buildCeloGetCircleParams,
  buildCeloIsMemberParams,
  buildCeloGetMemberCountParams,
  buildCeloHasPaidParams,
  buildCeloCircleCountParams,
  buildCeloRoundBalanceParams,
  buildCeloPendingWithdrawalsParams,
} = require("./dist/index.js");

// ── Constants ──

if (SUSUCHAIN_CELO_ADDRESS !== "0x20B421Db767D3496E4489Db5C3122C1fD4625525") {
  throw new Error("Invalid Celo contract address exported in CommonJS module");
}
if (STACKS_CONTRACT_NAME !== "susuchain") {
  throw new Error("Invalid Stacks contract name exported in CommonJS module");
}

// ── ABI Validation ──

const createCircleABI = SUSUCHAIN_CELO_ABI.find(
  (e) => e.name === "createCircle" && e.type === "function"
);
if (!createCircleABI || createCircleABI.inputs.length !== 6) {
  throw new Error(
    `Expected createCircle ABI to have 6 inputs, got ${createCircleABI ? createCircleABI.inputs.length : "not found"}`
  );
}
const withdrawABI = SUSUCHAIN_CELO_ABI.find(
  (e) => e.name === "withdraw" && e.type === "function"
);
if (!withdrawABI) {
  throw new Error("ABI is missing withdraw function");
}

// ── Stacks Server-Side Builders ──

const stacksBuilders = {
  buildCreateCircleTx,
  buildContributeTx,
  buildTriggerPayoutTx,
  broadcastTx,
};

for (const [name, fn] of Object.entries(stacksBuilders)) {
  if (typeof fn !== "function") {
    throw new Error(`Expected ${name} to be a function, got ${typeof fn}`);
  }
}

// ── Stacks Read-Only Builders ──

const stacksReaders = {
  readGetCircle,
  readGetCircleCount,
  readHasMemberPaid,
  readIsMember,
};

for (const [name, fn] of Object.entries(stacksReaders)) {
  if (typeof fn !== "function") {
    throw new Error(`Expected ${name} to be a function, got ${typeof fn}`);
  }
}

// ── Celo Param Builders ──

const celoBuilders = {
  buildCeloCreateCircleParams,
  buildCeloContributeParams,
  buildCeloWithdrawParams,
  buildCeloGetCircleParams,
  buildCeloIsMemberParams,
  buildCeloGetMemberCountParams,
  buildCeloHasPaidParams,
  buildCeloCircleCountParams,
  buildCeloRoundBalanceParams,
  buildCeloPendingWithdrawalsParams,
};

for (const [name, fn] of Object.entries(celoBuilders)) {
  if (typeof fn !== "function") {
    throw new Error(`Expected ${name} to be a function, got ${typeof fn}`);
  }
}

// ── Celo Builder Return Value Validation ──

const createParams = buildCeloCreateCircleParams({
  name: "Test",
  contributionWei: 1000000000000000000n,
  roundDurationDays: 30,
  gracePeriodDays: 3,
  penaltyFee: 0n,
  members: ["0x1234567890123456789012345678901234567890"],
});
if (createParams.functionName !== "createCircle") {
  throw new Error("buildCeloCreateCircleParams returned wrong functionName");
}
if (createParams.args.length !== 6) {
  throw new Error(`buildCeloCreateCircleParams returned ${createParams.args.length} args, expected 6`);
}

const withdrawParams = buildCeloWithdrawParams();
if (withdrawParams.functionName !== "withdraw") {
  throw new Error("buildCeloWithdrawParams returned wrong functionName");
}

const circleCountParams = buildCeloCircleCountParams();
if (circleCountParams.functionName !== "circleCount") {
  throw new Error("buildCeloCircleCountParams returned wrong functionName");
}

const getCircleParams = buildCeloGetCircleParams(0);
if (getCircleParams.functionName !== "getCircle") {
  throw new Error("buildCeloGetCircleParams returned wrong functionName");
}

const hasPaidParams = buildCeloHasPaidParams({
  circleId: 0,
  round: 0,
  member: "0x1234567890123456789012345678901234567890",
});
if (hasPaidParams.functionName !== "hasPaid") {
  throw new Error("buildCeloHasPaidParams returned wrong functionName");
}

console.log("CommonJS exports validated successfully.");
