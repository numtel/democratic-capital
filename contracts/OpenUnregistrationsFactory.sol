// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenUnregistrations.sol";
import "./ChildFactory.sol";

contract OpenUnregistrationsFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(address group, string memory name) external {
    OpenUnregistrations newContract = new OpenUnregistrations(childMeta, group, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


