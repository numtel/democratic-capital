// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Fundraiser.sol";
import "./ChildFactory.sol";

contract FundraiserFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(
    address group,
    address token,
    uint goalAmount,
    uint duration,
    string memory name
  ) external {
    Fundraiser newContract = new Fundraiser(
      childMeta, group, token, goalAmount, duration, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


