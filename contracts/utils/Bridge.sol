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
    address public immutable bridgeToken;
    IERC20 private immutable _bridgeTokenInterface;

    event BridgeTransfer(address indexed sender, uint256 indexed amount);

    /**
     * @dev Constructor to initialize the Bridge contract with the specified token address.
     * @param _token The address of the token to be bridged.
     */
    constructor(address _token) {
        bridgeToken = _token;
        _bridgeTokenInterface = IERC20(bridgeToken);
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
        uint256 balance = _bridgeTokenInterface.balanceOf(msg.sender);
        require(balance > 0, "Address dont have balance.");

        uint256 senderAllowance = _bridgeTokenInterface.allowance(
            msg.sender,
            address(this)
        );
        require(senderAllowance == balance, "Allowance is not as required.");

        _bridgeTokenInterface.burnFrom(msg.sender, balance);
        emit BridgeTransfer(msg.sender, balance);

        return (true);
    }
}
