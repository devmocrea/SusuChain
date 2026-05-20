# Emergency Circuit Breaker Flow

This document details the architectural design and mitigation strategy implemented to establish an emergency pause mechanism (circuit breaker) within the Susu circle lifecycle on the Celo network.

## The Objective
To protect user funds in the event of an identified vulnerability or protocol exploit, we introduce an emergency stop mechanism that allows the owner/deployer of the contract to halt state-changing user functions.

## The Solution

1. **Inheriting OpenZeppelin Pausable**:
   - Import `@openzeppelin/contracts/utils/Pausable.sol`.
   - Inherit `Pausable` in the `SusuChain` contract.

2. **Access Control (Owner Pause/Unpause)**:
   - Restrict state transitions for pause and unpause functions to the contract owner (`onlyOwner` modifier).
   ```solidity
   function pause() external onlyOwner {
       _pause();
   }

   function unpause() external onlyOwner {
       _unpause();
   }
   ```

3. **Restricting Operations when Paused**:
   - Add the `whenNotPaused` modifier to the following critical operations:
     - `createCircle`: Restricts new circle creation when paused.
     - `contribute`: Restricts new contributions when paused.

4. **Preserved Functionality**:
   - Internal helper routines and view functions remain accessible to ensure that active data and pending withdrawals can still be processed if required.

## Unit Testing
The Hardhat/Viem test suite verifies:
- Initialization of variables and contract pause state.
- Pausing/unpausing operations by the owner.
- Correct rejection of pause/unpause actions triggered by non-owners.
- Failure of `createCircle` and `contribute` when paused.
- Success of `createCircle` and `contribute` when unpaused.
- Proper event emission validation for `Paused` and `Unpaused`.
