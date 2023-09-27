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

describe("TokenDistributor", function () {
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

    // Test Token Distributor
    describe("Create TokenDistributor and test claiming period", async () => {
        let currentBlockTimestamp: number;
        const POOL_NAME = "TestTokenDistributor";
        let START_TIME: number;
        let END_TIME: number;
        const DISTRIBUTION_RATE = 5_000;
        const PERIOD_LENGTH = 86400;
        const LOCKED_AMOUNT = toWei(String(100_000));

        this.beforeAll(async () => {
            currentBlockTimestamp = await getBlockTimestamp(ethers);
            START_TIME = currentBlockTimestamp + 500_000;
            END_TIME = START_TIME + TWO_DAYS_IN_SECONDS;
        });

        // Try to create TokenDistributor with address who is not owner of contract and expect revert
        it("try to create TokenDistributor with address who is not owner of contract and expect revert", async () => {
            const { user_1, poolFactory, mtc } = await loadFixture(initiateVariables);

            await expect(poolFactory.connect(user_1).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH
            )).to.be.revertedWith("Ownable: caller is not the owner");
        });

        // Try to create TokenDistributor with 0x token address and expect revert
        it("try to create with 0x token address and expect revert", async () => {
            const { deployer, poolFactory } = await loadFixture(initiateVariables);

            await expect(poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                ethers.constants.AddressZero,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH
            )).to.be.revertedWith("PoolFactory: invalid token address");
        });

        // Try to initialize implementation and expect to be reverted
        it("try to initialize implementation and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            const implementationAddress = await poolFactory.tokenDistributorImplementation();

            const implementationInstance = TokenDistributor__factory.connect(implementationAddress, deployer);

            await expect(implementationInstance.initialize(
                deployer.address,
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            )).to.be.revertedWith("Initializable: contract is already initialized");
        });

        // Try to initialize TokenDistributor with start time bigger than end time and expect to be reverted
        it("try to initialize TokenDistributor with start time bigger than end time and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            // try with wrong distribution rate
            await expect(
                poolFactory.connect(deployer).createTokenDistributor(
                    POOL_NAME,
                    mtc.address,
                    END_TIME,
                    START_TIME,
                    DISTRIBUTION_RATE,
                    PERIOD_LENGTH,
                )
            ).to.be.revertedWith("TokenDistributor: end time must be bigger than start time");
        });

        // Try to initalize TokenDistributor with wrong params (isParamsValid) and expect to be reverted
        it("try to initalize TokenDistributor with wrong params (isParamsValid) and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            // try with wrong distribution rate
            await expect(
                poolFactory.connect(deployer).createTokenDistributor(
                    POOL_NAME,
                    mtc.address,
                    START_TIME,
                    END_TIME,
                    DISTRIBUTION_RATE + 1000,
                    PERIOD_LENGTH,
                )
            ).to.be.revertedWith("TokenDistributor: invalid parameters");
        });

        // Try to initialize TokenDistributor with correct params
        it("try to initialize TokenDistributor with correct params", async () => {
            const { deployer, mtc, poolFactory } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);
            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            expect(await tokenDistributorInstance.poolName()).to.be.equal(POOL_NAME);
            expect(await tokenDistributorInstance.token()).to.be.equal(mtc.address);
            expect(await tokenDistributorInstance.distributionPeriodStart()).to.be.equal(START_TIME);
            expect(await tokenDistributorInstance.distributionPeriodEnd()).to.be.equal(END_TIME);
            expect(await tokenDistributorInstance.distributionRate()).to.be.equal(DISTRIBUTION_RATE);
            expect(await tokenDistributorInstance.periodLength()).to.be.equal(PERIOD_LENGTH);
            expect(await tokenDistributorInstance.claimPeriodEnd()).to.be.equal(END_TIME + (86400 * 100));
        });

        // Try to setClaimableAmounts after claim period start and expect to be reverted
        it("try to setClaimableAmounts after claim period start and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            // start distribution period
            await incrementBlocktimestamp(ethers, 501_000);

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);
            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            await expect(tokenDistributorInstance.setClaimableAmounts([user_1.address], [toWei(String(1_000))])).to.be.revertedWith("TokenDistributor: claim period has already started");
        });

        // Try to setClaimableAmounts with mismatched users and amounts length and expect to be reverted
        it("try to setClaimableAmounts with mismatched users and amounts length and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1, user_2 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);
            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            await expect(tokenDistributorInstance.setClaimableAmounts([user_1.address, user_2.address], [toWei(String(1_000))])).to.be.revertedWith("TokenDistributor: lists' lengths must match");
            await expect(tokenDistributorInstance.setClaimableAmounts([ethers.constants.AddressZero], [toWei(String(1_000))])).to.be.revertedWith("TokenDistributor: cannot set zero address");
        });

        // Try to set a user who was already set and expect to be reverted
        it("try to set a user who was already set and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);
            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [toWei(String(1_000))]);
            await expect(tokenDistributorInstance.setClaimableAmounts([user_1.address], [toWei(String(2_000))])).to.be.revertedWith("TokenDistributor: address already set");
        });

        // Try to set a set user and amount with address who is not owner of pool expect to be reverted
        it("try to set a set user and amount with address who is not owner of pool expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1, user_2 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);
            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, user_1);

            await expect(tokenDistributorInstance.setClaimableAmounts([user_2.address], [toWei(String(2_000))])).to.be.revertedWith("Ownable: caller is not the owner");
        });

        // Try to set an amount bigger than balance of pool and expect to be reverted
        it("try to set an amount bigger than balance of pool and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            await expect(tokenDistributorInstance.setClaimableAmounts([user_1.address], [toWei(String(200_000))])).to.be.revertedWith("TokenDistributor: total claimable amount does not match");
        });

        // Try to setClaimableAmounts with correct params
        it("try to setClaimableAmounts with correct params", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);
            expect(await tokenDistributorInstance.claimableAmounts(user_1.address)).to.be.equal(CLAIMABLE_AMOUNT);
        });

        // Try to claim before claim startTime and expect to be reverted
        it("try to claim before claim startTime and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await expect(tokenDistributorInstance.connect(user_1).claim()).to.be.revertedWith("TokenDistributor: distribution has not started yet");
        });

        // Try to claim after the end of distribution period end but before claim period end
        it("try to claim after the end of distribution period end but before claim period end", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await incrementBlocktimestamp(ethers, 500_000 + TWO_DAYS_IN_SECONDS);

            await tokenDistributorInstance.connect(user_1).claim();

            expect(await mtc.balanceOf(user_1.address)).to.be.equal(CLAIMABLE_AMOUNT);
        });

        // Try to claim with a user with 0 claimable amount and expect to be reverted
        it("try to claim with a user with 0 claimable amount and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            await incrementBlocktimestamp(ethers, 500_000 + TWO_DAYS_IN_SECONDS);

            await expect(tokenDistributorInstance.connect(user_1).claim()).to.be.revertedWith("TokenDistributor: no tokens to claim");
        });

        // Try to claim successfully
        it("try to claim successfully", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await incrementBlocktimestamp(ethers, 550_000);
            const lastClaimTime = await tokenDistributorInstance.lastClaimTimes(user_1.address);

            const claimTx = await tokenDistributorInstance.connect(user_1).claim();
            const claimReceipt = await claimTx.wait();
            const txBlock = await ethers.provider.getBlock(claimReceipt.blockNumber);

            const calculatedClaimableAmount = calculateClaimableAmount(BigNumber.from(txBlock.timestamp), lastClaimTime, PERIOD_LENGTH, CLAIMABLE_AMOUNT, DISTRIBUTION_RATE);

            const event = claimReceipt.events?.find((event: any) => event.event === "HasClaimed");
            const [_, claimableAmount] = event?.args!;

            expect(calculatedClaimableAmount).to.be.equal(claimableAmount);
        });

        // Try to sweep before claim period end and expect to be reverted
        it("try to sweep before claim period end and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await incrementBlocktimestamp(ethers, 100_000_000_000);

            await expect(tokenDistributorInstance.connect(user_1).claim()).to.be.revertedWith("TokenDistributor: claim period ended");
        });

        // Try to sweep after there is no funds left in the pool and expect to be reverted
        it("try to sweep before claim period end and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await expect(tokenDistributorInstance.connect(deployer).sweep()).to.be.revertedWith("TokenDistributor: cannot sweep before claim period end time");

            await incrementBlocktimestamp(ethers, 500_000 + TWO_DAYS_IN_SECONDS + 86400 * 100);

            const poolBalance = await mtc.balanceOf(tokenDistributorInstance.address);
            const deployerBalance = await mtc.balanceOf(deployer.address);

            await tokenDistributorInstance.connect(deployer).sweep();
            expect(await mtc.balanceOf(deployer.address)).to.be.equal(poolBalance.add(deployerBalance));

            await expect(tokenDistributorInstance.connect(deployer).sweep()).to.be.revertedWith("TokenDistributor: no leftovers");
        });

        // Try to update pool params after distribution period start and expect to be reverted
        it("try to update pool params after distribution period start and expect to be reverted", async () => {
            const { deployer, mtc, poolFactory, user_1 } = await loadFixture(initiateVariables);

            await poolFactory.connect(deployer).createTokenDistributor(
                POOL_NAME,
                mtc.address,
                START_TIME,
                END_TIME,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            const tokenDistributorAddress = await poolFactory.getTokenDistributor(0);

            const pool: MTC.PoolStruct = {
                addr: tokenDistributorAddress,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME
            };

            await mtc.connect(deployer).submitPools([pool]);

            const tokenDistributorInstance = TokenDistributor__factory.connect(tokenDistributorAddress, deployer);

            await tokenDistributorInstance.connect(deployer).updatePoolParams(
                START_TIME + 1,
                END_TIME + 1,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            );

            expect(await tokenDistributorInstance.distributionPeriodStart()).to.be.equal(START_TIME + 1);
            expect(await tokenDistributorInstance.distributionPeriodEnd()).to.be.equal(END_TIME + 1);

            const CLAIMABLE_AMOUNT = toWei(String(50_000));

            await tokenDistributorInstance.setClaimableAmounts([user_1.address], [CLAIMABLE_AMOUNT]);

            await expect(tokenDistributorInstance.connect(deployer).updatePoolParams(
                START_TIME + 1,
                END_TIME + 1,
                DISTRIBUTION_RATE,
                PERIOD_LENGTH,
            )).to.be.revertedWith("TokenDistributor: claimable amounts were set before");
        });
    });
});