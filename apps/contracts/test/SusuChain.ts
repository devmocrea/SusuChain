import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";

describe("SusuChain", function () {
  async function deploySusuChainFixture() {
    const [owner, member1, member2, member3, nonMember] = await hre.viem.getWalletClients();
    const susuChain = await hre.viem.deployContract("SusuChain");
    const publicClient = await hre.viem.getPublicClient();

    return {
      susuChain,
      owner,
      member1,
      member2,
      member3,
      nonMember,
      publicClient,
    };
  }

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
  });
});
