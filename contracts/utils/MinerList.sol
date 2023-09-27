// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../libs/MinerTypes.sol";

contract MinerList is Context, Initializable, RolesHandler {
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

    function initialize(address rolesAddress) external initializer {
        roles = IRoles(rolesAddress);
    }

    function isMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external view returns (bool) {
        return list[minerAddress][nodeType];
    }

    function addMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(_msgSender()) returns (bool) {
        _addMiner(minerAddress, nodeType);
        return (true);
    }

    function deleteMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(_msgSender()) returns (bool) {
        _deleteMiner(minerAddress, nodeType);
        return (true);
    }

    function _addMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) internal returns (bool) {
        list[minerAddress][nodeType] = true;
        count[nodeType]++;

        emit AddMiner(minerAddress, nodeType);
        return (true);
    }

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
