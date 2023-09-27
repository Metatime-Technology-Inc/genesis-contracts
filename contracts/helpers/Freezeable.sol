// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./RolesHandler.sol";

abstract contract Freezeable is RolesHandler {
    bool public freezeStatus = true;

    event Freeze(bool indexed status);

    modifier isFreezed() {
        require(freezeStatus == true, "Contract is freezed.");
        _;
    }

    modifier isNotFreezed() {
        require(freezeStatus == false, "Contract is not freezed.");
        _;
    }

    function setFreeze(bool status) external onlyOwnerRole(msg.sender) {
        freezeStatus = status;
        emit Freeze(status);
    }
}
