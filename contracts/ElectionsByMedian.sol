// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MedianOfSixteen.sol";
using MedianOfSixteen for MedianOfSixteen.Data;
import "./AddressSet.sol";
using AddressSet for AddressSet.Set;
import "./VoteSet.sol";
using VoteSet for VoteSet.Data;

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

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  event ElectionProcessed(bytes sent, bytes returned);
  event NewElection(bytes data, address key);

  // TODO restrict invokeData to set of function hashes
  //  in order to make multiple channels for proposal configs
  //  also, support 2nd-level checking to invoke(address, bytes4)
  constructor(address _group) {
    group = IVerifiedGroup(_group);
  }

  // EIP-165
  function supportsInterface(bytes4 interfaceId) external pure returns(bool) {
    return interfaceId == thisInterfaceId();
  }
  function thisInterfaceId() public pure returns(bytes4) {
    return type(IElectionsByMedian).interfaceId;
  }

  function propose(bytes memory data) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');

    address key = address(uint160(uint256(keccak256(data))));
    require(!proposals.exists(key));

    emit NewElection(data, key);
    proposals.insert(key);
    elections[key].endTime = block.timestamp + (duration.median * SECONDS_PER_DAY);
    elections[key].threshold = threshold.median;
    // minVoters - 1: 0%, 16: 100% 6.67% each step
    elections[key].minVoters = (group.registeredCount() * (minParticipation.median - 1)) / 15;
    // At least one person must vote for an election to pass
    if(elections[key].minVoters == 0) {
      elections[key].minVoters = 1;
    }
  }

  function count() external view returns(uint) {
    return proposals.count();
  }

  function atIndex(uint index) external view returns(address) {
    return proposals.keyList[index];
  }

  function details(address key) external view returns(
    uint endTime, uint8 _threshold, uint minVoters, bool processed,
    uint supporting, uint against, bool passed, bool passing
  ) {
    require(elections[key].endTime > 0, 'Not Found');
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
    // TODO allowRevote as part of proposal config?
    elections[key].vote(msg.sender, inSupport, false);
  }

  function process(address key) external {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
    require(elections[key].endTime > 0, 'Election Not Finished');
    require(elections[key].processed == false, 'Election Already Processed');
    elections[key].processed = true;
    (bool success, bytes memory returned) = address(group).call(invokeData[key]);
    emit ElectionProcessed(invokeData[key], returned);
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
    require(account == msg.sender || group.contractAllowed(account), 'Invalid Caller');
    duration.unsetAccount(msg.sender);
    threshold.unsetAccount(msg.sender);
    minParticipation.unsetAccount(msg.sender);
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
}

