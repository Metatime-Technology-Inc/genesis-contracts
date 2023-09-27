// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/MinerTypes.sol";

import "../interfaces/IMinerHealthCheck.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerList.sol";

contract MicroMiner is Context, Initializable {
    uint256 public constant STAKE_AMOUNT = 100 ether;

    IMinerHealthCheck public minerHealthCheck;
    IMetaPoints public metapoints;
    IMinerList public minerList;

    // REMINDER: Use with kickMiner if needed
    modifier isMiner(address miner) {
        require(
            minerList.isMiner(miner, MinerTypes.NodeType.Micro),
            "Address is not macrominer."
        );
        _;
    }

    modifier notMiner(address miner) {
        require(
            !minerList.isMiner(miner, MinerTypes.NodeType.Micro),
            "Address is already macrominer."
        );
        _;
    }

    receive() external payable {}

    function initialize(
        address minerHealthCheckAddress,
        address metapointsAddress,
        address minerListAddress
    ) external initializer {
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
        metapoints = IMetaPoints(metapointsAddress);
        minerList = IMinerList(minerListAddress);
    }

    function setMiner() external payable notMiner(_msgSender()) returns (bool) {
        require(
            msg.value == STAKE_AMOUNT,
            "You have to stake as required STAKE_AMOUNT."
        );
        minerList.addMiner(_msgSender(), MinerTypes.NodeType.Micro);
        return (true);
    }

    // This method will be usable by TxValidator
    function _kickMiner(address minerAddress) internal returns (bool) {
        minerList.deleteMiner(minerAddress, MinerTypes.NodeType.Micro);
        (bool sent, ) = payable(minerAddress).call{value: STAKE_AMOUNT}("");

        require(sent, "Unstake failed.");
        return (true);
    }
}
