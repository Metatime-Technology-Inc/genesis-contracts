import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import {
  incrementBlocktimestamp,
  setBalance,
  toWei,
  mineBlock,
} from "../scripts/helpers";
import { BigNumber } from "ethers";
import {
  BlockValidator,
  MinerList,
  Macrominer,
  MinerPool,
  MinerFormulas,
  Metaminer,
  Roles,
  RewardsPool,
  MinerHealthCheck,
  MetaPoints,
  MockMetaminer,
} from "../typechain-types";

describe("Metaminer", function () {
  const minerHealthCheckTimeoutNumber: number = 14_400; // 4 hours
  const minerHealthCheckTimeout: BigNumber = BigNumber.from(
    String(minerHealthCheckTimeoutNumber)
  );
  async function initiateVariables() {
    const [owner, user_1, user_2, metaminer_1, metaminer_2, metaminer_3] =
      await ethers.getSigners();

    // Macrominer dependency contracts deployments
    // ***
    const Roles_ = await ethers.getContractFactory(CONTRACTS.utils.Roles);
    const roles = (await Roles_.connect(owner).deploy()) as Roles;
    await roles.deployed();

    const BlockValidator_ = await ethers.getContractFactory(
      CONTRACTS.utils.BlockValidator
    );
    const blockValidator = (await BlockValidator_.connect(
      owner
    ).deploy()) as BlockValidator;
    await blockValidator.deployed();

    const MinerList_ = await ethers.getContractFactory(
      CONTRACTS.utils.MinerList
    );
    const minerList = (await MinerList_.connect(owner).deploy()) as MinerList;
    await minerList.deployed();

    const MinerFormulas_ = await ethers.getContractFactory(
      CONTRACTS.utils.MinerFormulas
    );
    const minerFormulas = (await MinerFormulas_.connect(
      owner
    ).deploy()) as MinerFormulas;
    await minerFormulas.deployed();

    const MinerPool_ = await ethers.getContractFactory(
      CONTRACTS.core.MinerPool
    );
    const minerPool = (await MinerPool_.connect(owner).deploy()) as MinerPool;
    await minerPool.deployed();

    const RewardsPool_ = await ethers.getContractFactory(
      CONTRACTS.core.RewardsPool
    );
    const rewardsPool = (await RewardsPool_.connect(
      owner
    ).deploy()) as RewardsPool;
    await rewardsPool.deployed();

    const MinerHealthCheck_ = await ethers.getContractFactory(
      CONTRACTS.utils.MinerHealthCheck
    );
    const minerHealthCheck = (await MinerHealthCheck_.connect(
      owner
    ).deploy()) as MinerHealthCheck;
    await minerHealthCheck.deployed();

    const MetaPoints_ = await ethers.getContractFactory(
      CONTRACTS.utils.MetaPoints
    );
    const metaPoints = (await MetaPoints_.connect(
      owner
    ).deploy()) as MetaPoints;
    await metaPoints.deployed();

    const MockMetaminer_ = await ethers.getContractFactory(
      CONTRACTS.utils.MockMetaminer
    );
    const mockMetaminer = (await MockMetaminer_.connect(
      owner
    ).deploy()) as MockMetaminer;
    await mockMetaminer.deployed();
    // ***

    const Metaminer_ = await ethers.getContractFactory(
      CONTRACTS.utils.Metaminer
    );
    const metaminer = (await Metaminer_.connect(owner).deploy()) as Metaminer;
    await metaminer.deployed();

    await roles.connect(owner).initialize(owner.address);
    await metaminer
      .connect(owner)
      .initialize(
        blockValidator.address,
        minerList.address,
        minerFormulas.address,
        minerPool.address
      );
    await mockMetaminer
      .connect(owner)
      .initialize(
        blockValidator.address,
        minerList.address,
        minerFormulas.address,
        minerPool.address
      );

    await minerHealthCheck
      .connect(owner)
      .initialize(
        minerList.address,
        minerFormulas.address,
        minerPool.address,
        metaPoints.address,
        minerHealthCheckTimeout
      );

    await minerFormulas
      .connect(owner)
      .initialize(
        metaPoints.address,
        minerList.address,
        minerHealthCheck.address
      );

    await minerPool.connect(owner).initialize(minerFormulas.address);

    await metaPoints.connect(owner).initialize();

    await minerList.connect(owner).initialize(minerHealthCheck.address);

    await rewardsPool.connect(owner).initialize(minerFormulas.address);

    await blockValidator.connect(owner).initialize(rewardsPool.address);

    await metaminer.connect(owner).initRoles(roles.address);
    await mockMetaminer.connect(owner).initRoles(roles.address);
    await minerList.connect(owner).initRoles(roles.address);
    await blockValidator.connect(owner).initRoles(roles.address);
    await minerPool.connect(owner).initRoles(roles.address);
    await rewardsPool.connect(owner).initRoles(roles.address);
    await minerHealthCheck.connect(owner).initRoles(roles.address);

    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), blockValidator.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), rewardsPool.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), minerHealthCheck.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), minerFormulas.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), minerPool.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), metaPoints.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), minerList.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), metaminer.address);
    await roles
      .connect(owner)
      .grantRole(await roles.MANAGER_ROLE(), mockMetaminer.address);
    await roles
      .connect(owner)
      .grantRole(await roles.VALIDATOR_ROLE(), owner.address);

    const totalCharge = (await metaminer.ANNUAL_AMOUNT()).add(
      await metaminer.STAKE_AMOUNT()
    );

    await setBalance(network, metaminer_1.address, "0x33b2e3c9fd0803ce8000000");

    return {
      owner,
      user_1,
      user_2,
      metaminerContract: metaminer,
      metaminer_1,
      metaminer_2,
      metaminer_3,
      totalCharge,
      blockValidator,
      mockMetaminer,
      rewardsPool,
    };
  }

  // test Metaminer
  describe("test metaminer contract", async () => {
    // try initialize function with zero address
    it("try initialize function with zero address", async () => {
      const { owner } = await loadFixture(initiateVariables);

      const Metaminer2 = await ethers.getContractFactory(
        CONTRACTS.utils.Metaminer
      );
      const metaminer = (await Metaminer2.connect(owner).deploy()) as Metaminer;

      const RewardsPool2 = await ethers.getContractFactory(
        CONTRACTS.core.RewardsPool
      );
      const rewardsPool = (await RewardsPool2.connect(
        owner
      ).deploy()) as RewardsPool;

      await expect(
        metaminer
          .connect(owner)
          .initialize(
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
          )
      ).to.be.revertedWith("Metaminer: cannot set zero address");
      await expect(
        rewardsPool.connect(owner).initialize(ethers.constants.AddressZero)
      ).to.be.revertedWith("RewardsPool: cannot set zero address");
    });

    it("try to set miner with wrong amount of ether", async () => {
      const { metaminerContract, metaminer_1 } = await loadFixture(
        initiateVariables
      );

      await expect(
        metaminerContract.connect(metaminer_1).setMiner({ value: 1 })
      ).revertedWith("Metaminer: Required MTC is not sent");
    });

    it("try to set miner successfully", async () => {
      const { metaminerContract, metaminer_1, totalCharge } = await loadFixture(
        initiateVariables
      );

      await metaminerContract
        .connect(metaminer_1)
        .setMiner({ value: totalCharge });
    });

    it("try to subscribe and expect it to revert", async () => {
      const { metaminerContract, metaminer_1, totalCharge } = await loadFixture(
        initiateVariables
      );

      await expect(
        metaminerContract.connect(metaminer_1).subscribe({ value: 1 })
      ).revertedWith("Metaminer: Address is not metaminer");
      await metaminerContract
        .connect(metaminer_1)
        .setMiner({ value: totalCharge });
      await expect(
        metaminerContract.connect(metaminer_1).subscribe({ value: 1 })
      ).revertedWith("Metaminer: Required MTC was not sent");
    });

    it("try to subscribe & unsubscribe successfully", async () => {
      const { metaminerContract, metaminer_1, totalCharge } = await loadFixture(
        initiateVariables
      );

      await metaminerContract
        .connect(metaminer_1)
        .setMiner({ value: totalCharge });
      expect(
        await metaminerContract.connect(metaminer_1).callStatic.subscribe({
          value: await metaminerContract.ANNUAL_AMOUNT(),
        })
      ).to.be.equal(true);

      expect(
        await metaminerContract.connect(metaminer_1).callStatic.unsubscribe()
      ).to.be.equal(true);
    });

    it("try to unsubscribe with 0 balance metaminer contract", async () => {
      const { metaminerContract, metaminer_1, totalCharge } = await loadFixture(
        initiateVariables
      );

      await metaminerContract
        .connect(metaminer_1)
        .setMiner({ value: totalCharge });
      await metaminerContract.connect(metaminer_1).callStatic.subscribe({
        value: await metaminerContract.ANNUAL_AMOUNT(),
      });

      await setBalance(network, metaminerContract.address, "0x0");
      await expect(
        metaminerContract.connect(metaminer_1).unsubscribe()
      ).revertedWith("Metaminer: Unsubsribe failed");
    });

    it("try to set validator", async () => {
      const { owner, metaminerContract, metaminer_2, metaminer_1, user_1 } =
        await loadFixture(initiateVariables);

      await expect(
        metaminerContract.connect(user_1).setValidator(metaminer_2.address)
      ).revertedWith("RolesHandler: Owner role is needed for this action");

      await expect(
        metaminerContract
          .connect(owner)
          .setValidator(ethers.constants.AddressZero)
      ).revertedWith("Metaminer: Validator cannot be zero address");

      expect(
        await metaminerContract
          .connect(owner)
          .callStatic.setValidator(metaminer_2.address)
      ).to.be.equal(true);

      await metaminerContract
          .connect(owner)
          .setValidator(metaminer_1.address)

      expect(
        await metaminerContract
            .connect(metaminer_1)
            .callStatic.unsubscribe()
        ).to.be.equal(true);
    });

    it("try to refresh validator", async () => {
      const { owner, metaminerContract, metaminer_1 } = await loadFixture(
        initiateVariables
      );

      await metaminerContract.connect(owner).setValidator(metaminer_1.address);

      expect(
        await metaminerContract
          .connect(owner)
          .callStatic.refreshValidator(metaminer_1.address)
      ).to.be.equal(true);
    });

    it("try to set percents", async () => {
      const { owner, metaminerContract, metaminer_1, user_1, user_2 } =
        await loadFixture(initiateVariables);

      await metaminerContract.connect(owner).setValidator(metaminer_1.address);

      await expect(
        metaminerContract
          .connect(owner)
          .setPercentages(
            metaminer_1.address,
            [user_1.address, user_2.address],
            [3_000, 10_000]
          )
      ).revertedWith("Metaminer: Total percent cannot exceed 100");

      await expect(
        metaminerContract
          .connect(owner)
          .setPercentages(
            metaminer_1.address,
            [user_1.address, user_2.address, ethers.constants.AddressZero],
            [3_000, 1_000, 1_000]
          )
      ).revertedWith("Metaminer: Shareholder cannot set zero address");

      await expect(
        metaminerContract
          .connect(owner)
          .setPercentages(
            metaminer_1.address,
            [user_1.address, user_2.address],
            [3_000, 0]
          )
      ).revertedWith("Metaminer: Shareholder percentage cannot be zero");

      expect(
        await metaminerContract
          .connect(owner)
          .callStatic.setPercentages(
            metaminer_1.address,
            [user_1.address, user_2.address],
            [3_000, 2_000]
          )
      ).to.be.equal(true);
    });

    it("try to finalize block", async () => {
      const {
        owner,
        metaminerContract,
        blockValidator,
        metaminer_1,
        metaminer_2,
        metaminer_3,
        totalCharge,
      } = await loadFixture(initiateVariables);

      await metaminerContract.connect(owner).setValidator(metaminer_1.address);

      // await mineBlock(ethers, 10);

      const block_0 = await blockValidator.provider.getBlock("latest");
      const blockPayload_1: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_1.address,
        blockHash: block_0.hash,
        blockReward: toWei("1000"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_0.number, blockPayload_1);

      const block_1 = await blockValidator.provider.getBlock("latest");
      const blockPayload_2: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_2.address,
        blockHash: block_1.hash,
        blockReward: toWei("1000"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_1.number, blockPayload_2);

      const block_2 = await blockValidator.provider.getBlock("latest");
      const blockPayload_3: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_3.address,
        blockHash: block_2.hash,
        blockReward: toWei("100"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_2.number, blockPayload_3);
      const {
        coinbase: blockPayload_1Coinbase,
        blockHash: blockPayload_1BlockHash,
        blockReward: blockPayload_1BlockReward,
        isFinalized: blockPayload_1IsFinalized,
      } = await blockValidator.blockPayloads(block_0.number);
      const {
        coinbase: blockPayload_2Coinbase,
        blockHash: blockPayload_2BlockHash,
        blockReward: blockPayload_2BlockReward,
        isFinalized: blockPayload_2IsFinalized,
      } = await blockValidator.blockPayloads(block_1.number);
      const {
        coinbase: blockPayload_3Coinbase,
        blockHash: blockPayload_3BlockHash,
        blockReward: blockPayload_3BlockReward,
        isFinalized: blockPayload_3IsFinalized,
      } = await blockValidator.blockPayloads(block_2.number);

      expect(blockPayload_1Coinbase).to.be.equal(blockPayload_1.coinbase);
      expect(blockPayload_1BlockHash).to.be.equal(blockPayload_1.blockHash);
      expect(blockPayload_1BlockReward).to.be.equal(blockPayload_1.blockReward);
      expect(blockPayload_1IsFinalized).to.be.equal(blockPayload_1.isFinalized);
      expect(blockPayload_2Coinbase).to.be.equal(blockPayload_2.coinbase);
      expect(blockPayload_2BlockHash).to.be.equal(blockPayload_2.blockHash);
      expect(blockPayload_2BlockReward).to.be.equal(blockPayload_2.blockReward);
      expect(blockPayload_2IsFinalized).to.be.equal(blockPayload_2.isFinalized);
      expect(blockPayload_3Coinbase).to.be.equal(blockPayload_3.coinbase);
      expect(blockPayload_3BlockHash).to.be.equal(blockPayload_3.blockHash);
      expect(blockPayload_3BlockReward).to.be.equal(blockPayload_3.blockReward);
      expect(blockPayload_3IsFinalized).to.be.equal(blockPayload_3.isFinalized);

      expect(
        await metaminerContract
          .connect(metaminer_1)
          .callStatic.finalizeBlock(block_0.number, {
            value: blockPayload_1.blockReward,
          })
      ).to.be.equal(true);

      await setBalance(
        network,
        metaminer_2.address,
        "0x33b2e3c9fd0803ce8000000"
      );

      await setBalance(
        network,
        metaminer_3.address,
        "0x33b2e3c9fd0803ce8000000"
      );

      await metaminerContract
        .connect(metaminer_2)
        .setMiner({ value: totalCharge });

      await metaminerContract
        .connect(metaminer_3)
        .setMiner({ value: totalCharge });

      await expect(
        metaminerContract
          .connect(metaminer_1)
          .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward })
      ).revertedWith("Metaminer: Wrong coinbase");

      await expect(
        metaminerContract.connect(metaminer_3).finalizeBlock(block_2.number, {
          value: ethers.BigNumber.from(blockPayload_3.blockReward).div(2),
        })
      ).revertedWith("Metaminer: Insufficient amount");

      await metaminerContract
        .connect(metaminer_3)
        .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward });

      await expect(
        metaminerContract
          .connect(metaminer_3)
          .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward })
      ).revertedWith("Metaminer: Already finalized");

      // increment blocktimestamp to 1 year and 35 days to revoke miners subscription
      await incrementBlocktimestamp(ethers, 86400 * 400);

      expect(
        await metaminerContract
          .connect(metaminer_2)
          .callStatic.finalizeBlock(block_1.number, {
            value: blockPayload_2.blockReward,
          })
      ).to.be.equal(false);
    });

    it("try to finalize block 2", async () => {
      const {
        owner,
        metaminerContract,
        blockValidator,
        metaminer_1,
        metaminer_2,
        metaminer_3,
        totalCharge,
        user_1,
        user_2
      } = await loadFixture(initiateVariables);

      await metaminerContract.connect(owner).setValidator(metaminer_1.address);

      await metaminerContract.connect(owner).setPercentages(
        metaminer_1.address,
        [user_1.address, user_2.address],
        [3_000, 2_000]
      );

      // await mineBlock(ethers, 10);

      const block_0 = await blockValidator.provider.getBlock("latest");
      const blockPayload_1: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_1.address,
        blockHash: block_0.hash,
        blockReward: toWei("1000"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_0.number, blockPayload_1);

      const block_1 = await blockValidator.provider.getBlock("latest");
      const blockPayload_2: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_2.address,
        blockHash: block_1.hash,
        blockReward: toWei("1000"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_1.number, blockPayload_2);

      const block_2 = await blockValidator.provider.getBlock("latest");
      const blockPayload_3: BlockValidator.BlockPayloadStruct = {
        coinbase: metaminer_3.address,
        blockHash: block_2.hash,
        blockReward: toWei("100"),
        isFinalized: false,
      };
      await blockValidator
        .connect(owner)
        .setBlockPayload(block_2.number, blockPayload_3);
      const {
        coinbase: blockPayload_1Coinbase,
        blockHash: blockPayload_1BlockHash,
        blockReward: blockPayload_1BlockReward,
        isFinalized: blockPayload_1IsFinalized,
      } = await blockValidator.blockPayloads(block_0.number);
      const {
        coinbase: blockPayload_2Coinbase,
        blockHash: blockPayload_2BlockHash,
        blockReward: blockPayload_2BlockReward,
        isFinalized: blockPayload_2IsFinalized,
      } = await blockValidator.blockPayloads(block_1.number);
      const {
        coinbase: blockPayload_3Coinbase,
        blockHash: blockPayload_3BlockHash,
        blockReward: blockPayload_3BlockReward,
        isFinalized: blockPayload_3IsFinalized,
      } = await blockValidator.blockPayloads(block_2.number);

      expect(blockPayload_1Coinbase).to.be.equal(blockPayload_1.coinbase);
      expect(blockPayload_1BlockHash).to.be.equal(blockPayload_1.blockHash);
      expect(blockPayload_1BlockReward).to.be.equal(blockPayload_1.blockReward);
      expect(blockPayload_1IsFinalized).to.be.equal(blockPayload_1.isFinalized);
      expect(blockPayload_2Coinbase).to.be.equal(blockPayload_2.coinbase);
      expect(blockPayload_2BlockHash).to.be.equal(blockPayload_2.blockHash);
      expect(blockPayload_2BlockReward).to.be.equal(blockPayload_2.blockReward);
      expect(blockPayload_2IsFinalized).to.be.equal(blockPayload_2.isFinalized);
      expect(blockPayload_3Coinbase).to.be.equal(blockPayload_3.coinbase);
      expect(blockPayload_3BlockHash).to.be.equal(blockPayload_3.blockHash);
      expect(blockPayload_3BlockReward).to.be.equal(blockPayload_3.blockReward);
      expect(blockPayload_3IsFinalized).to.be.equal(blockPayload_3.isFinalized);

      expect(
        await metaminerContract
          .connect(metaminer_1)
          .callStatic.finalizeBlock(block_0.number, {
            value: blockPayload_1.blockReward,
          })
      ).to.be.equal(true);

      await setBalance(
        network,
        metaminer_2.address,
        "0x33b2e3c9fd0803ce8000000"
      );

      await setBalance(
        network,
        metaminer_3.address,
        "0x33b2e3c9fd0803ce8000000"
      );

      await metaminerContract
        .connect(metaminer_2)
        .setMiner({ value: totalCharge });

      await metaminerContract
        .connect(metaminer_3)
        .setMiner({ value: totalCharge });

      await expect(
        metaminerContract
          .connect(metaminer_1)
          .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward })
      ).revertedWith("Metaminer: Wrong coinbase");

      await expect(
        metaminerContract.connect(metaminer_3).finalizeBlock(block_2.number, {
          value: ethers.BigNumber.from(blockPayload_3.blockReward).div(2),
        })
      ).revertedWith("Metaminer: Insufficient amount");

      await metaminerContract
        .connect(metaminer_3)
        .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward });

      await expect(
        metaminerContract
          .connect(metaminer_3)
          .finalizeBlock(block_2.number, { value: blockPayload_3.blockReward })
      ).revertedWith("Metaminer: Already finalized");

      // increment blocktimestamp to 1 year and 35 days to revoke miners subscription
      await incrementBlocktimestamp(ethers, 86400 * 400);

      expect(
        await metaminerContract
          .connect(metaminer_2)
          .callStatic.finalizeBlock(block_1.number, {
            value: blockPayload_2.blockReward,
          })
      ).to.be.equal(false);
    });

    it("test burn mechanism", async () => {
      const { mockMetaminer, metaminer_1 } = await loadFixture(
        initiateVariables
      );

      const BURNED_AMOUNT = toWei(String(10));

      await metaminer_1.sendTransaction({
        to: mockMetaminer.address,
        value: BURNED_AMOUNT,
      });

      await mockMetaminer.connect(metaminer_1).burn(BURNED_AMOUNT);

      await expect(
        mockMetaminer.connect(metaminer_1).burn(BURNED_AMOUNT)
      ).revertedWith("Metaminer: Unable to burn");
    });

    it("test share income function and expect it to fail", async () => {
      const { mockMetaminer, metaminer_1, totalCharge } = await loadFixture(
        initiateVariables
      );

      await setBalance(
        network,
        metaminer_1.address,
        "0x1431e0fae6d7217caa0000000"
      );

      await mockMetaminer.connect(metaminer_1).setMiner({ value: totalCharge });

      await setBalance(network, mockMetaminer.address, "0x0");

      await expect(
        mockMetaminer.connect(metaminer_1).shareIncome({
          value: toWei("10"),
        })
      ).revertedWith("Metaminer: Income sharing failed");

      // increment blocktimestamp to 1 year and 35 days to revoke miners subscription
      await incrementBlocktimestamp(ethers, 86400 * 400);

      await setBalance(
        network,
        mockMetaminer.address,
        "0x1431e0fae6d7217caa0000000"
      );

      await expect(
        mockMetaminer.connect(metaminer_1).shareIncome({
          value: toWei("100"),
        })
      ).revertedWith("Metaminer: Miner subscription is not as required");
    });

    it("try to send eth to rewards pool", async () => {
      const { owner, rewardsPool } = await loadFixture(initiateVariables);

      await expect(
        owner.sendTransaction({
          to: rewardsPool.address,
          value: toWei("1"),
        })
      )
        .to.emit(rewardsPool, "Deposit")
        .withArgs(owner.address, toWei("1"), toWei("1"));
    });
  });
});
