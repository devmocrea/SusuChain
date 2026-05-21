import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("susuchain tests", () => {
  it("verifies vitest environment is ready", () => {
    expect(simnet.blockHeight).toBeDefined();
  });

  it("verifies contract deployment and initial circle count", () => {
    const { result } = simnet.callReadOnlyFn("susuchain", "get-circle-count", [], wallet1);
    expect(result).toBeUint(0);
  });
});
