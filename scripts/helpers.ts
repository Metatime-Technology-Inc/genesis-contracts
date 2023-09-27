import { BigNumber, ethers } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { HardhatEthersHelpers } from "@nomiclabs/hardhat-ethers/types";
import { cos, unit } from "mathjs";

const PI = "3141592653589793238";

type Entry<T> = {
  [K in keyof T]: [K, T[K]]
}[keyof T];

function filterObject<T extends object>(
  obj: T,
  fn: (entry: Entry<T>, i: number, arr: Entry<T>[]) => boolean
) {
  return Object.fromEntries(
    (Object.entries(obj) as Entry<T>[]).filter(fn)
  ) as Partial<T>;
}

const getBlockTimestamp = async (
  ethers: HardhatEthersHelpers
): Promise<number> => {
  const blockNumBefore = await ethers.provider.getBlockNumber();
  const blockBefore = await ethers.provider.getBlock(blockNumBefore);
  return blockBefore.timestamp;
};

const toWei = (amount: string): ethers.BigNumber => {
  return ethers.utils.parseEther(amount);
};

const callMethod = async (
  contract: ethers.Contract,
  signer: SignerWithAddress,
  methodName: string,
  params: any[],
  value?: BigNumber
): Promise<any> => {
  if (value) {
    params.push({ value });
  }

  return await contract.connect(signer)[methodName].apply(null, params);
};

const incrementBlocktimestamp = async (
  ethers: HardhatEthersHelpers,
  givenTimeAmount: number
): Promise<void> => {
  await ethers.provider.send("evm_increaseTime", [givenTimeAmount]);
  await ethers.provider.send("evm_mine", []);
};

const calculateExchangeFee = (amount: number, percentage: number) => {
  return (amount * percentage) / 100;
};

const calculateClaimableAmount = (blockTimestamp: BigNumber, lastClaimTimestamp: BigNumber, periodLength: number, claimableAmount: BigNumber, distributionRate: number) => {
  const decimals = BigNumber.from(10).pow(18);
  return (claimableAmount.mul(distributionRate).mul(blockTimestamp.sub(lastClaimTimestamp)).mul(decimals)).div(BigNumber.from(periodLength).mul(10_000).mul(decimals));
};

const calculateBurnAmount = (currentPrice: BigNumber, blocksInTwoMonths: number, constantValueFromFormula: number, totalBurnedAmount: number) => {
  const decimals = BigNumber.from(10).pow(18);
  const a = BigNumber.from(blocksInTwoMonths).mul(BigNumber.from(13).mul(BigNumber.from(10).pow(4))).mul(decimals);
  const b = (BigNumber.from(100).mul(currentPrice)).add(BigNumber.from(constantValueFromFormula).mul(decimals));
  const c = (a.div(b)).mul(decimals);
  const radiant = (((BigNumber.from(totalBurnedAmount).div(BigNumber.from(10).pow(9))).add(BigNumber.from(86).mul(decimals))).mul(BigNumber.from(PI))).div(BigNumber.from(180).mul(decimals));
  const cosine = toWei(String(cos(Number(ethers.utils.formatEther(radiant)))));
  const d = (cosine.mul(BigNumber.from(2923))).div(BigNumber.from(10).pow(3));

  return (c.mul(d)).div(decimals);
};

const findMarginOfDeviation = (V1: BigNumber, V2: BigNumber) => {
  let absDiff: string | BigNumber | number = V1.sub(V2).abs();
  let absAverage: string | BigNumber | number = (V1.add(V2)).div(2).abs();
  absDiff = ethers.utils.formatUnits(absDiff);
  absAverage = ethers.utils.formatUnits(absAverage);

  return (+absDiff / +absAverage) * 100;
};

export {
  getBlockTimestamp,
  toWei,
  callMethod,
  calculateExchangeFee,
  incrementBlocktimestamp,
  filterObject,
  calculateClaimableAmount,
  calculateBurnAmount,
  findMarginOfDeviation
};