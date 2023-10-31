import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import {
  toWei,
  incrementBlocktimestamp,
  getSlotOfTotalRewardsFromFirstFormula,
} from "../scripts/helpers";
import { BigNumber } from "ethers";
import {
  Macrominer,
  MinerHealthCheck,
  MinerFormulas,
  MinerPool,
  MetaPoints,
  MinerList,
  Roles,
} from "../typechain-types";

describe("MacroMiner", function () {
  async function initiateVariables() {
    const [owner, manager, miner_1, miner_2, miner_3] =
      await ethers.getSigners();

    const Macrominer_ = await ethers.getContractFactory(
      CONTRACTS.utils.Macrominer
    );
    const macroMiner = (await Macrominer_.connect(
      owner
    ).deploy()) as Macrominer;
    await macroMiner.deployed();

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

    const MinerList_ = await ethers.getContractFactory(
      CONTRACTS.utils.MinerList
    );
    const minerList = (await MinerList_.connect(owner).deploy()) as MinerList;
    await minerList.deployed();

    const Roles_ = await ethers.getContractFactory(CONTRACTS.utils.Roles);
    const roles = (await Roles_.connect(owner).deploy()) as Roles;
    await roles.deployed();

    return {
      macroMiner,
      minerHealthCheck,
      minerFormulas,
      minerPool,
      metaPoints,
      minerList,
      roles,
      owner,
      manager,
      miner_1,
      miner_2,
      miner_3,
    };
  }

  // test Macrominer
  describe("test macrominer contract", async () => {
    const minerHealthCheckTimeoutNumber: number = 14_400; // 4 hours
    const minerHealthCheckTimeout: BigNumber = BigNumber.from(
      String(minerHealthCheckTimeoutNumber)
    );
    const metaminerType: BigNumber = BigNumber.from(String(0));
    const macrominerArchiveType: BigNumber = BigNumber.from(String(1));
    const macrominerFullnodeType: BigNumber = BigNumber.from(String(2));
    const macrominerLightType: BigNumber = BigNumber.from(String(3));
    const STAKE_AMOUNT: BigNumber = toWei(String(100));

    const initContracts = async () => {
      const {
        owner,
        manager,
        miner_1,
        roles,
        macroMiner,
        minerHealthCheck,
        minerFormulas,
        minerPool,
        metaPoints,
        minerList,
      } = await loadFixture(initiateVariables);

      await minerList.initRoles(roles.address);
      await minerPool.initRoles(roles.address);
      await metaPoints.initRoles(roles.address);
      await minerHealthCheck.initRoles(roles.address);

      await roles.connect(owner).initialize(owner.address);
      await roles
        .connect(owner)
        .grantRole(await roles.MANAGER_ROLE(), manager.address);

      await roles
        .connect(owner)
        .grantRole(await roles.MANAGER_ROLE(), macroMiner.address);
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

      await macroMiner
        .connect(owner)
        .initialize(
          minerHealthCheck.address,
          metaPoints.address,
          minerList.address
        );
    };

    it("try to initialize with zero address", async () => {
      const { macroMiner, owner } = await loadFixture(initiateVariables);

      await expect(
        macroMiner
          .connect(owner)
          .initialize(
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
          )
      ).revertedWith("Macrominer: No zero address");
      await expect(
        macroMiner
          .connect(owner)
          .initialize(
            "0x0000000000000000000000000000000000000001",
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
          )
      ).revertedWith("Macrominer: No zero address");
      await expect(
        macroMiner
          .connect(owner)
          .initialize(
            "0x0000000000000000000000000000000000000001",
            "0x0000000000000000000000000000000000000001",
            ethers.constants.AddressZero
          )
      ).revertedWith("Macrominer: No zero address");
    });

    // try setMiner function when caller dont have enough funds
    it("try setMiner function when caller dont have enough funds", async () => {
      const { miner_1, macroMiner } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      await expect(
        macroMiner.connect(miner_1).setMiner(macrominerArchiveType)
      ).to.be.revertedWith(
        "Macrominer: Stake required"
      );
    });

    // try setMiner function when caller is already miner
    it("try setMiner function when caller is already miner", async () => {
      const { miner_1, macroMiner } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      await expect(
        macroMiner.connect(miner_1).setMiner(macrominerArchiveType)
      ).to.be.revertedWith("Macrominer: Already macrominer");
    });

    // try setMiner function when nodeType is wrong
    it("try setMiner function when nodeType is wrong", async () => {
      const { miner_1, macroMiner } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // setMiner preparedContractTranscation
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(metaminerType);

      await expect(
        miner_1.sendTransaction({
          ...preparedContractTranscation,
          value: STAKE_AMOUNT,
        })
      ).to.be.revertedWith("Macrominer: Wrong node type");
    });

    // try checkMinerStatus function when caller is not a miner
    it("try checkMinerStatus function when caller is not a miner", async () => {
      const { miner_1, miner_2, macroMiner } = await loadFixture(
        initiateVariables
      );

      // init contracts
      await initContracts();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      await expect(
        macroMiner
          .connect(miner_2)
          .checkMinerStatus(
            miner_1.address,
            macrominerArchiveType,
            macrominerArchiveType
          )
      ).to.be.revertedWith("Macrominer: Not a macrominer");
    });

    // try checkMinerStatus function when voted is not a miner
    it("try checkMinerStatus function when voted is not a miner", async () => {
      const { miner_1, miner_2, macroMiner } = await loadFixture(
        initiateVariables
      );

      // init contracts
      await initContracts();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      await expect(
        macroMiner
          .connect(miner_1)
          .checkMinerStatus(
            miner_2.address,
            macrominerArchiveType,
            macrominerArchiveType
          )
      ).to.be.revertedWith("Macrominer: Not a macrominer");
    });

    // try checkMinerStatus function when voted miner is not expired
    it("try checkMinerStatus function when voted miner is not expired", async () => {
      const { miner_1, miner_2, macroMiner, minerHealthCheck } =
        await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // vote miner_1
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote1.wait();

      const voteResult = await macroMiner.votes(
        miner_1.address,
        macrominerArchiveType
      );

      expect(voteResult[1]).to.be.equal(BigNumber.from(String(0)));
    });

    // try checkMinerStatus function when voted miner is expired
    it("try checkMinerStatus function when voted miner is expired", async () => {
      const {
        owner,
        miner_1,
        miner_2,
        miner_3,
        macroMiner,
        minerHealthCheck,
        metaPoints,
        minerPool,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(9_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX4.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation3 = await macroMiner
        .connect(miner_3)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction3 = await miner_3.sendTransaction({
        ...preparedContractTranscation3,
        value: STAKE_AMOUNT,
      });
      await transaction3.wait();

      // ping with miner_3
      const pingTX5 = await minerHealthCheck
        .connect(miner_3)
        .ping(macrominerArchiveType);
      await pingTX5.wait();

      const voterMetaPointsBalance = await metaPoints.balanceOf(
        miner_2.address
      );

      const voterMetaPointsBalance2 = await metaPoints.balanceOf(
        miner_3.address
      );

      // vote miner_1 with miner_2
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote1.wait();

      // vote miner_1 with miner_3
      const vote2 = await macroMiner
        .connect(miner_3)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote2.wait();

      const voteResult = await macroMiner.votes(
        miner_1.address,
        macrominerArchiveType
      );

      expect(voteResult[1]).to.be.equal(
        voterMetaPointsBalance.add(voterMetaPointsBalance2)
      );
    });

    // try checkMinerStatus function when vote expired miner and kick
    it("try checkMinerStatus function when vote expired miner and kick", async () => {
      const {
        owner,
        manager,
        miner_1,
        miner_2,
        macroMiner,
        minerHealthCheck,
        metaPoints,
        minerPool,
        minerList,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(8_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX4.wait();

      // add extra metapoint to miner_2
      const extraMP = await metaPoints
        .connect(manager)
        .mint(miner_2.address, toWei(String(100)));
      extraMP.wait();

      // vote miner_1
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote1.wait();

      const minerStatus = await minerList.list(
        miner_1.address,
        macrominerArchiveType
      );

      expect(minerStatus).to.be.equal(false);
    });

    // try checkMinerStatus function when vote expired miner and kick but contract dont have required balance
    it("try checkMinerStatus function when vote expired miner and kick but contract dont have required balance", async () => {
      const {
        owner,
        manager,
        miner_1,
        miner_2,
        macroMiner,
        minerHealthCheck,
        metaPoints,
        minerPool,
        minerList,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(8_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX4.wait();

      // add extra metapoint to miner_2
      const extraMP = await metaPoints
        .connect(manager)
        .mint(miner_2.address, toWei(String(100)));
      extraMP.wait();

      await network.provider.send("hardhat_setBalance", [
        macroMiner.address,
        "0x0",
      ]);

      await expect(
        macroMiner
          .connect(miner_2)
          .checkMinerStatus(
            miner_1.address,
            macrominerArchiveType,
            macrominerArchiveType
          )
      ).to.be.revertedWith("Macrominer: Unstake failed");
    });

    // try checkMinerStatus function when voter is ghost
    it("try checkMinerStatus function when voter is ghost", async () => {
        const {
          owner,
          miner_1,
          miner_2,
          macroMiner,
          minerHealthCheck,
          minerPool,
        } = await loadFixture(initiateVariables);
  
        // init contracts
        await initContracts();
  
        // sent funds to miner pool
        const fundsTX = await owner.sendTransaction({
          to: minerPool.address,
          value: toWei(String(8_000)),
        });
        await fundsTX.wait();
  
        // setMiner with STAKE_AMOUNT
        const preparedContractTranscation = await macroMiner
          .connect(miner_1)
          .populateTransaction.setMiner(macrominerArchiveType);
        const transaction = await miner_1.sendTransaction({
          ...preparedContractTranscation,
          value: STAKE_AMOUNT,
        });
        await transaction.wait();

        // setMiner with STAKE_AMOUNT
        const preparedContractTranscation2 = await macroMiner
          .connect(miner_2)
          .populateTransaction.setMiner(macrominerArchiveType);
        const transaction2 = await miner_2.sendTransaction({
          ...preparedContractTranscation2,
          value: STAKE_AMOUNT,
        });
        await transaction2.wait();
  
        // increment
        await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber * 2);

        // ping with miner_2
        const pingTX = await minerHealthCheck
          .connect(miner_2)
          .ping(macrominerArchiveType);
        await pingTX.wait();

        const vote = await macroMiner
        .connect(miner_1)
        .callStatic
        .checkMinerStatus(
          miner_2.address,
          macrominerArchiveType,
          macrominerArchiveType
        );

        expect(vote).to.be.equal(false);
    });

    // try checkMinerStatus function when voted miner being active again and close vote
    it("try checkMinerStatus function when voted miner being active again and close vote", async () => {
      const {
        owner,
        miner_1,
        miner_2,
        macroMiner,
        minerHealthCheck,
        minerPool,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(8_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerArchiveType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerArchiveType);
      await pingTX4.wait();

      // vote miner_1 with_miner2
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote1.wait();

      // ping with miner_1
      const pingTX5 = await minerHealthCheck
        .connect(miner_1)
        .ping(macrominerArchiveType);
      await pingTX5.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_1
      const pingTX6 = await minerHealthCheck
        .connect(miner_1)
        .ping(macrominerArchiveType);
      await pingTX6.wait();

      // vote miner_1 with miner_1
      const vote2 = await macroMiner
        .connect(miner_1)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote2.wait();

      const voteResult = await macroMiner.votes(
        miner_1.address,
        macrominerArchiveType
      );

      expect(voteResult[2]).to.be.equal(false);

      // vote miner_1 with miner_1
      const vote3 = await macroMiner
        .connect(miner_1)
        .checkMinerStatus(
          miner_1.address,
          macrominerArchiveType,
          macrominerArchiveType
        );
      await vote3.wait();
    });

    // try checkMinerStatus function when voted miner is expired -- fullnode test
    it("try checkMinerStatus function when voted miner is expired -- fullnode test", async () => {
      const {
        owner,
        miner_1,
        miner_2,
        macroMiner,
        minerHealthCheck,
        metaPoints,
        minerPool,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(8_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerFullnodeType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerFullnodeType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerFullnodeType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerFullnodeType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerFullnodeType);
      await pingTX4.wait();

      const voterMetaPointsBalance = await metaPoints.balanceOf(
        miner_2.address
      );

      // vote miner_1
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerFullnodeType,
          macrominerFullnodeType
        );
      await vote1.wait();

      const voteResult = await macroMiner.votes(
        miner_1.address,
        macrominerFullnodeType
      );

      expect(voteResult[1]).to.be.equal(voterMetaPointsBalance);
    });

    // try checkMinerStatus function when voted miner is expired -- light test
    it("try checkMinerStatus function when voted miner is expired -- light test", async () => {
      const {
        owner,
        miner_1,
        miner_2,
        macroMiner,
        minerHealthCheck,
        metaPoints,
        minerPool,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // sent funds to miner pool
      const fundsTX = await owner.sendTransaction({
        to: minerPool.address,
        value: toWei(String(8_000)),
      });
      await fundsTX.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation = await macroMiner
        .connect(miner_1)
        .populateTransaction.setMiner(macrominerLightType);
      const transaction = await miner_1.sendTransaction({
        ...preparedContractTranscation,
        value: STAKE_AMOUNT,
      });
      await transaction.wait();

      // setMiner with STAKE_AMOUNT
      const preparedContractTranscation2 = await macroMiner
        .connect(miner_2)
        .populateTransaction.setMiner(macrominerLightType);
      const transaction2 = await miner_2.sendTransaction({
        ...preparedContractTranscation2,
        value: STAKE_AMOUNT,
      });
      await transaction2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX2 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerLightType);
      await pingTX2.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX3 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerLightType);
      await pingTX3.wait();

      // increment
      await incrementBlocktimestamp(ethers, minerHealthCheckTimeoutNumber / 2);

      // ping with miner_2
      const pingTX4 = await minerHealthCheck
        .connect(miner_2)
        .ping(macrominerLightType);
      await pingTX4.wait();

      const voterMetaPointsBalance = await metaPoints.balanceOf(
        miner_2.address
      );

      // vote miner_1
      const vote1 = await macroMiner
        .connect(miner_2)
        .checkMinerStatus(
          miner_1.address,
          macrominerLightType,
          macrominerLightType
        );
      await vote1.wait();

      const voteResult = await macroMiner.votes(
        miner_1.address,
        macrominerLightType
      );

      expect(voteResult[1]).to.be.equal(voterMetaPointsBalance);
    });

    // try MinerHealthCheck:ping function when exceeds hardcap for formulas
    it("try MinerHealthCheck:ping function when exceeds hardcap for formulas", async () => {
      const {
        manager,
        miner_1,
        miner_2,
        miner_3,
        minerHealthCheck,
        minerPool,
        minerList,
        metaPoints,
        minerFormulas,
      } = await loadFixture(initiateVariables);

      // init contracts
      await initContracts();

      // set funds to miner pool
      await network.provider.send("hardhat_setBalance", [
        minerPool.address,
        "0x200000000000000000000000000000000000000000000000000000000000000",
      ]);

      // set funds to manager
      await network.provider.send("hardhat_setBalance", [
        manager.address,
        "0x200000000000000000000000000000000000000000000000000000000000000",
      ]);

      const wallets = [];
      const spawnCount = 37;
      for (let i = 0; i < spawnCount; i++) {
        const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
        wallets.push(wallet);

        // set funds to manager
        await network.provider.send("hardhat_setBalance", [
          wallet.address,
          "0x200000000000000000000000000000000000000000000000000000000000000",
        ]);
      }

      // addMiners
      await minerList
        .connect(manager)
        .addMiner(miner_1.address, macrominerFullnodeType);
      await minerList
        .connect(manager)
        .addMiner(miner_2.address, macrominerFullnodeType);
      await minerList
        .connect(manager)
        .addMiner(miner_3.address, macrominerFullnodeType);

      for (let i = 0; i < spawnCount; i++) {
        const wallet = wallets[i];
        await minerList
          .connect(manager)
          .addMiner(wallet.address, macrominerFullnodeType);
      }

      await metaPoints
        .connect(manager)
        .mint(miner_1.address, toWei(String(100)));

      // ping with miner_1
      await minerHealthCheck.connect(miner_1).ping(macrominerFullnodeType);
      // ping with miner_2
      await minerHealthCheck.connect(miner_2).ping(macrominerFullnodeType);
      // ping with miner_3
      await minerHealthCheck.connect(miner_3).ping(macrominerFullnodeType);

      const date = await minerFormulas.getDate();

      const slotOfTotalRewardsFromFirstFormula =
        getSlotOfTotalRewardsFromFirstFormula(
          BigNumber.from(3),
          date,
          BigNumber.from(2)
        );

      const value = ethers.utils.hexlify(
        ethers.utils.zeroPad(toWei("89999").toHexString(), 32)
      );
      await network.provider.send("hardhat_setStorageAt", [
        minerPool.address,
        slotOfTotalRewardsFromFirstFormula,
        value,
      ]);

      const slotOfTotalRewardsFromFirstFormula2 =
        getSlotOfTotalRewardsFromFirstFormula(
          BigNumber.from(3),
          date.add(1),
          BigNumber.from(2)
        );

      const value2 = ethers.utils.hexlify(
        ethers.utils.zeroPad(toWei("89999").toHexString(), 32)
      );
      await network.provider.send("hardhat_setStorageAt", [
        minerPool.address,
        slotOfTotalRewardsFromFirstFormula2,
        value2,
      ]);

      const slotOfTotalRewardsFromSecondFormula =
        getSlotOfTotalRewardsFromFirstFormula(
          BigNumber.from(4),
          date,
          BigNumber.from(2)
        );

      const value3 = ethers.utils.hexlify(
        ethers.utils.zeroPad(toWei("9999").toHexString(), 32)
      );
      await network.provider.send("hardhat_setStorageAt", [
        minerPool.address,
        slotOfTotalRewardsFromSecondFormula,
        value3,
      ]);
      const slotOfTotalRewardsFromSecondFormula2 =
        getSlotOfTotalRewardsFromFirstFormula(
          BigNumber.from(4),
          date.add(1),
          BigNumber.from(2)
        );

      const value4 = ethers.utils.hexlify(
        ethers.utils.zeroPad(toWei("9999").toHexString(), 32)
      );
      await network.provider.send("hardhat_setStorageAt", [
        minerPool.address,
        slotOfTotalRewardsFromSecondFormula2,
        value4,
      ]);

      for (let i = 0; i < 20; i++) {
        // increment
        await incrementBlocktimestamp(
          ethers,
          minerHealthCheckTimeoutNumber / 2
        );

        // ping with miner_1
        await minerHealthCheck.connect(miner_1).ping(macrominerFullnodeType);
        // ping with miner_2
        await minerHealthCheck.connect(miner_2).ping(macrominerFullnodeType);
        // ping with miner_3
        await minerHealthCheck.connect(miner_3).ping(macrominerFullnodeType);
        // ping with spawned wallets
        for (let i = 0; i < spawnCount; i++) {
          const wallet = wallets[i];
          await minerHealthCheck.connect(wallet).ping(macrominerFullnodeType);
        }
      }

      expect(
        await minerHealthCheck.connect(miner_1).ping(macrominerFullnodeType)
      ).to.be.ok;
    });
  });
});
