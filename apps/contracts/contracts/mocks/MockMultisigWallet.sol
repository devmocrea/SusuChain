// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockMultisigWallet {
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
    }

    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;
    Transaction[] public transactions;

    // txId => owner => confirmed
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

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

    function submitTransaction(address to, uint256 value, bytes memory data) public returns (uint256) {
        transactions.push(Transaction({
            to: to,
            value: value,
            data: data,
            executed: false
        }));
        return transactions.length - 1;
    }

    function confirmTransaction(uint256 txId) public {
        require(isOwner[msg.sender], "Not owner");
        require(txId < transactions.length, "Transaction does not exist");
        require(!isConfirmed[txId][msg.sender], "Transaction already confirmed");
        isConfirmed[txId][msg.sender] = true;
    }
}
