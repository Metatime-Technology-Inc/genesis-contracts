// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

import "../helpers/RolesHandler.sol";

contract MetaPoints is
    Initializable,
    ERC20Upgradeable,
    ERC20BurnableUpgradeable,
    PausableUpgradeable,
    RolesHandler
{
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    error BurnDisabled(uint256 amount);
    error TransferDisabled(address to, uint256 amount);
    error TransferFromDisabled(address from, address to, uint256 amount);

    function initialize() public initializer {
        __ERC20_init("Meta Points", "MP");
        __ERC20Burnable_init();
        __Pausable_init();
    }

    function pause() public onlyOwnerRole(_msgSender()) {
        _pause();
    }

    function unpause() public onlyOwnerRole(_msgSender()) {
        _unpause();
    }

    function mint(
        address to,
        uint256 amount
    ) public whenNotPaused onlyManagerRole(_msgSender()) {
        _mint(to, amount);
    }

    function burn(uint256 amount) public virtual override {
        revert BurnDisabled(amount);
    }

    function burnFrom(
        address account,
        uint256 amount
    ) public virtual override onlyManagerRole(_msgSender()) {
        _burn(account, amount);
    }

    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        revert TransferDisabled(to, amount);
    }

    function approve(
        address spender,
        uint256 amount
    ) public virtual override whenNotPaused returns (bool) {
        return super.approve(spender, amount);
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        revert TransferFromDisabled(from, to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
