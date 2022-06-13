// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MemberTokenEmissions.sol";
import "./ChildFactory.sol";

contract MemberTokenEmissionsFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(
    address group,
    address tokenAddress,
    uint emissionPeriodSeconds,
    uint emissionAmount,
    string memory name
  ) external {
    MemberTokenEmissions newContract = new MemberTokenEmissions(
      childMeta, group, tokenAddress, emissionPeriodSeconds, emissionAmount, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


