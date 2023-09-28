import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { incrementBlocktimestamp, toWei, getBlockTimestamp, calculateClaimableAmount } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Bridge, MTC, Roles } from "../typechain-types";

const METATIME_TOKEN_SUPPLY = 10_000_000_000;
const SECONDS_IN_A_DAY = 60 * 24 * 60;
const TWO_DAYS_IN_SECONDS = 2 * SECONDS_IN_A_DAY;

describe("Bridge", function () {
    async function initiateVariables() {
        const [owner, manager_1, manager_2, validator_1, validator_2, user] =
            await ethers.getSigners();

        const MTC_ = await ethers.getContractFactory(
            CONTRACTS.core.MTC
        );
        const mtc = await MTC_.connect(owner).deploy(toWei(String(METATIME_TOKEN_SUPPLY))) as MTC;
        await mtc.deployed();

        const Bridge_ = await ethers.getContractFactory(
            CONTRACTS.utils.Bridge
        );
        const bridge = await Bridge_.connect(owner).deploy(mtc.address) as Bridge;
        await bridge.deployed();

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            mtc,
            bridge,
            roles,
            owner,
            manager_1,
            manager_2,
            validator_1,
            validator_2,
            user,
        };
    }

    // test Bridge
    describe("test bridge contract", async () => {
        const funds:BigNumber = toWei(String(100));

        const initRoles = async () => {
            const { owner, roles, bridge } = await loadFixture(initiateVariables);
            await roles.connect(owner).initialize(owner.address);
            await bridge.connect(owner).initRoles(roles.address);
        }

        // try bridge when contract is frezeed and expect revert
        it("try bridge when contract is frezeed and expect revert", async () => {
            const { user, bridge } = await loadFixture(initiateVariables);

            await expect(bridge.connect(user).bridge()).to.be.revertedWith("Freezeable: Contract is freezed");
        });

        // try bridge when caller is blacklisted and expect revert
        it("try bridge when caller is blacklisted and expect revert", async () => {
            const { owner, user, bridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await bridge.connect(owner).setFreeze(false);
            // set user as blacklisted
            await bridge.connect(owner).setBlacklist(user.address, true);

            await expect(bridge.connect(user).bridge()).to.be.revertedWith("Blacklistable: Wallet is blacklisted");
        });

        // try bridge when caller is dont have token balance and expect revert
        it("try bridge when caller is dont have token balance and expect revert", async () => {
            const { owner, user, bridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await bridge.connect(owner).setFreeze(false);
            
            await expect(bridge.connect(user).bridge()).to.be.revertedWith("Bridge: Address dont have balance");
        });

        // try bridge when caller is didnt give required allowance and expect revert
        it("try bridge when caller is didnt give required allowance and expect revert", async () => {
            const { owner, user, bridge, mtc } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await bridge.connect(owner).setFreeze(false);
            // transfer funds to user
            await mtc.connect(owner).transfer(user.address, funds);
            
            await expect(bridge.connect(user).bridge()).to.be.revertedWith("Bridge: Allowance is not as required");
        });

        // try bridge when everything is ok
        it("try bridge when everything is ok", async () => {
            const { owner, user, bridge, mtc } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await bridge.connect(owner).setFreeze(false);
            // transfer funds to user
            await mtc.connect(owner).transfer(user.address, funds);
            // approve funds to bridge
            await mtc.connect(user).approve(bridge.address, funds);
            
            expect(await bridge.connect(user).bridge()).to.be.ok;
        });
    });
});