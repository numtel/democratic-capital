// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenUnregistrations.sol";
import "./ChildFactory.sol";

contract OpenUnregistrationsFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(address group, string memory name) external {
    requireMember(group);
    OpenUnregistrations newContract = new OpenUnregistrations(childMeta, group, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


