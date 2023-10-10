import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Bridge, MockToken, Multicall3, Roles } from "../typechain-types";
import { Address } from "hardhat-deploy/types";

describe("Multicall", function () {
  async function initiateVariables() {
    const [owner, user_1, user_2, user_3] = await ethers.getSigners();

    const MockToken_ = await ethers.getContractFactory(
      CONTRACTS.tokens.MockToken
    );
    const mockToken = (await MockToken_.connect(owner).deploy(toWei("1000"))) as MockToken;
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
      for (let i: number = 0; i < addresses.length; i++) {
        callData.push({
          callData: mockToken.interface.encodeFunctionData("balanceOf", [
            addresses[i],
          ]),
          target: mockToken.address,
        });
      }
      const result = await multicall.connect(owner).aggregate(callData);
      console.log(result);
    });
  });
});
