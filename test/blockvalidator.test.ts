import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei, mineBlock } from "../scripts/helpers";
import { BigNumber, BigNumberish } from "ethers";
import { BlockValidator, RewardsPool, MinerHealthCheck, MinerFormulas, MinerPool, MetaPoints, MinerList, Roles } from "../typechain-types";

describe("BlockValidator", function () {
    async function initiateVariables() {
        const [owner, manager, validator_1, validator_2, validator_3] =
            await ethers.getSigners();

        const BlockValidator_ = await ethers.getContractFactory(
            CONTRACTS.utils.BlockValidator
        );
        const blockValidator = await BlockValidator_.connect(owner).deploy() as BlockValidator;
        await blockValidator.deployed();

        const MinerHealthCheck_ = await ethers.getContractFactory(
            CONTRACTS.utils.MinerHealthCheck
        );
        const minerHealthCheck = await MinerHealthCheck_.connect(owner).deploy() as MinerHealthCheck;
        await minerHealthCheck.deployed();

        const MetaPoints_ = await ethers.getContractFactory(
            CONTRACTS.utils.MetaPoints
        );
        const metaPoints = await MetaPoints_.connect(owner).deploy() as MetaPoints;
        await metaPoints.deployed();

        const MinerFormulas_ = await ethers.getContractFactory(
            CONTRACTS.utils.MinerFormulas
        );
        const minerFormulas = await MinerFormulas_.connect(owner).deploy() as MinerFormulas;
        await minerFormulas.deployed();

        const MinerPool_ = await ethers.getContractFactory(
            CONTRACTS.core.MinerPool
        );
        const minerPool = await MinerPool_.connect(owner).deploy() as MinerPool;
        await minerPool.deployed();

        const MinerList_ = await ethers.getContractFactory(
            CONTRACTS.utils.MinerList
        );
        const minerList = await MinerList_.connect(owner).deploy() as MinerList;
        await minerList.deployed();

        const RewardsPool_ = await ethers.getContractFactory(
            CONTRACTS.core.RewardsPool
        );
        const rewardsPool = await RewardsPool_.connect(owner).deploy() as RewardsPool;
        await rewardsPool.deployed();

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            blockValidator,
            minerHealthCheck,
            minerFormulas,
            rewardsPool,
            minerPool,
            metaPoints,
            minerList,
            roles,
            owner,
            manager,
            validator_1,
            validator_2,
            validator_3
        };
    }

    // test BlockValidator
    describe("test blockvalidator contract", async () => {
        const minerHealthCheckTimeoutNumber:number = 14_400; // 4 hours
        const minerHealthCheckTimeout:BigNumber = BigNumber.from(String(minerHealthCheckTimeoutNumber));
        const metaminerType:BigNumber = BigNumber.from(String(0));

        const initContracts = async () => {
            const {
                owner,
                manager,
                validator_1,
                validator_2,
                validator_3,
                roles,
                blockValidator,
                minerHealthCheck,
                minerFormulas,
                minerPool,
                rewardsPool,
                metaPoints,
                minerList,
            } = await loadFixture(initiateVariables);

            await minerList.initRoles(roles.address);
            await minerPool.initRoles(roles.address);
            await metaPoints.initRoles(roles.address);
            await minerHealthCheck.initRoles(roles.address);
            await blockValidator.initRoles(roles.address);
            await rewardsPool.initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);

            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), blockValidator.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), rewardsPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerList.address);

            await roles.connect(owner).grantRole(await roles.VALIDATOR_ROLE(), validator_1.address);
            await roles.connect(owner).grantRole(await roles.VALIDATOR_ROLE(), validator_2.address);
            await roles.connect(owner).grantRole(await roles.VALIDATOR_ROLE(), validator_3.address);

            await minerHealthCheck.connect(owner).initialize(
                minerList.address,
                minerFormulas.address,
                minerPool.address,
                metaPoints.address,
                minerHealthCheckTimeout
            );

            await minerFormulas.connect(owner).initialize(
                metaPoints.address,
                minerList.address,
                minerHealthCheck.address
            );

            await minerPool.connect(owner).initialize(
                minerFormulas.address
            );

            await metaPoints.connect(owner).initialize();

            await minerList.connect(owner).initialize(
                minerHealthCheck.address
            );

            await rewardsPool.connect(owner).initialize(
                minerFormulas.address
            );

            await blockValidator.connect(owner).initialize(
                rewardsPool.address
            );
        }

        it("try to initialize with zero address", async () => {
            const { blockValidator, owner, rewardsPool } = await loadFixture(initiateVariables);

            await expect(blockValidator.connect(owner).initialize(
                ethers.constants.AddressZero
            )).revertedWith("BlockValidator: No zero address");
        }); 

        it("try to setBlockPayload with wrong payloads", async () => {
            const { validator_1, blockValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();
            
            const latestBlock = await blockValidator.provider.getBlock("latest");

            const blockNumber = latestBlock.number;

            await expect(
                blockValidator.connect(validator_1).setBlockPayload(blockNumber, {
                    coinbase: validator_1.address,
                    blockHash: "0xd502da602f23acd49758f8f2d4c1266808635890ba001835112204404c7d06d8",
                    blockReward: toWei("1"),
                    isFinalized: false
                })
            ).to.be.revertedWith("BlockValidator: Hash mismatch");
            await expect(
                blockValidator.connect(validator_1).setBlockPayload(blockNumber, {
                    coinbase: validator_1.address,
                    blockHash: latestBlock.hash,
                    blockReward: toWei("1"),
                    isFinalized: true
                })
            ).to.be.revertedWith("BlockValidator: Block finalized");
        }); 

        // try setBlockPayload with wallet which is dont have Validator role
        it("try setBlockPayload with wallet which is dont have Validator role", async () => {
            const { manager, blockValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();
            
            const latestBlock = await blockValidator.provider.getBlock("latest");

            const blockNumber = latestBlock.number;
            const blockPayload:BlockValidator.BlockPayloadStruct = {
                coinbase: manager.address,
                blockHash: latestBlock.hash,
                blockReward: toWei("1"),
                isFinalized: false
            };

            await expect(
                blockValidator.connect(manager).setBlockPayload(blockNumber, blockPayload)
            ).to.be.revertedWith("Roles: Validator role needed");
        });

        // try setBlockPayload with payload which is already setted
        it("try setBlockPayload with payload which is already setted", async () => {
            const { validator_1, blockValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            const latestBlock = await blockValidator.provider.getBlock("latest");

            const blockNumber = latestBlock.number;
            const blockPayload:BlockValidator.BlockPayloadStruct = {
                coinbase: validator_1.address,
                blockHash: latestBlock.hash,
                blockReward: toWei("1"),
                isFinalized: false
            };
            await blockValidator.connect(validator_1).setBlockPayload(blockNumber, blockPayload);

            await expect(
                blockValidator.connect(validator_1).setBlockPayload(blockNumber, blockPayload)
            ).to.be.revertedWith("BlockValidator: Payload issue");
        });

        // try finalizeBlock with wallet which is dont have Manager role
        it("try finalizeBlock with wallet which is dont have Manager role", async () => {
            const { validator_1, blockValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            const blockNumber = BigNumber.from(String(1));

            await expect(
                blockValidator.connect(validator_1).finalizeBlock(blockNumber)
            ).to.be.revertedWith("Roles: Manager role needed");
        });

        // try finalizeBlock with payload which is not setted
        it("try finalizeBlock with payload which is not setted", async () => {
            const { manager, blockValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            const blockNumber = BigNumber.from(String(1));

            await expect(
                blockValidator.connect(manager).finalizeBlock(blockNumber)
            ).to.be.revertedWith("BlockValidator: Can't finalize");
        });

        // try finalizeBlock when RewardsPool dont have enough balance
        it("try finalizeBlock when RewardsPool dont have enough balance", async () => {
            const { validator_1, validator_2, validator_3, manager, blockValidator, rewardsPool, minerList, minerFormulas } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await mineBlock(ethers, 100);

            const validators = [validator_1.address, validator_2.address, validator_3.address];

            // set validator as metaminer
            for (let i = 0; i < validators.length; i++) {
                const validator = validators[i];
                await minerList.connect(manager).addMiner(validator, metaminerType);
            }

            let currentValidator = 0;
            const pickValidator = ():string => {
                if(currentValidator == validators.length){
                    currentValidator = 0;
                }
                const pick = validators[currentValidator];
                currentValidator++;
                return pick;
            }

            interface payload {
                number:BigNumberish;
                payload:BlockValidator.BlockPayloadStruct;
            }

            const blockCount = 33;
            const blockPayloads:payload[] = [];
            

            // prepare payloads
            for (let i = 0; i < blockCount; i++) { 
                const block = await blockValidator.provider.getBlock(i);
                blockPayloads.push({
                    number: block.number,
                    payload: {
                        coinbase: pickValidator(),
                        blockHash: block.hash,
                        blockReward: toWei("1"),
                        isFinalized: false
                    }
                })
            }

            // set payloads
            for (let i = 0; i < blockCount; i++) { 
                const payload = blockPayloads[i];
                await blockValidator.connect(validator_1).setBlockPayload(payload.number, payload.payload);
            }

            // finalize payloads
            for (let i = 0; i < (blockCount - 1); i++) { 
                const payload = blockPayloads[i];
                await blockValidator.connect(manager).finalizeBlock(payload.number);
            }

            const lastPayload = blockPayloads[32];
            await expect(
                blockValidator.connect(manager).finalizeBlock(lastPayload.number)
            ).to.be.revertedWith("RewardsPool: Unable to claim"); 
        });

        // try 65x setBlockPayload and finalize
        it("try 65x setBlockPayload and finalize", async () => {
            const { validator_1, validator_2, validator_3, manager, blockValidator, rewardsPool, minerList, minerFormulas } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();
            await mineBlock(ethers, 100);

            // set funds to rewards pool
            await network.provider.send("hardhat_setBalance", [
                rewardsPool.address,
                "0x200000000000000000000000000000000000000000000000000000000000000"
            ]);

            const validators = [validator_1.address, validator_2.address, validator_3.address];

            // set validator as metaminer
            for (let i = 0; i < validators.length; i++) {
                const validator = validators[i];
                await minerList.connect(manager).addMiner(validator, metaminerType);
            }

            let currentValidator = 0;
            const pickValidator = ():string => {
                if(currentValidator == validators.length){
                    currentValidator = 0;
                }
                const pick = validators[currentValidator];
                currentValidator++;
                return pick;
            }

            interface payload {
                number:BigNumberish;
                payload:BlockValidator.BlockPayloadStruct;
            }

            const blockCount = 65;
            const blockPayloads:payload[] = [];
            

            // prepare payloads
            for (let i = 0; i < blockCount; i++) { 
                const block = await blockValidator.provider.getBlock(i);
                blockPayloads.push({
                    number: block.number,
                    payload: {
                        coinbase: pickValidator(),
                        blockHash: block.hash,
                        blockReward: toWei("1"),
                        isFinalized: false
                    }
                })
            }

            // set payloads
            for (let i = 0; i < blockCount; i++) { 
                const payload = blockPayloads[i];
                await blockValidator.connect(validator_1).setBlockPayload(payload.number, payload.payload);
            }

            // finalize payloads
            for (let i = 0; i < blockCount; i++) { 
                const payload = blockPayloads[i];
                await blockValidator.connect(manager).finalizeBlock(payload.number);
            }
        });
    });
});