// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionBase.sol";
import "./IElectionsSimple.sol";

contract ElectionsSimple is ElectionBase {
  uint public durationSeconds;
  uint16 public threshold;
  uint16 public minParticipation;

  constructor(
    address _group,
    bytes[] memory _allowedInvokePrefixes,
    uint _durationSeconds,
    uint16 _threshold,
    uint16 _minParticipation
  )
  ElectionBase( _allowedInvokePrefixes)
  ChildBase(_group, type(IElectionsSimple).interfaceId) {
    durationSeconds = _durationSeconds;
    threshold = _threshold;
    minParticipation = _minParticipation;
  }

  function propose(bytes memory data) external {
    _propose(
        data,
      durationSeconds,
      threshold,
      (group.registeredCount() * minParticipation) / 0xffff
    );
  }
}
