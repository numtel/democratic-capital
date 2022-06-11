// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20.sol";

contract TestERC20 is ERC20 {
  string public name = "Test Token";
  string public symbol = "TEST";
  uint8 public decimals = 4;

  function mint(address account, uint amount) external {
    _mint(account, amount);
  }
}
