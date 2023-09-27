// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./RolesHandler.sol";

abstract contract Blacklistable is RolesHandler {
    mapping(address => bool) public blacklist;

    event Blacklist(address indexed wallet, bool indexed status);

    modifier isBlacklisted(address wallet) {
        require(blacklist[wallet] == false, "Wallet is blacklisted.");
        _;
    }

    function setBlacklist(
        address wallet,
        bool status
    ) public virtual onlyOwnerRole(msg.sender) {
        blacklist[wallet] = status;
        emit Blacklist(wallet, status);
    }
}
