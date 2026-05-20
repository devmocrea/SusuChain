# Active Circle Verification Flow

This document details the mitigation strategy implemented to prevent locked funds inside completed or manual-deactivated SusuChain savings circles on the Celo network.

## The Issue
Previously, the `contribute` function inside `SusuChain.sol` did not verify the lifecycle state of the target circle (`circle.active`). If all payout rounds of a circle were finished, or if it had been manually closed, users could still make `payable` calls and lock up their Celo coins, rendering them unrecoverable.

## The Solution
We added a strict validation check at the top of the contribution execution path:
```solidity
Circle storage circle = circles[circleId];
// Ensure the circle is active and accepting contributions
require(circle.active, "Circle is not active");
```

## Validation & Verification
A comprehensive Hardhat + Viem unit test suite was written inside `test/SusuChain.ts` mapping:
1. Successful circle instantiation.
2. Orderly contribution rounds and payout logic.
3. Deactivation checks once currentRound reaches members size.
4. Validation that contributions to an inactive circle reject with `Circle is not active`.
