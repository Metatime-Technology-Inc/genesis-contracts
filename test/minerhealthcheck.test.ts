import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { MinerHealthCheck, MetaPoints, MinerFormulas, MinerPool, MinerList, Roles } from "../typechain-types";
import { BigNumber, BigNumberish } from "ethers";

describe("MinerHealthCheck", function () {
    async function initiateVariables() {
        const [owner] =
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

        const initContracts = async () => {
            const {
                owner,
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

        // try setTimeout function
        it("try setTimeout function", async () => {
            const { owner, minerHealthCheck } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await minerHealthCheck.connect(owner).setTimeout(minerHealthCheckTimeout)
            ).to.be.ok;
        });
    });
});