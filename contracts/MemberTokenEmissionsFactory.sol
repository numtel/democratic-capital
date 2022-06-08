// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MemberTokenEmissions.sol";
import "./ChildFactory.sol";

contract MemberTokenEmissionsFactory is ChildFactory {
  function deployNew(
    address group,
    address tokenAddress,
    uint emissionPeriodSeconds,
    uint emissionAmount,
    string memory name
  ) external {
    requireMember(group);
    MemberTokenEmissions newContract = new MemberTokenEmissions(
      group, tokenAddress, emissionPeriodSeconds, emissionAmount, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


