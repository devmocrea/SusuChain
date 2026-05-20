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
});
