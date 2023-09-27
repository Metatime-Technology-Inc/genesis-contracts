import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { incrementBlocktimestamp, toWei, getBlockTimestamp, calculateClaimableAmount } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Distributor, Distributor__factory, MTC, PoolFactory, TokenDistributor__factory } from "../typechain-types";

const METATIME_TOKEN_SUPPLY = 10_000_000_000;
const SECONDS_IN_A_DAY = 60 * 24 * 60;
const TWO_DAYS_IN_SECONDS = 2 * SECONDS_IN_A_DAY;

describe("Distributor", function () {
    async function initiateVariables() {
        const [deployer, user_1, user_2, user_3, user_4, user_5] =
            await ethers.getSigners();

        const MTC_ = await ethers.getContractFactory(
            CONTRACTS.core.MTC
        );
        const mtc = await MTC_.connect(deployer).deploy(toWei(String(METATIME_TOKEN_SUPPLY))) as MTC;
        await mtc.deployed();

        const PoolFactory_ = await ethers.getContractFactory(
            CONTRACTS.utils.PoolFactory
        );
        const poolFactory = await PoolFactory_.connect(deployer).deploy() as PoolFactory;
        await poolFactory.deployed();

        const Distributor_ = await ethers.getContractFactory(
            CONTRACTS.core.Distributor
        );
        const distributor = await Distributor_.connect(deployer).deploy() as Distributor;
        await distributor.deployed();

        return {
            mtc,
            poolFactory,
            deployer,
            distributor,
            user_1,
            user_2,
            user_3,
            user_4,
            user_5,
        };
    }

    // Test Distributor
    describe("Create Distributor and test claiming period", async () => {
        let currentBlockTimestamp: number;
        const POOL_NAME = "TestDistributor";
        let START_TIME: number;
        let END_TIME: number;
        const DISTRIBUTION_RATE = 5_000;
        const PERIOD_LENGTH = 86400;
        const LOCKED_AMOUNT = toWei(String(100_000));
        let LAST_CLAIM_TIME: number;
        const LEFT_CLAIMABLE_AMOUNT = toWei(String(50_000));

        // case is to migrate left claimable amounts to new contract
        // last claim time is one day after start time
        this.beforeAll(async () => {
            currentBlockTimestamp = await getBlockTimestamp(ethers);
            START_TIME = currentBlockTimestamp + 500_000;
            LAST_CLAIM_TIME = START_TIME + SECONDS_IN_A_DAY;
            END_TIME = START_TIME + TWO_DAYS_IN_SECONDS;
        });

        // Try to create TokenDistributor with address who is not owner of contract and expect revert
        it("try to create TokenDistributor with address who is not owner of contract and expect revert", async () => {
            const { user_1, poolFactory } = await loadFixture(initiateVariables);

            await expect(poolFactory.connect(user_1).createDistributor(
                POOL_NAME,
                ethers.constants.AddressZero,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            )).to.be.revertedWith("Ownable: caller is not the owner");
        });

        // Try to create with 0x token address and expect to be reverted
        it("try to create with 0x token address and expect revert", async () => {
            const { deployer, poolFactory } = await loadFixture(initiateVariables);

            await expect(poolFactory.connect(deployer).createDistributor(
                POOL_NAME,
                ethers.constants.AddressZero,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT
            )).to.be.revertedWith("PoolFactory: invalid token address");
        });

        // Try to initialize implementation and expect to be reverted
        it("try to initialize implementation and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            const implementationAddress = await poolFactory.distributorImplementation();

            const implementationInstance = Distributor__factory.connect(implementationAddress, deployer);

            await expect(implementationInstance.initialize(
                deployer.address,
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            )).to.be.revertedWith("Initializable: contract is already initialized");
        });

        // Try to initialize Distributor with start time bigger than end time and expect to be reverted
        it("try to initialize Distributor with start time bigger than end time and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            // try with wrong distribution rate
            await expect(
                poolFactory.connect(deployer).createDistributor(
                    POOL_NAME,
                    mtc.address,
                    END_TIME,
                    START_TIME,
                    DISTRIBUTION_RATE,
                    PERIOD_LENGTH,
                    LAST_CLAIM_TIME,
                    LOCKED_AMOUNT,
                    LEFT_CLAIMABLE_AMOUNT,
                )
            ).to.be.revertedWith("Distributor: end time must be bigger than start time");
        });

        // // Try to initalize Distributor with wrong params (isParamsValid) and expect to be reverted
        // it("try to initalize Distributor with wrong params (isParamsValid) and expect to be reverted", async () => {
        //     const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

        //     // try with wrong distribution rate
        //     await expect(
        //         poolFactory.connect(deployer).createDistributor(
        //             POOL_NAME,
        //             mtc.address,
        //             START_TIME,
        //             END_TIME,
        //             DISTRIBUTION_RATE + 1000,
        //             PERIOD_LENGTH,
        //             LAST_CLAIM_TIME,
        //             LOCKED_AMOUNT,
        //             LEFT_CLAIMABLE_AMOUNT
        //         )
        //     ).to.be.revertedWith("Distributor: invalid parameters");
        // });

        // Try to initialize TokenDistributor with correct params
        it("try to initialize Distributor with correct params", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            );

            const distributorAddress = await poolFactory.getDistributor(0);
            const distributorInstance = Distributor__factory.connect(distributorAddress, deployer);

            expect(await distributorInstance.poolName()).to.be.equal(POOL_NAME);
            expect(await distributorInstance.token()).to.be.equal(mtc.address);
            expect(await distributorInstance.startTime()).to.be.equal(START_TIME);
            expect(await distributorInstance.endTime()).to.be.equal(END_TIME);
            expect(await distributorInstance.distributionRate()).to.be.equal(DISTRIBUTION_RATE);
            expect(await distributorInstance.periodLength()).to.be.equal(PERIOD_LENGTH);
        });

        // Try to update pool params after distribution period started and expect to be reverted
        it("try to update pool params after distribution period started and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            );

            const distributorAddress = await poolFactory.getDistributor(0);
            const distributorInstance = Distributor__factory.connect(distributorAddress, deployer);

            await incrementBlocktimestamp(ethers, 500_000);

            await expect(distributorInstance.updatePoolParams(
                START_TIME + 1,
                END_TIME + 1,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LOCKED_AMOUNT
            )).to.be.revertedWith("Distributor: claim period has already started");
        });

        // Try to update pool params successfully
        it("try to update pool params successfully", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            );

            const distributorAddress = await poolFactory.getDistributor(0);
            const distributorInstance = Distributor__factory.connect(distributorAddress, deployer);

            await distributorInstance.updatePoolParams(
                START_TIME + 1,
                END_TIME + 1,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LOCKED_AMOUNT
            );

            expect(await distributorInstance.startTime()).to.be.equal(START_TIME + 1);
            expect(await distributorInstance.endTime()).to.be.equal(END_TIME + 1);
        });

        // Try to claim
        it("try to claim after distribution started but claim not ended", async () => {
            const { deployer, user_1, mtc, poolFactory } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
                LAST_CLAIM_TIME,
                LOCKED_AMOUNT,
                LEFT_CLAIMABLE_AMOUNT,
            );

            const distributorAddress = await poolFactory.getDistributor(0);
            const distributorInstance = Distributor__factory.connect(distributorAddress, deployer);

            const pool: MTC.PoolStruct = {
                addr: distributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            await expect(distributorInstance.connect(deployer).claim()).to.be.revertedWith("Distributor: distribution has not started yet");

            await incrementBlocktimestamp(ethers, 500_000 + SECONDS_IN_A_DAY);
            
            await expect(distributorInstance.connect(user_1).claim()).to.be.revertedWith("Ownable: caller is not the owner");

            const lastClaimTime = await distributorInstance.lastClaimTime();
            let deployerBalance = await mtc.balanceOf(deployer.address);

            const blockTimestamp_1 = await getBlockTimestamp(ethers);

            const calculatedClaimableAmount = calculateClaimableAmount(BigNumber.from(blockTimestamp_1), lastClaimTime, PERIOD_LENGTH, LOCKED_AMOUNT, DISTRIBUTION_RATE);
            const cca = await distributorInstance.calculateClaimableAmount();
            console.log("calculatedClaimableAmount", Number(ethers.utils.formatUnits(calculatedClaimableAmount)));
            console.log("cca", Number(ethers.utils.formatUnits(cca)));

            const claimTx = await distributorInstance.connect(deployer).claim();
            const claimReceipt = await claimTx.wait();
            console.log(claimReceipt);
            const txBlock = await ethers.provider.getBlock(claimReceipt.blockNumber);

            // console.log(calculatedClaimableAmount);
            // console.log(cca);
            // expect(await mtc.balanceOf(deployer.address)).to.be.equal(deployerBalance.add(calculatedClaimableAmount));

            // await incrementBlocktimestamp(ethers, 86400 * 102);
            // const leftClaimableAmount = await distributorInstance.leftClaimableAmount();
            // deployerBalance = await mtc.balanceOf(deployer.address);
            // await distributorInstance.connect(deployer).claim();
            // expect(await mtc.balanceOf(distributorInstance.address)).to.be.equal(0);
            // expect(await mtc.balanceOf(deployer.address)).to.be.equal(leftClaimableAmount.add(deployerBalance));

            // await expect(distributorInstance.connect(deployer).claim()).to.be.revertedWith("calculateClaimableAmount: No tokens to claim");
        });
    });
});