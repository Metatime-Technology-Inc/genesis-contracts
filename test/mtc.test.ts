import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { MTC } from "../typechain-types";

const METATIME_TOKEN_SUPPLY = 10_000_000_000;
const POOL_NAME = "TestPool";
const LOCKED_AMOUNT = toWei(String(1_000));
const TEST_POOL_ADDRESS = "0xbf9fBFf01664500A33080Da5d437028b07DFcC55";

describe("MTC", function () {
    async function initiateVariables() {
        const [deployer] =
            await ethers.getSigners();

        const MTC = await ethers.getContractFactory(
            CONTRACTS.core.MTC
        );
        const mtc = await MTC.connect(deployer).deploy(toWei(String(METATIME_TOKEN_SUPPLY))) as MTC;

        return {
            mtc,
            deployer,
        };
    }

    describe("Submit distributor pools", async () => {
        // try to submit pool with 0x pool address
        it("try to submit pool with 0x pool address", async () => {
            const {
                deployer,
                mtc,
            } = await loadFixture(initiateVariables);

            const pool: MTC.PoolStruct = {
                addr: ethers.constants.AddressZero,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME,
            };

            await expect(mtc.connect(deployer).submitPools([pool])).to.be.revertedWith("MTC: invalid pool address");
        });

        // try to submit pool successfully
        it("try to submit pool successfully", async () => {
            const {
                deployer,
                mtc,
            } = await loadFixture(initiateVariables);

            const pool: MTC.PoolStruct = {
                addr: TEST_POOL_ADDRESS,
                lockedAmount: LOCKED_AMOUNT,
                name: POOL_NAME,
            };

            const submitPoolTx = await mtc.connect(deployer).submitPools([pool]);
            const submitPoolReceipt = await submitPoolTx.wait();
            const event = submitPoolReceipt.events?.find((event: any) => event.event === "PoolSubmitted");
            const [name, addr, lockedAmount] = event?.args!;

            expect(name).to.be.equal(POOL_NAME);
            expect(addr).to.be.equal(TEST_POOL_ADDRESS);
            expect(lockedAmount).to.be.equal(LOCKED_AMOUNT);
        });
    });
});