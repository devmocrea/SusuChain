import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("SusuChain Dynamic Limits", function () {
  async function deploySusuChainFixture() {
    const [owner, member1, member2, nonOwner] = await hre.viem.getWalletClients();
    const susuChain = await hre.viem.deployContract("SusuChain");
    const publicClient = await hre.viem.getPublicClient();

    return {
      susuChain,
      owner,
      member1,
      member2,
      nonOwner,
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
});
