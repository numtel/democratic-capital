// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MemberTokenEmissions.sol";
import "./ChildFactory.sol";

/*{
  "name": "Member Token Emissions for ERC20Mintable Factory",
  "methods": {
    "deployNew": {
      "onlyAllowed": true,
      "fields": [
        {"hidden":"parent"},
        {"select":["Children"], "preview":"token"},
        {"preview":"seconds",
         "hint": "Each member will be eligible to collect emissionAmount after each period."},
        {"decimals":1}
      ]
    }
  }
}*/
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
    require(IVerifiedGroup(group).contractAllowed(msg.sender));
    MemberTokenEmissions newContract = new MemberTokenEmissions(
      childMeta, group, tokenAddress, emissionPeriodSeconds, emissionAmount, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


