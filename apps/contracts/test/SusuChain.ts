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
});
