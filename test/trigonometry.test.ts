import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { MockTrigonometry } from "../typechain-types";

describe("Trigonometry", function () {
    async function initiateVariables() {
        const [deployer] =
            await ethers.getSigners();

        const MockTrigonometry = await ethers.getContractFactory(
            CONTRACTS.lib.MockTrigonometry
        );
        const mockTrigonometry = await MockTrigonometry.connect(deployer).deploy() as MockTrigonometry;

        return {
            mockTrigonometry,
            deployer,
        };
    }

    describe("Try trigonometric operations", async () => {
        let angles: number[];

        this.beforeEach(() => {
            angles = Array.from({ length: 361 }, (_, index) => index);
        });
        // try sin for each angle
        it("try sin for each angle", async () => {
            const {
                mockTrigonometry,
            } = await loadFixture(initiateVariables);

            for (let i = 0; i < angles.length; i++) {
                const calculatedSin_1 = await mockTrigonometry.sin(toWei("90"));
                const calculatedSin_2 = Math.sin(90);
                const powerOf10 = Math.pow(10, 5);
                const sin_1 = Math.floor(Number(ethers.utils.formatEther(calculatedSin_1)) * powerOf10) / powerOf10;
                const sin_2 = Math.floor(Number(calculatedSin_2) * powerOf10) / powerOf10;

                expect(sin_2).to.be.equal(sin_1);
            }
        });
        // try cos for each angle
        it("try cos for each angle", async () => {
            const {
                mockTrigonometry,
            } = await loadFixture(initiateVariables);

            for (let i = 0; i < angles.length; i++) {
                const calculatedSin_1 = await mockTrigonometry.cos(toWei("90"));
                const calculatedSin_2 = Math.cos(90);
                const powerOf10 = Math.pow(10, 5);
                const sin_1 = Math.floor(Number(ethers.utils.formatEther(calculatedSin_1)) * powerOf10) / powerOf10;
                const sin_2 = Math.floor(Number(calculatedSin_2) * powerOf10) / powerOf10;

                expect(sin_2).to.be.equal(sin_1);
            }
        });
    });
});