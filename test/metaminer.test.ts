import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber, BytesLike } from "ethers";
import { BlockValidator, MinerList, Macrominer, MinerPool, Metaminer, Roles } from "../typechain-types";

describe("Metaminer", function () {
    async function initiateVariables() {
        const [owner, metaminer_1, metaminer_2] =
            await ethers.getSigners();

        // Macrominer dependency contracts deployments
        // ***
        const Roles_ = await ethers.getContractFactory(
            CONTRACTS.utils.Roles,
        );
        const roles = await Roles_.connect(owner).deploy() as Roles;
        await roles.deployed();

        const BlockValidator_ = await ethers.getContractFactory(
            CONTRACTS.utils.BlockValidator,
        );
        const blockValidator = await BlockValidator_.connect(owner).deploy() as BlockValidator;
        await blockValidator.deployed();

        const MinerList_ = await ethers.getContractFactory(
            CONTRACTS.utils.MinerList,
        );
        const minerList = await MinerList_.connect(owner).deploy() as MinerList;
        await minerList.deployed();

        const MinerFormulas_ = await ethers.getContractFactory(
            CONTRACTS.utils.MinerFormulas,
        );
        const minerFormulas = await MinerFormulas_.connect(owner).deploy() as MinerList;
        await minerFormulas.deployed();

        const MinerPool_ = await ethers.getContractFactory(
            CONTRACTS.core.MinerPool,
        );
        const minerPool = await MinerPool_.connect(owner).deploy() as MinerPool;
        await minerPool.deployed();

        const MacroMiner_ = await ethers.getContractFactory(
            CONTRACTS.utils.Macrominer
        );
        const macrominer = await MacroMiner_.connect(owner).deploy() as Macrominer;
        await macrominer.deployed();
        // ***

        const Metaminer_ = await ethers.getContractFactory(
            CONTRACTS.utils.Metaminer
        );
        const metaminer = await Metaminer_.connect(owner).deploy() as Metaminer;
        await metaminer.deployed();

        await metaminer.connect(owner).initialize(blockValidator.address, minerList.address, minerFormulas.address, minerPool.address);
        await metaminer.connect(owner).initRoles(roles.address);

        return {
            owner,
            metaminer_1,
            metaminer_2,
        };
    }

    // test MicroMiner
    describe("test microminer contract", async () => {

    });
});