// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../helpers/Blacklistable.sol";
import "../helpers/Freezeable.sol";

contract MainnetBridge is Blacklistable, Freezeable {
    struct Transaction {
        address receiver;
        uint256 amount;
    }

    mapping(bytes32 => Transaction) public history;

    event Bridge(
        bytes32 indexed txHash,
        address indexed receiver,
        uint256 indexed amount
    );

    modifier notExist(bytes32 txHash) {
        require(history[txHash].amount == 0, "Transaction is already setted.");
        _;
    }

    function bridge(
        bytes32 txHash,
        address receiver,
        uint256 amount
    )
        external
        payable
        isNotFreezed
        notExist(txHash)
        isBlacklisted(receiver)
        onlyOwnerRole(msg.sender)
    {
        history[txHash] = Transaction(receiver, amount);
        _transfer(receiver, amount);
        emit Bridge(txHash, receiver, amount);
    }

    function transfer(
        address receiver,
        uint256 amount
    )
        external
        payable
        isFreezed
        onlyManagerRole(receiver)
        onlyOwnerRole(msg.sender)
    {
        _transfer(receiver, amount);
    }

    function _transfer(address receiver, uint256 amount) internal {
        require(amount > 0, "Amount must be higher than 0.");
        require(receiver != address(0), "Receiver cannot be zero address.");
        (bool sent, ) = payable(receiver).call{value: amount}("");
        require(sent, "Transfer failed.");
    }
}
