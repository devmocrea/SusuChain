import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("SusuChain", function () {
  async function deploySusuChainFixture() {
    const [owner, member1, member2, member3, nonOwner, nonMember] = await hre.viem.getWalletClients();
    const susuChain = await hre.viem.deployContract("SusuChain");
    const publicClient = await hre.viem.getPublicClient();

    return {
      susuChain,
      owner,
      member1,
      member2,
      member3,
      nonOwner,
      nonMember,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should correctly set owner and initial limits", async function () {
      const { susuChain, owner } = await loadFixture(deploySusuChainFixture);

      expect(await susuChain.read.owner()).to.equal(
        getAddress(owner.account.address)
      );
      expect(await susuChain.read.minContributionAmount()).to.equal(parseEther("0.001"));
      expect(await susuChain.read.maxContributionAmount()).to.equal(parseEther("10000"));
    });
  });

  describe("Circle Creation Limits", function () {
    it("Should fail to create circle if contribution is below minimum", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await expect(
        susuChain.write.createCircle([
          "Below Limit Circle",
          parseEther("0.0005"), // Below 0.001 CELO
          30n,
          members,
        ])
      ).to.be.rejectedWith("Contribution too low");
    });

    it("Should fail to create circle if contribution is above maximum", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await expect(
        susuChain.write.createCircle([
          "Above Limit Circle",
          parseEther("10001"), // Above 10,000 CELO
          30n,
          members,
        ])
      ).to.be.rejectedWith("Contribution too high");
    });

    it("Should successfully create circle with valid contribution", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await expect(
        susuChain.write.createCircle([
          "Valid Circle",
          parseEther("10"), // Within range [0.001, 10000]
          30n,
          members,
        ])
      ).to.be.fulfilled;
    });
  });

  describe("Owner Limits Modification", function () {
    it("Should allow the owner to update contribution limits", async function () {
      const { susuChain } = await loadFixture(deploySusuChainFixture);

      await susuChain.write.setContributionLimits([parseEther("0.1"), parseEther("100")]);
      expect(await susuChain.read.minContributionAmount()).to.equal(parseEther("0.1"));
      expect(await susuChain.read.maxContributionAmount()).to.equal(parseEther("100"));
    });

    it("Should reject non-owners from updating contribution limits", async function () {
      const { susuChain, nonOwner } = await loadFixture(deploySusuChainFixture);

      const susuNon = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: nonOwner } }
      );

      await expect(
        susuNon.write.setContributionLimits([parseEther("0.1"), parseEther("100")])
      ).to.be.rejectedWith("Only the owner can call this function");
    });

    it("Should reject invalid bounds (min > max)", async function () {
      const { susuChain } = await loadFixture(deploySusuChainFixture);

      await expect(
        susuChain.write.setContributionLimits([parseEther("10"), parseEther("5")])
      ).to.be.rejectedWith("Min limit must be <= max limit");
    });

    it("Should emit an event when limits are updated", async function () {
      const { susuChain, publicClient } = await loadFixture(deploySusuChainFixture);

      const hash = await susuChain.write.setContributionLimits([parseEther("0.5"), parseEther("50")]);
      await publicClient.waitForTransactionReceipt({ hash });

      const events = await susuChain.getEvents.ContributionLimitsUpdated();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.minAmount).to.equal(parseEther("0.5"));
      expect(events[0].args.maxAmount).to.equal(parseEther("50"));
    });
  });

  describe("Circle Life Cycle and Contributions", function () {
    it("Should successfully create a Susu circle", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);

      const members = [
        getAddress(member1.account.address),
        getAddress(member2.account.address),
      ];

      await susuChain.write.createCircle([
        "Celo Circle",
        parseEther("1"),
        30n,
        members,
      ]);

      const circle = await susuChain.read.getCircle([0n]);
      expect(circle[0]).to.equal("Celo Circle");
      expect(circle[1]).to.equal(parseEther("1"));
      expect(circle[6]).to.be.true; // active
    });

    it("Should accept contributions and trigger payouts", async function () {
      const { susuChain, member1, member2, publicClient } = await loadFixture(
        deploySusuChainFixture
      );

      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr];

      await susuChain.write.createCircle([
        "Susu Circle",
        parseEther("1"),
        30n,
        members,
      ]);

      // Connect as member1 and contribute
      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      await susuM1.write.contribute([0n], { value: parseEther("1") });

      // Connect as member2 and contribute (this completes the round and triggers payout)
      const susuM2 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member2 } }
      );
      
      const balanceBefore = await publicClient.getBalance({ address: m1Addr });
      const hash = await susuM2.write.contribute([0n], { value: parseEther("1") });
      await publicClient.waitForTransactionReceipt({ hash });

      // Recipient for round 0 is members[0 % 2] = member1
      const balanceAfter = await publicClient.getBalance({ address: m1Addr });
      expect(balanceAfter - balanceBefore).to.equal(parseEther("2"));
    });

    it("Should reject contributions from non-members", async function () {
      const { susuChain, member1, member2, nonMember } = await loadFixture(
        deploySusuChainFixture
      );
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, members]);
      
      const susuNon = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: nonMember } }
      );
      await expect(
        susuNon.write.contribute([0n], { value: parseEther("1") })
      ).to.be.rejectedWith("Not a member");
    });

    it("Should reject wrong contribution amounts", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, members]);
      
      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      await expect(
        susuM1.write.contribute([0n], { value: parseEther("0.5") })
      ).to.be.rejectedWith("Wrong contribution amount");
    });

    it("Should reject double payments in the same round", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, members]);
      
      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      await susuM1.write.contribute([0n], { value: parseEther("1") });
      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.rejectedWith("Already paid this round");
    });

    it("Should deactivate the circle when all rounds are completed", async function () {
      const { susuChain, member1, member2 } = await loadFixture(
        deploySusuChainFixture
      );

      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr];

      await susuChain.write.createCircle([
        "Susu Circle",
        parseEther("1"),
        30n,
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      const susuM2 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member2 } }
      );

      // Round 0
      await susuM1.write.contribute([0n], { value: parseEther("1") });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // Circle currentRound should be 1
      let circle = await susuChain.read.getCircle([0n]);
      expect(circle[4]).to.equal(1n);
      expect(circle[6]).to.be.true;

      // Round 1
      await susuM1.write.contribute([0n], { value: parseEther("1") });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // Circle currentRound should be 2 (equals members.length = 2), active should be false
      circle = await susuChain.read.getCircle([0n]);
      expect(circle[4]).to.equal(2n);
      expect(circle[6]).to.be.false;
    });

    it("Should revert contributions to an inactive circle", async function () {
      const { susuChain, member1, member2 } = await loadFixture(
        deploySusuChainFixture
      );

      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr];

      await susuChain.write.createCircle([
        "Susu Circle",
        parseEther("1"),
        30n,
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      const susuM2 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member2 } }
      );

      // Complete all rounds to make circle inactive
      await susuM1.write.contribute([0n], { value: parseEther("1") });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      await susuM1.write.contribute([0n], { value: parseEther("1") });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      const circle = await susuChain.read.getCircle([0n]);
      expect(circle[6]).to.be.false; // Should be inactive

      // Attempting to contribute further should fail
      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.rejectedWith("Circle is not active");
    });
  });

  describe("Emergency Circuit Breaker", function () {
    it("Should start in an unpaused state", async function () {
      const { susuChain } = await loadFixture(deploySusuChainFixture);
      expect(await susuChain.read.paused()).to.be.false;
    });

    it("Should allow the owner to pause the contract", async function () {
      const { susuChain } = await loadFixture(deploySusuChainFixture);
      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;
    });

    it("Should allow the owner to unpause the contract", async function () {
      const { susuChain } = await loadFixture(deploySusuChainFixture);
      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;
      await susuChain.write.unpause();
      expect(await susuChain.read.paused()).to.be.false;
    });

    it("Should reject non-owners from pausing the contract", async function () {
      const { susuChain, nonOwner } = await loadFixture(deploySusuChainFixture);
      const susuNon = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: nonOwner } }
      );
      await expect(
        susuNon.write.pause()
      ).to.be.rejectedWith("Only the owner can call this function");
    });

    it("Should reject non-owners from unpausing the contract", async function () {
      const { susuChain, nonOwner } = await loadFixture(deploySusuChainFixture);
      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      const susuNon = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: nonOwner } }
      );
      await expect(
        susuNon.write.unpause()
      ).to.be.rejectedWith("Only the owner can call this function");
    });

    it("Should block circle creation when paused", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      await expect(
        susuChain.write.createCircle([
          "Circle Under Pause",
          parseEther("1"),
          30n,
          members,
        ])
      ).to.be.rejectedWith("EnforcedPause()");
    });

    it("Should block contributions when paused", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.createCircle([
        "Circle For Contribution Pause Test",
        parseEther("1"),
        30n,
        members,
      ]);

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.rejectedWith("EnforcedPause()");
    });

    it("Should allow circle creation when unpaused", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      await susuChain.write.unpause();
      expect(await susuChain.read.paused()).to.be.false;

      await expect(
        susuChain.write.createCircle([
          "Circle Under Unpause",
          parseEther("1"),
          30n,
          members,
        ])
      ).to.be.fulfilled;
    });

    it("Should allow contributions when unpaused", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.createCircle([
        "Circle For Contribution Unpause Test",
        parseEther("1"),
        30n,
        members,
      ]);

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      await susuChain.write.unpause();
      expect(await susuChain.read.paused()).to.be.false;

      const susuM1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.fulfilled;
    });

    it("Should emit a Paused event when paused", async function () {
      const { susuChain, publicClient, owner } = await loadFixture(deploySusuChainFixture);

      const hash = await susuChain.write.pause();
      await publicClient.waitForTransactionReceipt({ hash });

      const events = await susuChain.getEvents.Paused();
      expect(events).to.have.lengthOf(1);
      expect(getAddress(events[0].args.account!)).to.equal(getAddress(owner.account.address));
    });

    it("Should emit an Unpaused event when unpaused", async function () {
      const { susuChain, publicClient, owner } = await loadFixture(deploySusuChainFixture);

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      const hash = await susuChain.write.unpause();
      await publicClient.waitForTransactionReceipt({ hash });

      const events = await susuChain.getEvents.Unpaused();
      expect(events).to.have.lengthOf(1);
      expect(getAddress(events[0].args.account!)).to.equal(getAddress(owner.account.address));
    });
  });

  describe("Duplicate Member Prevention", function () {
    it("Should fail to create circle if duplicate members exist at the beginning", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m1Addr, m2Addr];

      await expect(
        susuChain.write.createCircle([
          "Duplicate Start Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });
  });
});
