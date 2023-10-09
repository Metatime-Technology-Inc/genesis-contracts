import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Roles } from "../typechain-types";

describe("Roles", function () {
  async function initiateVariables() {
    const [owner, validator_1, validator_2, validator_3] =
      await ethers.getSigners();

    const Roles_ = await ethers.getContractFactory(CONTRACTS.utils.Roles);
    const roles = (await Roles_.connect(owner).deploy()) as Roles;
    await roles.deployed();

    return {
      roles,
      owner,
      validator_1,
      validator_2,
      validator_3,
    };
  }

  // test Roles
  describe("test validator picking", async () => {
    // try to grant validator role and pick
    it("try to grant validator role and pick", async () => {
      const { roles, owner, validator_1, validator_2, validator_3 } =
        await loadFixture(initiateVariables);

      await roles.connect(owner).initialize(owner.address);

      const validatorArr = [
        owner.address,
        validator_1.address,
        validator_2.address,
        validator_3.address,
      ];

      const VALIDATOR_ROLE = await roles.VALIDATOR_ROLE();
      await roles.connect(owner).grantRole(VALIDATOR_ROLE, validatorArr[0]);
      await roles.connect(owner).grantRole(VALIDATOR_ROLE, validatorArr[1]);
      await roles.connect(owner).grantRole(VALIDATOR_ROLE, validatorArr[2]);
      await roles.connect(owner).grantRole(VALIDATOR_ROLE, validatorArr[3]);

      let latestValidatorIndex = 0;
      for (let i = 0; i < 7; i++) {
        const validatorQueuenumber = await roles
          .connect(owner)
          .validatorQueueNumber();
        const pickedValidator = await roles.validatorList(validatorQueuenumber);
        expect(pickedValidator).to.be.equal(validatorArr[latestValidatorIndex]);
        await roles.connect(owner).pickValidator();
        if (latestValidatorIndex + 1 === validatorArr.length) {
          latestValidatorIndex = 0;
        } else {
          latestValidatorIndex++;
        }
      }
    });
  });
});
