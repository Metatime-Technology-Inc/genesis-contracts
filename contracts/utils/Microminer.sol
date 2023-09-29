// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/MinerTypes.sol";

import "../interfaces/IMinerHealthCheck.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerList.sol";
import "../helpers/RolesHandler.sol";

/**
 * @title MicroMiner
 * @dev A smart contract for managing MicroMiners.
 */
contract MicroMiner is Initializable, RolesHandler {
    uint256 public constant STAKE_AMOUNT = 100 ether;

    IMinerHealthCheck public minerHealthCheck;
    IMetaPoints public metapoints;
    IMinerList public minerList;

    /**
     * @dev Modifier to check if an address is a MicroMiner.
     * @param miner The address to check.
     */
    modifier isMiner(address miner) {
        require(
            minerList.isMiner(miner, MinerTypes.NodeType.Micro),
            "MicroMiner: Address is not microminer"
        );
        _;
    }

    /**
     * @dev Modifier to check if an address is not a MicroMiner.
     * @param miner The address to check.
     */
    modifier notMiner(address miner) {
        require(
            !minerList.isMiner(miner, MinerTypes.NodeType.Micro),
            "MicroMiner: Address is already microminer"
        );
        _;
    }

    receive() external payable {}

    /**
     * @dev Initializes the MicroMiner contract with required addresses.
     * @param minerHealthCheckAddress The address of the MinerHealthCheck contract.
     * @param metapointsAddress The address of the MetaPoints contract.
     * @param minerListAddress The address of the MinerList contract.
     */
    function initialize(
        address minerHealthCheckAddress,
        address metapointsAddress,
        address minerListAddress
    ) external initializer {
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
        metapoints = IMetaPoints(metapointsAddress);
        minerList = IMinerList(minerListAddress);
    }

    /**
     * @dev Sets an address as a MicroMiner.
     * @return A boolean indicating whether the operation was successful.
     */
    function setMiner() external payable notMiner(msg.sender) returns (bool) {
        require(
            msg.value == STAKE_AMOUNT,
            "MicroMiner: You have to stake as required STAKE_AMOUNT"
        );
        minerList.addMiner(msg.sender, MinerTypes.NodeType.Micro);
        return (true);
    }

    /**
     * @dev Allows a manager to kick a MicroMiner and refund the staked amount.
     * @param minerAddress The address of the MicroMiner to kick.
     * @return A boolean indicating whether the operation was successful.
     */
    function kickMiner(
        address minerAddress
    )
        external
        isMiner(minerAddress)
        onlyManagerRole(msg.sender)
        returns (bool)
    {
        _kickMiner(minerAddress);
        return (true);
    }

    /**
     * @dev Internal function to kick a MicroMiner and refund the staked amount.
     * @param minerAddress The address of the MicroMiner to kick.
     * @return A boolean indicating whether the operation was successful.
     */
    function _kickMiner(address minerAddress) internal returns (bool) {
        minerList.deleteMiner(minerAddress, MinerTypes.NodeType.Micro);
        (bool sent, ) = payable(minerAddress).call{value: STAKE_AMOUNT}("");

        require(sent, "MicroMiner: Unstake failed");
        return (true);
    }
}
