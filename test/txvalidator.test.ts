import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei, incrementBlocktimestamp } from "../scripts/helpers";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { TxValidator, Macrominer, MinerHealthCheck, MinerFormulas, MinerPool, MetaPoints, MinerList, Roles } from "../typechain-types";

describe("TxValidator", function () {
    async function initiateVariables() {
        const [owner, manager, miner_1, miner_2, miner_3] =
            await ethers.getSigners();

        const Macrominer_ = await ethers.getContractFactory(
            CONTRACTS.utils.Macrominer
        );
        const macroMiner = await Macrominer_.connect(owner).deploy() as Macrominer;
        await macroMiner.deployed();

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

        const TxValidator_ = await ethers.getContractFactory(
            CONTRACTS.utils.TxValidator
        );
        const txValidator = await TxValidator_.connect(owner).deploy() as TxValidator;
        await txValidator.deployed();

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            macroMiner,
            minerHealthCheck,
            minerFormulas,
            minerPool,
            metaPoints,
            minerList,
            txValidator,
            roles,
            owner,
            manager,
            miner_1,
            miner_2,
            miner_3
        };
    }

    // test TxValidator
    describe("test txvalidator contract", async () => {
        const txHash:BytesLike = "0xd71ec8a6db62d01ee2925183550a408043e780b2260e1656da1f18657ff4b564";
        const txHash2:BytesLike = "0xd71ec8a6db62d01ee2925183550a408043e780b2260e1656da1f18657ff4b565";
        const reward:BigNumberish = toWei(String(10));

        const minerHealthCheckTimeoutNumber:number = 14_400; // 4 hours
        const txValidatorDefaultExpireTime:number = 300; // 5 minutes
        const minerHealthCheckTimeout:BigNumberish = BigNumber.from(String(minerHealthCheckTimeoutNumber));
        const metaminerType:BigNumber = BigNumber.from(String(0));
        const macrominerArchiveType:BigNumberish = BigNumber.from(String(1));
        const microminerType:BigNumberish = BigNumber.from(String(4));
        const STAKE_AMOUNT:BigNumberish = toWei(String(100));

        const pendingTX:number = 0;
        const completedTX:number = 1;
        const expiredTX:number = 2;

        const initContracts = async () => {
            const {
                owner,
                manager,
                miner_1,
                roles,
                macroMiner,
                minerHealthCheck,
                minerFormulas,
                minerPool,
                metaPoints,
                minerList,
                txValidator
            } = await loadFixture(initiateVariables);

            await minerList.connect(owner).initRoles(roles.address);
            await minerPool.connect(owner).initRoles(roles.address);
            await metaPoints.connect(owner).initRoles(roles.address);
            await minerHealthCheck.connect(owner).initRoles(roles.address);
            await txValidator.connect(owner).initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);

            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), macroMiner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerPool.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), minerList.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), txValidator.address);

            await roles.connect(owner).grantRole(await roles.DEVELOPER_ROLE(), miner_1.address);

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

            await macroMiner.connect(owner).initialize(
                minerHealthCheck.address,
                metaPoints.address,
                minerList.address
            );

            await txValidator.connect(owner).initialize(
                minerList.address,
                metaPoints.address,
                minerFormulas.address,
                minerHealthCheck.address,
                minerPool.address
            );
        }

        // try addTransaction function when caller dont have required role
        it("try addTransaction function when caller dont have required role", async () => {
            const { miner_1, txValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                txValidator.connect(miner_1).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType)
            ).to.be.revertedWith("RolesHandler: Manager role is needed for this action");
        });

        // try addTransaction function when handler is not active
        it("try addTransaction function when handler is not active", async () => {
            const { manager, miner_1, txValidator } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Miner is not active");
        });

        // try addTransaction function when txHash already exist
        it("try addTransaction function when txHash already exist", async () => {
            const { manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            await expect(
                txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Tx is already exist");
        });

        // try addTransaction function when txPayload is ok
        it("try addTransaction function when txPayload is ok", async () => {
            const { manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            const txPayload = await txValidator.txPayloads(txHash);

            expect(
                txPayload[1]
            ).to.be.equal(reward);
        });

        // try voteTransaction function when caller is not alive
        it("try voteTransaction function when caller is not alive", async () => {
            const { manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            await expect(
                txValidator.connect(manager).voteTransaction(txHash, true, metaminerType)
            ).to.be.revertedWith("TxValidator: Activity is not as expected");
        });

        // try voteTransaction function when caller cannot vote
        it("try voteTransaction function when caller cannot vote", async () => {
            const { manager, miner_1, miner_2, txValidator, macroMiner, minerList } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addMiner with manager
            const setMiner2 = await minerList.connect(manager).addMiner(miner_2.address, metaminerType);
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            await expect(
                txValidator.connect(miner_2).voteTransaction(txHash, true, metaminerType)
            ).to.be.revertedWith("TxValidator: Address is not eligible to vote");
        });

        // try voteTransaction function when txHash is not exist
        it("try voteTransaction function when txHash is not exist", async () => {
            const { manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();
            

            await expect(
                txValidator.connect(miner_1).voteTransaction(txHash2, true, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Tx doesn't exist");
        });

        // try voteTransaction function when tx is closed
        it("try voteTransaction function when tx is closed", async () => {
            const { owner, manager, miner_1, miner_2, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // increment
            await incrementBlocktimestamp(ethers, (txValidatorDefaultExpireTime * 2));

            await expect(
                txValidator.connect(miner_2).voteTransaction(txHash, true, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Tx is closed");
        });

        // try voteTransaction function when vote is from handler
        it("try voteTransaction function when vote is from handler", async () => {
            const { manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            await expect(
                txValidator.connect(miner_1).voteTransaction(txHash, true, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Handler cannot vote for tx");
        });

        // try voteTransaction function when tx already voted
        it("try voteTransaction function when tx already voted", async () => {
            const { manager, miner_1, miner_2, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, true, macrominerArchiveType);
            await voteTransaction.wait();

            await expect(
                txValidator.connect(miner_2).voteTransaction(txHash, true, macrominerArchiveType)
            ).to.be.revertedWith("TxValidator: Already voted");
        });

        // try voteTransaction function and make it with microminer
        it("try voteTransaction function and make it with microminer", async () => {
            const { owner, manager, miner_1, miner_2, txValidator, macroMiner, metaPoints, minerPool, minerList } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(1_000))
            });
            await fundsTX.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // microminer addMiner
            const addMiner = await minerList.connect(manager).addMiner(miner_2.address, microminerType);
            await addMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, true, microminerType);
            await voteTransaction.wait();

            const txPayload = await txValidator.txPayloads(txHash);

            expect(
                txPayload[2]
            ).to.be.equal(toWei(String(2)));
        });

        // try voteTransaction function and make it done as true
        it("try voteTransaction function and make it done as true", async () => {
            const { owner, manager, miner_1, miner_2, txValidator, macroMiner, metaPoints, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(1_000))
            });
            await fundsTX.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // add extra metapoint to miner_2
            const extraMP = await metaPoints.connect(manager).mint(miner_2.address, toWei(String(200)));
            extraMP.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, true, macrominerArchiveType);
            await voteTransaction.wait();

            const txPayload = await txValidator.txPayloads(txHash);

            expect(
                txPayload[6]
            ).to.be.equal(true);
        });

        // try voteTransaction function and make it done as false
        it("try voteTransaction function and make it done as false", async () => {
            const { owner, manager, miner_1, miner_2, txValidator, macroMiner, metaPoints, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(1_000))
            });
            await fundsTX.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // add extra metapoint to miner_2
            const extraMP = await metaPoints.connect(manager).mint(miner_2.address, toWei(String(200)));
            extraMP.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, false, macrominerArchiveType);
            await voteTransaction.wait();

            const txPayload = await txValidator.txPayloads(txHash);

            expect(
                txPayload[6]
            ).to.be.equal(true);
        });

        // try voteTransaction function and make it done as tie
        it("try voteTransaction function and make it done as tie", async () => {
            const { owner, manager, miner_1, miner_2, miner_3, txValidator, macroMiner, metaPoints, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(1_000))
            });
            await fundsTX.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation3 = await macroMiner.connect(miner_3).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner3 = await miner_3.sendTransaction({
                ...preparedContractTranscation3,
                value: STAKE_AMOUNT
            });
            await setMiner3.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // add extra metapoint to miner_2
            const extraMP = await metaPoints.connect(manager).mint(miner_2.address, toWei(String(5)));
            extraMP.wait();

            // add extra metapoint to miner_3
            const extraMP2 = await metaPoints.connect(manager).mint(miner_3.address, toWei(String(100)));
            extraMP2.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, false, macrominerArchiveType);
            await voteTransaction.wait();

            // voteTransaction
            const voteTransaction2 = await txValidator.connect(miner_3).voteTransaction(txHash, true, macrominerArchiveType);
            await voteTransaction2.wait();

            const txPayload = await txValidator.txPayloads(txHash);

            expect(
                txPayload[6]
            ).to.be.equal(true);
        });

        // try checkTransactionState function when txPayload state is Pending
        it("try checkTransactionState function when txPayload state is Pending", async () => {
            const { owner, manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            expect(
                await txValidator.connect(owner).callStatic.checkTransactionState(txHash)
            ).to.be.equal(pendingTX);
        });

        // try checkTransactionState function when txPayload state is Expired
        it("try checkTransactionState function when txPayload state is Expired", async () => {
            const { owner, manager, miner_1, txValidator, macroMiner } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // increment
            await incrementBlocktimestamp(ethers, (txValidatorDefaultExpireTime * 2));

            expect(
                await txValidator.connect(owner).callStatic.checkTransactionState(txHash)
            ).to.be.equal(expiredTX);
        });

        // try checkTransactionState function when txPayload state is Completed
        it("try checkTransactionState function when txPayload state is Completed", async () => {
            const { owner, manager, miner_1, miner_2, txValidator, macroMiner, metaPoints, minerPool } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // sent funds to miner pool
            const fundsTX = await owner.sendTransaction({
                to: minerPool.address,
                value: toWei(String(1_000))
            });
            await fundsTX.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation = await macroMiner.connect(miner_1).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner = await miner_1.sendTransaction({
                ...preparedContractTranscation,
                value: STAKE_AMOUNT
            });
            await setMiner.wait();

            // setMiner with STAKE_AMOUNT
            const preparedContractTranscation2 = await macroMiner.connect(miner_2).populateTransaction.setMiner(macrominerArchiveType);
            const setMiner2 = await miner_2.sendTransaction({
                ...preparedContractTranscation2,
                value: STAKE_AMOUNT
            });
            await setMiner2.wait();

            // addTransaction
            const addTransaction = await txValidator.connect(manager).addTransaction(txHash, miner_1.address, reward, macrominerArchiveType);
            await addTransaction.wait();

            // add extra metapoint to miner_2
            const extraMP = await metaPoints.connect(manager).mint(miner_2.address, toWei(String(200)));
            extraMP.wait();

            // voteTransaction
            const voteTransaction = await txValidator.connect(miner_2).voteTransaction(txHash, true, macrominerArchiveType);
            await voteTransaction.wait();

            expect(
                await txValidator.connect(owner).callStatic.checkTransactionState(txHash)
            ).to.be.equal(completedTX);
        });
    });
});