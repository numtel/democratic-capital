// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20.sol";
import "./ChildBase.sol";

contract ERC20Mintable is ERC20, ChildBase {
  string public symbol;
  uint8 public decimals;

  event SymbolChanged(string oldSymbol, string newSymbol);

  constructor(
    address _meta,
    address _group,
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ChildBase(_meta, _group, _name) {
    symbol = _symbol;
    decimals = _decimals;
  }

  function setSymbol(string memory _symbol) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit SymbolChanged(symbol, _symbol);
    symbol = _symbol;
  }

  function mint(address account, uint amount) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    _mint(account, amount);
  }

}
