// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISusuChain {
    function contribute(uint256 circleId) external payable;
}

contract GasGuzzlerRecipient {
    uint256 public counter;

    receive() external payable {
        for (uint256 i = 0; i < 200; i++) {
            counter += i;
        }
    }

    function callContribute(address susu, uint256 circleId) external payable {
        ISusuChain(susu).contribute{value: msg.value}(circleId);
    }
}
