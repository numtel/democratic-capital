// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Fundraiser.sol";
import "./ChildFactory.sol";

contract FundraiserFactory is ChildFactory {
  function deployNew(
    address group,
    address token,
    uint goalAmount,
    uint duration,
    string memory name
  ) external {
    requireMember(group);
    Fundraiser newContract = new Fundraiser(
      group, token, goalAmount, duration, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


