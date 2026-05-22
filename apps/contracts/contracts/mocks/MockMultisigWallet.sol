// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockMultisigWallet {
    address[] public owners;
    mapping(address => bool) public isOwner;
}
