// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

library VoteSet {
  struct Data {
    uint startTime;
    uint endTime;
    uint16 threshold;
    uint minVoters;
    bool processed;

    // 0: not voted, 1: in support, 2: against
    mapping(address => uint8) votesByAccount;
    uint supporting;
    uint against;
  }
  function vote(Data storage self, address account, bool inSupport) internal {
    require(block.timestamp < self.endTime, "Election Ended");
    require(self.votesByAccount[account] == 0, "Cannot Vote Again");

    if(inSupport) {
      self.supporting++;
      self.votesByAccount[account] = 1;
    } else {
      self.against++;
      self.votesByAccount[account] = 2;
    }
  }
  function passed(Data storage self) internal view returns(bool) {
    return block.timestamp > self.endTime && passing(self);
  }

  function passing(Data storage self) internal view returns(bool) {
    return ((self.against + self.supporting) >= self.minVoters)
      && (self.threshold == 0xffff
        // Special case in order to use exclusive greater than in lower levels
        ? self.against == 0
        : (((self.supporting * 0xffff) / (self.supporting + self.against)) > self.threshold));
  }
}
