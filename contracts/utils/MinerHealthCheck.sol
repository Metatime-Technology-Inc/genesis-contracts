// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../libs/MinerTypes.sol";
import "../interfaces/IMinerList.sol";
import "../interfaces/IMinerPool.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerFormulas.sol";

/**
 * @title MinerHealthCheck
 * @dev A smart contract for checking and managing miner health status.
 */
contract MinerHealthCheck is Initializable {
    IMinerList public minerList;
    IMinerFormulas public minerFormulas;
    IMinerPool public minerPool;
    IMetaPoints public metaPoints;
    mapping(address => mapping(MinerTypes.NodeType => uint256))
        public lastUptime;
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public dailyNodesActivities; // TA
    mapping(uint256 => mapping(address => mapping(MinerTypes.NodeType => uint256)))
        public dailyNodeActivity; // A
    uint256 public timeout;

    /**
     * @dev Modifier to check if an address is a miner of the specified node type.
     * @param miner The address to check.
     * @param nodeType The type of miner node to check.
     */
    modifier isMiner(address miner, MinerTypes.NodeType nodeType) {
        require(minerList.isMiner(miner, nodeType), "Address is not miner.");
        _;
    }

    /**
     * @dev Initializes the MinerHealthCheck contract with required addresses and timeout.
     * @param minerListAddress The address of the MinerList contract.
     * @param minerFormulasAddress The address of the MinerFormulas contract.
     * @param minerPoolAddress The address of the MinerPool contract.
     * @param metaPointsAddress The address of the MetaPoints contract.
     * @param requiredTimeout The timeout duration for miner activity.
     */
    function initialize(
        address minerListAddress,
        address minerFormulasAddress,
        address minerPoolAddress,
        address metaPointsAddress,
        uint256 requiredTimeout
    ) external initializer {
        minerList = IMinerList(minerListAddress);
        minerFormulas = IMinerFormulas(minerFormulasAddress);
        minerPool = IMinerPool(minerPoolAddress);
        metaPoints = IMetaPoints(metaPointsAddress);
        timeout = requiredTimeout;
    }

    /**
     * @dev Pings a miner node to update its uptime and perform related actions.
     * @param nodeType The type of miner node to ping.
     * @return A boolean indicating whether the ping was successful.
     */
    function ping(
        MinerTypes.NodeType nodeType
    ) external isMiner(msg.sender, nodeType) returns (bool) {
        uint256 lastSeen = lastUptime[msg.sender][nodeType];
        uint256 maxLimit = lastSeen + timeout;

        if (maxLimit >= block.timestamp) {
            uint256 activityTime = block.timestamp - lastSeen;
            _incrementDailyActiveTimes(msg.sender, nodeType, activityTime);
            _incrementDailyTotalActiveTimes(nodeType, activityTime);
            minerPool.claim(msg.sender, nodeType, activityTime);
            uint256 metaPointsReward = minerFormulas
                .calculateMetaPointsReward();
            metaPoints.mint(msg.sender, metaPointsReward * activityTime);
        }

        lastUptime[msg.sender][nodeType] = block.timestamp;
        return true;
    }

    /**
     * @dev Checks the status of a miner node.
     * @param minerAddress The address of the miner node to check.
     * @param minerType The type of miner node to check.
     * @return A boolean indicating whether the miner node is active.
     */
    function status(
        address minerAddress,
        MinerTypes.NodeType minerType
    ) external view returns (bool) {
        return (
            (lastUptime[minerAddress][minerType] + timeout) >= block.timestamp
                ? true
                : false
        );
    }

    /**
     * @dev Sets a new timeout duration for miner activity.
     * @param newTimeout The new timeout duration to set.
     * @return A boolean indicating whether the operation was successful.
     */
    function setTimeout(uint256 newTimeout) external returns (bool) {
        timeout = newTimeout;
        return (true);
    }

    /**
     * @dev Internal function to increment daily total active times for a node type.
     * @param nodeType The type of miner node.
     * @param activityTime The activity time to increment.
     * @return A boolean indicating whether the operation was successful.
     */
    function _incrementDailyTotalActiveTimes(
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (bool) {
        dailyNodesActivities[minerFormulas.getDate()][nodeType] += activityTime;
        return (true);
    }

    /**
     * @dev Internal function to increment daily active times for a miner node.
     * @param minerAddress The address of the miner node.
     * @param nodeType The type of miner node.
     * @param activityTime The activity time to increment.
     * @return A boolean indicating whether the operation was successful.
     */
    function _incrementDailyActiveTimes(
        address minerAddress,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (bool) {
        dailyNodeActivity[minerFormulas.getDate()][minerAddress][
            nodeType
        ] += activityTime;
        return (true);
    }
}
