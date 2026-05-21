// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";

contract SusuChain is Pausable {

    struct Circle {
        string name;
        uint256 contributionAmount;
        uint256 cycleDuration;
        address[] members;
        uint256 currentRound;
        uint256 lastPayout;
        bool active;
    }

    mapping(uint256 => Circle) public circles;
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public hasPaid;
    mapping(uint256 => uint256) public roundBalance;
    uint256 public circleCount;

    address public owner;
    uint256 public minContributionAmount;
    uint256 public maxContributionAmount;

    event CircleCreated(uint256 indexed circleId, address indexed creator, string name);
    event ContributionMade(uint256 indexed circleId, address indexed contributor, uint256 amount, uint256 round);
    event PayoutSent(uint256 indexed circleId, address indexed recipient, uint256 amount, uint256 round);
    event ContributionLimitsUpdated(uint256 minAmount, uint256 maxAmount);

    constructor() {
        owner = msg.sender;
        minContributionAmount = 0.001 ether;
        maxContributionAmount = 10000 ether;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function");
        _;
    }

    function setContributionLimits(uint256 _minAmount, uint256 _maxAmount) external onlyOwner {
        require(_minAmount <= _maxAmount, "Min limit must be <= max limit");
        minContributionAmount = _minAmount;
        maxContributionAmount = _maxAmount;
        emit ContributionLimitsUpdated(_minAmount, _maxAmount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createCircle(
        string memory name,
        uint256 contributionAmount,
        uint256 cycleDurationDays,
        address[] memory members
    ) external whenNotPaused {
        require(members.length >= 2, "Minimum 2 members required");
        for (uint256 i = 0; i < members.length; i++) {
            for (uint256 j = i + 1; j < members.length; j++) {
                require(members[i] != members[j], "Duplicate member addresses not allowed");
            }
        }
        require(contributionAmount >= minContributionAmount, "Contribution too low");
        require(contributionAmount <= maxContributionAmount, "Contribution too high");
        uint256 id = circleCount++;
        circles[id].name = name;
        circles[id].contributionAmount = contributionAmount;
        circles[id].cycleDuration = cycleDurationDays * 1 days;
        circles[id].members = members;
        circles[id].currentRound = 0;
        circles[id].lastPayout = block.timestamp;
        circles[id].active = true;
        emit CircleCreated(id, msg.sender, name);
    }

    function contribute(uint256 circleId) external payable whenNotPaused {
        Circle storage circle = circles[circleId];
        // Ensure the circle is active and accepting contributions
        require(circle.active, "Circle is not active");
        
        // MiniPay Gas Estimation Bypass:
        // MiniPay's fee abstraction proxy often strips msg.value during eth_estimateGas.
        // We return early if msg.value is 0 so the simulation succeeds without reverting.
        // This is safe because state changes are not reached.
        if (msg.value == 0) {
            return;
        }

        require(msg.value == circle.contributionAmount, "Wrong contribution amount");
        bool memberFound = false;
        for (uint256 i = 0; i < circle.members.length; i++) {
            if (circle.members[i] == msg.sender) { memberFound = true; break; }
        }
        require(memberFound, "Not a member");
        require(!hasPaid[circleId][circle.currentRound][msg.sender], "Already paid this round");
        hasPaid[circleId][circle.currentRound][msg.sender] = true;
        roundBalance[circleId] += msg.value;
        emit ContributionMade(circleId, msg.sender, msg.value, circle.currentRound);
        bool allPaid = true;
        for (uint256 i = 0; i < circle.members.length; i++) {
            if (!hasPaid[circleId][circle.currentRound][circle.members[i]]) {
                allPaid = false; break;
            }
        }
        if (allPaid) { _triggerPayout(circleId); }
    }

    function _triggerPayout(uint256 circleId) internal {
        Circle storage circle = circles[circleId];
        uint256 round = circle.currentRound;
        address recipient = circle.members[round % circle.members.length];
        uint256 amount = roundBalance[circleId];
        roundBalance[circleId] = 0;
        circle.currentRound++;
        circle.lastPayout = block.timestamp;
        if (circle.currentRound == circle.members.length) { circle.active = false; }
        (bool sent, ) = recipient.call{value: amount}("");
        require(sent, "Payout failed");
        emit PayoutSent(circleId, recipient, amount, round);
    }

    function getCircle(uint256 circleId) external view returns (
        string memory name,
        uint256 contributionAmount,
        uint256 cycleDuration,
        address[] memory members,
        uint256 currentRound,
        uint256 lastPayout,
        bool active
    ) {
        Circle storage c = circles[circleId];
        return (c.name, c.contributionAmount, c.cycleDuration, c.members,
                c.currentRound, c.lastPayout, c.active);
    }

    function isMember(uint256 circleId, address user) external view returns (bool) {
        Circle storage circle = circles[circleId];
        for (uint256 i = 0; i < circle.members.length; i++) {
            if (circle.members[i] == user) return true;
        }
        return false;
    }

    function getMemberCount(uint256 circleId) external view returns (uint256) {
        return circles[circleId].members.length;
    }
}
