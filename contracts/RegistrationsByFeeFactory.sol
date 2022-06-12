// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./RegistrationsByFee.sol";
import "./ChildFactory.sol";

contract RegistrationsByFeeFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(
    address group,
    address tokenAddress,
    uint amount,
    string memory name
  ) external {
    requireMember(group);
    RegistrationsByFee newContract = new RegistrationsByFee(
      childMeta, group, tokenAddress, amount, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


