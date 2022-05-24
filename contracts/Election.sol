// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract Election {
  uint public startTimestamp;
  uint public endTimestamp;
  uint public minimumVotes;
  uint16 public threshold;
  // An election that passes will invoke function from VerifiedGroup
  address public callContract;
  bytes public action;

  uint public votesSupporting;
  uint public votesAgainst;
  uint public voteCount;
  mapping(address => uint8) public accountVotes;

  constructor(
    uint _startTimestamp, uint _endTimestamp,
    uint _minimumVotes, uint16 _threshold,
    address _callContract, bytes memory _action
  ) {
    require(_endTimestamp > _startTimestamp);
    startTimestamp = _startTimestamp;
    endTimestamp = _endTimestamp;
    minimumVotes = _minimumVotes;
    threshold = _threshold;
    callContract = _callContract;
    action = _action;
  }
  // TODO support quadratic voting
  function vote(address account, bool inSupport) public {
    require(startTimestamp < block.timestamp
        && block.timestamp < endTimestamp,
      "Out of election period");

    if(accountVotes[account] == 0) {
      // This account has not voted yet
      voteCount++;
    } else if(accountVotes[account] == 1) {
      // Account is voting again, reverse their old vote
      votesSupporting--;
    } else if(accountVotes[account] == 2) {
      // Account is voting again, reverse their old vote
      votesAgainst--;
    }
    if(inSupport) {
      votesSupporting++;
      accountVotes[account] = 1;
    } else {
      votesAgainst++;
      accountVotes[account] = 2;
    }
  }
  function isThresholdMet() public view returns(bool) {
    if(voteCount == 0) return false;
    return ((votesSupporting * 0xffff) / (votesSupporting + votesAgainst))
      >= threshold;
  }
  function isParticipationMet() public view returns(bool) {
    return voteCount >= minimumVotes;
  }
  function hasEnded() public view returns(bool) {
    return block.timestamp > endTimestamp;
  }
  function hasPassed() public view returns(bool) {
    return hasEnded() && isThresholdMet() && isParticipationMet();
  }
}
