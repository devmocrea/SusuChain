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
});
