// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MedianOfSixteen.sol";
using MedianOfSixteen for MedianOfSixteen.Data;
import "./AddressSet.sol";
using AddressSet for AddressSet.Set;
import "./VoteSet.sol";
using VoteSet for VoteSet.Data;

contract VerifiedGroup {
  IVerification public verifications;
  mapping(address => uint) public joinedTimestamps;
  mapping(bytes32 => uint) public activeBans;
  MedianOfSixteen.Data preelectionDuration;
  MedianOfSixteen.Data preelectionThreshold;
  MedianOfSixteen.Data preelectionMinParticipation;
  AddressSet.Set proposals;

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationTimestamp, bytes32 idHash);

  constructor(address _verifications) {
    require(_verifications != address(0));
    verifications = IVerification(_verifications);
  }

  function isVerified(address account) public view returns(bool) {
    return verifications.addressActive(account);
  }

  function isRegistered(address account) public view returns(bool) {
    return joinedTimestamps[account] > 0;
  }
  function register(
    address account,
    uint8 _preelectionDuration,
    uint8 _preelectionThreshold,
    uint8 _preelectionMinParticipation
  ) public {
    require(isVerified(account), 'Not verified');
    bytes32 idHash = verifications.addressIdHash(account);
    require(activeBans[idHash] <= block.timestamp, 'Account Banned');
    joinedTimestamps[account] = block.timestamp;
    preelectionDuration.set(account, _preelectionDuration);
    preelectionThreshold.set(account, _preelectionThreshold);
    preelectionMinParticipation.set(account, _preelectionMinParticipation);
    emit Registration(account);
  }

  function unregister(address account) public {
    require(isRegistered(account), 'Not registered');
    delete joinedTimestamps[account];
    preelectionDuration.unsetAccount(account);
    preelectionThreshold.unsetAccount(account);
    preelectionMinParticipation.unsetAccount(account);
    emit Unregistered(account);
  }

  function registeredCount() public view returns(uint) {
    return preelectionDuration.count;
  }

  function ban(address account, uint banExpirationTimestamp) public {
    unregister(account);
    bytes32 idHash = verifications.addressIdHash(account);
    activeBans[idHash] = banExpirationTimestamp;
    emit AccountBanned(account, banExpirationTimestamp, idHash);
  }

  function setPreelectionConfig(
    address account,
    uint8 _preelectionDuration,
    uint8 _preelectionThreshold,
    uint8 _preelectionMinParticipation
  ) public {
    preelectionDuration.set(account, _preelectionDuration);
    preelectionThreshold.set(account, _preelectionThreshold);
    preelectionMinParticipation.set(account, _preelectionMinParticipation);
  }

  function initProposal(
    uint startTime,
    uint endTime,
    uint8 threshold,
    uint minVoters,
    address to,
    bytes memory data
  ) public {
    Proposal proposal = new Proposal(
      this,
      block.timestamp + (preelectionDuration.median * SECONDS_PER_DAY),
      preelectionThreshold.median,
      (registeredCount() * preelectionMinParticipation.median) / 16,
      startTime,
      endTime,
      threshold,
      minVoters,
      to,
      data
    );
    proposals.insert(address(proposal));
  }
}

contract Proposal {
  VerifiedGroup group;
  VoteSet.Data preelection;
  VoteSet.Data election;
  address to;
  bytes data;

  constructor(
    VerifiedGroup _group,
    uint _preEndTime,
    uint8 _preThreshold,
    uint _preMinVoters,
    uint _startTime,
    uint _endTime,
    uint8 _threshold,
    uint _minVoters,
    address _to,
    bytes memory _data
  ) {
    require(_preEndTime < _startTime);
    group = _group;
    preelection.startTime = block.timestamp;
    preelection.endTime = _preEndTime;
    preelection.threshold = _preThreshold;
    preelection.minVoters = _preMinVoters;
    election.startTime = _startTime;
    election.endTime = _endTime;
    election.threshold = _threshold;
    election.minVoters = _minVoters;
    to = _to;
    data = _data;
  }

  function preVote(bool inSupport) public {
    require(group.isRegistered(msg.sender));
    require(group.isVerified(msg.sender));
    preelection.vote(msg.sender, inSupport);
  }

  function prePassed() public view returns(bool) {
    return preelection.passed();
  }

  function mainVote(bool inSupport) public {
    require(prePassed());
    require(group.isRegistered(msg.sender));
    require(group.isVerified(msg.sender));
    election.vote(msg.sender, inSupport);
  }

  function mainPassed() public view returns(bool) {
    return election.passed();
  }
}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);
}
