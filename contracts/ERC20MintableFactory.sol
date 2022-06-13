// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20Mintable.sol";
import "./ChildFactory.sol";

contract ERC20MintableFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(
    address group,
    string memory name,
    string memory symbol,
    uint8 decimals
  ) external {
    ERC20Mintable newContract = new ERC20Mintable(childMeta, group, name, symbol, decimals);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


