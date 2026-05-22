// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockMultisigWallet {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;

    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Owners required");
        require(_threshold > 0 && _threshold <= _owners.length, "Invalid threshold");
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            isOwner[owner] = true;
            owners.push(owner);
        }
        threshold = _threshold;
    }
}
