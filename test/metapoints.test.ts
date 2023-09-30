import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { MetaPoints, Roles } from "../typechain-types";

describe("MetaPoints", function () {
    async function initiateVariables() {
        const [owner, manager] =
            await ethers.getSigners();

        const MetaPoints_ = await ethers.getContractFactory(
            CONTRACTS.utils.MetaPoints
        );
        const metaPoints = await MetaPoints_.connect(owner).deploy() as MetaPoints;
        await metaPoints.deployed();

        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        return {
            metaPoints,
            roles,
            owner,
            manager
        };
    }

    // test MetaPoints
    describe("test metapoints contract", async () => {
        const funds = toWei(String(100));

        const initContracts = async () => {
            const {
                owner,
                manager,
                roles,
                metaPoints,
            } = await loadFixture(initiateVariables);

            await metaPoints.initRoles(roles.address);

            await roles.connect(owner).initialize(owner.address);
            await roles.connect(owner).grantRole(await roles.MANAGER_ROLE(), manager.address);

            await metaPoints.connect(owner).initialize();
        }

        // try pause function
        it("try pause function", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await metaPoints.connect(owner).pause()
            ).to.be.ok;
        });

        // try pause function when contract already paused
        it("try pause function when contract already paused", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // pause contract
            const tx = await metaPoints.connect(owner).pause();
            await tx.wait();

            await expect(
                metaPoints.connect(owner).pause()
            ).to.be.revertedWith("Pausable: paused");
        });
        
        // try pause function when caller is not owner
        it("try pause function when caller is not owner", async () => {
            const { manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                metaPoints.connect(manager).pause()
            ).to.be.revertedWith("RolesHandler: Owner role is needed for this action");
        });

        // try unpause function when contract is not paused
        it("try unpause function when contract is not paused", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                metaPoints.connect(owner).unpause()
            ).to.be.revertedWith("Pausable: not paused");
        });

        // try unpause function when contract is paused
        it("try unpause function when contract is paused", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // pause contract
            const tx = await metaPoints.connect(owner).pause();
            await tx.wait();

            expect(
                await metaPoints.connect(owner).unpause()
            ).to.be.ok;
        });
        
        // try pause function when caller is not owner
        it("try pause function when caller is not owner", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // pause contract
            const tx = await metaPoints.connect(owner).pause();
            await tx.wait();

            await expect(
                metaPoints.connect(manager).unpause()
            ).to.be.revertedWith("RolesHandler: Owner role is needed for this action");
        });
        
        // try mint function when caller is not manager
        it("try mint function when caller is not manager", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            await expect(
                metaPoints.connect(owner).mint(owner.address, funds)
            ).to.be.revertedWith("RolesHandler: Manager role is needed for this action");
        });
        
        // try mint function when contract is paused
        it("try mint function when contract is paused", async () => {
            const { owner, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // pause contract
            const tx = await metaPoints.connect(owner).pause();
            await tx.wait();

            await expect(
                metaPoints.connect(owner).mint(owner.address, funds)
            ).to.be.revertedWith("Pausable: paused");
        });
        
        // try mint function
        it("try mint function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            expect(
                await metaPoints.connect(manager).mint(owner.address, funds)
            ).to.be.ok;
        });
        
        // try burn function
        it("try burn function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            expect(
                await metaPoints.connect(owner).burn(funds)
            ).to.be.ok;
        });
        
        // try transfer function
        it("try transfer function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            expect(
                await metaPoints.connect(owner).transfer(manager.address, funds)
            ).to.be.ok;
        });
        
        // try approve function
        it("try approve function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            expect(
                await metaPoints.connect(owner).approve(manager.address, funds)
            ).to.be.ok;
        });
        
        // try transferFrom function
        it("try transferFrom function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            // approve funds
            const tx2 = await metaPoints.connect(manager).approve(manager.address, funds)
            await tx2.wait();

            expect(
                await metaPoints.connect(owner).transferFrom(owner.address, manager.address, funds)
            ).to.be.ok;
        });
        
        // try burnFrom function
        it("try burnFrom function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            // approve funds
            const tx2 = await metaPoints.connect(manager).approve(manager.address, funds)
            await tx2.wait();

            expect(
                await metaPoints.connect(manager).burnFrom(owner.address, funds)
            ).to.be.ok;
        });
        
        // try increaseAllowance function
        it("try increaseAllowance function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            expect(
                await metaPoints.connect(owner).increaseAllowance(manager.address, funds)
            ).to.be.ok;
        });
        
        // try decreaseAllowance function
        it("try decreaseAllowance function", async () => {
            const { owner, manager, metaPoints } = await loadFixture(initiateVariables);

            // init contracts
            await initContracts();

            // mint funds
            const tx = await metaPoints.connect(manager).mint(owner.address, funds);
            await tx.wait();

            expect(
                await metaPoints.connect(owner).decreaseAllowance(manager.address, funds)
            ).to.be.ok;
        });
    });
});