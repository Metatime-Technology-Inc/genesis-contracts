import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONSTRUCTOR_PARAMS, CONTRACTS } from "../constants";

const func: DeployFunction = async ({
    deployments,
    ethers,
    getChainId,
    getNamedAccounts,
}: HardhatRuntimeEnvironment) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const mtc = await deploy(CONTRACTS.core.MTC, {
        from: deployer,
        args: [CONSTRUCTOR_PARAMS.MTC.totalSupply],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("MTC deployed at", mtc.address);

    const multicall3 = await deploy(CONTRACTS.utils.Multicall3, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("Multicall3 deployed at", multicall3.address);

    const multisig = await deploy(CONTRACTS.utils.MultiSigWallet, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("MulticallV3 deployed at", multisig.address);

    // const liquidityPool = await deploy(CONTRACTS.core.LiquidityPool, {
    //     from: deployer,
    //     args: [mtc.address],
    //     log: true,
    //     skipIfAlreadyDeployed: true,
    // });

    // console.log("Liquidity pool deployed at", liquidityPool.address);

    // const strategicPool = await deploy(CONTRACTS.core.StrategicPool, {
    //     from: deployer,
    //     args: [mtc.address],
    //     log: true,
    //     skipIfAlreadyDeployed: true,
    // });

    // console.log("Strategic pool deployed at", strategicPool.address);

    const poolFactory = await deploy(CONTRACTS.utils.PoolFactory, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("Pool factory deployed at", poolFactory.address);

    const distributor = await deploy(CONTRACTS.core.Distributor, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("Distributor deployed at", distributor.address);

    const tokenDistributor = await deploy(CONTRACTS.core.TokenDistributor, {
        from: deployer,
        args: [],
        log: true,
        skipIfAlreadyDeployed: true,
    });

    console.log("TokenDistributor deployed at", tokenDistributor.address);

    // // Pools that is derived from Distributor contract
    // const distributors = filterObject(POOL_PARAMS, ([k, v]) => v.baseContract === BaseContract.Distributor);

    // const distributorKeys = Object.keys(distributors);

    // // Pools that is derived from TokenDistributor contract
    // const tokenDistributors = filterObject(POOL_PARAMS, ([k, v]) => v.baseContract === BaseContract.TokenDistributor);

    // const tokenDistributorKeys = Object.keys(tokenDistributors);
};

export default func;

func.dependencies = ["MTC"];
