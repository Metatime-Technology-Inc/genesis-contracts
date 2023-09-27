// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../libs/MinerTypes.sol";

interface IMinerPool {
    function claim(
        address receiver,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) external returns (uint256, uint256);
}
