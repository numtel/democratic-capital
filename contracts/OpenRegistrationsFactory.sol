// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenRegistrations.sol";
import "./ChildFactory.sol";

contract OpenRegistrationsFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(address group, string memory name) external {
    requireMember(group);
    OpenRegistrations newContract = new OpenRegistrations(childMeta, group, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}

