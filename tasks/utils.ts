import { task } from "hardhat/config";
import fs from "fs";
import path from "path";
import { CONTRACTS } from "../scripts/constants";
import { HardhatRuntimeEnvironment, TaskArguments } from "hardhat/types";

// extracts abis for given network
task(
    "extract-abis",
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        try {
            const networkName = hre.network.name;

            for (const contractSection in CONTRACTS) {
                const sectionObj = CONTRACTS[contractSection];
                const objKeys = Object.keys(sectionObj);

                for (let i = 0; i < objKeys.length; i++) {
                    const innerSection = objKeys[i];
                    const originFilePath = path.resolve(
                        __dirname,
                        `../artifacts/contracts/${contractSection}/${innerSection}.sol/${innerSection}.json`
                    );
                    if (!fs.existsSync(originFilePath)) {
                        console.log(originFilePath, "not found!");
                        break;
                    }
                    const abisFilePath = path.resolve(
                        __dirname,
                        `../tmp/abis/${networkName}/${innerSection}.json`
                    );

                    const abisDir = path.resolve(__dirname, `../tmp/abis`);

                    const abisNetworkDir = path.resolve(
                        __dirname,
                        `../tmp/abis/${networkName}`
                    );

                    if (!fs.existsSync(abisNetworkDir)) {
                        fs.mkdirSync(abisDir);
                        fs.mkdirSync(abisNetworkDir);
                    }

                    const file = fs.readFileSync(originFilePath, "utf8");
                    const abi = JSON.parse(file);
                    fs.writeFileSync(abisFilePath, JSON.stringify(abi), "utf8");
                }
            }

            console.log("Task completed!");
        } catch (e) {
            console.log(e);
        }
    }
);

// extracts contract addresses for given network
task(
    "extract-deployment-addresses",
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        try {
            const networkName = hre.network.name;

            let obj: { [key: string]: string; } = {};

            const deploymentsFolder = path.resolve(__dirname, `../tmp/deployments`);

            if (!fs.existsSync(deploymentsFolder)) {
                fs.mkdirSync(deploymentsFolder);
            }

            const deploymentsFilePath = path.resolve(
                __dirname,
                `../tmp/deployments/${networkName}.json`
            );

            for (const contractSection in CONTRACTS) {
                const sectionObj = CONTRACTS[contractSection];
                const objKeys = Object.keys(sectionObj);

                const excludedContracts =
                    [CONTRACTS.core.Distributor, CONTRACTS.core.TokenDistributorWithNoVesting, CONTRACTS.core.TokenDistributor, CONTRACTS.lib.Trigonometry];

                for (let i = 0; i < objKeys.length; i++) {
                    const innerSection = objKeys[i];
                    if (excludedContracts.indexOf(innerSection) === 1) {
                        continue;
                    }

                    const originFilePath = path.resolve(
                        __dirname,
                        `../deployments/${networkName}/${innerSection}.json`
                    );

                    if (!fs.existsSync(originFilePath)) {
                        console.log(originFilePath, "not found!");
                    }

                    if (fs.existsSync(originFilePath)) {
                        const file = fs.readFileSync(originFilePath, "utf8");
                        const abi = JSON.parse(file);
                        obj[innerSection] = abi.address;
                    }
                }
            }

            fs.writeFileSync(deploymentsFilePath, JSON.stringify(obj), "utf8");

            console.info(
                "- Deployments on",
                networkName,
                "network were written to ./tmp/deployments/" +
                networkName +
                ".json file."
            );

            fs.writeFileSync(deploymentsFilePath, JSON.stringify(obj), "utf8");

            console.log("Task completed!");
        } catch (e) {
            console.log(e);
        }
    }
);

task("get-balance", "Get ETH balance")
    .addParam("address", "account address")
    .setAction(async (args, hre) => {
        try {
            const { address } = args;
            const networkName = hre.network.name;

            if (!address) {
                throw new Error("Please provide address argument!");
            }

            hre.ethers.utils.getAddress(address);

            const balance = await hre.ethers.provider.getBalance(address);
            console.log(`Account balance ${hre.ethers.utils.formatEther(balance)} ETH in ${networkName} network.`);
        } catch (err: any) {
            console.log(err);
        }
    });

task(
    "get-timestamp",
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        try {
            const networkName = hre.network.name;

            const block = await hre.ethers.provider.getBlock("latest");
            console.log(
                `-> Network: ${networkName}\n`,
                `Latest block: ${block.number}\n`,
                `Latest block timestamp: ${block.timestamp}`
            );
        } catch (err: any) {
            console.log(err);
        }
    }
);

task(
    "mine",
    async (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) => {
        try {
            await hre.network.provider.send("evm_increaseTime", [3600]);
            await hre.network.provider.send("evm_mine", []);
        } catch (err: any) {
            console.log(err);
        }
    }
);

// verifies multiple contracts
task("verify-contracts", "Verifies multiple contracts")
    .setAction(async (args, hre) => {
        try {
            const networkName = hre.network.name;

            const folderPath = path.resolve(__dirname, `../deployments/${networkName}`);
            if (!fs.existsSync(folderPath)) {
                throw new Error("File not found!");
            }

            const folderContent = fs.readdirSync(folderPath);

            const deployedContracts = folderContent.length > 0 && folderContent.filter((content: string) => {
                return content.split(".")[1] === "json";
            }).map((fileName: string) => {
                const contractFilePath = folderPath + "/" + fileName;
                let fileContent = fs.readFileSync(contractFilePath);
                let contract = JSON.parse(fileContent.toString());

                return {
                    name: fileName.split(".")[0],
                    address: contract.address,
                    args: contract.args,
                };
            });

            if (!deployedContracts || deployedContracts.length === 0) {
                throw new Error("Unable to find deployed contracts!");
            }

            for (let i = 0; i < deployedContracts.length; i++) {
                // await run("verify:verify", {
                //     address: deployedContracts[i].address,
                //     constructorArguments: deployedContracts[i].args,
                // });

                console.log({
                    message: `Contract ${deployedContracts[i].name} verified!`,
                    name: deployedContracts[i].name,
                    address: deployedContracts[i].address,
                    constructorArguments: deployedContracts[i].args,
                });
            }

            console.log("Contracts succesfully verified!");
        } catch (err: any) {
            throw new Error(err);
        }
    });