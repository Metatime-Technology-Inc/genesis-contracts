// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../utils/Metaminer.sol";

contract MockMetaminer is Metaminer {
    function shareIncome() public payable returns(bool) {
        return _shareIncome(msg.sender, 100 ether);
    }
}