// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./AddressSet.sol";
using AddressSet for AddressSet.Set;
import "./VoteSet.sol";
using VoteSet for VoteSet.Data;
import "./BytesLib.sol";
using BytesLib for bytes;

import "./ChildBase.sol";

abstract contract ElectionBase is ChildBase {
  mapping(address => VoteSet.Data) elections;
  mapping(address => bytes[]) invokeData;
  AddressSet.Set proposals;
  bytes[] public allowedInvokePrefixes;

  struct ProposalDetails {
    address key;
    uint startTime;
    uint endTime;
    bytes[] data;
    uint16 _threshold;
    uint minVoters;
    bool processed;
    uint supporting;
    uint against;
    uint8 myVote;
    bool passed;
    bool passing;
  }

  event ElectionProcessed(address key);
  event NewElection(address key);
  event ProposalText(string text);

  constructor(bytes[] memory _allowedInvokePrefixes) {
    allowedInvokePrefixes = _allowedInvokePrefixes;
  }

  // General usage methods
  function invokePrefixes() external view returns(bytes[] memory) {
    return allowedInvokePrefixes;
  }
  function proposalText(string calldata text) external {
    emit ProposalText(text);
  }
  function _propose(
    bytes[] memory data,
    uint durationSeconds,
    uint16 threshold,
    uint minVoters
  ) internal {
    if(!group.contractAllowed(msg.sender)) {
      requireAuth();
    }
    require(data.length > 0, 'Transaction Required');

    if(allowedInvokePrefixes.length > 0) {
      uint foundAllowed;
      for(uint i = 0; i < allowedInvokePrefixes.length; i++) {
        for(uint d = 0; d < data.length; d++) {
          if(data[d].length >= allowedInvokePrefixes[i].length) {
            bytes memory dataPrefix = data[d].slice(0, allowedInvokePrefixes[i].length);
            if(dataPrefix.equal(allowedInvokePrefixes[i])) {
              foundAllowed++;
            }
          }
        }
      }
      require(foundAllowed == data.length, 'Proposed Data Mismatch');
    }

    address key = address(uint160(uint256(keccak256(abi.encode(address(this), count())))));
    // Should never collide but can't be too safe
    require(!proposals.exists(key));

    emit NewElection(key);
    proposals.insert(key);
    invokeData[key] = data;
    elections[key].startTime = block.timestamp;
    elections[key].endTime = block.timestamp + durationSeconds;
    elections[key].threshold = threshold;
    elections[key].minVoters = minVoters;
    // At least one person must vote for an election to pass
    if(elections[key].minVoters == 0) {
      elections[key].minVoters = 1;
    }
  }

  function count() public view returns(uint) {
    return proposals.count();
  }

  function detailsMany(uint startIndex, uint8 fetchCount, address voter) external view returns(ProposalDetails[] memory) {
    ProposalDetails[] memory out = new ProposalDetails[](fetchCount);
    for(uint8 i; i < fetchCount; i++) {
      out[i] = details(proposals.keyList[startIndex + i], voter);
    }
    return out;
  }

  function details(address key, address voter) public view returns(ProposalDetails memory) {
    require(elections[key].endTime > 0);
    return ProposalDetails(
      key,
      elections[key].startTime,
      elections[key].endTime,
      invokeData[key],
      elections[key].threshold,
      elections[key].minVoters,
      elections[key].processed,
      elections[key].supporting,
      elections[key].against,
      elections[key].votesByAccount[voter],
      elections[key].passed(),
      elections[key].passing()
    );
  }

  function vote(address key, bool inSupport) public {
    requireAuth();
    require(group.joinedTimestamps(msg.sender) < elections[key].startTime,
      "Registered After Election Start");
    elections[key].vote(msg.sender, inSupport);
  }

  function process(address key) external {
    requireAuth();
    require(elections[key].passed());
    require(elections[key].processed == false);
    elections[key].processed = true;
    emit ElectionProcessed(key);
    group.invokeMany(invokeData[key]);
  }

  function requireAuth() internal view {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
  }
}


