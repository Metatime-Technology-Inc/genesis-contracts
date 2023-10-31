import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import {
  Bridge,
  MockToken,
  MultiSigWallet,
  Roles,
  WMTC,
} from "../typechain-types";

describe("MultiSigWallet", function () {
  async function initiateVariables() {
    const [owner_1, owner_2, owner_3, rand_user] = await ethers.getSigners();

    const MockToken_ = await ethers.getContractFactory(
      CONTRACTS.tokens.MockToken
    );
    const mockToken = (await MockToken_.connect(owner_1).deploy(
      toWei("10000")
    )) as MockToken;
    await mockToken.deployed();

    const MultiSigWallet_ = await ethers.getContractFactory(
      CONTRACTS.utils.MultiSigWallet
    );
    const multisigwallet = (await MultiSigWallet_.connect(
      owner_1
    ).deploy()) as MultiSigWallet;
    await multisigwallet.deployed();

    // send mock token to multi sig wallet address
    await mockToken
      .connect(owner_1)
      .transfer(multisigwallet.address, toWei("5000"));

    return {
      owner_1,
      owner_2,
      owner_3,
      rand_user,
      multisigwallet,
      mockToken,
    };
  }

  describe("test multisigwallet contract", async () => {
    const NUM_OF_CONF: number = 1;

    it("try initialize wallet", async () => {
      const { multisigwallet, owner_1, owner_2, owner_3 } = await loadFixture(
        initiateVariables
      );

      await expect(
        multisigwallet.connect(owner_1).initialize([], NUM_OF_CONF)
      ).revertedWith("owners required");
      await expect(
        multisigwallet
          .connect(owner_1)
          .initialize([owner_1.address, owner_2.address, owner_3.address], 0)
      ).revertedWith("Invalid confirmations number");
      await expect(
        multisigwallet
          .connect(owner_1)
          .initialize([owner_1.address, owner_2.address, owner_3.address], 4)
      ).revertedWith("Invalid confirmations number");
      await expect(
        multisigwallet
          .connect(owner_1)
          .initialize(
            [ethers.constants.AddressZero, owner_2.address, owner_3.address],
            NUM_OF_CONF
          )
      ).revertedWith("invalid owner");
      await expect(
        multisigwallet
          .connect(owner_1)
          .initialize(
            [owner_1.address, owner_1.address, owner_3.address],
            NUM_OF_CONF
          )
      ).revertedWith("owner not unique");
      await multisigwallet
        .connect(owner_1)
        .initialize(
          [owner_1.address, owner_2.address, owner_3.address],
          NUM_OF_CONF
        );

      expect(await multisigwallet.isOwner(owner_1.address)).to.be.equal(true);

      expect(await multisigwallet.getOwners()).to.be.members([
        owner_1.address,
        owner_2.address,
        owner_3.address,
      ]);
    });

    it("try to send ether to multisigwallet", async () => {
      const { owner_1, owner_2, owner_3, multisigwallet } = await loadFixture(initiateVariables);

      const SENT_AMOUNT = toWei("10");

      await multisigwallet
        .connect(owner_1)
        .initialize(
          [owner_1.address, owner_2.address, owner_3.address],
          NUM_OF_CONF
        );
      
        await owner_1.sendTransaction({
          to: multisigwallet.address,
          value: SENT_AMOUNT
        });

        expect(await multisigwallet.provider.getBalance(multisigwallet.address)).to.be.equal(SENT_AMOUNT);
    });

    it("try to send tx with wallet", async () => {
      const {
        owner_1,
        owner_2,
        owner_3,
        mockToken,
        multisigwallet,
        rand_user,
      } = await loadFixture(initiateVariables);

      await multisigwallet
        .connect(owner_1)
        .initialize(
          [owner_1.address, owner_2.address, owner_3.address],
          NUM_OF_CONF
        );

      // submit tx
      await multisigwallet
        .connect(owner_1)
        .submitTransaction(
          mockToken.address,
          ethers.BigNumber.from(0),
          mockToken.interface.encodeFunctionData("transfer", [
            rand_user.address,
            toWei("2"),
          ])
        );

      // submit tx with wrong owner
      await expect(
        multisigwallet
          .connect(rand_user)
          .submitTransaction(
            mockToken.address,
            ethers.BigNumber.from(0),
            mockToken.interface.encodeFunctionData("transfer", [
              rand_user.address,
              toWei("2"),
            ])
          )
      ).revertedWith("not owner");

      const txInQueue = await multisigwallet.getTransaction(0);
      expect(txInQueue.to).to.be.equal(mockToken.address);
      const txCount = await multisigwallet.getTransactionCount();
      expect(txCount).to.be.equal(1);

      // try to execute and expect to be reverted due to insufficient confirmation
      await expect(
        multisigwallet.connect(owner_1).executeTransaction(0)
      ).revertedWith("cannot execute tx");

      // confirm previously submitted tx
      await multisigwallet.connect(owner_2).confirmTransaction(0);

      // confirm transaction again and expect to be reverted
      await expect(
        multisigwallet.connect(owner_2).confirmTransaction(0)
      ).revertedWith("tx already confirmed");

      // revoke previously submitted tx confirmation
      await multisigwallet.connect(owner_2).revokeConfirmation(0);

      // revoke confirmation again but expect to be reverted due to previous revoked confirmation
      await expect(
        multisigwallet.connect(owner_2).revokeConfirmation(0)
      ).revertedWith("tx not confirmed");

      // confirm again previously submitted tx
      await multisigwallet.connect(owner_2).confirmTransaction(0);

      // execute previously confirmed tx
      await multisigwallet.connect(owner_1).executeTransaction(0);

      // execute non exist tx and expect to be reverted
      await expect(
        multisigwallet.connect(owner_1).executeTransaction(10)
      ).revertedWith("tx does not exist");

      // execute previously executed tx again and expect to be revertec
      await expect(
        multisigwallet.connect(owner_1).executeTransaction(0)
      ).revertedWith("tx already executed");

      // send wrong amount transfer tx
      await multisigwallet
        .connect(owner_1)
        .submitTransaction(
          mockToken.address,
          ethers.BigNumber.from(0),
          mockToken.interface.encodeFunctionData("transfer", [
            rand_user.address,
            toWei("1000000000"),
          ])
        );

      // confirm wrong tx
      await multisigwallet.connect(owner_2).confirmTransaction(1);

      // execute wrong tx
      await expect(
        multisigwallet.connect(owner_1).executeTransaction(1)
      ).revertedWith("tx failed");
    });
  });
});
