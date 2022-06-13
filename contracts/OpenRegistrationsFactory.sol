// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenRegistrations.sol";
import "./ChildFactory.sol";

contract OpenRegistrationsFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(address group, string memory name) external {
    OpenRegistrations newContract = new OpenRegistrations(childMeta, group, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}

