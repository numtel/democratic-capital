// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20Mintable.sol";
import "./ChildFactory.sol";

contract ERC20MintableFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(
    address group,
    string memory name,
    string memory symbol,
    uint8 decimals
  ) external {
    requireMember(group);
    ERC20Mintable newContract = new ERC20Mintable(childMeta, group, name, symbol, decimals);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


