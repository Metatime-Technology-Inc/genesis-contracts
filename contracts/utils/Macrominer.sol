// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../libs/MinerTypes.sol";

import "../interfaces/IMinerHealthCheck.sol";
import "../interfaces/IMetaPoints.sol";
import "../interfaces/IMinerList.sol";

contract Macrominer is Context, Initializable {
    uint256 public constant STAKE_AMOUNT = 100 ether;
    uint256 public constant VOTE_POINT_LIMIT = 100;

    uint256 public voteId;
    IMinerHealthCheck public minerHealthCheck;
    IMetaPoints public metapoints;
    IMinerList public minerList;

    struct Vote {
        uint256 voteId;
        uint256 point;
    }

    mapping(address => mapping(MinerTypes.NodeType => Vote)) public votes;

    event BeginVote(
        uint256 indexed voteId,
        address indexed miner,
        MinerTypes.NodeType indexed nodeType
    );
    event Voted(
        uint256 indexed voteId,
        address indexed miner,
        MinerTypes.NodeType indexed nodeType,
        uint256 point
    );
    event EndVote(
        uint256 indexed voteId,
        address indexed miner,
        MinerTypes.NodeType indexed nodeType
    );

    modifier isMiner(address miner, MinerTypes.NodeType nodeType) {
        require(
            minerList.isMiner(miner, nodeType),
            "Address is not macrominer."
        );
        _;
    }

    modifier notMiner(address miner, MinerTypes.NodeType nodeType) {
        require(
            !minerList.isMiner(miner, nodeType),
            "Address is already macrominer."
        );
        _;
    }

    modifier isNodeTypeValid(MinerTypes.NodeType nodeType) {
        require(
            nodeType != MinerTypes.NodeType.Meta ||
                nodeType != MinerTypes.NodeType.Micro,
            "Wrong node type."
        );
        _;
    }

    receive() external payable {}

    function initialize(
        address minerHealthCheckAddress,
        address metapointsAddress,
        address minerListAddress
    ) external initializer {
        minerHealthCheck = IMinerHealthCheck(minerHealthCheckAddress);
        metapoints = IMetaPoints(metapointsAddress);
        minerList = IMinerList(minerListAddress);
    }

    function setMiner(
        MinerTypes.NodeType nodeType
    )
        external
        payable
        isNodeTypeValid(nodeType)
        notMiner(_msgSender(), nodeType)
        returns (bool)
    {
        require(
            msg.value == STAKE_AMOUNT,
            "You have to stake as required STAKE_AMOUNT."
        );
        minerList.addMiner(_msgSender(), nodeType);
        return (true);
    }

    // metapoint hard cap for each address
    // vote mech for kick miner from pool, auto unstake for miner, for 100 vote point -> unstake
    // to be miner miners have to stake
    function checkMinerStatus(
        address votedMinerAddress,
        MinerTypes.NodeType votedMinerNodeType,
        MinerTypes.NodeType nodeType
    )
        external
        isNodeTypeValid(votedMinerNodeType)
        isNodeTypeValid(nodeType)
        isMiner(votedMinerAddress, votedMinerNodeType)
        isMiner(_msgSender(), nodeType)
    {
        // check status
        bool isAlive = minerHealthCheck.status(
            votedMinerAddress,
            votedMinerNodeType
        );

        Vote storage vote = votes[votedMinerAddress][votedMinerNodeType];

        // -- false status
        if (isAlive == false) {
            // --- get checkers mp points
            uint256 mpBalance = metapoints.balanceOf(_msgSender());

            if (vote.point == 0) {
                vote.voteId = voteId;
                voteId++;

                emit BeginVote(
                    vote.voteId,
                    votedMinerAddress,
                    votedMinerNodeType
                );
            }

            if (mpBalance + vote.point >= VOTE_POINT_LIMIT) {
                // --- check if its bigger than limit after adding voting points, then decrement miner count and suspand miner
                _kickMiner(votedMinerAddress, votedMinerNodeType);

                emit EndVote(
                    vote.voteId,
                    votedMinerAddress,
                    votedMinerNodeType
                );
            } else {
                // --- check if its lower than limit after adding voting points, then increment voting points
                vote.point += mpBalance;

                emit Voted(
                    vote.voteId,
                    votedMinerAddress,
                    votedMinerNodeType,
                    mpBalance
                );
            }
        } else {
            delete votes[votedMinerAddress][votedMinerNodeType];

            emit EndVote(vote.voteId, votedMinerAddress, votedMinerNodeType);
        }
    }

    function _kickMiner(
        address minerAddress,
        MinerTypes.NodeType nodeType
    ) internal returns (bool) {
        delete votes[minerAddress][nodeType];
        minerList.deleteMiner(minerAddress, nodeType);
        (bool sent, ) = payable(minerAddress).call{value: STAKE_AMOUNT}("");

        require(sent, "Unstake failed.");
        return (true);
    }
}
