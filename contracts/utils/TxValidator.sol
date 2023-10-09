// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IMinerList.sol";
import "../interfaces/IMinerPool.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerFormulas.sol";
import "../interfaces/IMinerHealthCheck.sol";
import "../libs/MinerTypes.sol";

// A long time ago in a galaxy far, far away! :D
contract TxValidator is Initializable, RolesHandler {
    enum TransactionState {
        Pending,
        Completed,
        Expired
    }
    uint256 public votePointLimit = 100 ether;
    uint256 public voteCountLimit = 32;
    uint256 public defaultVotePoint = 2 ether;
    uint256 public defaultExpireTime = 5 minutes;
    uint256 public constant HANDLER_PERCENT = 5_000;

    IMinerList public minerList;
    IMinerPool public minerPool;
    IMetaPoints public metaPoints;
    IMinerFormulas public minerFormulas;
    IMinerHealthCheck public minerHealthCheck;

    mapping(bytes32 => TxPayload) public txPayloads;
    mapping(bytes32 => mapping(uint256 => Vote)) public txVotes;
    mapping(bytes32 => uint256) public txVotesCount;
    mapping(bytes32 => mapping(address => bool)) public previousVotes;

    struct Vote {
        MinerTypes.NodeType nodeType;
        address voter;
        bool decision;
    }

    struct TxPayload {
        address handler;
        uint256 reward;
        uint256 votePoint;
        bool voteResult;
        bool expired;
        uint256 expireTime;
        bool done;
    }

    event AddTransaction(
        bytes32 indexed txHash,
        address indexed handler,
        uint256 reward
    );
    event VoteTransaction(
        bytes32 indexed txHash,
        address indexed voter,
        bool decision
    );
    event DoneTransaction(bytes32 indexed txHash, uint256 reward);
    event ExpireTransaction(bytes32 indexed txHash);

    function initialize(
        address minerListAddress,
        address metaPointsAddress,
        address minerFormulasAddress,
        address minerHealthCheckAddress,
        address minerPoolAddress
    ) external initializer {
        minerList = IMinerList(minerListAddress);
        metaPoints = IMetaPoints(metaPointsAddress);
        minerFormulas = IMinerFormulas(minerFormulasAddress);
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
        minerPool = IMinerPool(minerPoolAddress);
    }

    function addTransaction(
        bytes32 txHash,
        address handler,
        uint256 reward,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(msg.sender) returns (bool) {
        bool isAlive = minerHealthCheck.status(handler, nodeType);
        require(isAlive, "TxValidator: Miner is not active");
        TxPayload storage txPayload = txPayloads[txHash];
        require(
            txPayload.handler == address(0),
            "TxValidator: Tx is already exist"
        );
        txPayloads[txHash] = TxPayload(
            handler,
            reward,
            0,
            false,
            false,
            (block.timestamp + defaultExpireTime),
            false
        );
        emit AddTransaction(txHash, handler, reward);
        return (true);
    }

    function voteTransaction(
        bytes32 txHash,
        bool decision,
        MinerTypes.NodeType nodeType
    ) external returns (bool) {
        bool isAlive = minerHealthCheck.status(msg.sender, nodeType);
        require(isAlive, "TxValidator: Activity is not as expected");
        TxPayload storage txPayload = txPayloads[txHash];
        address voter = msg.sender;
        TransactionState txState = _checkTransactionState(txHash);

        require(
            txPayload.handler != address(0),
            "TxValidator: Tx doesn't exist"
        );
        require(
            txState == TransactionState.Pending,
            "TxValidator: Tx is closed"
        );
        require(
            previousVotes[txHash][voter] != true,
            "TxValidator: Already voted"
        );
        require(
            voter != txPayload.handler,
            "TxValidator: Handler cannot vote for tx"
        );
        require(
            minerList.list(voter, nodeType) == true &&
                nodeType != MinerTypes.NodeType.Meta,
            "TxValidator: Address is not eligible to vote"
        );

        uint256 votePoint = _calculateVotePoint(voter, nodeType);
        uint256 txVoteCount = txVotesCount[txHash];

        txPayload.votePoint += votePoint;
        txVotes[txHash][txVoteCount] = Vote(nodeType, voter, decision);
        previousVotes[txHash][voter] = true;
        txVotesCount[txHash]++;

        emit VoteTransaction(txHash, voter, decision);
        _checkTransactionState(txHash);

        return (true);
    }

    function checkTransactionState(
        bytes32 txHash
    ) external returns (TransactionState) {
        return (_checkTransactionState(txHash));
    }

    function _checkTransactionState(
        bytes32 txHash
    ) internal returns (TransactionState) {
        TxPayload storage txPayload = txPayloads[txHash];
        uint256 txVoteCount = txVotesCount[txHash];

        TransactionState state = TransactionState.Pending;

        if (
            (txPayload.votePoint >= votePointLimit ||
                txVoteCount == voteCountLimit) && txPayload.done == false
        ) {
            txPayload.done = true;
            _shareRewards(txHash);
            emit DoneTransaction(txHash, txPayload.reward);
        }
        if (txPayload.done != true && txPayload.expireTime < block.timestamp) {
            txPayload.expired = true;
            emit ExpireTransaction(txHash);
        }

        if (txPayload.done == true) {
            state = TransactionState.Completed;
        }
        if (txPayload.expired == true) {
            state = TransactionState.Expired;
        }

        return state;
    }

    function _calculateVotePoint(
        address voter,
        MinerTypes.NodeType nodeType
    ) internal view returns (uint256) {
        uint256 votePoint = defaultVotePoint;
        if (nodeType == MinerTypes.NodeType.Micro) {
            return votePoint;
        }

        uint256 metaPointsBalance = metaPoints.balanceOf(voter);
        votePoint *= (metaPointsBalance > 0 ? metaPointsBalance / 1 ether : 1);

        return votePoint;
    }

    function _shareRewards(bytes32 txHash) internal returns (bool) {
        TxPayload storage txPayload = txPayloads[txHash];
        uint256 txVoteCount = txVotesCount[txHash];

        address[32] memory trueVoters;
        address[32] memory falseVoters;
        uint256 trueVotersLength = 0;
        uint256 falseVotersLength = 0;

        for (uint256 i = 0; i < txVoteCount; i++) {
            Vote memory vote = txVotes[txHash][i];
            if (vote.decision) {
                trueVoters[trueVotersLength] = vote.voter;
                trueVotersLength++;
                continue;
            }
            falseVoters[falseVotersLength] = vote.voter;
            falseVotersLength++;
        }

        bool tie = (trueVotersLength == falseVotersLength ? true : false);
        bool decision = (trueVotersLength > falseVotersLength ? true : false);

        if (!tie) {
            uint256 txReward = txPayload.reward;
            uint256 minerPoolPercent = (minerFormulas.BASE_DIVIDER() /
                minerFormulas.METAMINER_MINER_POOL_SHARE_PERCENT());
            txReward /= minerPoolPercent;

            uint256 handlerReward = txReward /
                (minerFormulas.BASE_DIVIDER() / HANDLER_PERCENT);
            if (decision) {
                uint256 voteReward = (txReward - handlerReward) /
                    trueVotersLength;
                minerPool.claimTxReward(txPayload.handler, handlerReward);
                for (uint256 i = 0; i < trueVotersLength; i++) {
                    address trueVoter = trueVoters[i];
                    minerPool.claimTxReward(trueVoter, voteReward);
                }
            } else {
                uint256 voteReward = txReward / falseVotersLength;
                for (uint256 i = 0; i < falseVotersLength; i++) {
                    address falseVoter = falseVoters[i];
                    minerPool.claimTxReward(falseVoter, voteReward);
                }
            }
        }
        return (true);
    }
}
