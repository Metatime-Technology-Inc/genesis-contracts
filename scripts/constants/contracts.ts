interface IContracts {
  [key: string]: Object;
  core: {
    MinerPool: string;
    RewardsPool: string;
  },
  helpers: {
    RolesHandler: string;
    Blacklistable: string;
    Freezeable: string;
  },
  libs: {
    MinerFormulas: string;
    MinerTypes: string;
  },
  tokens: {
    MockToken: string;
    WMTC: string;
  }
  utils: {
    BlockValidator: string;
    Bridge: string;
    Macrominer: string;
    MainnetBridge: string;
    Metaminer: string;
    MetaPoints: string;
    Microminer: string;
    MinerHealthCheck: string;
    MinerList: string;
    MulticallV3: string;
    MultiSigWallet: string;
    Roles: string;
    TxValidator: string;
  };
}

const CONTRACTS: IContracts = {
  core: {
    MinerPool: "MinerPool",
    RewardsPool: "RewardsPool"
  },
  helpers: {
    RolesHandler: "RolesHandler",
    Blacklistable: "Blacklistable",
    Freezeable: "Freezeable",
  },
  libs: {
    MinerFormulas: "MinerFormulas",
    MinerTypes: "MinerTypes",
  },
  tokens: {
    MockToken: "MockToken",
    WMTC: "WMTC"
  },
  utils: {
    BlockValidator: "BlockValidator",
    Bridge: "Bridge",
    Macrominer: "Macrominer",
    MainnetBridge: "MainnetBridge",
    Metaminer: "Metaminer",
    MetaPoints: "MetaPoints",
    Microminer: "Microminer",
    MinerHealthCheck: "MinerHealthCheck",
    MinerList: "MinerList",
    MulticallV3: "MulticallV3",
    MultiSigWallet: "MultiSigWallet",
    Roles: "Roles",
    TxValidator: "TxValidator",
  }
};

export default CONTRACTS;
