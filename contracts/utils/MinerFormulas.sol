// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../libs/MinerTypes.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerHealthCheck.sol";
import "../interfaces/IMinerList.sol";

// This contract after unit tests & audit will be library
contract MinerFormulas is Initializable {
    IMetaPoints public metaPoints;
    IMinerList public minerList;
    IMinerHealthCheck public minerHealthCheck;

    // Divider for percentage calculatations %100 => %10_000
    uint256 public constant BASE_DIVIDER = 10_000;

    uint256 public constant METAMINER_MINER_POOL_SHARE_PERCENT = 5_000;

    uint256 public constant METAMINER_DAILY_BLOCK_COUNT = 17_280;
    uint256 public constant METAMINER_DAILY_PRIZE_POOL = 166_666 * 10 ** 18;
    uint256 public constant METAMINER_DAILY_PRIZE_LIMIT = 450 * 10 ** 18;

    uint256 public constant MACROMINER_ARCHIVE_DAILY_MAX_REWARD =
        150 * 10 ** 18;
    uint256 public constant MACROMINER_FULLNODE_DAILY_MAX_REWARD =
        100 * 10 ** 18;
    uint256 public constant MACROMINER_LIGHT_DAILY_MAX_REWARD = 50 * 10 ** 18;

    uint256 public constant MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA =
        135_000 * 10 ** 18;
    uint256 public constant MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA =
        15_000 * 10 ** 18;

    uint256 public constant MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA =
        90_000 * 10 ** 18;
    uint256 public constant MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA =
        10_000 * 10 ** 18;

    uint256 public constant MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA =
        45_000 * 10 ** 18;
    uint256 public constant MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA =
        5_000 * 10 ** 18;

    uint256 public constant SECONDS_IN_A_DAY = 86_400;

    function initialize(
        address metaPointsAddress,
        address minerListAddress,
        address minerHealthCheckAddress
    ) external initializer {
        metaPoints = IMetaPoints(metaPointsAddress);
        minerList = IMinerList(minerListAddress);
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
    }

    function calculateMetaminerReward() external view returns (uint256) {
        uint256 calculatedAmount = (METAMINER_DAILY_PRIZE_POOL /
            minerList.count(MinerTypes.NodeType.Meta));
        return
            calculatedAmount > METAMINER_DAILY_PRIZE_LIMIT
                ? METAMINER_DAILY_PRIZE_LIMIT / METAMINER_DAILY_BLOCK_COUNT
                : calculatedAmount /
                    (METAMINER_DAILY_BLOCK_COUNT /
                        minerList.count(MinerTypes.NodeType.Meta));
    }

    function calculateMetaPointsReward() external pure returns (uint256) {
        return (1 ether / SECONDS_IN_A_DAY);
    }

    function calculateDailyPoolRewardsFromFirstFormula(
        MinerTypes.NodeType nodeType
    ) external view returns (uint256) {
        uint256 TOTAL_NODE_COUNT = 0;
        uint256 DAILY_CALC_POOL_REWARD = 0;

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            TOTAL_NODE_COUNT = minerList.count(
                MinerTypes.NodeType.MacroArchive
            );
            DAILY_CALC_POOL_REWARD = MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            TOTAL_NODE_COUNT = minerList.count(
                MinerTypes.NodeType.MacroFullnode
            );
            DAILY_CALC_POOL_REWARD = MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            TOTAL_NODE_COUNT = minerList.count(MinerTypes.NodeType.MacroLight);
            DAILY_CALC_POOL_REWARD = MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA;
        } else {
            return (0);
        }

        uint256 formula = ((DAILY_CALC_POOL_REWARD / (24 * TOTAL_NODE_COUNT)) /
            SECONDS_IN_A_DAY);
        return (formula);
    }

    function calculateDailyPoolRewardsFromSecondFormula(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) external view returns (uint256) {
        uint256 TOTAL_NODE_COUNT = 0;
        uint256 REST_POOL_AMOUNT = 0;
        uint256 MINER_META_POINT = _balaceOfMP(minerAddress);
        uint256 TOTAL_SUPPLY_META_POINTS = _totalSupplyMP();

        uint256 MINERS_TOTAL_ACTIVITIES = minerHealthCheck.dailyNodesActivities(
            _getDate(),
            nodeType
        );

        uint256 MINER_ACTIVITY = minerHealthCheck.dailyNodeActivity(
            _getDate(),
            minerAddress,
            nodeType
        );

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            TOTAL_NODE_COUNT = minerList.count(
                MinerTypes.NodeType.MacroArchive
            );
            REST_POOL_AMOUNT = MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            TOTAL_NODE_COUNT = minerList.count(
                MinerTypes.NodeType.MacroFullnode
            );
            REST_POOL_AMOUNT = MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            TOTAL_NODE_COUNT = minerList.count(MinerTypes.NodeType.MacroLight);
            REST_POOL_AMOUNT = MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA;
        } else {
            return (0);
        }

        uint256 formula = (((REST_POOL_AMOUNT * 1e18 /
            (TOTAL_SUPPLY_META_POINTS *
                (MINERS_TOTAL_ACTIVITIES * 1e18 / (TOTAL_NODE_COUNT * 24)))) *
            MINER_META_POINT *
            (MINER_ACTIVITY / 24)) / SECONDS_IN_A_DAY);
        return (formula);
    }

    function getDate() external view returns (uint256) {
        return _getDate();
    }

    function _getDate() internal view returns (uint256) {
        // calculate today date from block.timestamp and return
        return uint256(block.timestamp) / SECONDS_IN_A_DAY;
    }

    function _balaceOfMP(address miner) internal view returns (uint256) {
        return (metaPoints.balanceOf(miner));
    }

    function _totalSupplyMP() internal view returns (uint256) {
        return (metaPoints.totalSupply());
    }
}
