// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VerifiedGroup.sol";
import "./ChildFactory.sol";

contract VerifiedGroupFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(
    address verifications,
    string memory name
  ) external {
    VerifiedGroup newContract = new VerifiedGroup(childMeta, verifications, msg.sender, name);
    deployedByGroup[address(0)].push(address(newContract));
    emit NewDeployment(address(0), address(newContract));
  }
}
