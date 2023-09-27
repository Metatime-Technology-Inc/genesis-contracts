// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

interface IMacrominer {
    function archiveCount() external view returns (uint256);

    function fullnodeCount() external view returns (uint256);

    function lightCount() external view returns (uint256);
}
