import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { MinerHealthCheck, MinerFormulas, MinerPool, MetaPoints, MinerList, Roles } from "../typechain-types";

describe("MinerPool", function () {
    async function initiateVariables() {
        const [owner, manager, miner_1, miner_2, miner_3] =
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
            minerHealthCheck,
            minerFormulas,
            minerPool,
            metaPoints,
            minerList,
            roles,
            owner,
            manager,
            miner_1,
            miner_2,
            miner_3
        };
    }

    // test MinerPool
    describe("test minerpool contract", async () => {

        const minerHealthCheckTimeoutNumber:number = 14_400; // 4 hours
        const txValidatorDefaultExpireTime:number = 300; // 5 minutes
        const minerHealthCheckTimeout:BigNumberish = BigNumber.from(String(minerHealthCheckTimeoutNumber));
        const metaminerType:BigNumber = BigNumber.from(String(0));
        const macrominerArchiveType:BigNumberish = BigNumber.from(String(1));
        const microminerType:BigNumberish = BigNumber.from(String(4));
        const funds:BigNumberish = toWei(String(100));

        const initContracts = async () => {
            const {
                owner,
                manager,
                miner_1,
                roles,
                minerHealthCheck,
                minerFormulas,
                minerPool,
                metaPoints,
                minerList,
            } = await loadFixture(initiateVariables);

            await minerList.connect(owner).initRoles(roles.address);
            await minerPool.connect(owner).initRoles(roles.address);
            await metaPoints.connect(owner).initRoles(roles.address);
            await minerHealthCheck.connect(owner).initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);

            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerList.address);

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
        }

        // try initialize function with zero address
        it("try initialize function with zero address", async () => {
            const { owner, minerPool } = await loadFixture(initiateVariables);
    
            await expect(
                minerPool.connect(owner).initialize(ethers.constants.AddressZero)
            ).to.be.revertedWith("MinerPool: No zero address");
        });

        // try claimTxReward function when contract dont have enough funds
        it("try claimTxReward function when contract dont have enough funds", async () => {
            const { manager, miner_1, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                minerPool.connect(manager).claimTxReward(miner_1.address, funds)
            ).to.be.revertedWith("MinerPool: Unable to send");
        });
    });
});