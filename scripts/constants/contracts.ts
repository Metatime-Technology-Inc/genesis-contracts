interface IContracts {
  [key: string]: Object;
  core: {
    MinerPool: string;
    RewardsPool: string;
  },
  helpers: {
    RolesHandler: string;
  },
  libs: {
    MinerFormulas: string;
    MinerTypes: string;
  },
  utils: {
    BlockValidator: string;
    Macrominer: string;
    Metaminer: string;
    MetaPoints: string;
    Microminer: string;
    MinerHealthCheck: string;
    MinerList: string;
    MulticallV3: string;
    MultiSigWallet: string;
    Roles: string;
    WMTC: string;
  };
}

const CONTRACTS: IContracts = {
  core: {
    MinerPool: "MinerPool",
    RewardsPool: "RewardsPool"
  },
  helpers: {
    RolesHandler: "RolesHandler",
  },
  libs: {
    MinerFormulas: "MinerFormulas",
    MinerTypes: "MinerTypes",
  },
  utils: {
    BlockValidator: "BlockValidator",
    Macrominer: "Macrominer",
    Metaminer: "Metaminer",
    MetaPoints: "MetaPoints",
    Microminer: "Microminer",
    MinerHealthCheck: "MinerHealthCheck",
    MinerList: "MinerList",
    MulticallV3: "MulticallV3",
    MultiSigWallet: "MultiSigWallet",
    Roles: "Roles",
    WMTC: "WMTC",
  }
};

export default CONTRACTS;
