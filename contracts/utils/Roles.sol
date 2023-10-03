// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

/**
 * @title Roles
 * @dev A smart contract for managing roles and permissions.
 */
contract Roles is AccessControl, Initializable {
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");
    bytes32 public constant DEVELOPER_ROLE = keccak256("DEVELOPER_ROLE");

    mapping(uint256 => address) public validatorList;
    uint256 public currentValidatorId;
    uint256 public validatorQueueNumber;

    event PickValidator(address indexed validatorAddress);

    /**
     * @dev Initializes the Roles contract with the initial owner's address.
     * @param ownerAddress The address of the initial owner.
     */
    function initialize(address ownerAddress) external initializer {
        _grantRole(OWNER_ROLE, ownerAddress);
        _setRoleAdmin(MANAGER_ROLE, OWNER_ROLE);
        _setRoleAdmin(VALIDATOR_ROLE, OWNER_ROLE);
        _setRoleAdmin(DEVELOPER_ROLE, OWNER_ROLE);
    }

    function pickValidator()
        external
        onlyRole(VALIDATOR_ROLE)
        returns (address)
    {
        uint256 currentId = currentValidatorId;

        if (currentId - 1 > validatorQueueNumber) {
            validatorQueueNumber = 0;
        }

        currentValidatorId++;
        address pickedValidator = validatorList[currentId];

        emit PickValidator(pickedValidator);

        return pickedValidator;
    }

    function grantRole(
        bytes32 role,
        address account
    ) public virtual override onlyRole(getRoleAdmin(role)) {
        validatorList[currentValidatorId] = account;

        super.grantRole(role, account);

        currentValidatorId++;
    }
}
