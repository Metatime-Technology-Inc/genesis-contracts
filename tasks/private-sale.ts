import { task } from "hardhat/config";
import { CONTRACTS } from "../scripts/constants";
import { ethers } from "ethers";

// creates TokenDistributorWithNoVesting for given network
task("create-private-sale", "Create a private sale pool")
    .addParam("start", "start timestamp of token distribution")
    .addParam("end", "end timestamp of token distribution")
    .setAction(async (args, hre) => {
        try {
            const { start, end } = args;

            if (!start || !end) {
                throw new Error("Missing arguments!");
            }

            const networkName = hre.network.name;
            const { deployer } = await hre.getNamedAccounts();
            const deployerSigner = await hre.ethers.getSigner(deployer);

            const TokenDistributorWithNoVesting = await hre.ethers.getContractFactory(CONTRACTS.core.TokenDistributorWithNoVesting);
            const privateSaleTokenDistributor = await TokenDistributorWithNoVesting.connect(deployerSigner).deploy(
                Number(start),
                Number(end),
            );

            await privateSaleTokenDistributor.deployed();

            console.log("NETWORK:", networkName);
            console.log("TokenDistributorWithNoVesting deployed at", privateSaleTokenDistributor.address);
        } catch (err: any) {
            throw new Error(err);
        }
    });