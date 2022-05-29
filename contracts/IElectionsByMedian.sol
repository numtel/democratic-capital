// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IElectionsByMedian {
  function propose(bytes memory data) external;
  function count() external view returns(uint);
  function atIndex(uint index) external view returns(address);
  function details(address key) external view returns(
    uint endTime, uint8 _threshold, uint minVoters, bool processed,
    uint supporting, uint against, bool passed, bool passing
  );
  function vote(address key, bool inSupport) external;
  function process(address key) external;
  function setProposalConfig(
    uint8 _duration, uint8 _threshold, uint8 _minParticipation
  ) external;
  function unsetProposalConfig(address account) external;
  function getProposalConfig(address account) external view
    returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation);
  function getProposalConfig() external view
    returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation);
}
