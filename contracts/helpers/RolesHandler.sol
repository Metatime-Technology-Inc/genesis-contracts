// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IRoles.sol";

abstract contract RolesHandler {
    IRoles public roles = IRoles(0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5);

    modifier onlyOwnerRole(address account) {
        require(
            roles.hasRole(roles.OWNER_ROLE(), account),
            "Owner role is needed for this action."
        );
        _;
    }

    modifier onlyManagerRole(address account) {
        require(
            roles.hasRole(roles.MANAGER_ROLE(), account),
            "Manager role is needed for this action."
        );
        _;
    }

    modifier onlyValidatorRole(address account) {
        require(
            roles.hasRole(roles.VALIDATOR_ROLE(), account),
            "Validator role is needed for this action."
        );
        _;
    }

    modifier onlyDeveloperRole(address account) {
        require(
            roles.hasRole(roles.DEVELOPER_ROLE(), account),
            "Developer role is needed for this action."
        );
        _;
    }
}
