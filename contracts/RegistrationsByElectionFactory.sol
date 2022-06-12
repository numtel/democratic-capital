// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./RegistrationsByElection.sol";
import "./ChildFactory.sol";

contract RegistrationsByElectionFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(
    address group,
    address elections,
    string memory name
  ) external {
    requireMember(group);
    RegistrationsByElection newContract = new RegistrationsByElection(
      childMeta, group, elections, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


