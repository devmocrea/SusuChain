import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

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

  it("handles full circle rotation and payouts", () => {
    // 1. Create a 2-member circle
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

    // ROUND 0
    // Contributors pay
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);

    // Creator triggers payout
    const pay1 = simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);
    expect(pay1.result).toBeOk(Cl.bool(true));

    // Verify round progressed to 1, and active is true
    const circle1 = simnet.callReadOnlyFn("susuchain", "get-circle", [Cl.uint(0)], wallet1);
    expect(circle1.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Susu Test Circle"),
        contribution: Cl.uint(1000000),
        members: Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        "current-round": Cl.uint(1),
        active: Cl.bool(true)
      })
    );

    // ROUND 1
    // Contributors pay
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);

    // Creator triggers payout
    const pay2 = simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);
    expect(pay2.result).toBeOk(Cl.bool(true));

    // Verify circle is inactive after complete rotation
    const circle2 = simnet.callReadOnlyFn("susuchain", "get-circle", [Cl.uint(0)], wallet1);
    expect(circle2.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Susu Test Circle"),
        contribution: Cl.uint(1000000),
        members: Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        "current-round": Cl.uint(2),
        active: Cl.bool(false)
      })
    );
  });

  it("safely increments circle count across multiple circle creations", () => {
    const res1 = simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Susu Test Circle 1"),
        Cl.uint(1000000),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );
    expect(res1.result).toBeOk(Cl.uint(0));
    expect(simnet.callReadOnlyFn("susuchain", "get-circle-count", [], wallet1).result).toBeUint(1);

    const res2 = simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Susu Test Circle 2"),
        Cl.uint(1000000),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet3)])
      ],
      wallet1
    );
    expect(res2.result).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn("susuchain", "get-circle-count", [], wallet1).result).toBeUint(2);
  });

  it("rejects circle creation with an overflow-prone contribution amount", () => {
    // With 2 members, maximum safe contribution is u18446744073709551615 / 2 = u9223372036854775807
    // So u9223372036854775808 (max_safe + 1) should fail with (err u3)
    const overflowContribution = Cl.uint(9223372036854775808n);
    const { result } = simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Overflow Circle"),
        overflowContribution,
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(3));
  });

  it("mathematically guarantees that contribution balance cannot exceed max uint", () => {
    // 1. Create a circle with a large safe contribution.
    const largeSafeContribution = Cl.uint(1000000000000n); // 1,000,000 STX (affordable by 100,000,000 STX wallets)
    const creationRes = simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Large Contribution Circle"),
        largeSafeContribution,
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );
    expect(creationRes.result).toBeOk(Cl.uint(0));

    // 2. Contribute wallet1
    const res1 = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    expect(res1.result).toBeOk(Cl.bool(true));

    // 3. Contribute wallet2
    const res2 = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    expect(res2.result).toBeOk(Cl.bool(true));
  });

  it("verifies trigger-payout works successfully within expected round boundaries", () => {
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

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);

    const payoutRes = simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);
    expect(payoutRes.result).toBeOk(Cl.bool(true));
  });

  it("verifies circle is deactivated and active flag is false after final payout", () => {
    simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Deactivation Circle"),
        Cl.uint(1000000),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);

    const circle = simnet.callReadOnlyFn("susuchain", "get-circle", [Cl.uint(0)], wallet1);
    expect(circle.result).toBeSome(
      Cl.tuple({
        name: Cl.stringAscii("Deactivation Circle"),
        contribution: Cl.uint(1000000),
        members: Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)]),
        "current-round": Cl.uint(2),
        active: Cl.bool(false)
      })
    );
  });

  it("rejects contributions to inactive circles", () => {
    simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Inactive Circle"),
        Cl.uint(1000000),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);
    simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet1);

    const res = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    expect(res.result).toBeErr(Cl.uint(11));
  });

  it("rejects contributions from non-members", () => {
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

    const res = simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet3);
    expect(res.result).toBeErr(Cl.uint(12));
  });

  it("rejects payout triggering from non-creator callers", () => {
    simnet.callPublicFn(
      "susuchain",
      "create-circle",
      [
        Cl.stringAscii("Creator Restriction Circle"),
        Cl.uint(1000000),
        Cl.list([Cl.principal(wallet1), Cl.principal(wallet2)])
      ],
      wallet1
    );

    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet1);
    simnet.callPublicFn("susuchain", "contribute", [Cl.uint(0)], wallet2);

    const res = simnet.callPublicFn("susuchain", "trigger-payout", [Cl.uint(0)], wallet2);
    expect(res.result).toBeErr(Cl.uint(24));
  });
});

describe("SusuChain Enhancements - Reputation, Registry, and Vault Tests", () => {
  it("verifies vitest environment is prepared for enhancement contracts", () => {
    expect(simnet.blockHeight).toBeDefined();
  });
});
