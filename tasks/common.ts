import { task } from "hardhat/config";
import fs from "fs";
import path from "path";

// transfer ownership of contract
task("transfer-ownership", "Transfers ownership of contract")
    .addParam("contract", "address of contract")
    .addParam("newowner", "new owner address")
    .setAction(async (args, hre) => {
        try {
            const { contract, newowner } = args;

            if (!contract || !newowner) {
                throw new Error("Missing arguments!");
            }

            const networkName = hre.network.name;
            const newOwner = hre.ethers.utils.getAddress(newowner);
            const { deployer } = await hre.getNamedAccounts();
            const deployerSigner = await hre.ethers.getSigner(deployer);

            const abi = [
                "function transferOwnership(address newOwner)",
            ];

            const contractInstance = new hre.ethers.Contract(contract, abi, deployerSigner);

            await contractInstance.transferOwnership(newOwner);

            console.log("NETWORK:", networkName);
            console.log(`Ownership request sent to ${newOwner} for the address of ${contract}.`);
        } catch (err: any) {
            throw new Error(err);
        }
    });