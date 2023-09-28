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
    uint256 public constant HANDLER_PERCENT = 50;

    IMinerList public minerList;
    IMinerPool public minerPool;
    IMetaPoints public metaPoints;
    IMinerFormulas public minerFormulas;
    IMinerHealthCheck public minerHealthCheck;

    mapping(bytes32 => TxPayload) public txPayloads;
    mapping(bytes32 => Vote[]) public txVotes;
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
        address minerPointsAddress,
        address minerFormulasAddress,
        address minerHealthCheckAddress
    ) external {
        minerList = IMinerList(minerListAddress);
        metaPoints = IMetaPoints(minerPointsAddress);
        minerFormulas = IMinerFormulas(minerFormulasAddress);
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
    }

    function addTransaction(
        bytes32 txHash,
        address handler,
        uint256 reward,
        MinerTypes.NodeType nodeType
    ) external onlyManagerRole(msg.sender) returns (bool) {
        bool isAlive = minerHealthCheck.status(handler, nodeType);
        require(isAlive, "Miner is not active");
        TxPayload storage txPayload = txPayloads[txHash];
        require(txPayload.handler == address(0), "Tx is already exist");
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
        require(isAlive, "Activity is not as expected");
        TxPayload storage txPayload = txPayloads[txHash];
        address voter = msg.sender;
        TransactionState txState = _checkTransactionState(txHash);

        require(txState == TransactionState.Pending, "Tx is closed");
        require(txPayload.handler != address(0), "Tx doesn't exist");
        require(previousVotes[txHash][voter] != true, "Already voted");
        require(voter != txPayload.handler, "Handler cannot vote for tx");
        require(
            minerList.list(voter, nodeType) == true &&
                nodeType != MinerTypes.NodeType.Meta,
            "Address is not eligible to vote"
        );

        uint256 votePoint = _calculateVotePoint(voter, nodeType);

        txPayload.votePoint += votePoint;
        txVotes[txHash].push(Vote(nodeType, voter, decision));

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
        Vote[] storage txVote = txVotes[txHash];

        TransactionState state = TransactionState.Pending;

        if (
            (txPayload.votePoint >= votePointLimit ||
                txVote.length == voteCountLimit) && txPayload.done == false
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
        if (nodeType == MinerTypes.NodeType.Micro) {
            // for micro miners
            return defaultVotePoint;
        }

        uint256 metaPointsBalance = metaPoints.balanceOf(voter);
        return (defaultVotePoint * metaPointsBalance);
    }

    function _shareRewards(bytes32 txHash) internal returns (bool) {
        TxPayload storage txPayload = txPayloads[txHash];
        Vote[] storage txVote = txVotes[txHash];

        address[] memory trueVoters;
        address[] memory falseVoters;
        for (uint256 i = 0; i < txVote.length; i++) {
            Vote memory vote = txVote[i];
            if (vote.decision) {
                trueVoters[trueVoters.length] = vote.voter;
                continue;
            }
            falseVoters[falseVoters.length] = vote.voter;
        }

        bool tie = (trueVoters.length == falseVoters.length ? true : false);
        bool decision = (trueVoters.length > falseVoters.length ? true : false);

        if (!tie) {
            uint256 txReward = txPayload.reward;
            uint256 minerPoolPercent = (100 /
                minerFormulas.METAMINER_MINER_POOL_SHARE_PERCENT());
            txReward /= minerPoolPercent;

            uint256 handlerReward = txReward / (100 / HANDLER_PERCENT);
            uint256 voteReward = (txReward - handlerReward) / txVote.length;
            if (decision) {
                // send handler reward
                for (uint256 i2 = 0; i2 < trueVoters.length; i2++) {
                    address trueVoter = trueVoters[i2];
                    // send voter reward
                }
            } else {
                voteReward = txReward / txVote.length;
                for (uint256 i2 = 0; i2 < falseVoters.length; i2++) {
                    address falseVoter = falseVoters[i2];
                    // send voter reward
                }
            }
        }
        return (true);
    }
}
