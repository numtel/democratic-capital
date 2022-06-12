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

  event ElectionProcessed(address key, uint txIndex, bytes sent, bytes returned);
  event NewElection(address key);

  constructor(bytes[] memory _allowedInvokePrefixes) {
    allowedInvokePrefixes = _allowedInvokePrefixes;
  }

  // General usage methods
  function invokePrefixes() external view returns(bytes[] memory) {
    return allowedInvokePrefixes;
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

    if(allowedInvokePrefixes.length > 0) {
      bool foundAllowed = false;
      for(uint i = 0; i < allowedInvokePrefixes.length; i++) {
        for(uint d = 0; d < data.length; d++) {
          if(data[d].length >= allowedInvokePrefixes[i].length) {
            bytes memory dataPrefix = data[d].slice(0, allowedInvokePrefixes[i].length);
            if(dataPrefix.equal(allowedInvokePrefixes[i])) {
              foundAllowed = true;
              break;
            }
          }
        }
      }
      require(foundAllowed, 'Proposed Data Mismatch');
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

  function atIndex(uint index) external view returns(address) {
    return proposals.keyList[index];
  }

  // TODO function detailsMany(startIndex, count) external view returns()

  function details(address key) external view returns(
    uint startTime, uint endTime, bytes[] memory data, uint dataCount,
    uint16 _threshold, uint minVoters, bool processed,
    uint supporting, uint against, bool passed, bool passing
  ) {
    require(elections[key].endTime > 0, 'Not Found');
    startTime = elections[key].startTime;
    endTime = elections[key].endTime;
    data = invokeData[key];
    dataCount = invokeData[key].length;
    _threshold = elections[key].threshold;
    minVoters = elections[key].minVoters;
    processed = elections[key].processed;
    supporting = elections[key].supporting;
    against = elections[key].against;
    passed = elections[key].passed();
    passing = elections[key].passing();
  }

  function voteValue(address key, address voter) external view returns(uint8) {
    return elections[key].votesByAccount[voter];
  }

  function vote(address key, bool inSupport) external {
    requireAuth();
    require(group.joinedTimestamps(msg.sender) < elections[key].startTime,
      "Registered After Election Start");
    elections[key].vote(msg.sender, inSupport, false);
  }

  function process(address key) external {
    requireAuth();
    require(elections[key].passed(), 'Election Not Passed');
    require(elections[key].processed == false, 'Election Already Processed');
    elections[key].processed = true;
    for(uint d = 0; d < invokeData[key].length; d++) {
      address to = abi.decode(bytes(hex"000000000000000000000000").concat(invokeData[key][d].slice(0, 20)), (address));
      bytes memory data = invokeData[key][d].slice(20, invokeData[key][d].length - 20);
      (bool success, bytes memory returned) = address(to).call(data);
      emit ElectionProcessed(key, d, invokeData[key][d], returned);
      // TODO consider election processed even if invoke fails?
      //  invoke condition could become valid at much later time?
      require(success, 'Invoke Failed');
    }
  }
  function requireAuth() internal view {
    require(group.isRegistered(msg.sender), 'Not Registered');
    require(group.isVerified(msg.sender), 'Not Verified');
  }
}


