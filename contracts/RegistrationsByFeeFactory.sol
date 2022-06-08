// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./RegistrationsByFee.sol";
import "./ChildFactory.sol";

contract RegistrationsByFeeFactory is ChildFactory {
  function deployNew(
    address group,
    address tokenAddress,
    uint amount,
    string memory name
  ) external {
    requireMember(group);
    RegistrationsByFee newContract = new RegistrationsByFee(
      group, tokenAddress, amount, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


