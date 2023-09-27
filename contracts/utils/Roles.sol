// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract Roles is AccessControl, Initializable {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    function initialize(address ownerAddress) external initializer {
        _grantRole(OWNER_ROLE, ownerAddress);
        _setRoleAdmin(MANAGER_ROLE, OWNER_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, OWNER_ROLE);
        _setRoleAdmin(DEVELOPER_ROLE, OWNER_ROLE);
    }
}
