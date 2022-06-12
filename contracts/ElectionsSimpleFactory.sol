// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionsSimple.sol";
import "./ChildFactory.sol";

contract ElectionsSimpleFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta) {}

  function deployNew(
    address group,
    bytes[] memory allowedInvokePrefixes,
    uint durationSeconds,
    uint16 threshold,
    uint16 minParticipation,
    string memory name
  ) external {
    requireMember(group);
    ElectionsSimple newContract = new ElectionsSimple(
      childMeta, group, allowedInvokePrefixes, durationSeconds, threshold, minParticipation, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}

