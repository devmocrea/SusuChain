import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther, encodeFunctionData } from "viem";

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
          2n,
          0n,
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
          2n,
          0n,
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
          2n,
          0n,
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
        2n,
        0n,
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
        2n,
        0n,
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
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, 2n, 0n, members]);
      
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
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, 2n, 0n, members]);
      
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
      await susuChain.write.createCircle(["Susu Circle", parseEther("1"), 30n, 2n, 0n, members]);
      
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
        2n,
        0n,
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
        2n,
        0n,
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
          2n,
          0n,
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
        2n,
        0n,
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
          2n,
          0n,
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
        2n,
        0n,
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

  describe("Smart Contract Wallet and Multisig Integration", function () {
    async function deployMultisigFixture() {
      const { susuChain, owner, member1, member2, member3, publicClient } = await loadFixture(deploySusuChainFixture);
      const ownersList = [
        getAddress(member1.account.address),
        getAddress(member2.account.address),
        getAddress(member3.account.address),
      ];
      const thresholdVal = 2n;

      const mockMultisig = await hre.viem.deployContract("MockMultisigWallet", [
        ownersList,
        thresholdVal,
      ]);

      return {
        susuChain,
        owner,
        member1,
        member2,
        member3,
        publicClient,
        mockMultisig,
        ownersList,
        thresholdVal,
      };
    }

    it("Should correctly deploy MockMultisigWallet with owners and threshold", async function () {
      const { mockMultisig, ownersList, thresholdVal } = await loadFixture(deployMultisigFixture);

      expect(await mockMultisig.read.threshold()).to.equal(thresholdVal);
      expect(await mockMultisig.read.isOwner([ownersList[0]])).to.be.true;
      expect(await mockMultisig.read.isOwner([ownersList[1]])).to.be.true;
      expect(await mockMultisig.read.isOwner([ownersList[2]])).to.be.true;
      expect(await mockMultisig.read.owners([0n])).to.equal(ownersList[0]);
      expect(await mockMultisig.read.owners([1n])).to.equal(ownersList[1]);
      expect(await mockMultisig.read.owners([2n])).to.equal(ownersList[2]);
    });

    it("Should verify mock multisig can successfully create circles", async function () {
      const { susuChain, mockMultisig, member1, member2, publicClient } = await loadFixture(deployMultisigFixture);

      const createCircleData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "createCircle",
        args: [
          "Multisig Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          [getAddress(mockMultisig.address), getAddress(member1.account.address)]
        ]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      const txHash = await multisigAsMember1.write.submitTransaction([
        susuChain.address,
        0n,
        createCircleData
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const confirm1Hash = await multisigAsMember1.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm1Hash });

      const confirm2Hash = await multisigAsMember2.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm2Hash });

      const executeHash = await multisigAsMember1.write.executeTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: executeHash });

      const circle = await susuChain.read.getCircle([0n]);
      expect(circle[0]).to.equal("Multisig Circle");
      expect(circle[1]).to.equal(parseEther("1"));
    });

    it("Should verify mock multisig can be registered as a circle member", async function () {
      const { susuChain, mockMultisig, member1, member2 } = await loadFixture(deployMultisigFixture);

      const members = [
        getAddress(mockMultisig.address),
        getAddress(member1.account.address),
        getAddress(member2.account.address)
      ];

      const susuAsMember1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await susuAsMember1.write.createCircle([
        "Mixed Membership Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members
      ]);

      const circleId = 0n;
      expect(await susuChain.read.isMember([circleId, getAddress(mockMultisig.address)])).to.be.true;
      expect(await susuChain.read.isMember([circleId, getAddress(member1.account.address)])).to.be.true;
      expect(await susuChain.read.getMemberCount([circleId])).to.equal(3n);

      const circle = await susuChain.read.getCircle([circleId]);
    });

    it("Should verify mock multisig can contribute to a savings circle", async function () {
      const { susuChain, mockMultisig, member1, member2, publicClient } = await loadFixture(deployMultisigFixture);

      const members = [
        getAddress(mockMultisig.address),
        getAddress(member1.account.address)
      ];

      const susuAsMember1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await susuAsMember1.write.createCircle([
        "Multisig Contribution Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members
      ]);

      const circleId = 0n;

      const fundTx = await member1.sendTransaction({
        to: getAddress(mockMultisig.address),
        value: parseEther("2")
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });

      const contributeData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "contribute",
        args: [circleId]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      const txHash = await multisigAsMember1.write.submitTransaction([
        susuChain.address,
        parseEther("1"),
        contributeData
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const confirm1Hash = await multisigAsMember1.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm1Hash });

      const confirm2Hash = await multisigAsMember2.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm2Hash });

      const executeHash = await multisigAsMember1.write.executeTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: executeHash });

    });

    it("Should verify mock multisig can receive payouts successfully", async function () {
      const { susuChain, mockMultisig, member1, member2, publicClient } = await loadFixture(deployMultisigFixture);

      const members = [
        getAddress(mockMultisig.address),
        getAddress(member1.account.address)
      ];

      const susuAsMember1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await susuAsMember1.write.createCircle([
        "Multisig Payout Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members
      ]);

      const circleId = 0n;

      const fundTx = await member1.sendTransaction({
        to: getAddress(mockMultisig.address),
        value: parseEther("2")
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });

      const contributeData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "contribute",
        args: [circleId]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      const txHash = await multisigAsMember1.write.submitTransaction([
        susuChain.address,
        parseEther("1"),
        contributeData
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const confirm1Hash = await multisigAsMember1.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm1Hash });

      const confirm2Hash = await multisigAsMember2.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm2Hash });

      const executeHash = await multisigAsMember1.write.executeTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: executeHash });

      const balanceBefore = await publicClient.getBalance({ address: getAddress(mockMultisig.address) });

      const contributeTx = await susuAsMember1.write.contribute([circleId], { value: parseEther("1") });
      await publicClient.waitForTransactionReceipt({ hash: contributeTx });

      const balanceAfter = await publicClient.getBalance({ address: getAddress(mockMultisig.address) });
    });

    it("Should verify rotating payout sequence with mixed EOAs and multisig accounts", async function () {
      const { susuChain, mockMultisig, member1, member2, publicClient } = await loadFixture(deployMultisigFixture);

      const members = [
        getAddress(mockMultisig.address),
        getAddress(member1.account.address),
        getAddress(member2.account.address)
      ];

      const susuAsMember1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );
      const susuAsMember2 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member2 } }
      );

      await susuAsMember1.write.createCircle([
        "Mixed Rotation Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members
      ]);

      const circleId = 0n;

      const fundTx = await member1.sendTransaction({
        to: getAddress(mockMultisig.address),
        value: parseEther("5")
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });

      const contributeData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "contribute",
        args: [circleId]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      // --- ROUND 0 ---
      const initialMultisigBalance = await publicClient.getBalance({ address: getAddress(mockMultisig.address) });

      const txHash0 = await multisigAsMember1.write.submitTransaction([susuChain.address, parseEther("1"), contributeData]);
      await publicClient.waitForTransactionReceipt({ hash: txHash0 });
      await multisigAsMember1.write.confirmTransaction([0n]);
      await multisigAsMember2.write.confirmTransaction([0n]);
      await multisigAsMember1.write.executeTransaction([0n]);

      await susuAsMember1.write.contribute([circleId], { value: parseEther("1") });
      await susuAsMember2.write.contribute([circleId], { value: parseEther("1") });

      const round0MultisigBalance = await publicClient.getBalance({ address: getAddress(mockMultisig.address) });
      expect(round0MultisigBalance - initialMultisigBalance).to.equal(parseEther("2"));

      // --- ROUND 1 ---
      const initialMember1Balance = await publicClient.getBalance({ address: getAddress(member1.account.address) });

      const txHash1 = await multisigAsMember1.write.submitTransaction([susuChain.address, parseEther("1"), contributeData]);
      await publicClient.waitForTransactionReceipt({ hash: txHash1 });
      await multisigAsMember1.write.confirmTransaction([1n]);
      await multisigAsMember2.write.confirmTransaction([1n]);
      await multisigAsMember1.write.executeTransaction([1n]);

      const m1ContributeTx = await susuAsMember1.write.contribute([circleId], { value: parseEther("1") });
      const m1Receipt = await publicClient.waitForTransactionReceipt({ hash: m1ContributeTx });
      const m1ContributeGasUsed = m1Receipt.gasUsed * m1Receipt.effectiveGasPrice;

      await susuAsMember2.write.contribute([circleId], { value: parseEther("1") });

      const round1Member1Balance = await publicClient.getBalance({ address: getAddress(member1.account.address) });
      expect(round1Member1Balance - initialMember1Balance + m1ContributeGasUsed > parseEther("1.9")).to.be.true;

      // --- ROUND 2 ---
      const initialMember2Balance = await publicClient.getBalance({ address: getAddress(member2.account.address) });

      const txHash2 = await multisigAsMember1.write.submitTransaction([susuChain.address, parseEther("1"), contributeData]);
      await publicClient.waitForTransactionReceipt({ hash: txHash2 });
      await multisigAsMember1.write.confirmTransaction([2n]);
      await multisigAsMember2.write.confirmTransaction([2n]);
      await multisigAsMember1.write.executeTransaction([2n]);

      await susuAsMember1.write.contribute([circleId], { value: parseEther("1") });

      const m2ContributeTx = await susuAsMember2.write.contribute([circleId], { value: parseEther("1") });
      const m2Receipt = await publicClient.waitForTransactionReceipt({ hash: m2ContributeTx });
      const m2ContributeGasUsed = m2Receipt.gasUsed * m2Receipt.effectiveGasPrice;

      const round2Member2Balance = await publicClient.getBalance({ address: getAddress(member2.account.address) });
      expect(round2Member2Balance - initialMember2Balance + m2ContributeGasUsed > parseEther("1.9")).to.be.true;

      const circle = await susuChain.read.getCircle([circleId]);
      expect(circle[4]).to.equal(3n);
    });

    it("Should verify multisig reverts on execution failures gracefully", async function () {
      const { susuChain, mockMultisig, member1, member2 } = await loadFixture(deployMultisigFixture);

      const invalidContributeData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "contribute",
        args: [999n]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      await multisigAsMember1.write.submitTransaction([
        susuChain.address,
        0n,
        invalidContributeData
      ]);

      await multisigAsMember1.write.confirmTransaction([0n]);
      await multisigAsMember2.write.confirmTransaction([0n]);

      await expect(
        multisigAsMember1.write.executeTransaction([0n])
      ).to.be.rejectedWith("Transaction call reverted");
    });

    it("Should verify multiple owners requirement for multisig actions", async function () {
      const { susuChain, mockMultisig, member1, member2, publicClient } = await loadFixture(deployMultisigFixture);

      const members = [
        getAddress(mockMultisig.address),
        getAddress(member1.account.address)
      ];

      const susuAsMember1 = await hre.viem.getContractAt(
        "SusuChain",
        susuChain.address,
        { client: { wallet: member1 } }
      );

      await susuAsMember1.write.createCircle([
        "Multisig Threshold Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members
      ]);

      const circleId = 0n;

      const contributeData = encodeFunctionData({
        abi: susuChain.abi,
        functionName: "contribute",
        args: [circleId]
      });

      const multisigAsMember1 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member1 } }
      );
      const multisigAsMember2 = await hre.viem.getContractAt(
        "MockMultisigWallet",
        mockMultisig.address,
        { client: { wallet: member2 } }
      );

      const txHash = await multisigAsMember1.write.submitTransaction([
        susuChain.address,
        parseEther("1"),
        contributeData
      ]);
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      const confirm1Hash = await multisigAsMember1.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm1Hash });

      await expect(
        multisigAsMember1.write.executeTransaction([0n])
      ).to.be.rejectedWith("Threshold not met");

      const fundTx = await member1.sendTransaction({
        to: getAddress(mockMultisig.address),
        value: parseEther("2")
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });

      const confirm2Hash = await multisigAsMember2.write.confirmTransaction([0n]);
      await publicClient.waitForTransactionReceipt({ hash: confirm2Hash });

      await expect(
        multisigAsMember1.write.executeTransaction([0n])
      ).to.be.fulfilled;
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

    it("Should fail to create circle if duplicate members exist at the end", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr, m2Addr];

      await expect(
        susuChain.write.createCircle([
          "Duplicate End Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should fail to create circle if duplicate members exist adjacent in the middle", async function () {
      const { susuChain, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [m1Addr, m2Addr, m2Addr, m3Addr];

      await expect(
        susuChain.write.createCircle([
          "Duplicate Adjacent Middle Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should fail to create circle if duplicate members exist non-adjacent in the array", async function () {
      const { susuChain, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [m1Addr, m2Addr, m3Addr, m1Addr];

      await expect(
        susuChain.write.createCircle([
          "Duplicate Non-Adjacent Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should successfully create circle when members array contains only unique addresses", async function () {
      const { susuChain, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [m1Addr, m2Addr, m3Addr];

      await expect(
        susuChain.write.createCircle([
          "Unique Members Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.fulfilled;
    });

    it("Should fail to create circle with three members containing a duplicate pair", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr, m1Addr];

      await expect(
        susuChain.write.createCircle([
          "Three Members Duplicate Pair Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should fail to create circle with five members containing duplicate owner address", async function () {
      const { susuChain, owner, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const ownerAddr = getAddress(owner.account.address);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [ownerAddr, m1Addr, m2Addr, m3Addr, ownerAddr];

      await expect(
        susuChain.write.createCircle([
          "Five Members Duplicate Owner Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should successfully create circle with zero duplicate members and standard setup containing four members", async function () {
      const { susuChain, owner, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const ownerAddr = getAddress(owner.account.address);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [ownerAddr, m1Addr, m2Addr, m3Addr];

      await expect(
        susuChain.write.createCircle([
          "Four Unique Members Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.fulfilled;
    });

    it("Should fail to create circle if a duplicate address exists in a larger ten member setup", async function () {
      const { susuChain, owner, member1, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const ownerAddr = getAddress(owner.account.address);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);

      const members = [
        ownerAddr,
        m1Addr,
        m2Addr,
        m3Addr,
        getAddress("0x1111111111111111111111111111111111111111"),
        getAddress("0x2222222222222222222222222222222222222222"),
        getAddress("0x3333333333333333333333333333333333333333"),
        m2Addr, // Duplicate of index 2
        getAddress("0x4444444444444444444444444444444444444444"),
        getAddress("0x5555555555555555555555555555555555555555"),
      ];

      await expect(
        susuChain.write.createCircle([
          "Ten Members Duplicate Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          members,
        ])
      ).to.be.rejectedWith("Duplicate member addresses not allowed");
    });

    it("Should emit a CircleCreated event when a circle is successfully created with unique members", async function () {
      const { susuChain, publicClient, owner, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const ownerAddr = getAddress(owner.account.address);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [ownerAddr, m1Addr, m2Addr];

      const hash = await susuChain.write.createCircle([
        "Event Unique Members Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members,
      ]);
      await publicClient.waitForTransactionReceipt({ hash });

      const events = await susuChain.getEvents.CircleCreated();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.creator).to.equal(ownerAddr);
      expect(events[0].args.name).to.equal("Event Unique Members Circle");
    });

    it("Should verify that createCircle state fields are correctly populated with unique members", async function () {
      const { susuChain, owner, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const ownerAddr = getAddress(owner.account.address);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [ownerAddr, m1Addr, m2Addr];

      await susuChain.write.createCircle([
        "State Population Circle",
        parseEther("1"),
        30n,
        2n,
        0n,
        members,
      ]);

      const circleCount = await susuChain.read.circleCount();
      const circleId = circleCount - 1n;

      const circleData = await susuChain.read.getCircle([circleId]);
      expect(circleData[0]).to.equal("State Population Circle");
      expect(circleData[1]).to.equal(parseEther("1"));
      expect(circleData[2]).to.equal(30n * 24n * 60n * 60n);
      expect(circleData[3]).to.have.lengthOf(3);
      expect(getAddress(circleData[3][0])).to.equal(ownerAddr);
      expect(getAddress(circleData[3][1])).to.equal(m1Addr);
      expect(getAddress(circleData[3][2])).to.equal(m2Addr);
      expect(circleData[6]).to.be.true;
    });

    it("Should verify that pause state prevents circle creation regardless of duplicate members", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);

      await susuChain.write.pause();
      expect(await susuChain.read.paused()).to.be.true;

      const duplicateMembers = [m1Addr, m1Addr, m2Addr];
      await expect(
        susuChain.write.createCircle([
          "Paused Duplicate Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          duplicateMembers,
        ])
      ).to.be.rejectedWith("EnforcedPause()");

      const uniqueMembers = [m1Addr, m2Addr];
      await expect(
        susuChain.write.createCircle([
          "Paused Unique Circle",
          parseEther("1"),
          30n,
          2n,
          0n,
          uniqueMembers,
        ])
      ).to.be.rejectedWith("EnforcedPause()");
    });
  });

  describe("Secure EVM Payout Fallback", function () {
    it("Should successfully payout directly to a standard EOA recipient", async function () {
      const { susuChain, member1, member2, publicClient } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr];

      await susuChain.write.createCircle(["Standard Circle", parseEther("1"), 30n, 2n, 0n, members]);

      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });
      await susuM1.write.contribute([0n], { value: parseEther("1") });

      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      const balanceBefore = await publicClient.getBalance({ address: m1Addr });
      const hash = await susuM2.write.contribute([0n], { value: parseEther("1") });
      await publicClient.waitForTransactionReceipt({ hash });

      const balanceAfter = await publicClient.getBalance({ address: m1Addr });
      expect(balanceAfter - balanceBefore).to.equal(parseEther("2"));
      expect(await susuChain.read.pendingWithdrawals([m1Addr])).to.equal(0n);
    });

    it("Should fail payout gracefully for a reverting contract and store it in pendingWithdrawals", async function () {
      const { susuChain, member2 } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [revAddr, m2Addr];

      await susuChain.write.createCircle(["Reverting Payout Circle", parseEther("1"), 30n, 2n, 0n, members]);

      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });

      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      expect(await susuChain.read.pendingWithdrawals([revAddr])).to.equal(parseEther("2"));
    });

    it("Should fail payout gracefully for a gas-guzzling contract and store it in pendingWithdrawals", async function () {
      const { susuChain, member2 } = await loadFixture(deploySusuChainFixture);
      const guzzlerContract = await hre.viem.deployContract("GasGuzzlerRecipient");
      const guzzlerAddr = getAddress(guzzlerContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [guzzlerAddr, m2Addr];

      await susuChain.write.createCircle(["Guzzler Payout Circle", parseEther("1"), 30n, 2n, 0n, members]);

      await guzzlerContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });

      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      expect(await susuChain.read.pendingWithdrawals([guzzlerAddr])).to.equal(parseEther("2"));
    });

    it("Should continue circle round progression when direct payout fails", async function () {
      const { susuChain, member2 } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [revAddr, m2Addr];

      await susuChain.write.createCircle(["Progressing Circle", parseEther("1"), 30n, 2n, 0n, members]);

      // Round 0
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });

      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // Verify progression
      const circleRound0 = await susuChain.read.getCircle([0n]);
      expect(circleRound0[4]).to.equal(1n); // round progresses to 1
      expect(await susuChain.read.roundBalance([0n])).to.equal(0n); // balance reset to 0
      expect(circleRound0[6]).to.be.true; // remains active for next round
    });

    it("Should keep the circle active when direct payout fails in earlier rounds", async function () {
      const { susuChain, member2, member3 } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const m3Addr = getAddress(member3.account.address);
      const members = [revAddr, m2Addr, m3Addr];

      await susuChain.write.createCircle(["Multi-round Circle", parseEther("1"), 30n, 2n, 0n, members]);

      // Round 0
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });
      const susuM3 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member3 } });
      await susuM3.write.contribute([0n], { value: parseEther("1") });

      // Round 0 recipient is revAddr. Payout fails. Verify circle is active.
      let circle = await susuChain.read.getCircle([0n]);
      expect(circle[6]).to.be.true;
      expect(circle[4]).to.equal(1n);

      // Round 1 contribution should be allowed (proves circle is still active)
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      circle = await susuChain.read.getCircle([0n]);
      expect(circle[6]).to.be.true;
    });

    it("Should deactivate the circle when payout fails in the final round", async function () {
      const { susuChain, member2 } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [revAddr, m2Addr]; // 2 rounds total

      await susuChain.write.createCircle(["Deactivating Circle", parseEther("1"), 30n, 2n, 0n, members]);

      // Round 0: Payout to revertingContract (fails)
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // Round 1: Payout to member2 (succeeds)
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // After round 1 completes (currentRound becomes 2 = members.length), circle should be inactive.
      const circle = await susuChain.read.getCircle([0n]);
      expect(circle[4]).to.equal(2n);
      expect(circle[6]).to.be.false;
    });

    it("Should allow user to successfully pull their pending balance via withdraw", async function () {
      const { susuChain, member2, publicClient } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [revAddr, m2Addr];

      await susuChain.write.createCircle(["Pull Circle", parseEther("1"), 30n, 2n, 0n, members]);

      // Trigger failed payout to revertingContract
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      expect(await susuChain.read.pendingWithdrawals([revAddr])).to.equal(parseEther("2"));

      // Set contract to accept transfer and pull balance
      await revertingContract.write.setShouldRevert([false]);
      const balanceBefore = await publicClient.getBalance({ address: revAddr });
      await revertingContract.write.callWithdraw([susuChain.address]);

      const balanceAfter = await publicClient.getBalance({ address: revAddr });
      expect(balanceAfter - balanceBefore).to.equal(parseEther("2"));
      expect(await susuChain.read.pendingWithdrawals([revAddr])).to.equal(0n);
    });

    it("Should reject withdrawals from users with zero pending balance", async function () {
      const { susuChain, member1 } = await loadFixture(deploySusuChainFixture);
      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });

      await expect(
        susuM1.write.withdraw()
      ).to.be.rejectedWith("No pending withdrawal");
    });

    it("Should emit a Withdrawal event upon a successful withdrawal", async function () {
      const { susuChain, member2, publicClient } = await loadFixture(deploySusuChainFixture);
      const revertingContract = await hre.viem.deployContract("RevertingRecipient");
      const revAddr = getAddress(revertingContract.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [revAddr, m2Addr];

      await susuChain.write.createCircle(["Withdrawal Event Circle", parseEther("1"), 30n, 2n, 0n, members]);

      // Trigger failed payout to revertingContract
      await revertingContract.write.callContribute([susuChain.address, 0n], { value: parseEther("1") });
      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      await susuM2.write.contribute([0n], { value: parseEther("1") });

      // Set contract to accept transfer and pull balance
      await revertingContract.write.setShouldRevert([false]);
      const hash = await revertingContract.write.callWithdraw([susuChain.address]);
      await publicClient.waitForTransactionReceipt({ hash });

      const events = await susuChain.getEvents.Withdrawal();
      expect(events).to.have.lengthOf(1);
      expect(getAddress(events[0].args.recipient!)).to.equal(revAddr);
      expect(events[0].args.amount).to.equal(parseEther("2"));
    });
  });

  describe("Late Payment Penalties and Grace Periods", function () {
    it("Should successfully contribute on-time with penalty configurations active", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.createCircle([
        "Penalty Circle",
        parseEther("1"),
        7n,
        2n,
        parseEther("0.5"),
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });
      
      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.fulfilled;
    });

    it("Should successfully contribute within the grace period without charging a penalty", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.createCircle([
        "Penalty Circle",
        parseEther("1"),
        7n,
        2n,
        parseEther("0.5"),
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });
      
      await time.increase(8 * 24 * 60 * 60);

      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.fulfilled;
    });

    it("Should reject contributions after the grace period if the penalty is not included", async function () {
      const { susuChain, member1, member2 } = await loadFixture(deploySusuChainFixture);
      const members = [getAddress(member1.account.address), getAddress(member2.account.address)];

      await susuChain.write.createCircle([
        "Penalty Circle",
        parseEther("1"),
        7n,
        2n,
        parseEther("0.5"),
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });
      
      await time.increase(10 * 24 * 60 * 60);

      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1") })
      ).to.be.rejectedWith("Wrong contribution amount");
    });

    it("Should accept late contributions when penalty is paid and correctly augment the payout pool", async function () {
      const { susuChain, member1, member2, publicClient } = await loadFixture(deploySusuChainFixture);
      const m1Addr = getAddress(member1.account.address);
      const m2Addr = getAddress(member2.account.address);
      const members = [m1Addr, m2Addr];

      await susuChain.write.createCircle([
        "Penalty Circle",
        parseEther("1"),
        7n,
        2n,
        parseEther("0.5"),
        members,
      ]);

      const susuM1 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member1 } });
      const susuM2 = await hre.viem.getContractAt("SusuChain", susuChain.address, { client: { wallet: member2 } });
      
      await time.increase(10 * 24 * 60 * 60);

      await expect(
        susuM1.write.contribute([0n], { value: parseEther("1.5") })
      ).to.be.fulfilled;

      const balanceBefore = await publicClient.getBalance({ address: m1Addr });
      const hash = await susuM2.write.contribute([0n], { value: parseEther("1.5") });
      await publicClient.waitForTransactionReceipt({ hash });

      const balanceAfter = await publicClient.getBalance({ address: m1Addr });
      expect(balanceAfter - balanceBefore).to.equal(parseEther("3"));
    });
  });
});
