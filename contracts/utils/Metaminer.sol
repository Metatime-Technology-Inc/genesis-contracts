// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/MinerTypes.sol";
import "../interfaces/IBlockValidator.sol";
import "../interfaces/IMinerList.sol";
import "../helpers/RolesHandler.sol";

contract Metaminer is Context, Initializable, RolesHandler {
    IBlockValidator public blockValidator;
    IMinerList public minerList;
    uint256 constant STAKE_AMOUNT = 1_000_000 ether;
    uint256 constant ANNUAL_AMOUNT = 100_000 ether;
    uint256 constant YEAR = 31536000;

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

    modifier isMiner(address _miner) {
        require(
            minerList.isMiner(_miner, MinerTypes.NodeType.Meta),
            "Address is not metaminer."
        );
        _;
    }

    modifier validMinerSubscription(address _miner) {
        require(
            minerSubscription[_miner] > block.timestamp,
            "Miner subscription is not as required."
        );
        _;
    }

    receive() external payable {}

    function initialize(
        address blockValidatorAddress,
        address minerListAddress
    ) external initializer {
        blockValidator = IBlockValidator(blockValidatorAddress);
        minerList = IMinerList(minerListAddress);
    }

    function setMiner() external payable returns (bool) {
        require(
            msg.value == (ANNUAL_AMOUNT + STAKE_AMOUNT),
            "Required MTC is not sended."
        );
        shares[_msgSender()] = Share(0, 0);
        minerSubscription[_msgSender()] = _nextYear(_msgSender());
        minerList.addMiner(_msgSender(), MinerTypes.NodeType.Meta);
        emit MinerAdded(_msgSender(), minerSubscription[_msgSender()]);
        return (true);
    }

    function subscribe() external payable isMiner(_msgSender()) returns (bool) {
        require(msg.value == ANNUAL_AMOUNT, "Required MTC is not sended.");
        minerSubscription[_msgSender()] = _nextYear(_msgSender());
        emit MinerSubscribe(_msgSender(), minerSubscription[_msgSender()]);
        return (true);
    }

    function unstake() external isMiner(_msgSender()) returns (bool) {
        _unstake(_msgSender());
        emit MinerUnsubscribe(_msgSender());
        return (true);
    }

    function setValidator(
        address _miner
    ) external onlyOwnerRole(_msgSender()) returns (bool) {
        shares[_miner] = Share(0, 0);
        minerSubscription[_miner] = _nextYear(_miner);
        minerList.addMiner(_miner, MinerTypes.NodeType.Meta);
        emit MinerAdded(_miner, minerSubscription[_miner]);
        return (true);
    }

    function refreshValidator(
        address _miner
    ) external onlyOwnerRole(_msgSender()) returns (bool) {
        minerSubscription[_miner] = _nextYear(_miner);
        return (true);
    }

    function setPercent(
        address _miner,
        address[] memory _shareHolders,
        uint256[] memory _percents,
        uint256 _shareHoldersLength
    ) external onlyOwnerRole(_msgSender()) returns (bool) {
        Share storage share = shares[_miner];
        for (uint256 i = 0; i < _shareHoldersLength; i++) {
            address addr = _shareHolders[i];
            uint256 percent = _percents[i];
            uint256 nextPercent = share.sharedPercent + percent;

            require(nextPercent <= 100, "Total percent cannot exceed 100.");

            _addShareHolder(_miner, addr, percent);
            share.sharedPercent = nextPercent;
        }
        return (true);
    }

    function finalizeBlock(
        uint256 blockNumber
    ) external payable returns (bool) {
        bool status = _minerCheck(_msgSender());
        if (status == true) {
            IBlockValidator.BlockPayload memory blockPayload = blockValidator
                .blockPayloads(blockNumber);
            bool finalized = blockPayload.isFinalized;
            require(finalized == false, "Already finalized.");
            address coinbase = blockPayload.coinbase;
            uint256 blockReward = blockPayload.blockReward;

            require(_msgSender() == coinbase, "Wrong sender address.");
            require(msg.value >= blockReward, "Insufficient amount.");

            _shareIncome(_msgSender(), msg.value);

            bool result = blockValidator.finalizeBlock(blockNumber);
            require(result == true, "Unable to finalize block.");
        }

        return true;
    }

    function _nextYear(address _miner) internal view returns (uint256) {
        return (
            minerSubscription[_miner] > block.timestamp
                ? (minerSubscription[_miner] + YEAR)
                : (block.timestamp + YEAR)
        );
    }

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

    function _shareIncome(
        address _miner,
        uint256 _balance
    ) internal isMiner(_miner) validMinerSubscription(_miner) returns (bool) {
        uint256 _shareholderCount = shares[_miner].shareHolderCount;
        for (uint256 i = 0; i < _shareholderCount; i++) {
            Shareholder memory shareHolder = shareholders[_miner][i];
            uint256 holderPercent = (_balance * shareHolder.percent) / 100;
            (bool sent, ) = address(shareHolder.addr).call{
                value: holderPercent
            }("");
            require(sent, "_shareIncome failed.");
        }
        return (true);
    }

    function _unstake(address _miner) internal returns (bool) {
        (bool sent, ) = address(_miner).call{value: STAKE_AMOUNT}("");
        require(sent, "unstake failed.");
        minerList.deleteMiner(_miner, MinerTypes.NodeType.Meta);
        minerSubscription[_miner] = 0;
        return (true);
    }

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
