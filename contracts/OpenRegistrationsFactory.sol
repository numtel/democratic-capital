// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenRegistrations.sol";
import "./ChildFactory.sol";

contract OpenRegistrationsFactory is ChildFactory {
  function deployNew(address group) external {
    requireMember(group);
    OpenRegistrations newContract = new OpenRegistrations(group);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}

