// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GasGuzzlerRecipient {
    uint256 public counter;

    receive() external payable {
        for (uint256 i = 0; i < 200; i++) {
            counter += i;
        }
    }
}
