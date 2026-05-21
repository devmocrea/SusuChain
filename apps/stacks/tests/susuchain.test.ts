import { describe, expect, it } from "vitest";
import { Cl } from "@hirosystems/clarinet-sdk";

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

  it("successfully creates a circle", () => {
    const { result } = simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Susu Test Circle"),
        Cl.uint(1000000), // 1 STX
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(0));
  });

  it("allows standard circle contributions", () => {
    simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Susu Test Circle"),
        Cl.uint(1000000), // 1 STX
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );

    const res1 = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    expect(res1.result).toBeOk(Cl.bool(true));

    const res2 = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    expect(res2.result).toBeOk(Cl.bool(true));
  });
});
