import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Bridge, MockToken, Roles } from "../typechain-types";

describe("MultiSigWallet", function () {
  async function initiateVariables() {
    const [owner] = await ethers.getSigners();

    return {};
  }

  describe("test multisigwallet contract", async () => {});
});
