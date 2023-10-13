import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { CONTRACTS } from "../scripts/constants";
import { toWei } from "../scripts/helpers";
import { BigNumber } from "ethers";
import { Bridge, MockToken, Roles } from "../typechain-types";

const METATIME_TOKEN_SUPPLY = 10_000_000_000;

describe("Bridge", function () {
  async function initiateVariables() {
    const [owner, user] = await ethers.getSigners();

    const MTC_ = await ethers.getContractFactory(CONTRACTS.tokens.MockToken);
    const mtc = (await MTC_.connect(owner).deploy(
      toWei(String(METATIME_TOKEN_SUPPLY))
    )) as MockToken;
    await mtc.deployed();

    const Bridge_ = await ethers.getContractFactory(CONTRACTS.utils.Bridge);
    const bridge = (await Bridge_.connect(owner).deploy(mtc.address)) as Bridge;
    await bridge.deployed();

    const Roles_ = await ethers.getContractFactory(CONTRACTS.utils.Roles);
    const roles = (await Roles_.connect(owner).deploy()) as Roles;
    await roles.deployed();

    return {
      mtc,
      bridge,
      roles,
      owner,
      user,
    };
  }

  it("try to deploy with wrong parameters", async () => {
    const { owner } = await loadFixture(initiateVariables);

    const Bridge2 = await ethers.getContractFactory(CONTRACTS.utils.Bridge);
    await expect(Bridge2.connect(owner).deploy(ethers.constants.AddressZero)).revertedWith("Bridge: cannot set zero address");
  }); 

  // test Bridge
  describe("test bridge contract", async () => {
    const funds: BigNumber = toWei(String(100));

    const initRoles = async () => {
      const { owner, roles, bridge } = await loadFixture(initiateVariables);
      await roles.connect(owner).initialize(owner.address);
      await bridge.connect(owner).initRoles(roles.address);
    };

    // try bridge function when contract is frezeed and expect revert
    it("try bridge function when contract is frezeed and expect revert", async () => {
      const { user, bridge } = await loadFixture(initiateVariables);

      await expect(bridge.connect(user).bridge()).to.be.revertedWith(
        "Freezeable: Contract is freezed"
      );
    });

    // try bridge function when caller is blacklisted and expect revert
    it("try bridge function when caller is blacklisted and expect revert", async () => {
      const { owner, user, bridge } = await loadFixture(initiateVariables);

      // init roles
      await initRoles();
      // set freeze
      await bridge.connect(owner).setFreeze(false);
      // set user as blacklisted
      await bridge.connect(owner).setBlacklist(user.address, true);

      await expect(bridge.connect(user).bridge()).to.be.revertedWith(
        "Blacklistable: Wallet is blacklisted"
      );
    });

    // try bridge function when caller is dont have token balance and expect revert
    it("try bridge function when caller is dont have token balance and expect revert", async () => {
      const { owner, user, bridge } = await loadFixture(initiateVariables);

      // init roles
      await initRoles();
      // set freeze
      await bridge.connect(owner).setFreeze(false);

      await expect(bridge.connect(user).bridge()).to.be.revertedWith(
        "Bridge: Address dont have balance"
      );
    });

    // try bridge function when caller is didnt give required allowance and expect revert
    it("try bridge function when caller is didnt give required allowance and expect revert", async () => {
      const { owner, user, bridge, mtc } = await loadFixture(initiateVariables);

      // init roles
      await initRoles();
      // set freeze
      await bridge.connect(owner).setFreeze(false);
      // transfer funds to user
      await mtc.connect(owner).transfer(user.address, funds);

      await expect(bridge.connect(user).bridge()).to.be.revertedWith(
        "Bridge: Allowance is not as required"
      );
    });

    // try bridge function when everything is ok
    it("try bridge function when everything is ok", async () => {
      const { owner, user, bridge, mtc } = await loadFixture(initiateVariables);

      // init roles
      await initRoles();
      // set freeze
      await bridge.connect(owner).setFreeze(false);
      // transfer funds to user
      await mtc.connect(owner).transfer(user.address, funds);
      // approve funds to bridge
      await mtc.connect(user).approve(bridge.address, funds);

      expect(await bridge.connect(user).bridge()).to.be.ok;
    });

    // init roles twice
    it("try to initiate roles twice", async () => {
      const { owner, bridge, roles } = await loadFixture(initiateVariables);

      await bridge.connect(owner).initRoles(roles.address);

      await expect(
        bridge.connect(owner).initRoles(roles.address)
      ).to.be.revertedWith("RolesHandler: roles already initialiazed");
    });
  });
});
