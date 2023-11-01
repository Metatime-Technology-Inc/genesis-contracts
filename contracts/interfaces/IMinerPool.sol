// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../libs/MinerTypes.sol";

interface IMinerPool {
    function claimMacroDailyReward(
        address receiver,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) external;

    function claimTxReward(address receiver, uint256 amount) external;
}
