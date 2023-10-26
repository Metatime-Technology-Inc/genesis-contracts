import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { MinerFormulas, MetaPoints, MinerList, MinerHealthCheck, MinerPool, Roles } from "../typechain-types";
import { BigNumber, BigNumberish } from "ethers";
import { incrementBlocktimestamp, getBlockTimestamp, toWei } from "../scripts/helpers";

describe("MinerFormulas", function () {
    async function initiateVariables() {
        const [owner, manager] =
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
            minerHealthCheck,
            metaPoints,
            minerFormulas,
            minerPool,
            minerList,
            roles
        };
    }

    // test MinerFormulas
    describe("test minerformulas contract", async () => {
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
                minerHealthCheck.address
            );
        }

        const multiplier = toWei("0.00000001");
        const multiplier2 = toWei("0.0001");
        const multiplier3 = toWei("1000000");
        const secondsInADay = BigNumber.from("86400");
        const secondsInADay2 = BigNumber.from("86400").mul(multiplier2);

        const calculateMetaPoint = (activity:BigNumber) => {
            return toWei("1").div(secondsInADay).mul(activity);
        }

        const calculateFormulas1 = (poolAmount:BigNumber, nodeCount:BigNumber) => {
            // return ((DAILY_CALC_POOL_REWARD / (24 * TOTAL_NODE_COUNT)) / SECONDS_IN_A_DAY);
            const step1 = nodeCount.mul(BigNumber.from(String(24)));
            const step2 = poolAmount.div(step1).div(secondsInADay);
            return step2;
        }

        const calculateFormulas2 = (poolAmount:BigNumber, nodeCount:BigNumber, activity:BigNumber) => {
            // return (((REST_POOL_AMOUNT * 1e18 / (TOTAL_SUPPLY_META_POINTS * (MINERS_TOTAL_ACTIVITIES * 1e18 / (TOTAL_NODE_COUNT * 24)))) * MINER_META_POINT * (MINER_ACTIVITY / 24)) / SECONDS_IN_A_DAY);
            const step1 = (activity.mul(multiplier)).div((nodeCount.mul(BigNumber.from(String(24)))));
            const step2 = poolAmount.mul(multiplier3).div((calculateMetaPoint(activity).mul(step1)));
            const step3 = step2.mul(calculateMetaPoint(activity)).mul((activity.div(BigNumber.from(String(24))))).div(secondsInADay2);

            return step3;
        }

        // try initialize function with zero address
        it("try initialize function with zero address", async () => {
            const { owner, minerFormulas } = await loadFixture(initiateVariables);
    
            await expect(
                minerFormulas.connect(owner).initialize(
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero
                )
            ).to.be.revertedWith("MinerFormulas: cannot set zero address");
        });

        // try calculateDailyPoolRewardsFromFirstFormula function with wrong nodeType
        it("try calculateDailyPoolRewardsFromFirstFormula function with wrong nodeType", async () => {
            const { minerFormulas } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await minerFormulas.calculateDailyPoolRewardsFromFirstFormula(metaminerType)
            ).to.be.equal(BigNumber.from(String(0)));
        });

        // try calculateDailyPoolRewardsFromSecondFormula function with wrong nodeType
        it("try calculateDailyPoolRewardsFromSecondFormula function with wrong nodeType", async () => {
            const { minerFormulas } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await minerFormulas.calculateDailyPoolRewardsFromSecondFormula(minerFormulas.address, metaminerType)
            ).to.be.equal(BigNumber.from(String(0)));
        });

        // try calculateDailyPoolRewardsFromFirstFormula function test calculate
        it("try calculateDailyPoolRewardsFromFirstFormula function test calculate", async () => {
            const { manager, minerFormulas, minerList } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // addMiner
            const addMiner = await minerList.connect(manager).addMiner(manager.address, macrominerArchiveType);
            await addMiner.wait();

            const contractCalc = await minerFormulas.calculateDailyPoolRewardsFromFirstFormula(macrominerArchiveType);
            const jsCalc = calculateFormulas1(toWei("135000"), BigNumber.from(String(1)));

            expect(
                contractCalc
            ).to.be.equal(jsCalc);
        });

        // try calculateDailyPoolRewardsFromSecondFormula function test calculate
        it("try calculateDailyPoolRewardsFromSecondFormula function test calculate", async () => {
            const { manager, minerFormulas, minerList, minerHealthCheck, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // set funds to miner pool
            await network.provider.send("hardhat_setBalance", [
                minerPool.address,
                "0x200000000000000000000000000000000000000000000000000000000000000"
            ]);

            // addMiner
            const addMiner = await minerList.connect(manager).addMiner(manager.address, macrominerArchiveType);
            await addMiner.wait();
            const begin = await getBlockTimestamp(ethers);

            // increment
            await incrementBlocktimestamp(ethers, (minerHealthCheckTimeoutNumber / 2));

            // ping
            const pingTX = await minerHealthCheck.connect(manager).ping(macrominerArchiveType);
            await pingTX.wait();

            const diff = (begin - await getBlockTimestamp(ethers));
            const contractCalc = await minerFormulas.calculateDailyPoolRewardsFromSecondFormula(manager.address, macrominerArchiveType);
            const jsCalc = calculateFormulas2(toWei("15000"), BigNumber.from(String(1)), BigNumber.from(String(diff)));

            expect(
                contractCalc
            ).to.be.equal(jsCalc);
        });

        // try formulaProportion function test calculate
        it("try formulaProportion function test calculate", async () => {
            const { manager, minerFormulas, minerList, minerHealthCheck, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            const calc1 = await minerFormulas.formulaProportion(200, 100, 150);
            expect(
                calc1[0]
            ).to.be.equal(100);
            
            const calc2 = await minerFormulas.formulaProportion(204, 100, 150);
            expect(
                calc2[0]
            ).to.be.equal(101);
            
            const calc3 = await minerFormulas.formulaProportion(1, 204, 150);
            expect(
                calc3[0]
            ).to.be.equal(1);

            const calc4 = await minerFormulas.formulaProportion(1, 166, 150);
            expect(
                calc4[1]
            ).to.be.equal(149);
        });
    });
});