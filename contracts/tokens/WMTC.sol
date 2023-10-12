// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

/**
 * @title WMTC (Wrapped MTC)
 * @dev This is a basic implementation of an ERC-20 token contract named "Wrapped MTC" (WMTC).
 * It allows for the creation of wrapped tokens backed by Ether (MTC).
 */
contract WMTC {
    string public name = "Wrapped MTC";
    string public symbol = "WMTC";
    uint8 public decimals = 18;

    event Approval(address indexed src, address indexed guy, uint wad);
    event Transfer(address indexed src, address indexed dst, uint wad);
    event Deposit(address indexed dst, uint wad);
    event Withdrawal(address indexed src, uint wad);

    mapping(address => uint) public balanceOf;
    mapping(address => mapping(address => uint)) public allowance;

    receive() external payable {
        deposit();
    }

    /**
     * @dev Deposit Ether to receive WMTC tokens.
     */
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /**
     * @dev Withdraw WMTC tokens and receive Ether in return.
     * @param wad The amount of WMTC tokens to withdraw.
     */
    function withdraw(uint wad) public {
        require(balanceOf[msg.sender] >= wad);
        balanceOf[msg.sender] -= wad;
        payable(msg.sender).transfer(wad);
        emit Withdrawal(msg.sender, wad);
    }

    /**
     * @return The total supply of WMTC tokens, represented as the contract's ETH balance.
     */
    function totalSupply() public view returns (uint) {
        return address(this).balance;
    }

    /**
     * @dev Approve another address to spend tokens on your behalf.
     * @param guy The address to approve for spending.
     * @param wad The amount of tokens to approve for spending.
     * @return true if the approval was successful.
     */
    function approve(address guy, uint wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    /**
     * @dev Transfer tokens to another address.
     * @param dst The recipient's address.
     * @param wad The amount of tokens to transfer.
     * @return true if the transfer was successful.
     */
    function transfer(address dst, uint wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    /**
     * @dev Transfer tokens from one address to another.
     * @param src The sender's address.
     * @param dst The recipient's address.
     * @param wad The amount of tokens to transfer.
     * @return true if the transfer was successful.
     */
    function transferFrom(
        address src,
        address dst,
        uint wad
    ) public returns (bool) {
        require(balanceOf[src] >= wad);

        if (
            src != msg.sender && allowance[src][msg.sender] != type(uint256).max
        ) {
            require(allowance[src][msg.sender] >= wad);
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);

        return true;
    }
}
