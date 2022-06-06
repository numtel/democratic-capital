// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IElectionsSimpleQuadratic {
  function propose(bytes memory data) external;
  function count() external view returns(uint);
  function atIndex(uint index) external view returns(address);
  function details(address key) external view returns(
    uint startTime, uint endTime, bytes memory data,
    uint16 _threshold, uint minVoters, bool processed,
    uint supporting, uint against, bool passed, bool passing
  );
  function voteValue(address key, address voter) external view returns(uint8);
  function vote(address key, bool inSupport) external;
  function voteQuadratic(address key, bool inSupport, uint amount) external;
  function process(address key) external;
  function setDuration(uint _durationSeconds) external;
  function setThreshold(uint16 _threshold) external;
  function setMinParticipation(uint16 _minParticipation) external;
  function setQuadraticToken(address _quadraticToken) external;
  function setQuadraticMultiplier(uint _quadraticMultiplier) external;
}

