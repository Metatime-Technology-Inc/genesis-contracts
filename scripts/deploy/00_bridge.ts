import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CONSTRUCTOR_PARAMS, CONTRACTS } from "../constants";

const func: DeployFunction = async ({
  deployments,
  ethers,
  getChainId,
  getNamedAccounts,
  network,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const bridge = await deploy(CONTRACTS.utils.Bridge, {
    from: deployer,
    args: [CONSTRUCTOR_PARAMS.Bridge.mtcAddress],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  console.log(`Bridge deployed at ${bridge.address} on ${network.name}.`);
};

export default func;

func.dependencies = ["MTC"];
