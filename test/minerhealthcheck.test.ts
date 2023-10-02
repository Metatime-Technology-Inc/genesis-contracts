import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { MinerHealthCheck, MetaPoints, MinerFormulas, MinerPool, MinerList, Roles } from "../typechain-types";
import { BigNumber, BigNumberish } from "ethers";
import { incrementBlocktimestamp, toWei } from "../scripts/helpers";

describe("MinerHealthCheck", function () {
    async function initiateVariables() {
        const [owner, manager, miner_1] =
            await ethers.getSigners();

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
            owner,
            manager,
            miner_1,
            minerHealthCheck,
            metaPoints,
            minerFormulas,
            minerPool,
            minerList,
            roles
        };
    }

    // test MinerHealthCheck
    describe("test minerhealthcheck contract", async () => {
        const minerHealthCheckTimeoutNumber:number = 14_400; // 4 hours
        const minerHealthCheckTimeout:BigNumberish = BigNumber.from(String(minerHealthCheckTimeoutNumber));
        const metaminerType:BigNumberish = BigNumber.from(String(0));
        const macrominerArchiveType:BigNumberish = BigNumber.from(String(1));

        const initContracts = async () => {
            const {
                owner,
                manager,
                roles,
                minerHealthCheck,
                metaPoints,
                minerFormulas,
                minerPool,
                minerList
            } = await loadFixture(initiateVariables);

            await minerList.initRoles(roles.address);
            await minerPool.initRoles(roles.address);
            await metaPoints.initRoles(roles.address);
            await minerHealthCheck.initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);

            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerList.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);


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
                roles.address,
                minerHealthCheck.address
            );
        }

        // try ping function when caller is not miner
        it("try ping function when caller is not miner", async () => {
            const { owner, minerHealthCheck } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                minerHealthCheck.connect(owner).ping(metaminerType)
            ).to.be.revertedWith("MinerHealthCheck: Address is not miner");
        });

        // try ping function when caller is metaminer
        it("try ping function when caller is metaminer", async () => {
            const { owner, manager, miner_1, minerHealthCheck, minerList } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // addMiner
            const addMiner = await minerList.connect(manager).addMiner(miner_1.address, metaminerType);
            await addMiner.wait();

            expect(
                await minerHealthCheck.connect(miner_1).ping(metaminerType)
            ).to.be.ok;
        });

        // try setTimeout function
        it("try setTimeout function", async () => {
            const { owner, minerHealthCheck } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await minerHealthCheck.connect(owner).setTimeout(minerHealthCheckTimeout)
            ).to.be.ok;
        });

        // try ping function when minerpool dont have enough funds for formula 1
        it("try ping function when minerpool dont have enough funds for formula 1", async () => {
            const { owner, manager, miner_1, minerHealthCheck, minerList } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // addMiner
            const addMiner = await minerList.connect(manager).addMiner(miner_1.address, macrominerArchiveType);
            await addMiner.wait();

            // increment
            await incrementBlocktimestamp(ethers, (minerHealthCheckTimeoutNumber / 2));

            await expect(
                minerHealthCheck.connect(miner_1).ping(macrominerArchiveType)
            ).to.be.revertedWith("MinerPool: Unable to claim");
        });

        // try ping function when minerpool dont have enough funds for formula 2
        it("try ping function when minerpool dont have enough funds for formula 2", async () => {
            const { owner, manager, miner_1, minerHealthCheck, minerList, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(150))
            });
            await fundsTX.wait();

            // addMiner
            const addMiner = await minerList.connect(manager).addMiner(miner_1.address, macrominerArchiveType);
            await addMiner.wait();

            // increment
            await incrementBlocktimestamp(ethers, (minerHealthCheckTimeoutNumber / 2));

            await expect(
                minerHealthCheck.connect(miner_1).ping(macrominerArchiveType)
            ).to.be.revertedWith("MinerPool: Unable to claim");
        });
    });
});