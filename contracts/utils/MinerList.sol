// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../interfaces/IMinerHealthCheck.sol";
import "../helpers/RolesHandler.sol";
import "../libs/MinerTypes.sol";

/**
 * @title MinerList
 * @dev A smart contract for managing a list of miners.
 */
contract MinerList is Initializable, RolesHandler {
    IMinerHealthCheck public minerHealthCheck;
    mapping(address => mapping(MinerTypes.NodeType => bool)) public list;
    mapping(MinerTypes.NodeType => uint256) public count;

    event AddMiner(
        address indexed minerAddress,
        MinerTypes.NodeType indexed nodeType
    );
    event DeleteMiner(
        address indexed minerAddress,
        MinerTypes.NodeType indexed nodeType
    );

    /**
     * @dev Initializes the MinerList contract with the address of the RolesHandler contract.
     * @param rolesAddress The address of the RolesHandler contract.
     */
    function initialize(
        address rolesAddress,
        address minerHealthCheckAddress
    ) external initializer {
        roles = IRoles(rolesAddress);
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
    }

    /**
     * @dev Checks if an address is a miner of the specified node type.
     * @param minerAddress The address to check.
     * @param nodeType The type of miner node to check.
     * @return A boolean indicating whether the address is a miner.
     */
    function isMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external view returns (bool) {
        return list[minerAddress][nodeType];
    }

    /**
     * @dev Adds an address as a miner of the specified node type.
     * @param minerAddress The address to add as a miner.
     * @param nodeType The type of miner node to add.
     * @return A boolean indicating whether the operation was successful.
     */
    function addMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(msg.sender) returns (bool) {
        _addMiner(minerAddress, nodeType);
        return (true);
    }

    /**
     * @dev Deletes an address from the list of miners of the specified node type.
     * @param minerAddress The address to delete from the list of miners.
     * @param nodeType The type of miner node to delete from.
     * @return A boolean indicating whether the operation was successful.
     */
    function deleteMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(msg.sender) returns (bool) {
        _deleteMiner(minerAddress, nodeType);
        return (true);
    }

    /**
     * @dev Internal function to add an address as a miner of the specified node type.
     * @param minerAddress The address to add as a miner.
     * @param nodeType The type of miner node to add.
     * @return A boolean indicating whether the operation was successful.
     */
    function _addMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) internal returns (bool) {
        list[minerAddress][nodeType] = true;
        count[nodeType]++;
        minerHealthCheck.manuelPing(minerAddress, nodeType);

        emit AddMiner(minerAddress, nodeType);
        return (true);
    }

    /**
     * @dev Internal function to delete an address from the list of miners of the specified node type.
     * @param minerAddress The address to delete from the list of miners.
     * @param nodeType The type of miner node to delete from.
     * @return A boolean indicating whether the operation was successful.
     */
    function _deleteMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) internal returns (bool) {
        delete list[minerAddress][nodeType];
        count[nodeType]--;

        emit DeleteMiner(minerAddress, nodeType);
        return (true);
    }
}
