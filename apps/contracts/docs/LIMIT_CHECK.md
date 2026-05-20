# Dynamic Contribution Limits Flow

This document details the architectural design and mitigation strategy implemented to establish dynamic minimum and maximum bounds during the Susu circle creation lifecycle on the Celo network.

## The Objective
To prevent abuse, protect users, and shield the protocol from spamming circles with dust values or dangerously high values, we introduced owner-configurable contribution thresholds.

## The Solution

1. **State variables**:
   ```solidity
   address public owner;
   uint256 public minContributionAmount;
   uint256 public maxContributionAmount;
   ```

2. **Access-controlled setting**:
   - Initialized variables inside constructor with default bounds: min = 0.001 CELO, max = 10,000 CELO.
   - Designed access control modifier `onlyOwner`.
   - Exposed admin setter function `setContributionLimits(uint256, uint256)` enabling dynamic modification and emitting `ContributionLimitsUpdated`.

3. **Validation logic during Circle creation**:
   ```solidity
   require(contributionAmount >= minContributionAmount, "Contribution too low");
   require(contributionAmount <= maxContributionAmount, "Contribution too high");
   ```

## Unit Testing
The Hardhat/Viem test suite verifies:
- Initialization of variables and contract owner.
- Correct rejection for below-min and above-max bounds during circle creation.
- Strict owner verification during limits modification.
- Rejection of invalid limits definition (min > max).
- Automated event validation for updating limits.
