// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MedianOfSixteen.sol";
using MedianOfSixteen for MedianOfSixteen.Data;
import "./AddressSet.sol";
using AddressSet for AddressSet.Set;
import "./VoteSet.sol";
using VoteSet for VoteSet.Data;
import "./BytesLib.sol";
using BytesLib for bytes;

import "./IElectionsByMedian.sol";
import "./IVerifiedGroup.sol";

contract ElectionsByMedian {
  IVerifiedGroup public group;
  MedianOfSixteen.Data duration;
  MedianOfSixteen.Data threshold;
  MedianOfSixteen.Data minParticipation;
  mapping(address => VoteSet.Data) elections;
  mapping(address => bytes) invokeData;
  AddressSet.Set proposals;
  bytes[] allowedInvokePrefixes;

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  event ElectionProcessed(address key, bytes sent, bytes returned);
  event NewElection(bytes data, address key);

  constructor(address _group, bytes[] memory _allowedInvokePrefixes) {
    group = IVerifiedGroup(_group);
    allowedInvokePrefixes = _allowedInvokePrefixes;
  }

  // EIP-165
  function supportsInterface(bytes4 interfaceId) external pure returns(bool) {
    return interfaceId == thisInterfaceId();
  }
  function thisInterfaceId() public pure returns(bytes4) {
    return type(IElectionsByMedian).interfaceId;
  }

  // Lifecycle methods
  function onAllow() external {
    require(msg.sender == address(group));
    group.hookUnregister(this.unsetProposalConfig.selector);
  }

  // General usage methods
  function propose(bytes memory data) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
    require(proposalConfigCount() > 0, 'Missing Proposal Config');
    if(allowedInvokePrefixes.length > 0) {
      bool foundAllowed = false;
      for(uint i = 0; i < allowedInvokePrefixes.length; i++) {
        if(data.length >= allowedInvokePrefixes[i].length) {
          bytes memory dataPrefix = data.slice(0, allowedInvokePrefixes[i].length);
          if(dataPrefix.equal(allowedInvokePrefixes[i])) {
            foundAllowed = true;
            break;
          }
        }
      }
      require(foundAllowed, 'Proposed Data Mismatch');
    }

    address key = address(uint160(uint256(keccak256(abi.encode(count(), data)))));
    // Should never collide but can't be too safe
    require(!proposals.exists(key));

    emit NewElection(data, key);
    proposals.insert(key);
    invokeData[key] = data;
    elections[key].startTime = block.timestamp;
    elections[key].endTime = block.timestamp + (duration.median * SECONDS_PER_DAY);
    elections[key].threshold = threshold.median;
    // minVoters - 1: 0%, 16: 100% 6.67% each step
    elections[key].minVoters = (group.registeredCount() * (minParticipation.median - 1)) / 15;
    // At least one person must vote for an election to pass
    if(elections[key].minVoters == 0) {
      elections[key].minVoters = 1;
    }
  }

  function count() public view returns(uint) {
    return proposals.count();
  }

  function atIndex(uint index) external view returns(address) {
    return proposals.keyList[index];
  }

  function details(address key) external view returns(
    uint startTime, uint endTime,
    uint8 _threshold, uint minVoters, bool processed,
    uint supporting, uint against, bool passed, bool passing
  ) {
    require(elections[key].endTime > 0, 'Not Found');
    startTime = elections[key].startTime;
    endTime = elections[key].endTime;
    _threshold = elections[key].threshold;
    minVoters = elections[key].minVoters;
    processed = elections[key].processed;
    supporting = elections[key].supporting;
    against = elections[key].against;
    passed = elections[key].passed();
    passing = elections[key].passing();
  }

  function vote(address key, bool inSupport) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
    require(group.joinedTimestamps(msg.sender) < elections[key].startTime,
      "Registered After Election Start");
    elections[key].vote(msg.sender, inSupport, false);
  }

  function process(address key) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
    require(elections[key].passed(), 'Election Not Passed');
    require(elections[key].processed == false, 'Election Already Processed');
    elections[key].processed = true;
    (bool success, bytes memory returned) = address(group).call(invokeData[key]);
    emit ElectionProcessed(key, invokeData[key], returned);
    require(success, 'Invoke Failed');
  }

  function setProposalConfig(
    uint8 _duration, uint8 _threshold, uint8 _minParticipation
  ) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
    duration.set(msg.sender, _duration);
    threshold.set(msg.sender, _threshold);
    minParticipation.set(msg.sender, _minParticipation);
  }

  function unsetProposalConfig(address account) external {
    // Allow contracts to invoke this function so that
    // they can clean out any users that unregister
    require(account == msg.sender || group.contractAllowed(msg.sender), 'Invalid Caller');
    duration.unsetAccount(account);
    threshold.unsetAccount(account);
    minParticipation.unsetAccount(account);
  }

  function getProposalConfig(address account) external view
      returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation) {
    require(group.isRegistered(account), 'Not Registered');
    _duration = duration.accountValues[account];
    _threshold = threshold.accountValues[account];
    _minParticipation = minParticipation.accountValues[account];
  }

  function getProposalConfig() external view
      returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation) {
    _duration = duration.median;
    _threshold = threshold.median;
    _minParticipation = minParticipation.median;
  }

  function proposalConfigCount() public view returns(uint) {
    return duration.count;
  }
}

