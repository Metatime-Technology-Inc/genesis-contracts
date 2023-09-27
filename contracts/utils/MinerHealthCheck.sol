// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../libs/MinerTypes.sol";
import "../interfaces/IMinerList.sol";
import "../interfaces/IMinerPool.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerFormulas.sol";

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

    modifier isMiner(address miner, MinerTypes.NodeType nodeType) {
        require(minerList.isMiner(miner, nodeType), "Address is not miner.");
        _;
    }

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

    function setTimeout(uint256 newTimeout) external returns (bool) {
        timeout = newTimeout;
        return (true);
    }

    function _incrementDailyTotalActiveTimes(
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (bool) {
        dailyNodesActivities[minerFormulas.getDate()][nodeType] += activityTime;
        return (true);
    }

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
