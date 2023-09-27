// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

library MinerTypes {
    struct Miner {
        NodeType nodeType;
        bool exist;
    }

    enum NodeType {
        Meta,
        MacroArchive,
        MacroFullnode,
        MacroLight,
        Micro
    }
}
