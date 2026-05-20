// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract RevertingRecipient {
    receive() external payable {
        revert("Revert recipient always reverts");
    }
}
