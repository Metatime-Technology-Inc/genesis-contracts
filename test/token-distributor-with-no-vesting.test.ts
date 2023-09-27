import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import POOL_PARAMS from "../scripts/constants/pool-params";
import { incrementBlocktimestamp, toWei, getBlockTimestamp } from "../scripts/helpers";
import { MTC, TokenDistributorWithNoVesting } from "../typechain-types";

const METATIME_TOKEN_SUPPLY = 10_000_000_000;
const SECONDS_IN_A_DAY = 60 * 24 * 60;

describe("TokenDistributorWithNoVesting", function () {
    async function initiateVariables() {
        const [deployer, user_1, user_2, user_3, user_4, user_5] =
            await ethers.getSigners();

        const currentBlockTimestamp = await getBlockTimestamp(ethers);
        const LISTING_TIMESTAMP = currentBlockTimestamp + (SECONDS_IN_A_DAY * 2);

        const MTC = await ethers.getContractFactory(
            CONTRACTS.core.MTC
        );
        const mtc = await MTC.connect(deployer).deploy(toWei(String(METATIME_TOKEN_SUPPLY))) as MTC;

        const TokenDistributorWithNoVesting = await ethers.getContractFactory(
            CONTRACTS.core.TokenDistributorWithNoVesting
        );
        const periodDurationInSeconds = LISTING_TIMESTAMP + (SECONDS_IN_A_DAY * 10);
        const tokenDistributorWithNoVesting = await TokenDistributorWithNoVesting.connect(deployer)
            .deploy(mtc.address, LISTING_TIMESTAMP, LISTING_TIMESTAMP + periodDurationInSeconds) as TokenDistributorWithNoVesting;

        return {
            mtc,
            tokenDistributorWithNoVesting,
            deployer,
            user_1,
            user_2,
            user_3,
            user_4,
            user_5,
            LISTING_TIMESTAMP,
            periodDurationInSeconds
        };
    }

    describe("Create TokenDistributorWithNoVesting & test claim period", async () => {
        // try to create with wrong constructor params
        it("try to create with wrong constructor params", async function () {
            const {
                deployer,
                mtc,
            } = await loadFixture(initiateVariables);

            const TokenDistributorWithNoVesting = await ethers.getContractFactory(
                CONTRACTS.core.TokenDistributorWithNoVesting
            );

            const currentBlockTimestamp = await getBlockTimestamp(ethers);
            const LISTING_TIMESTAMP = currentBlockTimestamp + (SECONDS_IN_A_DAY * 2);
            const periodDurationInSeconds = LISTING_TIMESTAMP + (SECONDS_IN_A_DAY * 10);

            await expect(TokenDistributorWithNoVesting.connect(deployer)
                .deploy(ethers.constants.AddressZero, LISTING_TIMESTAMP, LISTING_TIMESTAMP + periodDurationInSeconds)).to.be.revertedWith("TokenDistributorWithNoVesting: invalid token address");

            await expect(TokenDistributorWithNoVesting.connect(deployer)
                .deploy(mtc.address, LISTING_TIMESTAMP + periodDurationInSeconds, LISTING_TIMESTAMP)).to.be.revertedWith("TokenDistributorWithNoVesting: end time must be bigger than start time");
        });

        it("should initiate pool & test claim period", async function () {
            const {
                mtc,
                tokenDistributorWithNoVesting,
                deployer,
                user_1,
                user_2,
                user_3,
                user_4,
                user_5,
                LISTING_TIMESTAMP,
                periodDurationInSeconds
            } = await loadFixture(initiateVariables);

            // Set addresses and their amounts with no balance and expect revert
            const addrs = [user_1.address, user_2.address, user_3.address, user_4.address];
            const amounts = [toWei(String(10_000_000)), toWei(String(25_000_000)), toWei(String(60_000_000)), toWei(String(5_000_000))];

            await expect(tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts(addrs, amounts))
                .to.be.revertedWith("TokenDistributorWithNoVesting: total claimable amount does not match");

            // Send funds and try to set addresses and their amounts
            await mtc.connect(deployer).transfer(tokenDistributorWithNoVesting.address, POOL_PARAMS.PRIVATE_SALE_POOL.lockedAmount);

            await tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts(addrs, amounts);

            // try send mismatched length of address and amount list and expect to be reverted
            await expect(tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts([addrs[0]], amounts)).to.be.revertedWith("TokenDistributorWithNoVesting: user and amount list lengths must match");
            
            // try to set address again
            await expect(tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts([addrs[0]], [amounts[0]])).to.be.revertedWith("TokenDistributorWithNoVesting: address already set");

            // try to set 0x address and expect to be reverted
            await expect(tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts([ethers.constants.AddressZero], [toWei(String(1_000))])).to.be.revertedWith("TokenDistributorWithNoVesting: cannot set zero address");

            const user_1ClaimableAmounts = await tokenDistributorWithNoVesting.claimableAmounts(user_1.address);
            const user_2ClaimableAmounts = await tokenDistributorWithNoVesting.claimableAmounts(user_2.address);
            const user_3ClaimableAmounts = await tokenDistributorWithNoVesting.claimableAmounts(user_3.address);
            const user_4ClaimableAmounts = await tokenDistributorWithNoVesting.claimableAmounts(user_4.address);

            expect(user_1ClaimableAmounts).to.be.equal(toWei(String(10_000_000)));
            expect(user_2ClaimableAmounts).to.be.equal(toWei(String(25_000_000)));
            expect(user_3ClaimableAmounts).to.be.equal(toWei(String(60_000_000)));
            expect(user_4ClaimableAmounts).to.be.equal(toWei(String(5_000_000)));

            // Try to claim before distribution start time
            await expect(tokenDistributorWithNoVesting.connect(user_1).claim()).to.be.revertedWith("TokenDistributorWithNoVesting: tokens cannot be claimed yet");

            // Try to set addresses and their amounts after claim started and expect revert
            await incrementBlocktimestamp(ethers, SECONDS_IN_A_DAY * 3);
            await expect(tokenDistributorWithNoVesting.connect(deployer).setClaimableAmounts([user_5.address], [toWei(String(1_000_000))]))
                .to.be.revertedWith("TokenDistributorWithNoVesting: claim period has already started");

            // Try to claim tokens with wrong address
            await expect(tokenDistributorWithNoVesting.connect(user_5).claim())
                .to.be.revertedWith("TokenDistributorWithNoVesting: no tokens to claim");

            // Try to claim tokens with true addresses
            await tokenDistributorWithNoVesting.connect(user_1).claim();
            await tokenDistributorWithNoVesting.connect(user_2).claim();
            await tokenDistributorWithNoVesting.connect(user_3).claim();

            const user_1Balance = await mtc.balanceOf(user_1.address);
            const user_2Balance = await mtc.balanceOf(user_2.address);
            const user_3Balance = await mtc.balanceOf(user_3.address);

            expect(user_1Balance).to.be.equal(toWei(String(10_000_000)));
            expect(user_2Balance).to.be.equal(toWei(String(25_000_000)));
            expect(user_3Balance).to.be.equal(toWei(String(60_000_000)));

            // try to sweep before claim period end
            await expect(tokenDistributorWithNoVesting.connect(deployer).sweep()).to.be.revertedWith("TokenDistributorWithNoVesting: cannot sweep before claim end time");

            // try to claim after claim period end
            await incrementBlocktimestamp(ethers, (SECONDS_IN_A_DAY * 1000) + periodDurationInSeconds);
            await expect(tokenDistributorWithNoVesting.connect(user_4).claim()).to.be.revertedWith("TokenDistributorWithNoVesting: claim period has ended");

            // try to sweep after claim period end
            await tokenDistributorWithNoVesting.connect(deployer).sweep();

            // try to sweep again
            await expect(tokenDistributorWithNoVesting.connect(deployer).sweep()).to.be.revertedWith("TokenDistributorWithNoVesting: no leftovers");
        });
    });
});