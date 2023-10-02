import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { WMTC } from "../typechain-types";
import { BigNumber, BigNumberish } from "ethers";

describe("WMTC", function () {
    async function initiateVariables() {
        const [owner, manager] =
            await ethers.getSigners();

        const WMTC_ = await ethers.getContractFactory(
            CONTRACTS.tokens.WMTC
        );
        const wmtc = await WMTC_.connect(owner).deploy() as WMTC;
        await wmtc.deployed();

        return {
            wmtc,
            owner,
            manager
        };
    }

    // test WMTC
    describe("test wmtc contract", async () => {
        const funds:BigNumberish = toWei(String(100));

        // try deposit function
        it("try deposit function", async () => {
            const { owner, wmtc } = await loadFixture(initiateVariables);

            // function prepare
            const populateTransaction = await wmtc.connect(owner).populateTransaction.deposit();

            expect(
                await owner.sendTransaction({
                    ...populateTransaction,
                    value: funds
                })
            ).to.be.ok;
        });

        // try withdraw function
        it("try withdraw function", async () => {
            const { owner, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            expect(
                await wmtc.connect(owner).withdraw(funds)
            ).to.be.ok;
        });

        // try withdraw function with 2x funds
        it("try withdraw function with 2x funds", async () => {
            const { owner, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            await expect(
                wmtc.connect(owner).withdraw(funds.mul(BigNumber.from(String(2))))
            ).to.be.revertedWithoutReason();
        });

        // try totalSupply function
        it("try totalSupply function", async () => {
            const { owner, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            expect(
                await wmtc.connect(owner).totalSupply()
            ).to.be.equal(funds);
        });

        // try transfer function
        it("try transfer function", async () => {
            const { owner, manager, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            expect(
                await wmtc.connect(owner).transfer(manager.address, funds)
            ).to.be.ok;
        });

        // try approve function
        it("try approve function", async () => {
            const { owner, manager, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            expect(
                await wmtc.connect(owner).approve(manager.address, funds)
            ).to.be.ok;
        });

        // try transferFrom function
        it("try transferFrom function", async () => {
            const { owner, manager, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            // approve
            const approve = await wmtc.connect(owner).approve(manager.address, funds);
            await approve.wait();

            expect(
                await wmtc.connect(manager).transferFrom(owner.address, manager.address, funds)
            ).to.be.ok;
        });

        // try transferFrom function with 2x funds
        it("try transferFrom function with 2x funds", async () => {
            const { owner, manager, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            // approve
            const approve = await wmtc.connect(owner).approve(manager.address, funds);
            await approve.wait();

            await expect(
                wmtc.connect(manager).transferFrom(owner.address, manager.address, funds.mul(BigNumber.from(String(2))))
            ).to.be.revertedWithoutReason();
        });

        // try transferFrom function with less approved funds
        it("try transferFrom function with less approved funds", async () => {
            const { owner, manager, wmtc } = await loadFixture(initiateVariables);

            // deposit
            const depositPopulateTransaction = await wmtc.connect(owner).populateTransaction.deposit();
            const tx = await owner.sendTransaction({
                ...depositPopulateTransaction,
                value: funds
            });
            await tx.wait();

            // approve
            const approve = await wmtc.connect(owner).approve(manager.address, funds.div(BigNumber.from(String(2))));
            await approve.wait();

            await expect(
                wmtc.connect(manager).transferFrom(owner.address, manager.address, funds)
            ).to.be.revertedWithoutReason();
        });
    });
});