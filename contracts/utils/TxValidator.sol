// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IMinerList.sol";
import "../interfaces/IMinerPool.sol";
import "../interfaces/IMetaPoints.sol";
import "../libs/MinerTypes.sol";

// A long time ago in a galaxy far, far away! :D
contract TxValidator is Initializable, RolesHandler {
    // web2 decide which macrominer will take tx
    // after decide event will be triggered
    // micro miners will listen event, after trigger they will call getTransaction of announced tx
    // micro miners can vote transactions of result -> true, false as existing on blocks


    // should we;
    // check activity of macrominer
    // is it actually macrominer

    // tx in kapanması verifyPoint || timeout
    // micro only voting
    // micro verifyPoint 3point(ether) & macro verifyPoint (5point(ether) * mpBalance)


    // google || huawei loadbalance with geo location
    // server anthill loadbalancer
    // post request to client anthill and contract event trigger

    uint256 public votePointLimit = 100 ether;
    uint256 public voteCountLimit = 32;
    uint256 public defaultVotePoint = 2 ether;
    IMinerList public minerList;
    IMinerPool public minerPool;
    IMetaPoints public metaPoints;
    mapping (bytes32 => TxPayload) public txPayloads;
    mapping (bytes32 => Votes[]) public txVotes;
    mapping(bytes32 => mapping(address => bool)) public previousVotes;

    struct Vote {
        // macro & micro only
        MinerTypes.NodeType nodeType;
        address voter;
        bool decision;
    }

    // ya votes 32 ya da vote points 100
    struct TxPayload {
        address handler;
        uint256 reward;
        uint256 votePoint;
        bool done;
    }
    
    event AddTransaction(bytes indexed txHash, address indexed handler, uint256 reward);
    event VoteTransaction(bytes indexed txHash, address indexed voter, uint256 decision);
    event DoneTransaction(bytes indexed txHash, uint256 reward);

    function initialize(address minerListAddress, address minerPointsAddress) external {
        minerList = IMinerList(minerListAddress);
        metaPoints = IMetaPoints(minerPointsAddress);
    }

    function addTransaction(bytes32 txHash, address handler, uint256 reward) onlyManagerRole(msg.sender) external returns (bool) {
        require(txPayload.handler == address(0), "Tx is already exist");
        txPayloads[txHash] = TxPayload(handler, reward, false);
        emit AddTransaction(txHash, handler, reward);
        return (true);
    }

    function voteTransaction(bytes32 txHash, bool decision, MinerTypes.NodeType nodeType) external returns (bool) {
        TxPayload storage txPayload = txPayloads[txHash];
        address voter = msg.sender;
        bool txState = _checkTransactionState(txHash);

        require(txState == false, "Tx is closed");
        require(txPayload.handler != address(0), "Tx doesn't exist");
        require(previousVotes[txHash][voter] != true, "Already voted");
        require(voter != txPayload.handler, "Handler cannot vote for tx");
        require(minerList.list[voter][nodeType] == true && nodeType != MinerTypes.nodeType.Meta, "Address is not eligible to vote");
        
        uint256 votePoint = _calculateVotePoint(voter, nodeType);

        txPayload.votePoint += votePoint;
        txPayload.votes[] = Vote(nodeType, voter, decision);

        emit VoteTransaction(txHash, voter, decision);
        _checkTransactionState(txHash);

        return (true);
    }

    function checkTransactionState(bytes32 txHash) external returns (bool) {
        return (_checkTransactionState(txHash));
    }

    function _checkTransactionState(bytes32 txHash) internal returns (bool) {
        TxPayload storage txPayload = txPayloads[txHash];
        Votes[] storage txVote = txVotes[txHash];
        
        if (txPayload.votePoint >= votePointLimit || txVote.length == voteCountLimit){
            txPayload.done = true;
            emit DoneTransaction(txHash, txPayload.reward);
        }
        
        return txPayload.done;
    }

    function _calculateVotePoint(address voter, MinerTypes.NodeType nodeType) internal view returns (uint256) {
        if (nodeType == MinerTypes.NodeType.Macro) {
            uint256 metaPointsBalance = metaPoints.balanceOf(voter);

            return (defaultVotePoint * metaPointsBalance);
        }

        // for micro miners
        return defaultVotePoint;
    }

    function _shareRewards(bytes32 txHash) internal returns (bool) {
        // metaminer blocktan geleni minerpool ve diğerlerine paylaştırıyor
        // macrominer daily reward alıyor minerpooldan
        
        // minerpooldan çekilen paranın hardcap i var;
        // archive a 75k - fullnode a 50k - light a 45k
        // total 170k daily eksilme ihtimali var
        // minerpool ilk balance i => 1_000_000_000 / 170_000 => 5882 gün => 16 yıl
        // ben bugün 25 yaşındayım bitince pool, 41 olucam LOL

        // ki bu fix orana göre iletlemekte bu değişken olması lazım fiyata göre (alt limiti şuanki fix oran)

        // buna göre metaminer dan gelen paranın yüzdesi kaç ise o orana göre verilmesi lazım, örnek;
        // blocktan gelen para 10 ether, 5 i minerpoola gidiyor bu sebeple %50 miner poolun,
        // tx ten gelen para yani blocka verilen para 1 ether ise 0.5 ether paylaşıltırılması lazım



        // sharing rewards from minerPool
        return (true);
    }
}