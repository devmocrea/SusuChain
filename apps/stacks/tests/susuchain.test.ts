import { describe, expect, it } from "vitest";

const accounts = simnet.getAccounts();
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

describe("susuchain tests", () => {
  it("verifies vitest environment is ready", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});
