// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IRoles.sol";

/**
 * @title RolesHandler
 * @dev An abstract contract for handling roles and permissions.
 */
abstract contract RolesHandler {
    IRoles public roles = IRoles(0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5);

    /**
     * @dev Modifier to check if an address has the owner role.
     * @param account The address to check.
     */
    modifier onlyOwnerRole(address account) {
        require(
            roles.hasRole(roles.OWNER_ROLE(), account),
            "Owner role is needed for this action."
        );
        _;
    }

    /**
     * @dev Modifier to check if an address has the manager role.
     * @param account The address to check.
     */
    modifier onlyManagerRole(address account) {
        require(
            roles.hasRole(roles.MANAGER_ROLE(), account),
            "Manager role is needed for this action."
        );
        _;
    }

    /**
     * @dev Modifier to check if an address has the validator role.
     * @param account The address to check.
     */
    modifier onlyValidatorRole(address account) {
        require(
            roles.hasRole(roles.VALIDATOR_ROLE(), account),
            "Validator role is needed for this action."
        );
        _;
    }

    /**
     * @dev Modifier to check if an address has the developer role.
     * @param account The address to check.
     */
    modifier onlyDeveloperRole(address account) {
        require(
            roles.hasRole(roles.DEVELOPER_ROLE(), account),
            "Developer role is needed for this action."
        );
        _;
    }
}
