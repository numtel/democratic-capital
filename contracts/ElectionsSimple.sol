// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionBase.sol";

/*{
  "name": "Simple Elections",
  "overview": {
    "invokePrefixes": { "display": ["invokeFilter"] },
    "durationSeconds": { "display": ["seconds"] },
    "threshold": { "display": ["percentage"] },
    "minParticipation": { "display": ["percentage"] }
  },
  "methods": {
    "propose": {
      "onlyMember": true,
      "fields": [
        {"input":"txs"}
      ]
    },
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "setDuration": {
      "onlyAllowed": true,
      "fields": [
        { "preview": "seconds" }
      ]
    },
    "setThreshold": {
      "onlyAllowed": true,
      "fields": [
        { "input": "percentage" }
      ]
    },
    "setMinParticipation": {
      "onlyAllowed": true,
      "fields": [
        { "input": "percentage" }
      ]
    }
  },
  "display": {
    "Proposals": {}
  }
}*/
contract ElectionsSimple is ElectionBase {
  uint public durationSeconds;
  uint16 public threshold;
  uint16 public minParticipation;

  event DurationChanged(uint oldDuration, uint newDuration);
  event ThresholdChanged(uint16 oldThreshold, uint16 newThreshold);
  event MinParticipationChanged(uint16 oldMinParticipation, uint16 newMinParticipation);

  constructor(
    address _meta,
    address _group,
    bytes[] memory _allowedInvokePrefixes,
    uint _durationSeconds,
    uint16 _threshold,
    uint16 _minParticipation,
    string memory _name
  )
  ElectionBase( _allowedInvokePrefixes)
  ChildBase(_meta, _group, _name) {
    durationSeconds = _durationSeconds;
    threshold = _threshold;
    minParticipation = _minParticipation;
  }

  function propose(bytes[] memory data) external {
    _propose(
        data,
      durationSeconds,
      threshold,
      (group.registeredCount() * minParticipation) / 0xffff
    );
  }
  function setDuration(uint _durationSeconds) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit DurationChanged(durationSeconds, _durationSeconds);
    durationSeconds = _durationSeconds;
  }
  function setThreshold(uint16 _threshold) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit ThresholdChanged(threshold, _threshold);
    threshold = _threshold;
  }
  function setMinParticipation(uint16 _minParticipation) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit MinParticipationChanged(minParticipation, _minParticipation);
    minParticipation = _minParticipation;
  }
}
