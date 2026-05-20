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
});
