// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IMinerFormulas.sol";
import "../interfaces/IMinerList.sol";

/**
 * @title MinerPool
 * @notice Manages the distribution of tokens to miners based on their activity.
 * @dev This contract facilitates the reward distribution to miners for
 * their participation in different miner node types.
 */
contract MinerPool is Initializable, RolesHandler, ReentrancyGuard {
    /// @notice This variable represents a contract instance of IMinerFormulas, which is used to access miner formulas.
    IMinerFormulas public minerFormulas;
    /// @notice This mapping stores the claimed amounts for each address.
    mapping(address => uint256) public claimedAmounts;
    /// @notice This mapping stores the total rewards from the first formula for a given miner type and a specific uint256 identifier.
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromFirstFormula;
    /// @notice This mapping stores the total rewards from the second formula for a given miner type and a specific uint256 identifier.
    mapping(uint256 => mapping(MinerTypes.NodeType => uint256))
        public totalRewardsFromSecondFormula;

    /// @notice MTC claimed
    event HasClaimed(
        address indexed beneficiary,
        uint256 amount,
        string indexed claimType
    );
    /// @notice MTC deposited
    event Deposit(address indexed sender, uint amount, uint balance);

    /**
     * @dev The receive function is a special function that allows the contract to accept MTC transactions.
     * It emits a Deposit event to record the deposit details.
     */
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /**
     * @dev Initializes the contract with the specified parameters.
     * @param minerFormulasAddress Address of MinerFormulas contract.
     */
    function initialize(address minerFormulasAddress) external initializer {
        require(
            minerFormulasAddress != address(0),
            "MinerPool: No zero address"
        );
        minerFormulas = IMinerFormulas(minerFormulasAddress);
    }

    /**
     * @dev Claim tokens for the sender. Called by a manager.
     * @param receiver Address of the receiver.
     * @param nodeType Type of miner node.
     * @param activityTime The time duration for which the miner has been active.
     */
    function claimMacroDailyReward(
        address receiver,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) external onlyManagerRole(msg.sender) nonReentrant {
        (uint256 firstAmount, uint256 secondAmount) = _calculateClaimableAmount(
            receiver,
            nodeType,
            activityTime
        );

        if (firstAmount != 0) {
            (bool isFirstAmountSent, ) = receiver.call{value: firstAmount}("");
            require(isFirstAmountSent, "MinerPool: Unable to claim");

            emit HasClaimed(receiver, firstAmount, "MACRO_DAILY_REWARD");
        }

        if (secondAmount != 0) {
            (bool isSecondAmountSent, ) = receiver.call{value: secondAmount}(
                ""
            );
            require(isSecondAmountSent, "MinerPool: Unable to claim");

            emit HasClaimed(receiver, secondAmount, "MACRO_DAILY_REWARD");
        }
    }

    /**
     * @dev Claim a transaction reward for the sender. Called by a manager.
     * @param receiver Address of the receiver.
     * @param amount The amount to claim.
     */
    function claimTxReward(
        address receiver,
        uint256 amount
    ) external onlyManagerRole(msg.sender) nonReentrant {
        (bool sent, ) = receiver.call{value: amount}("");
        emit HasClaimed(receiver, amount, "TX_REWARD");
        require(sent, "MinerPool: Unable to send");
    }

    /**
     * @dev Calculate the claimable amounts for the sender based on the mining activity.
     * @param minerAddress Address of the miner.
     * @param nodeType Type of miner node.
     * @param activityTime The time duration for which the miner has been active.
     * @return A tuple containing the claimable amounts from the first and second formulas.
     */
    function _calculateClaimableAmount(
        address minerAddress,
        MinerTypes.NodeType nodeType,
        uint256 activityTime
    ) internal returns (uint256, uint256) {
        uint256 firstFormulaHardCap;
        uint256 secondFormulaHardCap;
        uint256 dailyHardCap;

        if (nodeType == MinerTypes.NodeType.MacroArchive) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_POOL_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_ARCHIVE_POOL_HARD_CAP_OF_SECOND_FORMULA();

            dailyHardCap = (minerFormulas
                .MACROMINER_ARCHIVE_DAILY_MAX_REWARD() /
                minerFormulas.SECONDS_IN_A_DAY());
        } else if (nodeType == MinerTypes.NodeType.MacroFullnode) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_POOL_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_FULLNODE_POOL_HARD_CAP_OF_SECOND_FORMULA();

            dailyHardCap = (minerFormulas
                .MACROMINER_FULLNODE_DAILY_MAX_REWARD() /
                minerFormulas.SECONDS_IN_A_DAY());
        } else if (nodeType == MinerTypes.NodeType.MacroLight) {
            firstFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_POOL_HARD_CAP_OF_FIRST_FORMULA();
            secondFormulaHardCap = minerFormulas
                .MACROMINER_LIGHT_POOL_HARD_CAP_OF_SECOND_FORMULA();

            dailyHardCap = (minerFormulas.MACROMINER_LIGHT_DAILY_MAX_REWARD() /
                minerFormulas.SECONDS_IN_A_DAY());
        } else {
            return (uint256(0), uint256(0));
        }

        uint256 firstFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromFirstFormula(nodeType);
        uint256 secondFormulaAmount = minerFormulas
            .calculateDailyPoolRewardsFromSecondFormula(minerAddress, nodeType);
        uint256 currentDateIndex = minerFormulas.getDate();

        firstFormulaAmount *= activityTime;
        secondFormulaAmount *= activityTime;
        dailyHardCap *= activityTime;

        (
            uint256 firstFormulaProportion,
            uint256 secondFormulaProportion
        ) = minerFormulas.formulaProportion(
                firstFormulaAmount,
                secondFormulaAmount,
                dailyHardCap
            );

        firstFormulaAmount = firstFormulaProportion;
        secondFormulaAmount = secondFormulaProportion;

        if (
            (totalRewardsFromFirstFormula[currentDateIndex][nodeType] +
                firstFormulaAmount) > firstFormulaHardCap
        ) {
            firstFormulaAmount = 0;
        }
        if (
            (totalRewardsFromSecondFormula[currentDateIndex][nodeType] +
                secondFormulaAmount) > secondFormulaHardCap
        ) {
            secondFormulaAmount = 0;
        }

        totalRewardsFromFirstFormula[currentDateIndex][
            nodeType
        ] += firstFormulaAmount;
        totalRewardsFromSecondFormula[currentDateIndex][
            nodeType
        ] += secondFormulaAmount;

        return (firstFormulaAmount, secondFormulaAmount);
    }
}
