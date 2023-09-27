// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IMetaminer {
    struct Miner {
        uint256 sharedPercent;
        uint256 shareHolderCount;
        bool exist;
    }

    function miners(address addr) external view returns (Miner memory);
}
