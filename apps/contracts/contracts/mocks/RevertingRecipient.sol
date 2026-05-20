// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ISusuChain {
    function contribute(uint256 circleId) external payable;
}

contract RevertingRecipient {
    bool public shouldRevert = true;

    receive() external payable {
        if (shouldRevert) {
            revert("Revert recipient always reverts");
        }
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function callContribute(address susu, uint256 circleId) external payable {
        ISusuChain(susu).contribute{value: msg.value}(circleId);
    }

    function callWithdraw(address susu) external {
        ISusuChain(susu).withdraw();
    }
}
