// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./RegistrationsByElection.sol";
import "./ChildFactory.sol";

contract RegistrationsByElectionFactory is ChildFactory {
  function deployNew(
    address group,
    address elections,
    string memory name
  ) external {
    requireMember(group);
    RegistrationsByElection newContract = new RegistrationsByElection(
      group, elections, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


