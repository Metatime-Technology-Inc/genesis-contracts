// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "../interfaces/IERC20.sol";
import "../helpers/Blacklistable.sol";
import "../helpers/Freezeable.sol";

/**
 * @title Bridge
 * @dev A smart contract for bridging tokens to another chain.
 */
contract Bridge is Blacklistable, Freezeable {
    IERC20 public immutable bridgeToken;

    event BridgeTransfer(address indexed sender, uint256 indexed amount);

    /**
     * @dev Constructor to initialize the Bridge contract with the specified token address.
     * @param tokenAddress The address of the token to be bridged.
     */
    constructor(address tokenAddress) {
        bridgeToken = IERC20(tokenAddress);
    }

    /**
     * @dev Initiates the token bridging process for the sender.
     * @return A boolean indicating whether the bridging process was successful.
     */
    function bridge()
        external
        isNotFreezed
        isBlacklisted(msg.sender)
        returns (bool)
    {
        uint256 balance = bridgeToken.balanceOf(msg.sender);
        require(balance > 0, "Bridge: Address dont have balance");

        uint256 senderAllowance = bridgeToken.allowance(
            msg.sender,
            address(this)
        );
        require(senderAllowance == balance, "Bridge: Allowance is not as required");

        bridgeToken.burnFrom(msg.sender, balance);
        emit BridgeTransfer(msg.sender, balance);

        return (true);
    }
}
