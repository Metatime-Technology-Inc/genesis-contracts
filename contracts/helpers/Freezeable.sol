// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "./RolesHandler.sol";

/**
 * @title Freezeable
 * @dev An abstract contract for managing the freeze status of a contract.
 */
abstract contract Freezeable is RolesHandler {
    bool public freezeStatus = true;

    event Freeze(bool indexed status);

    /**
     * @dev Modifier to check if the contract is freezed.
     */
    modifier isFreezed() {
        require(freezeStatus == true, "Contract is freezed.");
        _;
    }

    /**
     * @dev Modifier to check if the contract is not freezed.
     */
    modifier isNotFreezed() {
        require(freezeStatus == false, "Contract is not freezed.");
        _;
    }

    /**
     * @dev Sets the freeze status of the contract.
     * @param status The new freeze status (true for freezed, false for not freezed).
     */
    function setFreeze(bool status) external onlyOwnerRole(msg.sender) {
        freezeStatus = status;
        emit Freeze(status);
    }
}
