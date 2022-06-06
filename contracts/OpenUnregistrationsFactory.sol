// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenUnregistrations.sol";
import "./ChildFactory.sol";

contract OpenUnregistrationsFactory is ChildFactory {
  function deployNew(address group, string memory name) external {
    requireMember(group);
    OpenUnregistrations newContract = new OpenUnregistrations(group, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


