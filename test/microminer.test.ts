import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber, BytesLike } from "ethers";
import { Microminer, MinerHealthCheck, MinerFormulas, MinerPool, MetaPoints, MinerList, Roles } from "../typechain-types";

describe("MainnetBridge", function () {
    async function initiateVariables() {
        const [owner, manager, user] =
            await ethers.getSigners();

        const Microminer_ = await ethers.getContractFactory(
            CONTRACTS.utils.Microminer
        );
        const microMiner = await Microminer_.connect(owner).deploy() as Microminer;
        await microMiner.deployed();

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

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            microMiner,
            minerHealthCheck,
            minerFormulas,
            minerPool,
            metaPoints,
            minerList,
            roles,
            owner,
            manager,
            user,
        };
    }

    // test MicroMiner
    describe("test microminer contract", async () => {
        const minerHealthCheckTimeout = BigNumber.from(String(14_400)); // 4 hours
        const STAKE_AMOUNT = toWei(String(100));

        const initContracts = async () => {
            const {
                owner,
                manager,
                user,
                roles,
                microMiner,
                minerHealthCheck,
                minerFormulas,
                minerPool,
                metaPoints,
                minerList,
            } = await loadFixture(initiateVariables);

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
                roles.address
            );

            await microMiner.connect(owner).initialize(
                minerHealthCheck.address,
                metaPoints.address,
                minerList.address
            );

            await microMiner.initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);

            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), microMiner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerList.address);

            await roles.connect(owner).grantRole(await roles.DEVELOPER_ROLE(), user.address);
        }

        // try setMiner function when caller dont have enough funds
        it("try setMiner function when caller dont have enough funds", async () => {
            const { user, microMiner } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();
    
            await expect(
                microMiner.connect(user).setMiner()
            ).to.be.revertedWith("MicroMiner: You have to stake as required STAKE_AMOUNT");
        });

        // try setMiner function when everything is ok
        it("try setMiner function when everything is ok", async () => {
            const { user, microMiner } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await microMiner.connect(user).populateTransaction.setMiner();
            const transaction = await user.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });

            expect(
                await transaction.wait()
            ).to.be.ok;
        });

        // try setMiner function when caller already miner
        it("try setMiner function when caller already miner", async () => {
            const { user, microMiner } = await loadFixture(initiateVariables);
            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await microMiner.connect(user).populateTransaction.setMiner();
            const transaction = await user.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await transaction.wait();

            // setMiner again with STAKE_AMOUNT for revert
            const preparedContractTranscation2 = await microMiner.connect(user).populateTransaction.setMiner();

            await expect(
                user.sendTransaction({
                    ...preparedContractTranscation2,
                    value: STAKE_AMOUNT
                })
            ).to.be.revertedWith("MicroMiner: Address is already microminer");
        });

        // try kickMiner function when given minerAddress is not miner
        it("try kickMiner function when given minerAddress is not miner", async () => {
            const { manager, user, microMiner } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();
    
            await expect(
                microMiner.connect(manager).kickMiner(user.address)
            ).to.be.revertedWith("MicroMiner: Address is not microminer");
        });

        // try kickMiner function when everything is ok
        it("try kickMiner function when everything is ok", async () => {
            const { manager, user, microMiner } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await microMiner.connect(user).populateTransaction.setMiner();
            const transaction = await user.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await transaction.wait();
    
            expect(
                await microMiner.connect(manager).kickMiner(user.address)
            ).to.be.ok;
        });

        // try kickMiner function when caller dont have required role
        it("try kickMiner function when caller dont have required role", async () => {
            const { user, microMiner } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await microMiner.connect(user).populateTransaction.setMiner();
            const transaction = await user.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await transaction.wait();
    
            await expect(
                microMiner.connect(user).kickMiner(user.address)
            ).to.be.revertedWith("RolesHandler: Manager role is needed for this action");
        });
    });
});