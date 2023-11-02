
# Metatime Genesis Contracts
This project encompasses block validation, transaction validation, miner structures, and reward distribution based on the actions of miners on the MetaChain network. Additionally, there are bridge contracts prepared for both MetaChain and BSC. The purpose of these bridge contracts is to facilitate the transfer or migration of MTC tokens from the BSC network to the MetaChain network.

All miner structures and the reward system in this project are documented in the [Metatime whitepaper](https://docs.metatime.com/whitepaper).

Also, If you would like check use cases of Metatime Genesis Contracts, you can check our [use case diagram](https://www.figma.com/file/4H0BwNCsVvCbz8W5xc3rFv).

# Getting Started
Recommended Node version is 16.0.0 and above.

### Available commands

```bash
# install dependencies
$ yarn install

# compile contracts
$ npx hardhat compile

# run tests
$ npx hardhat test

# generate typechain files
$ npx hardhat typechain

# compute tests coverage, run "npx hardhat typechain" before using it
$ npx hardhat coverage

# run prettier formatter
$ yarn run prettier:solidity

# run linter
$ yarn run solhint

# extract ABIs
$ npx hardhat extract-abis --network <network-name>
```

# Project Structure

```
genesis-contracts/
├── contracts/
│   ├── core/
│   │   ├── MinerPool.sol
│   │   └── RewardsPool.sol
│   ├── helpers/
│   │   ├── Blacklistable.sol
│   │   ├── Freezeable.sol
│   │   └── RolesHandler.sol
│   ├── interfaces/
│   │   ├── IBlockValidator.sol
│   │   ├── IERC20.sol
│   │   ├── IMetaPoints.sol
│   │   ├── IMinerFormulas.sol
│   │   ├── IMinerHealthCheck.sol
│   │   ├── IMinerList.sol
│   │   ├── IMinerPool.sol
│   │   ├── IRewardsPool.sol
│   │   └── IRoles.sol
│   ├── libs/
│   │   └── MinerTypes.sol
│   ├── tokens/
│   │   ├── MockToken.sol
│   │   └── WMTC.sol
│   └── utils/
│       ├── BlockValidator.sol
│       ├── Bridge.sol
│       ├── Macrominer.sol
│       ├── MainnetBridge.sol
│       ├── Metaminer.sol
│       ├── MetaPoints.sol
│       ├── Microminer.sol
│       ├── MinerFormulas.sol
│       ├── MinerHealthCheck.sol
│       ├── MinerList.sol
│       ├── MockMetatimer.sol
│       ├── Multicall3.sol
│       ├── MultiSigWallet.sol
│       ├── Roles.sol
│       └── TxValidator.sol
├── scripts/
│   ├── constants/
│   │   ├── chain-ids.ts
│   │   ├── constructor-params.ts
│   │   ├── contracts.ts
│   │   └── index.ts
│   ├── deploy/
│   │   └── 00_bridge.ts
│   └── helpers.ts
├── test/
│   ├── blockvalidator.test.ts
│   ├── bridge.test.ts
│   ├── macrominer.test.ts
│   ├── mainnet-bridge.test.ts
│   ├── metaminer.test.ts
│   ├── metapoints.test.ts
│   ├── microminer.test.ts
│   ├── minerformulas.test.ts
│   ├── minerhealthcheck.test.ts
│   ├── minerpool.test.ts
│   ├── multicall.test.ts
│   ├── multisigwallet.test.ts
│   ├── roles.test.ts
│   ├── txvalidator.test.ts
│   └── wmtc.test.ts
├── hardhat.config.ts
├── README.md
└── package.json
```

1. `contracts/`: This directory contains the Solidity smart contracts for the MetaChain Genesis Contracts. Additional contracts or libraries can also be included as needed.

3. `scripts/`: This directory contains Typescript scripts related to the project.

4. `test/`: The test directory is where you write and store your test files. These tests verify the functionality and behavior of the smart contracts. Tests can be written using testing frameworks like Mocha or Hardhat's built-in testing functionality.

5. `hardhat.config.ts`: The Hardhat configuration file specifies the network settings, compilation settings, and other configuration options for the project. It includes information such as the compiler version, network connections, and deployment accounts.

6. `README.md`: The README file provides documentation and instructions for setting up and running the project. It includes information about the project, its purpose, installation steps, and other important details.

7. `package.json`: The package.json file contains metadata and dependencies for the project. It includes information about the project's name, version, dependencies, and scripts.

# Contracts
## MinerPool Contract

The MinerPool contract is responsible for managing the distribution of tokens to miners based on their mining activity. It acts as an essential component for rewarding miners for their participation across various miner node types.

### Contract Overview

The MinerPool contract provides the following core functionalities:

- **Initialization**: Initializes the contract with the address of the MinerFormulas contract to facilitate reward calculations.
- **claimMacroDailyReward**: Allows a manager to claim daily rewards for miners based on their activity. It calculates and distributes rewards from the first and second reward formulas.
- **claimTxReward**: Permits a manager to claim transaction rewards and distribute them to the specified receiver.
- **calculateClaimableAmount**: An internal function for calculating claimable reward amounts based on miner activity and specific formulas.

### Architecture Overview
![MinerPool Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/minerpool-schema.svg)

### Contract Details

#### State Variables

- **minerFormulas**: A reference to the MinerFormulas contract, which provides reward calculation formulas.
- **claimedAmounts**: A mapping of miners' addresses to their claimed reward amounts.
- **totalRewardsFromFirstFormula**: Tracks the total rewards claimed from the first formula by miner node type.
- **totalRewardsFromSecondFormula**: Records the total rewards claimed from the second formula by miner node type.

#### Events

- **HasClaimed**: Emitted when a miner or manager successfully claims a reward. It includes the recipient's address, the claimed amount, and the claim type, whether it's a macro daily reward or transaction reward.
- **Deposit**: Emitted when Ether is deposited into the contract.

### Contract Functions

#### Initialization

The contract is initialized with the address of the MinerFormulas contract to enable accurate reward calculations.

#### claimMacroDailyReward

This function allows a manager to claim daily rewards for miners based on their activity. It calculates and distributes rewards from both the first and second reward formulas. The claimable amounts are determined based on the miner's node type and activity time.

#### claimTxReward

Managers can use this function to claim transaction rewards and distribute them to the specified receiver. The function transfers the reward amount to the receiver's address.

#### calculateClaimableAmount (Internal)

An internal function that calculates claimable reward amounts for miners based on their mining activity. It considers factors such as the miner's node type and activity time, and ensures that the reward caps are not exceeded. This function plays a crucial role in the claim process.

### Usage

The MinerPool contract is a critical component for distributing rewards to miners within the system. Here are the typical steps for using the contract:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. To claim daily rewards for miners, call the `claimMacroDailyReward` function, specifying the receiver's address, node type, and activity time.
4. Managers can claim transaction rewards using the `claimTxReward` function, specifying the receiver's address and the reward amount to be transferred.

The contract ensures that miners are rewarded based on their activity, and it plays a pivotal role in maintaining the health and participation of the miner network.

## RewardsPool Contract

The RewardsPool contract is designed to hold tokens that miners can claim. It is a fundamental component for distributing tokens over a specified period of time, primarily for mining purposes.

### Contract Overview

The RewardsPool contract offers the following key functionalities:

- **Initialization**: Initializes the contract with the address of the MinerFormulas contract, which provides the reward calculation formulas.
- **claim**: Allows a manager to claim tokens on behalf of a miner. The claimed amount is calculated using the `calculateClaimableAmount` function.
- **calculateClaimableAmount**: A public function to calculate the amount of tokens claimable for the current period.
- **claimedAmounts**: A mapping that tracks the total amount of tokens claimed by each miner.
- **Deposit**: An event emitted when the pool receives MTC (Mainnet Coin) deposits.
- **HasClaimed**: An event emitted when a beneficiary claims tokens. It includes the beneficiary's address and the claimed amount.

### Architecture Overview
![RewardsPool Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/rewardspool-schema.svg)

### Contract Details

#### State Variables

- **minerFormulas**: A reference to the MinerFormulas contract, which contains the reward calculation logic.
- **claimedAmounts**: A mapping that stores the total amount of tokens claimed by each miner.

#### Events

- **HasClaimed**: Emitted when a beneficiary successfully claims tokens. It includes the beneficiary's address and the claimed amount.
- **Deposit**: Emitted when the contract receives deposits in the form of MTC (Mainnet Coin).

### Contract Functions

#### Initialization

The contract is initialized with the address of the MinerFormulas contract, which provides the necessary formulas for reward calculations.

#### claim

The `claim` function allows a manager to claim tokens on behalf of a miner. The amount claimed is determined using the `calculateClaimableAmount` function. It transfers the calculated amount to the miner's address. 

#### calculateClaimableAmount

This public function calculates the amount of tokens that can be claimed by miners for the current period. The calculation is based on the reward calculation logic provided by the MinerFormulas contract.

### Usage

The RewardsPool contract plays a vital role in the distribution of tokens to miners for their mining activities. Here's how it is typically used:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Managers can use the `claim` function to claim tokens on behalf of miners. The claimed amount is determined based on the current period's reward calculation.
4. Miners can view their claimed amounts by checking the `claimedAmounts` mapping.

This contract is an essential part of the mining ecosystem, ensuring miners are appropriately rewarded for their contributions.

## WMTC (Wrapped MTC) Contract

The WMTC (Wrapped MTC) contract is a basic implementation of an ERC-20 token named "Wrapped MTC" (WMTC). It serves as a mechanism for creating wrapped tokens that are backed by Ether (MTC). Wrapped tokens are a common way to represent real-world assets on the blockchain.

### Contract Overview

The WMTC contract offers the following functionalities:

- **Deposit**: Allows users to deposit Ether (MTC) and receive an equivalent amount of WMTC tokens.
- **Withdraw**: Allows users to withdraw WMTC tokens and receive Ether (MTC) in return.
- **Total Supply**: Provides the total supply of WMTC tokens, which is represented as the contract's ETH balance.
- **Approve**: Enables users to approve another address to spend WMTC tokens on their behalf.
- **Transfer**: Allows the transfer of WMTC tokens from one address to another.
- **TransferFrom**: Permits the transfer of WMTC tokens from one address to another, with approval.

### Architecture Overview
![WMTC Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/wmtc-schema.svg)

### Contract Details

#### State Variables

- **name**: A string representing the name of the token, which is "Wrapped MTC."
- **symbol**: A string representing the token's symbol, which is "WMTC."
- **decimals**: An unsigned integer representing the number of decimal places for the token, typically set to 18.
- **balanceOf**: A mapping that tracks the token balance of each address.
- **allowance**: A mapping that tracks the approved allowance for one address to spend tokens on behalf of another.

#### Events

- **Approval**: Emitted when an address approves another address to spend tokens on its behalf.
- **Transfer**: Emitted when tokens are transferred from one address to another.
- **Deposit**: Emitted when an address deposits Ether (MTC) to receive WMTC tokens.
- **Withdrawal**: Emitted when an address withdraws WMTC tokens to receive Ether (MTC).

### Contract Functions

#### receive

The `receive` function allows users to deposit Ether (MTC) by sending it directly to the contract. It triggers a deposit of Ether and the issuance of an equivalent amount of WMTC tokens.

#### deposit

The `deposit` function enables users to deposit Ether (MTC) to receive WMTC tokens. It updates the user's WMTC token balance accordingly and emits a `Deposit` event.

#### withdraw

The `withdraw` function allows users to withdraw WMTC tokens and receive an equivalent amount of Ether (MTC). It checks the user's WMTC token balance and transfers the corresponding Ether to the user. An accompanying `Withdrawal` event is emitted.

#### totalSupply

The `totalSupply` function returns the total supply of WMTC tokens. This value is derived from the contract's ETH balance.

#### approve

The `approve` function permits an address to approve another address to spend a specified amount of WMTC tokens on its behalf. The approval amount is recorded in the `allowance` mapping.

#### transfer

The `transfer` function enables users to transfer WMTC tokens to another address. It is a convenience function that calls `transferFrom`, allowing the owner to transfer tokens to another address.

#### transferFrom

The `transferFrom` function facilitates the transfer of WMTC tokens from one address to another. It checks the sender's balance, the approval allowance, and updates the balances accordingly.

### Usage

The WMTC contract serves as a basic implementation of an ERC-20 token, enabling users to wrap their Ether (MTC) into tokens that can be traded and transferred on the blockchain. Here's how it is typically used:

1. Users can deposit Ether (MTC) into the contract by sending Ether directly or calling the `deposit` function.
2. Users can withdraw their WMTC tokens by calling the `withdraw` function, which returns an equivalent amount of Ether (MTC).
3. Approval can be granted to another address using the `approve` function to spend WMTC tokens on the user's behalf.
4. Users can transfer WMTC tokens to other addresses using the `transfer` or `transferFrom` functions, depending on the context.

WMTC tokens are backed by real Ether (MTC) held within the contract, making it a bridge between the world of blockchain and traditional assets.

## BlockValidator Contract

The BlockValidator contract is a smart contract designed for validating and finalizing blocks on the blockchain. It provides the infrastructure for managing block payloads and ensures that blocks are correctly processed.

### Contract Overview

The BlockValidator contract offers the following key functionalities:

- **Set Block Payload**: Allows validators to add a payload to a specific block. This payload typically includes information about the block, such as the coinbase address, block hash, and block reward.
- **Finalize Block**: Permits managers to mark a block as finalized once all necessary information has been added to it.

### Architecture Overview
![BlockValidator Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/blockvalidator-schema.svg)

### Contract Details

#### State Variables

- **lastVerifiedBlocknumbers**: An array that tracks the block numbers of the last verified blocks.
- **DELAY_LIMIT**: A constant defining the maximum number of blocks that can be verified before claiming rewards.
- **blockPayloads**: A mapping that associates block numbers with block payloads, including the coinbase address, block hash, block reward, and a flag indicating whether the block is finalized.
- **rewardsPool**: A reference to the RewardsPool contract used for claiming rewards.
- **_verifiedBlockId**: An internal counter to keep track of verified blocks.

#### Events

- **SetPayload**: Emitted when a payload is added to a specific block.
- **FinalizeBlock**: Emitted when a block is marked as finalized.
- **Claim**: Emitted when rewards are claimed for a finalized block. It includes details such as the coinbase address, block number, claimed amount, and block reward.

### Contract Functions

#### initialize

The `initialize` function initializes the BlockValidator contract with the address of the RewardsPool contract. This connection enables the contract to interact with the RewardsPool when claiming rewards.

#### setBlockPayload

The `setBlockPayload` function allows validators to add a payload to a specific block. The payload includes essential block information and is associated with the provided block number. The function checks if a payload already exists for the block to prevent overwriting.

#### finalizeBlock

The `finalizeBlock` function is used by managers to mark a block as finalized. This operation ensures that all necessary information for the block has been added, and it sets the `isFinalized` flag to true. The function also keeps track of the last verified blocks and claims rewards for blocks once the `DELAY_LIMIT` is reached.

### Usage

The BlockValidator contract plays a critical role in ensuring that blocks are processed correctly on the blockchain. Here's how it is typically used:

1. Initialize the contract with the address of the RewardsPool contract, which allows for reward claiming.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Validators can use the `setBlockPayload` function to add block payloads to specific block numbers.
4. Managers can call the `finalizeBlock` function to mark a block as finalized once all information is added.
5. When the `DELAY_LIMIT` is reached, the contract automatically claims rewards for the last verified blocks, emitting `Claim` events.

The BlockValidator contract contributes to the reliability and integrity of the blockchain by ensuring that blocks are correctly finalized and rewards are claimed promptly.

## Bridge Contract

The Bridge contract is a smart contract designed for bridging tokens from one blockchain to another. It allows users to initiate the process of transferring tokens from the local blockchain to a different chain.

### Contract Overview

The Bridge contract offers the following key functionalities:

- **Constructor**: Initializes the contract with the address of the token to be bridged.
- **Bridge**: Allows users to initiate the bridging process for their tokens, subject to certain conditions.
- **Blacklistable**: Utilizes a blacklist mechanism to restrict certain addresses from using the bridge.
- **Freezeable**: Implements the ability to freeze the contract, preventing further token bridging.

### Architecture Overview
![Bridge Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/bridge-schema.svg)

### Contract Details

#### State Variables

- **bridgeToken**: An immutable variable that holds the address of the token to be bridged.

#### Events

- **BridgeTransfer**: Emitted when a user initiates the token bridging process. It includes details such as the sender's address and the amount of tokens being bridged.

#### Constructor

The constructor function initializes the Bridge contract with the address of the token to be bridged. This association is crucial for enabling token transfers from the local blockchain to another chain.

### Contract Functions

#### Bridge

The `bridge` function allows users to initiate the token bridging process. However, several conditions must be met:

- The sender's address must not be blacklisted using the `isBlacklisted` modifier.
- The contract must not be in a frozen state (`isNotFreezed` modifier).
- The sender must have a balance of the bridged token greater than zero.
- The sender's allowance for the contract must match their token balance.

If these conditions are satisfied, the contract will proceed to burn the tokens from the sender's account and emit a `BridgeTransfer` event.

### Usage

The Bridge contract is an essential component for enabling cross-chain token transfers. Here's how it is typically used:

1. Deploy the Bridge contract, specifying the address of the token to be bridged.
2. Users who wish to bridge their tokens call the `bridge` function.
3. The `bridge` function checks various conditions to ensure that the bridging is valid.
4. If the conditions are met, the tokens are burned from the sender's account, and a `BridgeTransfer` event is emitted.
5. The contract may also utilize the `Blacklistable` and `Freezeable` mechanisms to restrict certain addresses and control the contract's functionality.

The Bridge contract plays a crucial role in facilitating interoperability between different blockchain networks by allowing users to move their tokens across chains securely and efficiently.

## Macrominer Contract

The Macrominer contract is a smart contract designed for managing and voting on the status of macrominers, specifically those of different node types. Macrominers are larger-scale miners who are subject to regular health checks and community-driven votes regarding their status.

### Contract Overview

The Macrominer contract provides several important functionalities:

- **Staking**: Macrominers are required to stake a specific amount of Ether (STAKE_AMOUNT) to become a macrominer of a particular node type.
- **Health Checks**: The contract checks the health status of macrominers and allows other miners to initiate these checks.
- **Voting System**: Macrominers can be voted out of their status if their health is found to be compromised. A voting system enables other miners to accumulate votes and kick out an unhealthy macrominer.

### Architecture Overview
![Macrominer Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/macrominer-schema.svg)

### Contract Details

#### Constants

- **STAKE_AMOUNT**: The required staking amount for macrominers, set to 100 Ether.
- **VOTE_POINT_LIMIT**: The limit of voting points required to kick out a macrominer, set to 100 Ether.

#### State Variables

- **voteId**: An incrementing ID for each vote.
- **minerHealthCheck**: An interface to the MinerHealthCheck contract for checking the health status of miners.
- **metapoints**: An interface to the MetaPoints contract for vote point balances.
- **minerList**: An interface to the MinerList contract for managing miners.
- **votes**: A mapping that keeps track of votes for each macrominer and their node type.

#### Events

- **BeginVote**: Emitted when a vote is initiated. It includes the vote ID, macrominer address, and node type.
- **Voted**: Emitted when a miner's health is voted upon. It includes the vote ID, macrominer address, node type, and the number of voting points.
- **EndVote**: Emitted when a vote concludes. It includes the vote ID, macrominer address, and node type.

### Modifiers

- **isMiner**: A modifier to check if an address is a macrominer of a specific node type.
- **notMiner**: A modifier to check if an address is not a macrominer of a specific node type.
- **isNodeTypeValid**: A modifier to check if the node type is valid.

### Contract Functions

#### Initialization

- **initialize**: Initializes the contract with the specified addresses of the MinerHealthCheck, MetaPoints, and MinerList contracts.

#### Staking

- **setMiner**: Allows a miner to become a macrominer of a specific node type by staking STAKE_AMOUNT Ether. This action adds the miner to the list of macrominers.

#### Health Checks and Voting

- **checkMinerStatus**: Checks the health status of a macrominer and allows other macrominers to vote on it. If an unhealthy macrominer accumulates enough votes, it is kicked out. This process involves accumulating vote points and can lead to the removal of a macrominer's status.

#### Internal Functions

- **_kickMiner**: An internal function to kick out a macrominer and return their staked amount to them. This function is called when an unhealthy macrominer is voted out.

### Usage

The Macrominer contract plays a crucial role in managing the status of macrominers. Here's how it is typically used:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Miners who want to become macrominers must call the `setMiner` function with the desired node type and stake STAKE_AMOUNT Ether.
4. The health status of macrominers is regularly checked using the `checkMinerStatus` function.
5. Unhealthy macrominers can be voted out by accumulating votes from other macrominers. If the vote point limit is reached, the macrominer is kicked out.

The Macrominer contract ensures that macrominers maintain their health and that the community can take action in the event of a compromised health status.

## MainnetBridge Contract

The MainnetBridge contract is a smart contract designed to bridge transactions to the Mainnet chain, providing a mechanism to transfer funds between chains while maintaining a transaction history.

### Contract Overview

The MainnetBridge contract facilitates the bridging of transactions to the Mainnet chain with the following key functionalities:

- **Transaction History**: A mapping named `history` is used to record the transaction details (receiver and amount) associated with a unique transaction hash.
- **Modifiers**: Custom modifiers, including `notExist`, are used to validate transaction statuses.
- **Event**: The contract emits a `Bridge` event when a transaction is bridged.

### Architecture Overview
![MainnetBridge Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/mainnetbridge-schema.svg)

### Contract Details

#### State Variables

- **history**: A mapping that stores the transaction details (receiver and amount) associated with a unique transaction hash.

#### Events

- **Bridge**: Emitted when a transaction is bridged to the Mainnet chain. It includes the transaction hash, the receiver's address on the Mainnet chain, and the bridged amount.

#### Modifiers

- **notExist**: A modifier to check whether a transaction with a given hash does not exist in the history.

### Contract Functions

#### Bridging Transactions

- **bridge**: Initiates the bridging of a transaction to the Mainnet chain. It records the transaction in the `history` mapping, transfers the specified amount to the receiver's address, and emits the `Bridge` event. This function is accessible only by the owner role and when the contract is not frozen.

#### Transferring Funds

- **transfer**: Allows the owner to transfer funds directly to a specified receiver. This function is only accessible by the owner and the specified manager roles, and it is possible when the contract is frozen.

#### Internal Function

- **_transfer**: An internal function that performs the actual transfer of funds to the specified receiver. It includes validations to ensure the amount is greater than zero and that the receiver's address is not the zero address.

### Usage

The MainnetBridge contract is intended for bridging transactions from the current chain to the Mainnet chain. It offers a mechanism for recording transaction history and for transferring funds, as well as the ability to freeze the contract if necessary.

Here's how it can be typically used:

1. Use the `initRoles` function to set the addresses of the required Roles contract.
2. Use the `bridge` function to bridge transactions to the Mainnet chain by providing the transaction hash, receiver's address on Mainnet, and the amount to be bridged. This function can be accessed by the owner role when the contract is not frozen.
3. Use the `transfer` function to transfer funds directly to a specified receiver. This function is accessible by the owner role and the specified manager roles when the contract is frozen.

The MainnetBridge contract facilitates the seamless transfer of funds between different chains while maintaining a transaction history.

## Metaminer Contract

The Metaminer contract is a smart contract designed to represent a Metaminer, allowing users to stake MTC tokens, participate in block validation, and manage their subscriptions and shareholders.

### Contract Overview

The Metaminer contract offers the following core functionalities:

- **Staking**: Users can become Metaminers by staking a required amount of MTC tokens, which includes both a one-time stake and an annual subscription fee.
- **Subscription Management**: Metaminers can renew their subscription for the following year by paying an annual subscription fee.
- **Shareholders**: Metaminers can distribute a percentage share of their rewards to shareholders.
- **Block Finalization**: Metaminers can finalize blocks and distribute rewards to their shareholders.
- **Unsubscription**: Metaminers can unsubscribe and receive their staked amount back.

### Architecture Overview
![Metaminer Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/metaminer-schema.svg)

### Contract Details

#### State Variables

- **blockValidator**: Address of the BlockValidator contract.
- **minerList**: Address of the MinerList contract.
- **minerFormulas**: Address of the MinerFormulas contract.
- **STAKE_AMOUNT**: Required one-time staking amount.
- **ANNUAL_AMOUNT**: Annual subscription fee.
- **YEAR**: The duration of a year in seconds.
- **minerPool**: Address of the MinerPool.

#### Events

- **MinerAdded**: Emitted when a user becomes a Metaminer, including the address and the new valid date.
- **MinerSubscribe**: Emitted when a Metaminer renews their subscription, including the address and the new valid date.
- **MinerUnsubscribe**: Emitted when a Metaminer unsubscribes.

#### Modifiers

- **isMiner**: A modifier to check if an address is a Metaminer.
- **validMinerSubscription**: A modifier to check if a Metaminer's subscription is valid.

### Contract Functions

#### Staking and Subscription

- **setMiner**: Allows a user to become a Metaminer by staking the required amount of MTC tokens. The user receives a new valid date for the subscription.
- **subscribe**: Allows a Metaminer to renew their subscription for another year by paying the annual subscription fee.
- **unsubscribe**: Allows a Metaminer to unsubscribe and receive their staked amount back.

#### Management Functions

- **setPercentages**: Allows the contract owner to set the percentage share for a Metaminer's shareholders.

#### Block Finalization and Income Sharing

- **finalizeBlock**: Allows a Metaminer to finalize a block and distribute rewards to their shareholders.
- **_shareIncome**: Distributes the income from block finalization to the Metaminer's shareholders.
- **_unsubscribe**: Unsubscribes a Metaminer by transferring their staked amount back to them.
- **_minerCheck**: Checks if a Metaminer's subscription is valid and unsubscribes them if it's not.

### Usage

The Metaminer contract is intended for users who wish to become Metaminers and participate in block finalization and reward distribution. It allows for staking, annual subscriptions, and the management of shareholders. The contract also supports the ability to check and renew subscriptions.

Here's how it can be typically used:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. A user can become a Metaminer by using the `setMiner` function and staking the required amount of MTC tokens. This function initializes the Metaminer's subscription and sets their details.
4. A Metaminer can renew their subscription for the following year using the `subscribe` function by paying the annual subscription fee.
5. A Metaminer can add shareholders by using the `setPercentages` function, which specifies the percentage shares for each shareholder.
6. Metaminers can finalize blocks and distribute rewards to their shareholders using the `finalizeBlock` function.
7. A Metaminer can unsubscribe by using the `unsubscribe` function, which returns their staked amount.

The contract owner can also set Metaminers and manage their subscriptions, shareholders, and shares. This contract facilitates participation in the network and the management of Metaminer activities.

## MetaPoints Contract

The MetaPoints contract is a custom ERC20 token contract that extends the functionality of OpenZeppelin's ERC20 token. It implements roles and pausable features and provides additional control over token operations.

### Contract Overview

The MetaPoints contract provides the following key features:

- Minting: Managers can mint new Meta Points and send them to a specified address.
- Pausing: The contract can be paused and unpaused to control token transfers.
- Role-Based Access: The contract uses roles to control who can perform certain actions.
- Burning (Disabled): The burn function is disabled, preventing token holders from burning their tokens.
- Transfer (Disabled): The transfer function is disabled, preventing token holders from transferring their tokens.
- TransferFrom (Disabled): The transferFrom function is disabled, preventing the transfer of tokens between addresses.

### Architecture Overview
![MetaPoints Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/metapoints-schema.svg)

### Contract Details

#### State Variables

- **STAKE_AMOUNT**: A constant representing the required stake amount for becoming a Microminer.
- **minerHealthCheck**: Address of the MinerHealthCheck contract.
- **metapoints**: Address of the MetaPoints contract.
- **minerList**: Address of the MinerList contract.

### Contract Functions

#### Initialize

- **initialize**: Initializes the MetaPoints contract with the token name and symbol.

#### Pausing

- **pause**: Pauses token transfers. Can only be called by an owner with the appropriate role.
- **unpause**: Unpauses token transfers. Can only be called by an owner with the appropriate role.

#### Minting

- **mint**: Allows managers to mint new Meta Points and send them to a specified address. Can only be called when the contract is not paused.

#### Burning (Disabled)

- **burn**: Disables the burn function, preventing token holders from burning their tokens.

#### Transfer (Disabled)

- **transfer**: Disables the transfer function, preventing token holders from transferring their tokens.

#### TransferFrom (Disabled)

- **transferFrom**: Disables the transferFrom function, preventing the transfer of tokens between addresses.

### Usage

The MetaPoints contract is designed to provide flexibility and control over token operations. Key actions include:

1. Use the `initialize` function to set the token name and symbol.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Managers can mint new Meta Points using the `mint` function and specifying the recipient's address.
4. Pausing and unpausing token transfers is done by owners with the appropriate role using the `pause` and `unpause` functions.
5. The burn function is disabled, preventing token holders from burning their tokens.
6. The transfer function is disabled, preventing token holders from transferring their tokens.
7. The transferFrom function is disabled, preventing the transfer of tokens between addresses.

The contract provides powerful tools for managing and controlling the Meta Points token.

## MicroMiner Contract

The Microminer contract manages MicroMiners in the system and provides functions for adding and removing MicroMiners.

### Contract Overview

The Microminer contract allows users to become MicroMiners by staking a specific amount of cryptocurrency. It also provides a mechanism to remove MicroMiners and refund their stake.

### Architecture Overview
![MicroMiner Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/microminer-schema.svg)

### Contract Details

#### State Variables

- **STAKE_AMOUNT**: A constant representing the required stake amount for becoming a Microminer.
- **minerHealthCheck**: Address of the MinerHealthCheck contract.
- **metapoints**: Address of the MetaPoints contract.
- **minerList**: Address of the MinerList contract.

#### Modifiers

- **isMiner**: A modifier to check if an address is a MicroMiner.
- **notMiner**: A modifier to check if an address is not a MicroMiner.

### Contract Functions

##### Initialize

- **initialize**: Initializes the Microminer contract with the addresses of other contracts.

##### Staking

- **setMiner**: Allows users to become a MicroMiner by staking the required amount. The caller's address becomes a MicroMiner.

##### Kicking

- **kickMiner**: Allows managers to remove a MicroMiner and refund their stake.

### Usage

The Microminer contract provides the following functionality:

1. Use the `initialize` function to set the addresses of required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Users can become MicroMiners by calling the `setMiner` function and staking the required amount.
4. Managers can remove a MicroMiner by calling the `kickMiner` function, which also refunds the staked amount.

The contract facilitates the management of MicroMiners and their stakes efficiently.


## MinerFormulas Contract

The MinerFormulas contract is designed to perform various calculations related to rewards for miners. It is used to determine rewards for different types of miners and to calculate daily pool rewards based on specific formulas.

### Contract Overview

The MinerFormulas contract provides the following core functionalities and constants:

- Access to MetaPoints contract: The contract has access to the MetaPoints contract for interacting with the Meta Points token.
- Access to MinerList contract: The contract has access to the MinerList contract for managing the list of miners.
- Access to MinerHealthCheck contract: The contract has access to the MinerHealthCheck contract to retrieve miner activity data.
- Constants for calculations: The contract defines constants for various calculations and reward distribution.
- Functions for calculating rewards: The contract provides functions to calculate rewards for MetaMiners, MetaPoints, and daily pool rewards for different types of macro miners.

### Architecture Overview
![MinerFormulas Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/minerformulas-schema.svg)

### Contract Details

#### State Variables

- **metaPoints**: Address of the MetaPoints contract.
- **minerList**: Address of the MinerList contract.
- **minerHealthCheck**: Address of the MinerHealthCheck contract.

#### Constants

- **BASE_DIVIDER**: A constant representing the base divider for percentage calculations.
- **METAMINER_MINER_POOL_SHARE_PERCENT**: The percentage share of MetaMiners in the daily miner pool.
- **METAMINER_DAILY_BLOCK_COUNT**: The daily block count for MetaMiners.
- **METAMINER_DAILY_PRIZE_POOL**: The total daily prize pool for MetaMiners.
- **METAMINER_DAILY_PRIZE_LIMIT**: The daily prize limit for MetaMiners.
- **MACROMINER_ARCHIVE_DAILY_MAX_REWARD**: The daily max reward for Macro Archive miners.
- **MACROMINER_FULLNODE_DAILY_MAX_REWARD**: The daily max reward for Macro Fullnode miners.
- **MACROMINER_LIGHT_DAILY_MAX_REWARD**: The daily max reward for Macro Light miners.
- **MACROMINER_ARCHIVE_POOL_HARD_CAP_OF_FIRST_FORMULA**: The hard cap of the first formula for Macro Archive miners.
- **MACROMINER_ARCHIVE_POOL_HARD_CAP_OF_SECOND_FORMULA**: The hard cap of the second formula for Macro Archive miners.
- **MACROMINER_FULLNODE_POOL_HARD_CAP_OF_FIRST_FORMULA**: The hard cap of the first formula for Macro Fullnode miners.
- **MACROMINER_FULLNODE_POOL_HARD_CAP_OF_SECOND_FORMULA**: The hard cap of the second formula for Macro Fullnode miners.
- **MACROMINER_LIGHT_POOL_HARD_CAP_OF_FIRST_FORMULA**: The hard cap of the first formula for Macro Light miners.
- **MACROMINER_LIGHT_POOL_HARD_CAP_OF_SECOND_FORMULA**: The hard cap of the second formula for Macro Light miners.
- **SECONDS_IN_A_DAY**: The number of seconds in a day.

### Contract Functions

#### Initialize

- **initialize**: Initializes the MinerFormulas contract with the addresses of the required dependencies.

#### Reward Calculation Functions

- **calculateMetaminerReward**: Calculates the reward for MetaMiners.
- **calculateMetaPointsReward**: Calculates the reward for MetaPoints.
- **calculateDailyPoolRewardsFromFirstFormula**: Calculates the daily pool rewards from the first formula for macro miners.
- **calculateDailyPoolRewardsFromSecondFormula**: Calculates the daily pool rewards from the second formula for macro miners.

#### Date Calculation

- **getDate**: Retrieves the current date in terms of the number of days since the Unix epoch.

#### Internal Functions

- **_getDate**: An internal function to calculate the current date.
- **_balaceOfMP**: An internal function to get the Meta Points balance of a miner.
- **_totalSupplyMP**: An internal function to get the total supply of Meta Points.

### Usage

The MinerFormulas contract is primarily used to calculate rewards for different types of miners based on specific formulas and constants. Key actions include:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Call the various reward calculation functions to determine rewards for MetaMiners, MetaPoints, and macro miners.
3. Retrieve the current date using the `getDate` function.
4. Utilize the internal functions for calculating balances and supply of Meta Points.

The contract plays a crucial role in calculating and distributing rewards to miners within the system.

## MinerHealthCheck Contract

The MinerHealthCheck contract plays a crucial role in managing the health status of miner nodes within the network. It ensures that miners remain active, tracks their uptime, and rewards them for their continued participation.

### Contract Overview

The MinerHealthCheck contract offers several essential features and functionalities:

- **Ping Mechanism**: Miners can "ping" the contract to update their uptime, perform related actions, and receive rewards based on their activity.
- **Status Checks**: Users can verify the health status of miner nodes to determine if they are actively participating.
- **Timeout Configuration**: The contract allows for the configuration of the timeout duration for miner activity.
- **Manual Ping**: Managers have the privilege to manually update the uptime of miner nodes when necessary.
- **Activity Tracking**: The contract maintains a record of daily activities for different types of miner nodes.

### Architecture Overview
![MinerHealthCheck Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/minerhealthcheck-schema.svg)

### Contract Details

#### State Variables

- **minerList**: An interface to the MinerList contract, which manages lists of miner nodes.
- **minerFormulas**: An interface to the MinerFormulas contract for calculating rewards and activity metrics.
- **minerPool**: An interface to the MinerPool contract, which manages miner rewards.
- **metaPoints**: An interface to the MetaPoints contract, responsible for handling rewards in the form of Meta Points.
- **lastUptime**: A mapping that stores the last uptime timestamp for each miner address and node type.
- **dailyNodesActivities**: A mapping that tracks daily activity metrics for different types of miner nodes.
- **dailyNodeActivity**: A mapping that stores daily activity metrics for each miner address and node type.
- **timeout**: The timeout duration for miner activity.

### Contract Functions

- **initialize**: Initializes the contract with the specified addresses of the MinerList, MinerFormulas, MinerPool, MetaPoints contracts, and the timeout duration.
- **ping**: Miners use this function to "ping" the contract, update their uptime, and receive rewards based on their activity.
- **status**: Users can check the status of a miner node to determine if it is currently active.
- **setTimeout**: Owners of the contract can configure the timeout duration for miner activity.
- **manualPing**: Managers can manually ping a miner node when necessary.

#### Internal Functions

- **_incrementDailyTotalActiveTimes**: An internal function to increment daily total active times for a specific node type.
- **_incrementDailyActiveTimes**: An internal function to increment daily active times for a specific miner node.

### Usage

The MinerHealthCheck contract is fundamental to maintaining the health of miner nodes within the network. Here's how it is typically used:

1. Use the `initialize` function to set the addresses of the required contracts and define the timeout duration.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. The contract continually tracks the uptime and activity of miner nodes, ensuring that active participation is rewarded.
4. Miners receive rewards in the form of Meta Points based on their activity and uptime.
5. Users can utilize the `status` function to check if a miner node is actively participating.
6. The contract's owner can adjust the timeout duration for miner activity as network requirements evolve.
7. Managers have the capability to manually update the uptime of miner nodes, allowing for intervention when necessary.

In summary, the MinerHealthCheck contract safeguards the health of miner nodes and ensures that active miners are recognized and rewarded accordingly.

## MinerList Contract

The MinerList contract is responsible for managing a list of miners in the system. It allows for adding and deleting miners of different types and provides functions to check the status of miners.

### Contract Overview

The MinerList contract offers the following core functionalities:

- Adding miners: Users with the appropriate permissions can add addresses as miners of a specified node type.
- Deleting miners: Users with the appropriate permissions can delete miners from the list.
- Checking miner status: The contract provides functions to check if an address is a miner and to retrieve the count of miners for a specific node type.

### Architecture Overview
![MinerList Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/minerlist-schema.svg)

### Contract Details

#### State Variables

- **minerHealthCheck**: Address of the MinerHealthCheck contract.
- **list**: A mapping that stores whether an address is a miner for a specific node type.
- **count**: A mapping that stores the count of miners for each node type.

#### Events

- **AddMiner**: Emitted when a user is added as a miner, indicating the miner's address and the node type.
- **DeleteMiner**: Emitted when a user is removed from the list of miners, indicating the miner's address and the node type.

#### Modifiers

- **onlyManagerRole**: A custom modifier that restricts the execution of functions to users with the "manager" role.

### Contract Functions

#### Adding and Deleting Miners

- **addMiner**: Allows a user with the "manager" role to add an address as a miner for a specific node type.
- **deleteMiner**: Allows a user with the "manager" role to remove an address from the list of miners for a specific node type.

#### Checking Miner Status

- **isMiner**: Checks if an address is a miner for a specified node type.
- **getMinerCount**: Retrieves the count of miners for a specific node type.

### Usage

The MinerList contract is typically used by users with the "manager" role to manage the list of miners in the system. It allows the addition and removal of miners for different node types and provides functions to check the status of miners.

Here's how it can be typically used:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. A user with the "manager" role calls the `addMiner` function to add an address as a miner for a specific node type.
4. To remove a user from the list of miners, the `deleteMiner` function is called by a user with the "manager" role.
5. To check if an address is a miner, the `isMiner` function can be called, providing the address and node type.
6. To retrieve the count of miners for a specific node type, the `getMinerCount` function is used.

The contract helps in maintaining and managing the list of miners efficiently.

For detailed information about the state variables, events, modifiers, and functions, please refer to the contract source code.

## Multicall3 Contract

The Multicall3 contract is a smart contract designed for aggregating results from multiple function calls. It enables efficient and cost-effective interaction with multiple functions on the Ethereum blockchain in a single transaction. It is backward-compatible with the Multicall and Multicall2 contracts.

### Contract Overview

The Multicall3 contract provides the following key functionalities:

- **Aggregation of Function Calls**: It allows multiple function calls to be aggregated in a single transaction, enabling a more efficient way to interact with smart contracts.

- **Return Data Handling**: It handles the return data from function calls, allowing the caller to process the results efficiently.

- **Validator Queue**: The contract includes a feature for managing a queue of validators, which can be used for selecting validators based on the current block number.

- **Value Transfer**: The contract supports aggregating function calls that involve value transfers (msg.value).

### Architecture Overview
![Multicall3 Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/multicall3-schema.svg)

### Contract Details

#### Data Structures

- **Call**: A data structure representing a function call, containing the target address and call data.

- **Call3**: A data structure representing a function call with an optional failure flag.

- **Call3Value**: A data structure representing a function call with an optional failure flag and value transfer (msg.value).

- **Result**: A data structure representing the result of a function call, containing a success flag and the return data.

### Contract Functions

- **aggregate**: Aggregates multiple function calls and returns their results. It is compatible with Multicall and Multicall2.

- **tryAggregate**: Aggregates multiple function calls, allowing some calls to fail, and returns their results. The `requireSuccess` parameter determines whether all calls are required to succeed.

- **tryBlockAndAggregate**: Aggregates function calls and allows failures while also returning block information. It is backward-compatible with Multicall2.

- **blockAndAggregate**: Aggregates function calls and allows failures while also returning block information. This function calls `tryBlockAndAggregate` with the `requireSuccess` parameter set to `true`.

- **aggregate3**: Aggregates function calls that can have optional failures and returns their results. Each call must explicitly set the `allowFailure` flag.

- **aggregate3Value**: Aggregates function calls with value transfers (msg.value) and can handle optional failures. The value for each call is accumulated and compared with the total msg.value to ensure consistency.

- **getBlockHash**: Returns the block hash for a given block number.

- **getBlockNumber**: Returns the current block number.

- **getCurrentBlockCoinbase**: Returns the coinbase address for the current block.

- **getCurrentBlockDifficulty**: Returns the difficulty of the current block.

- **getCurrentBlockGasLimit**: Returns the gas limit of the current block.

- **getCurrentBlockTimestamp**: Returns the timestamp of the current block.

- **getEthBalance**: Returns the (ETH) balance of a given address.

- **getLastBlockHash**: Returns the block hash of the last block.

- **getBasefee**: Returns the base fee of the given block. This feature may require blockchain support for the BASEFEE opcode.

- **getChainId**: Returns the chain ID.

### Usage

The Multicall3 contract is typically used for efficiently interacting with multiple functions on the Ethereum blockchain in a single transaction. Here's how it can be typically used:

1. Use the `aggregate` or `tryAggregate` functions to aggregate multiple function calls and retrieve their results. The contract allows flexibility in handling success and failure scenarios.

2. Utilize the `tryBlockAndAggregate` or `blockAndAggregate` functions for aggregated function calls and optional failures, while also obtaining block information.

3. For advanced use cases, use the `aggregate3` and `aggregate3Value` functions when you need to work with calls that can have optional failures.

4. Access various block-related information and account balances using the provided helper functions.

The Multicall3 contract is particularly useful when you want to optimize gas costs and reduce the number of transactions required to interact with multiple smart contracts or retrieve blockchain data.

## MultiSigWallet Contract

### Contract Overview

The MultiSigWallet contract is designed to facilitate multi-signature wallet functionality. It enables multiple authorized parties (owners) to propose and execute transactions collectively. The contract offers a secure way for a group of owners to manage their shared funds.

### Architecture Overview
![MultiSigWallet Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/multisigwallet-schema.svg)

### Contract Details

#### State Variables

- `owners`: An array of addresses representing the owners of the multi-signature wallet.
- `isOwner`: A mapping that keeps track of whether an address is an owner of the wallet.
- `numConfirmationsRequired`: The minimum number of owner confirmations required for a transaction to be executed.
- `transactions`: An array of `Transaction` structures to store pending transactions.

#### Structs

- `Transaction`: A struct representing a pending transaction with fields for recipient address (`to`), value, data, execution status (`executed`), and the number of confirmations (`numConfirmations`).

#### Events

- `Deposit(sender, amount, balance)`: Emitted when Ether is deposited into the contract.
- `SubmitTransaction(owner, txIndex, to, value, data)`: Emitted when an owner submits a new transaction.
- `ConfirmTransaction(owner, txIndex)`: Emitted when an owner confirms a transaction.
- `RevokeConfirmation(owner, txIndex)`: Emitted when an owner revokes their confirmation on a transaction.
- `ExecuteTransaction(owner, txIndex)`: Emitted when a transaction is executed.

#### Modifiers

- `onlyOwner`: A modifier that restricts access to only the owners.
- `txExists`: A modifier that checks whether a transaction with a given index exists.
- `notExecuted`: A modifier that checks whether a transaction has not been executed.
- `notConfirmed`: A modifier that checks whether an owner has not confirmed a transaction.

### Contract Functions

#### Core Functions

- `submitTransaction(to, value, data)`: Allows an owner to submit a new transaction to the wallet.
- `confirmTransaction(txIndex)`: Enables an owner to confirm a pending transaction.
- `revokeConfirmation(txIndex)`: Allows an owner to revoke their confirmation on a pending transaction.
- `executeTransaction(txIndex)`: Permits an owner to execute a pending transaction if the required number of confirmations is met.

#### View Functions

- `getOwners()`: Returns the list of wallet owners.
- `getTransactionCount()`: Provides the number of pending transactions.
- `getTransaction(txIndex)`: Retrieves details about a specific transaction by its index.

### Usage

The MultiSigWallet contract is typically used as follows:

1. Initialize the contract by providing a list of owner addresses and specifying the required number of confirmations.

2. Owners can use the `submitTransaction` function to propose new transactions, specifying the recipient address, value, and data.

3. Owners can confirm pending transactions using the `confirmTransaction` function.

4. If necessary, owners can revoke their confirmation on a pending transaction with the `revokeConfirmation` function.

5. Once the required number of confirmations is met, an owner can execute a transaction using the `executeTransaction` function.

6. Use the view functions to retrieve information about owners, transaction counts, and specific transaction details.


## Roles Contract

The Roles contract is a smart contract designed for managing roles and permissions in a decentralized application. It implements role-based access control using OpenZeppelin's AccessControl library and provides functions to handle roles for owners, managers, and validators.

### Contract Overview

The Roles contract provides the following core functionalities:

- Role Definition: The contract defines three roles: `OWNER_ROLE`, `MANAGER_ROLE`, and `VALIDATOR_ROLE`. Each role has specific access control and management capabilities.

- Role Management: The contract allows owners to grant roles to accounts. In the case of the `VALIDATOR_ROLE`, it also maintains a list of validators.

- Validator Queue: Validators are selected based on their order in the queue, with the queue position determined by the block number. The `pickValidator` function returns the address of the validator based on the current block number.

### Architecture Overview
![Roles Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/roles-schema.svg)

### Contract Details

#### State Variables

- **OWNER_ROLE**: The constant representing the owner role.
- **MANAGER_ROLE**: The constant representing the manager role.
- **VALIDATOR_ROLE**: The constant representing the validator role.
- **validatorList**: An array that stores addresses of validators.
- **currentValidatorId**: An integer tracking the number of validators.

### Contract Functions

- **initialize**: Initializes the Roles contract with the initial owner's address.

- **pickValidator**: Returns the current validator based on the block number.

- **grantRole**: Grants a role to an account, with special handling for the VALIDATOR_ROLE, including updating the validator list.

### Usage

The Roles contract is typically used for managing roles and permissions within a decentralized application. Here's how it can be typically used:

1. Use the `initialize` function to set up the initial owner of the contract.

2. Roles, such as `MANAGER_ROLE` and `VALIDATOR_ROLE`, can be granted to specific accounts using the `grantRole` function. Special handling for the `VALIDATOR_ROLE` ensures that validators are added to the list and tracked.

3. The `pickValidator` function can be used to select validators in a specific order based on the block number.

The contract facilitates robust access control and role management, making it an essential component of a decentralized application.


## TxValidator Contract

The TxValidator contract is responsible for validating transactions and managing votes on transactions. It allows users to vote on the validity of transactions and, upon reaching a consensus, distributes rewards to voters and transaction handlers.

### Contract Overview

The TxValidator contract offers the following core functionalities:

- Transaction Validation: Users can propose transactions for validation by specifying a handler, reward, and associated miner node type. These transactions are subject to voting.

- Voting Mechanism: Users eligible to vote can express their decision (approve or disapprove) on a transaction. Their voting power is determined based on their Meta Points balance and the associated miner node type.

- Consensus and Rewards: When a transaction receives a sufficient number of votes or exceeds a vote point limit, it is considered completed. Rewards are then distributed to voters and the handler based on the decision and the number of voters.

### Architecture Overview
![TxValidator Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/eec8b99da98cf010019747de4f76c35dafa1fb56/resources/schemas/txvalidator-schema.svg)

### Contract Details

#### State Variables

- **votePointLimit**: The minimum vote point threshold for completing a transaction.
- **voteCountLimit**: The maximum number of votes allowed for a transaction.
- **defaultVotePoint**: The default vote point value assigned to voters.
- **defaultExpireTime**: The default time until a transaction expires.
- **HANDLER_PERCENT**: The percentage of rewards allocated to transaction handlers.
- **minerList**: Address of the MinerList contract.
- **minerPool**: Address of the MinerPool contract.
- **metaPoints**: Address of the MetaPoints contract.
- **minerFormulas**: Address of the MinerFormulas contract.
- **minerHealthCheck**: Address of the MinerHealthCheck contract.
- **txPayloads**: Mapping to store transaction information.
- **txVotes**: Mapping to store votes for each transaction.
- **txVotesCount**: Mapping to track the number of votes for each transaction.
- **previousVotes**: Mapping to track previous votes of addresses.

#### Enums

- **TransactionState**: Represents the state of a transaction (Pending, Completed, Expired).

#### Events

- **AddTransaction**: Emitted when a new transaction is added for validation.
- **VoteTransaction**: Emitted when a user votes on a transaction.
- **DoneTransaction**: Emitted when a transaction reaches a consensus and is completed.
- **ExpireTransaction**: Emitted when a transaction expires.

### Contract Functions

#### Transaction Validation

- **addTransaction**: Allows a manager to add a new transaction for validation, specifying the handler, reward, and miner node type.

#### Voting Mechanism

- **voteTransaction**: Enables users to vote on a transaction by indicating their decision. The voting power is based on their Meta Points balance and node type.

#### Consensus and Rewards

- **checkTransactionState**: Checks the state of a transaction and handles state transitions.
- **_checkTransactionState**: Internal function to check the state of a transaction.
- **_calculateVotePoint**: Internal function to calculate the vote point for a voter.
- **_shareRewards**: Internal function to distribute rewards for a completed transaction.

### Usage

Use the `initialize` function to set the addresses of the required contracts.
The TxValidator contract is used for the validation of transactions within the system. Here's how it can typically be used:

1. Use the `initialize` function to set the addresses of the required contracts.
2. Use the `initRoles` function to set the addresses of the required Roles contract.
3. Use the `addTransaction` function to propose a transaction for validation, specifying the handler, reward, and miner node type.
4. Eligible users can vote on the proposed transactions using the `voteTransaction` function, indicating their decision. Voting power is determined based on their Meta Points balance and node type.
5. Transactions are considered completed when they reach the vote point threshold or the maximum vote count. Upon completion, rewards are distributed to voters and transaction handlers.
6. Expired transactions are marked as such, and no further voting or rewards distribution occurs.

The contract plays a crucial role in maintaining a fair and secure transaction validation system within the ecosystem.

# Abstract Contracts

## Blacklistable Contract

The `Blacklistable` contract is an abstract contract designed to manage a blacklist of addresses. This contract extends the functionality of the `RolesHandler` contract, which deals with roles and permissions. The primary purpose of the `Blacklistable` contract is to provide a mechanism for marking addresses as blacklisted or not, allowing for specific actions or restrictions based on this status.

### Contract Overview

The `Blacklistable` contract introduces the following key components:

- Transaction Blacklist: A mapping that associates addresses with a boolean value to indicate whether they are blacklisted.
- Event Emission: Events are emitted when the blacklist status of an address is updated.

### Architecture Overview
![Blacklistable Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/edbbae45637182d93f27ca1ee83bbbad6ea3f8b0/resources/schemas/blacklistable-schema.svg)

### Contract Details

#### State Variables

- **`blacklist`**: A public mapping that associates Ethereum addresses with a boolean value (`true` for blacklisted, `false` for not blacklisted). It keeps track of which addresses are on the blacklist.

#### Events

- **`Blacklist`**: This event is emitted when the blacklist status of an address is modified. It logs the affected `wallet` address and its new `status` (blacklisted or not).

#### Modifiers

- **`isBlacklisted`**: A modifier that checks whether a specified address is not blacklisted. If the address is found to be blacklisted, it raises an error stating "Wallet is blacklisted," preventing the function from executing.

### Contract Functions

- **`setBlacklist`**: An external function that allows a user with the `onlyOwnerRole` permission (as defined in the `RolesHandler` contract) to change the blacklist status of an address. It takes two arguments: the `wallet` address and the `status`, which is a boolean (`true` for blacklisted, `false` for not blacklisted). This function updates the `blacklist` mapping accordingly and emits the `Blacklist` event to log the status change.

### Usage

The Blacklistable contract serves as a foundation for managing a blacklist of addresses, providing control over which addresses can participate in certain actions based on their blacklist status. By using the `isBlacklisted` modifier, other functions can ensure that specific actions are only permitted for addresses that are not blacklisted.

By extending the `RolesHandler` contract, the `Blacklistable` contract can manage the roles and permissions required to add or remove addresses from the blacklist.

## Freezeable Contract

The `Freezeable` contract is an abstract contract designed to manage the freeze status of a contract. This contract extends the functionality of the `RolesHandler` contract, which deals with roles and permissions. The primary purpose of the `Freezeable` contract is to provide a mechanism for freezing and unfreezing a contract, allowing for specific actions or restrictions based on this status.

### Contract Overview

The `Freezeable` contract introduces the following key components:

- Freeze Status: A boolean variable `freezeStatus` that indicates whether the contract is frozen or not.
- Event Emission: An event is emitted when the freeze status of the contract is updated.

### Architecture Overview
![Freezeable Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/edbbae45637182d93f27ca1ee83bbbad6ea3f8b0/resources/schemas/freezeable-schema.svg)

### Contract Details

#### State Variables

- **`freezeStatus`**: A public boolean variable that indicates whether the contract is currently frozen (`true` for frozen, `false` for not frozen). This variable controls the freeze status of the contract.

#### Events

- **`Freeze`**: This event is emitted when the freeze status of the contract is modified. It logs the new `status` of the contract (frozen or not).

#### Modifiers

- **`isFreezed`**: A modifier that checks whether the contract is currently frozen. If the contract is frozen, it raises an error stating "Contract is not freezed," preventing the function from executing.

- **`isNotFreezed`**: A modifier that checks whether the contract is currently not frozen. If the contract is not frozen, it raises an error stating "Contract is freezed," preventing the function from executing.

### Contract Functions

- **`setFreeze`**: An external function that allows a user with the `onlyOwnerRole` permission (as defined in the `RolesHandler` contract) to change the freeze status of the contract. It takes a single argument `status`, which is a boolean (`true` for frozen, `false` for not frozen). This function updates the `freezeStatus` variable accordingly and emits the `Freeze` event to log the status change.

### Usage

The Freezeable contract serves as a foundation for managing the freeze status of a contract, providing control over the contract's functionality based on whether it is frozen or not. By using the `isFreezed` and `isNotFreezed` modifiers, other functions can ensure that specific actions are only permitted when the contract is in the desired freeze status.

By extending the `RolesHandler` contract, the `Freezeable` contract can manage the roles and permissions required to control the freeze status of the contract.

## RolesHandler Contract

The `RolesHandler` contract is an abstract contract designed to facilitate the management of roles and permissions within a smart contract. It is intended to be inherited by other contracts that require role-based access control. The contract defines and enforces roles such as owner, manager, and validator, and provides modifiers for checking if an address has a specific role.

### Contract Overview

The `RolesHandler` contract introduces the following key components:

- Role Modifiers: Modifiers are provided to check if an address has a specific role, including `onlyOwnerRole`, `onlyManagerRole`, and `onlyValidatorRole`.

- Initialization: The contract allows for the initialization of the roles contract, connecting it to an external contract that defines the roles.

### Architecture Overview
![RolesHandler Schema](https://raw.githubusercontent.com/Metatime-Technology-Inc/metachain/edbbae45637182d93f27ca1ee83bbbad6ea3f8b0/resources/schemas/roleshandler-schema.svg)

### Contract Details

#### State Variables

- **`roles`**: An address of an external contract that defines and manages roles within the system.

#### Modifiers

- **`onlyOwnerRole`**: A modifier that checks if the provided address has the owner role. If the address does not have the owner role, the modifier raises an error with the message "Owner role is needed for this action," preventing the function from executing.

- **`onlyManagerRole`**: A modifier that checks if the provided address has the manager role. If the address does not have the manager role, the modifier raises an error with the message "Manager role is needed for this action," preventing the function from executing.

- **`onlyValidatorRole`**: A modifier that checks if the provided address has the validator role. If the address does not have the validator role, the modifier raises an error with the message "Validator role is needed for this action," preventing the function from executing.

### Contract Functions

- **`initRoles`**: An external function that initializes the roles contract by setting the `roles` state variable to the provided `rolesAddress`. This function can only be called once, ensuring that the roles contract is properly connected.

### Usage

The `RolesHandler` contract acts as a foundational component for managing roles and permissions within the system. It can be extended by other contracts that require role-based access control. By using the provided modifiers, these contracts can enforce role requirements for specific actions, helping maintain security and access control in a decentralized application.

The `RolesHandler` contract ensures that proper authorization is in place, allowing specific addresses to perform actions based on their assigned roles.

# Library Contracts

## MinerTypes Library

The `MinerTypes` library defines custom data structures and an enumeration for miner node types. It is typically used in Ethereum smart contracts to represent and manage miner-related information.

### Library Overview

The `MinerTypes` library offers the following core components:

- `Miner` Struct: A structure to store miner-specific information, including the `nodeType` and whether the miner `exist`.

- `NodeType` Enumeration: An enumeration to define various miner node types, including `Meta`, `MacroArchive`, `MacroFullnode`, `MacroLight`, and `Micro`.

### Library Details

#### `Miner` Struct

The `Miner` struct is defined as follows:

- `nodeType`: An instance of the `NodeType` enumeration, representing the node type of the miner.

- `exist`: A boolean value that indicates whether the miner exists.

#### `NodeType` Enumeration

The `NodeType` enumeration defines various miner node types within the system:

- `Meta`: A Meta miner node type.
- `MacroArchive`: A Macro Archive miner node type.
- `MacroFullnode`: A Macro Fullnode miner node type.
- `MacroLight`: A Macro Light miner node type.
- `Micro`: A Micro miner node type.

### Usage

The `MinerTypes` library is designed to be used within other smart contracts for managing and storing information related to miners and their respective node types. By utilizing the `Miner` struct and the `NodeType` enumeration, developers can maintain a clear and structured representation of miner data.

The `MinerTypes` library is an essential tool for projects that involve miner management and where distinguishing between various miner types is necessary.
