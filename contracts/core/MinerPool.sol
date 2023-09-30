// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IMinerFormulas.sol";
import "../interfaces/IMinerList.sol";

/**
 * @title RewardsPool
 * @notice Holds tokens for miners to claim.
 * @dev A contract for distributing tokens over a specified period of time for mining purposes.
 */
contract MinerPool is Initializable, RolesHandler {
    IMinerFormulas public minerFormulas;
    mapping(address => uint256) public claimedAmounts; // Total amount of tokens claimed so far
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromFirstFormula;
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromSecondFormula;

    event HasClaimed(
        address indexed beneficiary,
        uint256 amount,
        string indexed claimType
    ); // Event emitted when a beneficiary has claimed tokens
    event Deposit(address indexed sender, uint amount, uint balance); // Event emitted when pool received mtc

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
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
    function claimMacroDailyReward(
        address receiver,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) external onlyManagerRole(msg.sender) returns (uint256, uint256) {
        (uint256 firstAmount, uint256 secondAmount) = _calculateClaimableAmount(
            receiver,
            nodeType,
            activityTime
        );

        (bool isFirstAmountSent, ) = receiver.call{value: firstAmount}("");
        require(isFirstAmountSent, "MinerPool: Unable to claim");

        emit HasClaimed(receiver, firstAmount, "MACRO_DAILY_REWARD");

        (bool isSecondAmountSent, ) = receiver.call{value: secondAmount}("");
        require(isSecondAmountSent, "MinerPool: Unable to claim");

        emit HasClaimed(receiver, secondAmount, "MACRO_DAILY_REWARD");

        return (firstAmount, secondAmount);
    }

    function claimTxReward(
        address receiver,
        uint256 amount
    ) external onlyManagerRole(msg.sender) {
        (bool sent, ) = receiver.call{value: amount}("");
        emit HasClaimed(receiver, amount, "TX_REWARD");
        require(sent, "MinerPool: Unable to send");
    }

    function _calculateClaimableAmount(
        address minerAddress,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (uint256, uint256) {
        uint256 firstFormulaHardCap = 0;
        uint256 firstFormulaMinerHardCap = 0;
        uint256 secondFormulaHardCap = 0;

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_HARD_CAP_OF_SECOND_FORMULA();

            firstFormulaMinerHardCap = (minerFormulas
                .MACROMINER_ARCHIVE_DAILY_MAX_REWARD() / minerFormulas.SECONDS_IN_A_DAY());
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_HARD_CAP_OF_SECOND_FORMULA();

            firstFormulaMinerHardCap = (minerFormulas
                .MACROMINER_FULLNODE_DAILY_MAX_REWARD() / minerFormulas.SECONDS_IN_A_DAY());
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_HARD_CAP_OF_SECOND_FORMULA();

            firstFormulaMinerHardCap = (minerFormulas
                .MACROMINER_LIGHT_DAILY_MAX_REWARD() / minerFormulas.SECONDS_IN_A_DAY());
        }

        uint256 firstFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromFirstFormula(nodeType);
        uint256 secondFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromSecondFormula(minerAddress, nodeType);
        uint256 currentDateIndex = minerFormulas.getDate();

        firstFormulaAmount *= activityTime;
        secondFormulaAmount *= activityTime;
        firstFormulaMinerHardCap *= activityTime;

        if(firstFormulaAmount > firstFormulaMinerHardCap){
            firstFormulaAmount = firstFormulaMinerHardCap;
        }

        require(
            (totalRewardsFromFirstFormula[currentDateIndex][nodeType] +
                firstFormulaAmount) <= firstFormulaHardCap,
            "MinerPool: Addition exceeds hardcap for first formula"
        );
        require(
            (totalRewardsFromSecondFormula[currentDateIndex][nodeType] +
                secondFormulaAmount) <= secondFormulaHardCap,
            "MinerPool: Addition exceeds hardcap for second formula"
        );

        totalRewardsFromFirstFormula[currentDateIndex][
            nodeType
        ] += firstFormulaAmount;
        totalRewardsFromSecondFormula[currentDateIndex][
            nodeType
        ] += secondFormulaAmount;

        return (firstFormulaAmount, secondFormulaAmount);
    }
}
