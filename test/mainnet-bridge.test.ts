import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber, BytesLike } from "ethers";
import { MainnetBridge, Roles } from "../typechain-types";

describe("MainnetBridge", function () {
    async function initiateVariables() {
        const [owner, manager, user] =
            await ethers.getSigners();

        const MainnetBridge_ = await ethers.getContractFactory(
            CONTRACTS.utils.MainnetBridge
        );
        const mainnetBridge = await MainnetBridge_.connect(owner).deploy() as MainnetBridge;
        await mainnetBridge.deployed();

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            mainnetBridge,
            roles,
            owner,
            manager,
            user,
        };
    }

    // test MainnetBridge
    describe("test mainnet-bridge contract", async () => {
        const funds:BigNumber = toWei(String(100));
        const txHash:BytesLike = "0xdf724b377b528ec9a766713fe7a0eee17485dff3ea3114dc255f04a2fadf1e06";

        const initRoles = async () => {
            const { owner, manager, roles, mainnetBridge } = await loadFixture(initiateVariables);
            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);
            await mainnetBridge.connect(owner).initRoles(roles.address);
        }

        // try bridge function when contract is frezeed and expect revert
        it("try bridge function when contract is frezeed and expect revert", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);
            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(true);

            await expect(mainnetBridge.connect(owner).bridge(txHash, user.address, funds)).to.be.revertedWith("Freezeable: Contract is freezed");
        });

        // try bridge function when receiver is blacklisted and expect revert
        it("try bridge function when receiver is blacklisted and expect revert", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);
            // set user as blacklisted
            await mainnetBridge.connect(owner).setBlacklist(user.address, true);

            await expect(mainnetBridge.connect(owner).bridge(txHash, user.address, funds)).to.be.revertedWith("Blacklistable: Wallet is banned");
        });

        // try bridge function when receiver is zero address
        it("try bridge function when receiver is zero address", async () => {
            const { owner, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);

            await expect(mainnetBridge.connect(owner).bridge(txHash, "0x0000000000000000000000000000000000000000", funds)).to.be.revertedWith("MainnetBridge: No zero receiver");
        });

        // try bridge function when amount is 0
        it("try bridge function when amount is 0", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);

            await expect(mainnetBridge.connect(owner).bridge(txHash, user.address, toWei(String(0)))).to.be.revertedWith("MainnetBridge: Amount > 0");
        });

        // try bridge function when contract dont have enough funds
        it("try bridge function when contract dont have enough funds", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);

            await expect(mainnetBridge.connect(owner).bridge(txHash, user.address, funds)).to.be.revertedWith("MainnetBridge: Transfer failed");
        });

        // try bridge function when txHash already setted
        it("try bridge function when txHash already setted", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);
            // send funds to contract
            await owner.sendTransaction({to: mainnetBridge.address, value: funds});
            await owner.sendTransaction({to: mainnetBridge.address, value: funds});
            // first bridge
            await mainnetBridge.connect(owner).bridge(txHash, user.address, funds)

            await expect(mainnetBridge.connect(owner).bridge(txHash, user.address, funds)).to.be.revertedWith("MainnetBridge: Already set");
        });

        // try bridge function when contract everything is ok
        it("try bridge function when contract everything is ok", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);
            // send funds to contract
            await owner.sendTransaction({to: mainnetBridge.address, value: funds});

            expect(await mainnetBridge.connect(owner).bridge(txHash, user.address, funds)).to.be.ok;
        });

        // try transfer function when receiver is not manager
        it("try transfer function when receiver is not manager", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(true);

            await expect(mainnetBridge.connect(owner).transfer(user.address, funds)).to.be.revertedWith("Roles: Manager role needed");
        });

        // try transfer function when contract is not freezed
        it("try transfer function when contract is not freezed", async () => {
            const { owner, user, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(false);

            await expect(mainnetBridge.connect(owner).transfer(user.address, funds)).to.be.revertedWith("Freezeable: Contract not freezed");
        });

        // try transfer function when contract dont have enough funds
        it("try transfer function when contract dont have enough funds", async () => {
            const { owner, manager, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(true);

            await expect(mainnetBridge.connect(owner).transfer(manager.address, funds)).to.be.revertedWith("MainnetBridge: Transfer failed");
        });

        // try transfer function when everything is ok
        it("try transfer function when everything is ok", async () => {
            const { owner, manager, mainnetBridge } = await loadFixture(initiateVariables);

            // init roles
            await initRoles();
            // set freeze
            await mainnetBridge.connect(owner).setFreeze(true);
            // send funds to contract
            await owner.sendTransaction({to: mainnetBridge.address, value: funds});

            expect(await mainnetBridge.connect(owner).transfer(manager.address, funds)).to.be.ok;
        });
    });
});