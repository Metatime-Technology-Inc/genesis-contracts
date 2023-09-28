// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";

/**
 * @title MTC
 * @dev An ERC20 standard contract that mints Metatime Token and distributes it to each pool based on Metatime Tokenomics.
 */
contract MTC is ERC20, ERC20Burnable, Ownable2Step {
    struct Pool {
        string name; // Name of the pool
        address addr; // Address of the pool
        uint256 lockedAmount; // Locked amount in the pool
    }

    event PoolSubmitted(string name, address addr, uint256 lockedAmount);

    /**
     * @dev Initializes the MTC contract with initial pools and total supply.
     * @param _totalSupply The total supply of the MTC token.
     */
    constructor(uint256 _totalSupply) ERC20("Metatime", "MTC") {
        _mint(_msgSender(), _totalSupply);
    }

    /**
     * @dev A function to submit pools and distribute tokens from the owner's balance accordingly.
     * @param pools The array of Pool structures containing pool information.
     * @return A boolean value indicating whether the pools were successfully submitted.
     */
    function submitPools(
        Pool[] memory pools
    ) external onlyOwner returns (bool) {
        uint256 poolsLength = pools.length;

        for (uint256 i = 0; i < poolsLength; ) {
            Pool memory pool = pools[i];

            require(pool.addr != address(0), "MTC: invalid pool address");

            transfer(pool.addr, pool.lockedAmount);
            emit PoolSubmitted(pool.name, pool.addr, pool.lockedAmount);

            unchecked {
                i += 1;
            }
        }

        return true;
    }
}
