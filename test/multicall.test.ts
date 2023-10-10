import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { getBlock, mineBlock, toWei } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Bridge, MockToken, Multicall3, Roles, WMTC } from "../typechain-types";
import { Address } from "hardhat-deploy/types";

describe("Multicall", function () {
  async function initiateVariables() {
    const [owner, user_1, user_2, user_3] = await ethers.getSigners();

    const MockToken_ = await ethers.getContractFactory(CONTRACTS.tokens.WMTC);
    const mockToken = (await MockToken_.connect(owner).deploy()) as WMTC;
    await mockToken.deployed();

    const Multicall_ = await ethers.getContractFactory(
      CONTRACTS.utils.Multicall3
    );
    const multicall = (await Multicall_.connect(owner).deploy()) as Multicall3;
    await multicall.deployed();

    return {
      owner,
      user_1,
      user_2,
      user_3,
      multicall,
      mockToken,
    };
  }

  describe("test multicall contract", async () => {
    it("test aggregate functions", async () => {
      const { owner, user_1, user_2, user_3, multicall, mockToken } =
        await loadFixture(initiateVariables);

      const addresses: Address[] = [
        user_1.address,
        user_2.address,
        user_3.address,
      ];
      let callData: Multicall3.CallStruct[] = [];
      let callDataFail: Multicall3.CallStruct[] = [];
      let callData3: Multicall3.Call3Struct[] = [];
      let callData3AllowFailure: Multicall3.Call3Struct[] = [];
      let callData3Value: Multicall3.Call3ValueStruct[] = [];
      let callData3ValueAllowFailure: Multicall3.Call3ValueStruct[] = [];
      for (let i: number = 0; i < addresses.length; i++) {
        callData.push({
          callData: mockToken.interface.encodeFunctionData("balanceOf", [
            addresses[i],
          ]),
          target: mockToken.address,
        });
        callDataFail.push({
          callData: mockToken.interface.encodeFunctionData("transfer", [
            addresses[i],
            toWei("1"),
          ]),
          target: mockToken.address,
        });
        callData3.push({
          callData: mockToken.interface.encodeFunctionData("balanceOf", [
            addresses[i],
          ]),
          target: mockToken.address,
          allowFailure: false,
        });
        callData3AllowFailure.push({
          callData: mockToken.interface.encodeFunctionData("balanceOf", [
            addresses[i],
          ]),
          target: mockToken.address,
          allowFailure: true,
        });
        callData3Value.push({
          callData: mockToken.interface.encodeFunctionData("deposit"),
          target: mockToken.address,
          allowFailure: false,
          value: toWei("1"),
        });
        callData3ValueAllowFailure.push({
          callData: mockToken.interface.encodeFunctionData("deposit"),
          target: mockToken.address,
          allowFailure: true,
          value: toWei("1"),
        });
      }
      const aggregate = await multicall
        .connect(owner)
        .callStatic.aggregate(callData);
      expect(aggregate.returnData.map((data) => Number(data))).to.be.members([
        0, 0, 0,
      ]);

      await expect(
        multicall.connect(user_1).callStatic.aggregate(callDataFail)
      ).revertedWith("Multicall3: call failed");

      const tryAndAggregateTrue = await multicall
        .connect(owner)
        .callStatic.tryAggregate(true, callData);

      expect(
        tryAndAggregateTrue.map((data) => Number(data.returnData))
      ).to.be.members([0, 0, 0]);

      await expect(
        multicall.connect(user_1).tryAggregate(true, callDataFail)
      ).revertedWith("Multicall3: call failed");

      const tryAndAggregateFalse = await multicall
        .connect(owner)
        .callStatic.tryAggregate(false, callData);
      expect(
        tryAndAggregateFalse.map((data) => Number(data.returnData))
      ).to.be.members([0, 0, 0]);

      const tryBlockAndAggregateTrue = await multicall
        .connect(owner)
        .callStatic.tryBlockAndAggregate(true, callData);
      const tryBlockAndAggregateTrueBlock = await getBlock(
        ethers,
        Number(tryBlockAndAggregateTrue.blockNumber)
      );
      expect(
        tryBlockAndAggregateTrue.returnData.map((data) => Number(data[1]))
      ).to.be.members([0, 0, 0]);
      expect([
        tryBlockAndAggregateTrue.blockHash,
        Number(tryBlockAndAggregateTrue.blockNumber),
      ]).to.be.members([
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        Number(tryBlockAndAggregateTrueBlock.number),
      ]);

      await multicall.connect(owner).tryBlockAndAggregate(true, callData);

      await multicall.connect(owner).blockAndAggregate(callData);

      await multicall.connect(owner).aggregate3(callData3);

      await multicall.connect(owner).aggregate3(callData3AllowFailure);

      await multicall
        .connect(owner)
        .aggregate3Value(callData3Value, { value: toWei("3") });

      await expect(
        multicall
          .connect(owner)
          .aggregate3Value(callData3Value, { value: toWei("4") })
      ).revertedWith("Multicall3: value mismatch");

      await multicall
        .connect(owner)
        .aggregate3Value(callData3ValueAllowFailure, { value: toWei("3") });
    });

    it("test view functions", async () => {
      const { owner, multicall } = await loadFixture(initiateVariables);

      await mineBlock(ethers);

      const block = await getBlock(ethers);
      const secondBlock = await getBlock(ethers, 2);

      await multicall.getBlockHash(2);
      await multicall.getLastBlockHash();
      expect(await multicall.getBlockNumber(), "block number").to.be.equal(
        block.number
      );
      expect(
        await multicall.getBasefee(),
        "current block base fee"
      ).to.be.equal(0);
      expect(
        await multicall.getCurrentBlockCoinbase(),
        "current block coinbase"
      ).to.be.equal(block.miner);
      expect(
        await multicall.getCurrentBlockDifficulty(),
        "current block difficulty"
      ).to.be.equal(block.difficulty);
      expect(
        await multicall.getCurrentBlockGasLimit(),
        "current block gas limit"
      ).to.be.equal(block.gasLimit);
      expect(
        await multicall.getCurrentBlockTimestamp(),
        "current block timestamp"
      ).to.be.equal(block.timestamp);
      expect(
        await multicall.getEthBalance(owner.address),
        "eth balance"
      ).to.be.equal(await owner.getBalance());
      expect(await multicall.getChainId(), "chain id").to.be.equal(
        network.config.chainId
      );
    });
  });
});
