// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionsSimpleQuadratic.sol";
import "./ChildFactory.sol";

contract ElectionsSimpleQuadraticFactory is ChildFactory {
  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory)
    ChildFactory(factoryMeta, _childMeta, _parentFactory) {}

  function deployNew(
    address group,
    bytes[] memory allowedInvokePrefixes,
    uint durationSeconds,
    uint16 threshold,
    uint16 minParticipation,
    address quadraticToken,
    uint quadraticMultiplier,
    string memory name
  ) external {
    ElectionsSimpleQuadratic newContract = new ElectionsSimpleQuadratic(
      childMeta, group, allowedInvokePrefixes, durationSeconds, threshold, minParticipation, quadraticToken, quadraticMultiplier, name);
    parentFactory.registerChild(group, childMeta, address(newContract));
  }
}


