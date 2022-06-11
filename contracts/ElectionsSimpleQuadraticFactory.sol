// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionsSimpleQuadratic.sol";
import "./ChildFactory.sol";

contract ElectionsSimpleQuadraticFactory is ChildFactory {
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
    requireMember(group);
    ElectionsSimpleQuadratic newContract = new ElectionsSimpleQuadratic(
      group, allowedInvokePrefixes, durationSeconds, threshold, minParticipation, quadraticToken, quadraticMultiplier, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


