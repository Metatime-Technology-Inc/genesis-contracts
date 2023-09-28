// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/MinerTypes.sol";
import "../interfaces/IBlockValidator.sol";
import "../interfaces/IMinerList.sol";
import "../interfaces/IMinerFormulas.sol";
import "../helpers/RolesHandler.sol";

/**
 * @title Metaminer
 * @dev A smart contract representing a Metaminer, allowing users to stake and participate in block validation.
 */
contract Metaminer is Initializable, RolesHandler {
    IBlockValidator public blockValidator;
    IMinerList public minerList;
    IMinerFormulas public minerFormulas;
    uint256 public STAKE_AMOUNT = 1_000_000 ether;
    uint256 public ANNUAL_AMOUNT = 100_000 ether;
    uint256 private constant YEAR = 31536000;
    address private MINER_POOL_ADDRESS; // should be constant

    struct Share {
        uint256 sharedPercent;
        uint256 shareHolderCount;
    }

    struct Shareholder {
        address addr;
        uint256 percent;
    }

    mapping(address => Share) public shares;
    mapping(address => uint256) public minerSubscription;
    mapping(address => mapping(uint256 => Shareholder)) public shareholders;

    event MinerAdded(address indexed miner, uint256 indexed validDate);
    event MinerSubscribe(address indexed miner, uint256 indexed newValidDate);
    event MinerUnsubscribe(address indexed miner);

    /**
     * @dev Modifier to check if an address is a Metaminer.
     * @param _miner The address to check.
     */
    modifier isMiner(address _miner) {
        require(
            minerList.isMiner(_miner, MinerTypes.NodeType.Meta),
            "Metaminer: Address is not metaminer"
        );
        _;
    }

    /**
     * @dev Modifier to check if a Metaminer's subscription is valid.
     * @param _miner The address of the Metaminer to check.
     */
    modifier validMinerSubscription(address _miner) {
        require(
            minerSubscription[_miner] > block.timestamp,
            "Metaminer: Miner subscription is not as required"
        );
        _;
    }

    receive() external payable {}

    /**
     * @dev Initializes the Metaminer contract with the addresses of the BlockValidator, MinerList, MinerFormulas, and MinerPool contracts.
     * @param blockValidatorAddress The address of the BlockValidator contract.
     * @param minerListAddress The address of the MinerList contract.
     * @param minerFormulasAddress The address of the MinerFormulas contract.
     * @param minerPoolAddress The address of the MinerPool contract.
     */
    function initialize(
        address blockValidatorAddress,
        address minerListAddress,
        address minerFormulasAddress,
        address minerPoolAddress
    ) external initializer {
        blockValidator = IBlockValidator(blockValidatorAddress);
        minerList = IMinerList(minerListAddress);
        minerFormulas = IMinerFormulas(minerFormulasAddress);
        MINER_POOL_ADDRESS = minerPoolAddress;
    }

    /**
     * @dev Allows a user to become a Metaminer by staking the required amount of MTC.
     * @return A boolean indicating whether the operation was successful.
     */
    function setMiner() external payable returns (bool) {
        require(
            msg.value == (ANNUAL_AMOUNT + STAKE_AMOUNT),
            "Metaminer: Required MTC is not sended"
        );
        shares[msg.sender] = Share(0, 0);
        minerSubscription[msg.sender] = _nextYear(msg.sender);
        minerList.addMiner(msg.sender, MinerTypes.NodeType.Meta);
        _addShareHolder(
            msg.sender,
            MINER_POOL_ADDRESS,
            minerFormulas.METAMINER_MINER_POOL_SHARE_PERCENT()
        );
        emit MinerAdded(msg.sender, minerSubscription[msg.sender]);
        return (true);
    }

    /**
     * @dev Allows a Metaminer to renew their subscription for another year by sending the required amount of MTC.
     * @return A boolean indicating whether the operation was successful.
     */
    function subscribe() external payable isMiner(msg.sender) returns (bool) {
        require(msg.value == ANNUAL_AMOUNT, "Metaminer: Required MTC was not sent");
        minerSubscription[msg.sender] = _nextYear(msg.sender);
        emit MinerSubscribe(msg.sender, minerSubscription[msg.sender]);
        return (true);
    }

    /**
     * @dev Allows a Metaminer to unsubscribe by unstaking their funds.
     * @return A boolean indicating whether the operation was successful.
     */
    function unstake() external isMiner(msg.sender) returns (bool) {
        _unstake(msg.sender);
        emit MinerUnsubscribe(msg.sender);
        return (true);
    }

    /**
     * @dev Allows the contract owner to set a Metaminer by address.
     * @return A boolean indicating whether the operation was successful.
     */
    function setValidator(
        address _miner
    ) external onlyOwnerRole(msg.sender) returns (bool) {
        shares[_miner] = Share(0, 0);
        minerSubscription[_miner] = _nextYear(_miner);
        minerList.addMiner(_miner, MinerTypes.NodeType.Meta);
        _addShareHolder(
            _miner,
            MINER_POOL_ADDRESS,
            minerFormulas.METAMINER_MINER_POOL_SHARE_PERCENT()
        );
        emit MinerAdded(_miner, minerSubscription[_miner]);
        return (true);
    }

    /**
     * @dev Allows the contract owner to refresh the subscription of a Metaminer.
     * @return A boolean indicating whether the operation was successful.
     */
    function refreshValidator(
        address _miner
    ) external onlyOwnerRole(msg.sender) returns (bool) {
        minerSubscription[_miner] = _nextYear(_miner);
        return (true);
    }

    /**
     * @dev Allows the contract owner to set the percentage share for Metaminer's shareholders.
     * @param _miner The address of the Metaminer.
     * @param _shareHolders The addresses of the shareholders.
     * @param _percents The corresponding percentages for the shareholders.
     * @param _shareHoldersLength The number of shareholders.
     * @return A boolean indicating whether the operation was successful.
     */
    function setPercent(
        address _miner,
        address[] memory _shareHolders,
        uint256[] memory _percents,
        uint256 _shareHoldersLength
    ) external onlyOwnerRole(msg.sender) returns (bool) {
        Share storage share = shares[_miner];
        for (uint256 i = 0; i < _shareHoldersLength; i++) {
            address addr = _shareHolders[i];
            uint256 percent = _percents[i];
            uint256 nextPercent = share.sharedPercent + percent;

            require(
                nextPercent <= minerFormulas.BASE_DIVIDER(),
                "Metaminer: Total percent cannot exceed 100"
            );

            _addShareHolder(_miner, addr, percent);
            share.sharedPercent = nextPercent;
        }
        return (true);
    }

    /**
     * @dev Allows a Metaminer to finalize a block and distribute rewards.
     * @param blockNumber The block number to finalize.
     * @return A boolean indicating whether the operation was successful.
     */
    function finalizeBlock(
        uint256 blockNumber
    ) external payable returns (bool) {
        bool status = _minerCheck(msg.sender);
        if (status == true) {
            IBlockValidator.BlockPayload memory blockPayload = blockValidator
                .blockPayloads(blockNumber);
            bool finalized = blockPayload.isFinalized;
            require(finalized == false, "Already finalized.");
            address coinbase = blockPayload.coinbase;
            uint256 blockReward = blockPayload.blockReward;

            require(msg.sender == coinbase, "Metaminer: Wrong sender address");
            require(msg.value >= blockReward, "Metaminer: Insufficient amount");

            _shareIncome(msg.sender, msg.value);

            bool result = blockValidator.finalizeBlock(blockNumber);
            require(result == true, "Metaminer: Unable to finalize block");
        }

        return true;
    }

    /**
     * @dev Calculates the timestamp for the start of the next year.
     * @param _miner The address of the Metaminer.
     * @return The timestamp for the start of the next year.
     */
    function _nextYear(address _miner) internal view returns (uint256) {
        return (
            minerSubscription[_miner] > block.timestamp
                ? (minerSubscription[_miner] + YEAR)
                : (block.timestamp + YEAR)
        );
    }

    /**
     * @dev Adds a shareholder to a Metaminer's list of shareholders.
     * @param _miner The address of the Metaminer.
     * @param _addr The address of the shareholder to add.
     * @param _percent The percentage share of the shareholder.
     * @return A boolean indicating whether the operation was successful.
     */
    function _addShareHolder(
        address _miner,
        address _addr,
        uint256 _percent
    ) internal isMiner(_miner) returns (bool) {
        Share storage share = shares[_miner];
        shareholders[_miner][share.shareHolderCount] = Shareholder(
            _addr,
            _percent
        );
        share.shareHolderCount++;
        return (true);
    }

    /**
     * @dev Distributes the income to the Metaminer's shareholders.
     * @param _miner The address of the Metaminer.
     * @param _balance The total balance to distribute.
     * @return A boolean indicating whether the operation was successful.
     */
    function _shareIncome(
        address _miner,
        uint256 _balance
    ) internal isMiner(_miner) validMinerSubscription(_miner) returns (bool) {
        uint256 _shareholderCount = shares[_miner].shareHolderCount;
        for (uint256 i = 0; i < _shareholderCount; i++) {
            Shareholder memory shareHolder = shareholders[_miner][i];
            uint256 holderPercent = (_balance * shareHolder.percent) /
                minerFormulas.BASE_DIVIDER();
            (bool sent, ) = address(shareHolder.addr).call{
                value: holderPercent
            }("");
            require(sent, "MetaMiner: Income sharing failed");
        }
        return (true);
    }

    /**
     * @dev Unstakes a Metaminer by transferring their staked amount back to them.
     * @param _miner The address of the Metaminer to unstake.
     * @return A boolean indicating whether the operation was successful.
     */
    function _unstake(address _miner) internal returns (bool) {
        (bool sent, ) = address(_miner).call{value: STAKE_AMOUNT}("");
        require(sent, "Metaminer: Unstake failed");
        minerList.deleteMiner(_miner, MinerTypes.NodeType.Meta);
        minerSubscription[_miner] = 0;
        // must be delete old shareholders
        return (true);
    }

    /**
     * @dev Checks if a Metaminer's subscription is valid and unstakes them if it's not.
     * @param _miner The address of the Metaminer to check.
     * @return A boolean indicating whether the Metaminer's subscription is valid.
     */
    function _minerCheck(
        address _miner
    ) internal isMiner(_miner) returns (bool) {
        if (minerSubscription[_miner] < block.timestamp) {
            _unstake(_miner);
            return (false);
        } else {
            return (true);
        }
    }
}
