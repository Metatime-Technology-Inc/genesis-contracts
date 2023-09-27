// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IMinerFormulas.sol";
import "../interfaces/IMinerList.sol";

/**
 * @title RewardsPool
 * @notice Holds tokens for miners to claim.
 * @dev A contract for distributing tokens over a specified period of time for mining purposes.
 */
contract RewardsPool is Context, Initializable, RolesHandler {
    uint256 currentBlock = 0;
    IMinerFormulas public minerFormulas;
    mapping(address => uint256) public claimedAmounts; // Total amount of tokens claimed so far

    event HasClaimed(address indexed beneficiary, uint256 amount); // Event emitted when a beneficiary has claimed tokens
    event Deposit(address indexed sender, uint amount, uint balance); // Event emitted when pool received mtc

    receive() external payable {
        emit Deposit(_msgSender(), msg.value, address(this).balance);
    }

    /**
     * @dev Initializes the contract with the specified parameters.
     * @param minerFormulasAddress Address of MinerFormulas contract.
     */
    function initialize(address minerFormulasAddress) external initializer {
        minerFormulas = IMinerFormulas(minerFormulasAddress);
    }

    /**
     * @dev Claim tokens for the sender.
     * @return A boolean indicating whether the claim was successful.
     */
    function claim(
        address receiver
    ) external onlyManagerRole(_msgSender()) returns (uint256) {
        // external call blok yapısını al
        uint256 amount = calculateClaimableAmount();

        claimedAmounts[receiver] += amount;

        (bool sent, ) = receiver.call{value: amount}("");
        require(sent, "RewardsPool: unable to claim");

        emit HasClaimed(receiver, amount);

        return amount;
    }

    /**
     * @dev Calculates the amount of tokens claimable for the current period.
     * @return The amount of tokens claimable for the current period.
     */
    function calculateClaimableAmount() public view returns (uint256) {
        return minerFormulas.calculateMetaminerReward();
    }
}
