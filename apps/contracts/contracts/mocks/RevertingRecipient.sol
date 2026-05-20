// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISusuChain {
    function contribute(uint256 circleId) external payable;
}

contract RevertingRecipient {
    receive() external payable {
        revert("Revert recipient always reverts");
    }

    function callContribute(address susu, uint256 circleId) external payable {
        ISusuChain(susu).contribute{value: msg.value}(circleId);
    }
}
