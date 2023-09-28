// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";
import "../interfaces/IRewardsPool.sol";
import "../interfaces/IMinerList.sol";
import "../libs/MinerTypes.sol";

/**
 * @title BlockValidator
 * @dev A smart contract for validating and finalizing blocks.
 */
contract BlockValidator is Context, Initializable, RolesHandler {
    uint256[32] public lastVerifiedBlocknumbers;
    uint8 public constant DELAY_LIMIT = 32;
    mapping(uint256 => BlockPayload) public blockPayloads;
    IMinerList public minerList;
    IRewardsPool public rewardsPool;
    uint8 private _verifiedBlockId = 0;

    struct BlockPayload {
        address coinbase;
        bytes32 blockHash;
        uint256 blockReward;
        bool isFinalized;
    }

    /**
     * @dev Modifier to check if an address is a Metaminer.
     * @param _miner The address to check.
     */
    modifier isMiner(address _miner) {
        require(
            minerList.isMiner(_miner, MinerTypes.NodeType.Meta),
            "Address is not metaminer."
        );
        _;
    }

    event SetPayload(uint256 blockNumber);
    event FinalizeBlock(uint256 blockNumber);
    event Claim(
        address indexed coinbase,
        bytes32 indexed blockNumber,
        uint256 claimedAmount,
        uint256 blockReward
    );

    /**
     * @dev Initializes the BlockValidator contract with the addresses of the MinerList and RewardsPool contracts.
     * @param minerListAddress The address of the MinerList contract.
     * @param rewardsPoolAddress The address of the RewardsPool contract.
     */
    function initialize(
        address minerListAddress,
        address rewardsPoolAddress
    ) external initializer {
        minerList = IMinerList(minerListAddress);
        rewardsPool = IRewardsPool(rewardsPoolAddress);
    }

    /**
     * @dev Adds a payload to the queue for a specific block.
     * @param blockNumber The block number for which to set the payload.
     * @param blockPayload The block payload to set.
     * @return A boolean indicating whether the operation was successful.
     */
    function setBlockPayload(
        uint256 blockNumber,
        BlockPayload memory blockPayload
    ) external isMiner(_msgSender()) returns (bool) {
        require(
            blockPayloads[blockNumber].coinbase == address(0),
            "setBlockPayload: Unable to set block payload."
        );
        blockPayloads[blockNumber] = blockPayload;

        emit SetPayload(blockNumber);

        return true;
    }

    /**
     * @dev Finalizes a block by marking it as finalized.
     * @param blockNumber The block number to finalize.
     * @return A boolean indicating whether the operation was successful.
     */
    function finalizeBlock(
        uint256 blockNumber
    ) external onlyManagerRole(_msgSender()) returns (bool) {
        BlockPayload storage payload = blockPayloads[blockNumber];
        require(
            payload.coinbase != address(0),
            "finalizeBlock: Unable to finalize block."
        );

        payload.isFinalized = true;

        if (_verifiedBlockId == DELAY_LIMIT) {
            uint8 i = 0;
            for (i; i < DELAY_LIMIT; i++) {
                BlockPayload memory bp = blockPayloads[
                    lastVerifiedBlocknumbers[i]
                ];

                uint256 result = rewardsPool.claim(bp.coinbase);
                emit Claim(bp.coinbase, bp.blockHash, result, bp.blockReward);
            }

            _verifiedBlockId = 0;
            delete lastVerifiedBlocknumbers;
        }

        lastVerifiedBlocknumbers[_verifiedBlockId] = blockNumber;
        _verifiedBlockId++;

        emit FinalizeBlock(blockNumber);

        return true;
    }
}
