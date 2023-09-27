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
contract MinerPool is Context, Initializable, RolesHandler {
    IMinerFormulas public minerFormulas;
    mapping(address => uint256) public claimedAmounts; // Total amount of tokens claimed so far
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromFirstFormula;
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromSecondFormula;

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
        address receiver,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) external onlyManagerRole(_msgSender()) returns (uint256, uint256) {
        (uint256 firstAmount, uint256 secondAmount) = _calculateClaimableAmount(
            receiver,
            nodeType,
            activityTime
        );

        (bool isFirstAmountSent, ) = receiver.call{value: firstAmount}("");
        require(isFirstAmountSent, "RewardsPool: unable to claim");

        emit HasClaimed(receiver, firstAmount);

        (bool isSecondAmountSent, ) = receiver.call{value: secondAmount}("");
        require(isSecondAmountSent, "RewardsPool: unable to claim");

        emit HasClaimed(receiver, secondAmount);

        return (firstAmount, secondAmount);
    }

    function _calculateClaimableAmount(
        address minerAddress,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (uint256, uint256) {
        uint256 firstFormulaHardCap = 0;
        uint256 secondFormulaHardCap = 0;

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA();
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA();
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA();
        }

        uint256 firstFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromFirstFormula(nodeType);
        uint256 secondFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromSecondFormula(minerAddress, nodeType);
        uint256 currentDateIndex = minerFormulas.getDate();

        require(
            (totalRewardsFromFirstFormula[currentDateIndex][nodeType] +
                firstFormulaAmount) <= firstFormulaHardCap
        );
        require(
            (totalRewardsFromSecondFormula[currentDateIndex][nodeType] +
                secondFormulaAmount) <= secondFormulaHardCap
        );

        totalRewardsFromFirstFormula[currentDateIndex][
            nodeType
        ] += firstFormulaAmount;
        totalRewardsFromSecondFormula[currentDateIndex][
            nodeType
        ] += secondFormulaAmount;

        firstFormulaAmount *= activityTime;
        secondFormulaAmount *= activityTime;

        return (firstFormulaAmount, secondFormulaAmount);
    }
}
