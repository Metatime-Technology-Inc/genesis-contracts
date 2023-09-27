// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../libs/MinerTypes.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerHealthCheck.sol";
import "../interfaces/IMinerList.sol";

library MinerFormulas {
    enum PoolType {
        Reward,
        Mining
    }

    IMetaPoints public constant METAPOINTS =
        IMetaPoints(0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5);
    IMinerList public constant METALIST =
        IMinerList(0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5);
    IMinerHealthCheck public constant METAHEALTHCHECK =
        IMinerHealthCheck(0xDAFEA492D9c6733ae3d56b7Ed1ADB60692c98Bc5);

    uint256 public constant METAMINER_DAILY_BLOCK_COUNT = 17_280;
    uint256 public constant METAMINER_DAILY_PRIZE_POOL = 166_666;
    uint256 public constant METAMINER_DAILY_PRIZE_LIMIT = 450 * 10 ** 18;

    uint256 public constant MACROMINER_ARCHIVE_DAILY_MAX_REWARD = 150;
    uint256 public constant MACROMINER_FULLNODE_DAILY_MAX_REWARD = 100;
    uint256 public constant MACROMINER_LIGHT_DAILY_MAX_REWARD = 50;

    uint256 public constant MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA =
        60_000 * 10 ** 18;
    uint256 public constant MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA =
        15_000 * 10 ** 18;

    uint256 public constant MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA =
        40_000 * 10 ** 18;
    uint256 public constant MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA =
        10_000 * 10 ** 18;

    uint256 public constant MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA =
        40_000 * 10 ** 18;
    uint256 public constant MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA =
        5_000 * 10 ** 18;

    uint256 public constant SECONDS_IN_A_DAY = 86_400;

    function calculateMetaminerReward() external view returns (uint256) {
        uint256 calculatedAmount = ((METAMINER_DAILY_PRIZE_POOL * 10 ** 18) /
            METALIST.count(MinerTypes.NodeType.Meta));
        return
            calculatedAmount > METAMINER_DAILY_PRIZE_LIMIT
                ? METAMINER_DAILY_PRIZE_LIMIT / METAMINER_DAILY_BLOCK_COUNT
                : calculatedAmount /
                    (METAMINER_DAILY_BLOCK_COUNT /
                        METALIST.count(MinerTypes.NodeType.Meta));
    }

    function calculateMetaPointsReward() external pure returns (uint256) {
        return (1 ether / uint256(86400));
    }

    function calculateDailyPoolRewardsFromFirstFormula(
        MinerTypes.NodeType nodeType
    ) external view returns (uint256) {
        uint256 TOTAL_NODE_COUNT = 0;
        uint256 DAILY_CALC_POOL_REWARD = 0;

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            TOTAL_NODE_COUNT = METALIST.count(MinerTypes.NodeType.MacroArchive);
            DAILY_CALC_POOL_REWARD = MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            TOTAL_NODE_COUNT = METALIST.count(
                MinerTypes.NodeType.MacroFullnode
            );
            DAILY_CALC_POOL_REWARD = MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            TOTAL_NODE_COUNT = METALIST.count(MinerTypes.NodeType.MacroLight);
            DAILY_CALC_POOL_REWARD = MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA;
        }
        uint256 formula = ((DAILY_CALC_POOL_REWARD / (24 * TOTAL_NODE_COUNT)) /
            1 hours);
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
        uint256 MINERS_TOTAL_ACTIVITIES = METAHEALTHCHECK.dailyNodesActivities(
            _getDate(),
            nodeType
        );
        uint256 MINER_ACTIVITY = METAHEALTHCHECK.dailyNodeActivity(
            _getDate(),
            minerAddress,
            nodeType
        );

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            TOTAL_NODE_COUNT = METALIST.count(MinerTypes.NodeType.MacroArchive);
            REST_POOL_AMOUNT = MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            TOTAL_NODE_COUNT = METALIST.count(
                MinerTypes.NodeType.MacroFullnode
            );
            REST_POOL_AMOUNT = MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA;
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            TOTAL_NODE_COUNT = METALIST.count(MinerTypes.NodeType.MacroLight);
            REST_POOL_AMOUNT = MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA;
        }
        uint256 formula = (((REST_POOL_AMOUNT /
            (TOTAL_SUPPLY_META_POINTS *
                (MINERS_TOTAL_ACTIVITIES / (TOTAL_NODE_COUNT * 24)))) *
            MINER_META_POINT *
            (MINER_ACTIVITY / 24)) / 1 hours);
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
        return (METAPOINTS.balanceOf(miner));
    }

    function _totalSupplyMP() internal view returns (uint256) {
        return (METAPOINTS.totalSupply());
    }
}
