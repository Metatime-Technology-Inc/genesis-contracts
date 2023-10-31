import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber, BigNumberish } from "ethers";
import { MinerHealthCheck, MinerFormulas, MinerPool, MetaPoints, MinerList, Roles } from "../typechain-types";

describe("MinerList", function () {
    async function initiateVariables() {
        const [owner, manager, miner] =
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
            miner,
        };
    }

    // test MinerList
    describe("test minerlist contract", async () => {
        const minerHealthCheckTimeout:BigNumberish = BigNumber.from(String(14_400)); // 4 hours
        const metaminerType: BigNumber = BigNumber.from(String(0));

        const initContracts = async () => {
            const {
                owner,
                manager,
                roles,
                minerHealthCheck,
                minerFormulas,
                minerPool,
                metaPoints,
                minerList,
            } = await loadFixture(initiateVariables);

            await minerHealthCheck.initRoles(roles.address);
            await minerPool.initRoles(roles.address);
            await minerList.initRoles(roles.address);

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
            const { owner, minerList } = await loadFixture(initiateVariables);
    
            await expect(
                minerList.connect(owner).initialize(
                    ethers.constants.AddressZero
                )
            ).to.be.revertedWith("MinerList: No zero address");
        });

        // try addMiner function when miner already miner
        it("try addMiner function when miner already miner", async () => {
            const { miner, manager, minerList } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();

            await minerList.connect(manager).addMiner(miner.address, metaminerType);
    
            await expect(
                minerList.connect(manager).addMiner(miner.address, metaminerType)
            ).to.be.revertedWith("MinerList: Already miner");
        });

        // try deleteMiner function when miner not a miner
        it("try deleteMiner function when miner not a miner", async () => {
            const { miner, manager, minerList } = await loadFixture(initiateVariables);
    
            // init contracts
            await initContracts();
    
            await expect(
                minerList.connect(manager).deleteMiner(miner.address, metaminerType)
            ).to.be.revertedWith("MinerList: Not a miner");
        });
    });
});