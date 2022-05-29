// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

library VoteSet {
  struct Data {
    uint endTime;
    uint8 threshold;
    uint minVoters;
    bool processed;
    
    // 0: not voted, 1: in support, 2: against
    mapping(address => uint8) votesByAccount;
    uint supporting;
    uint against;
  }
  function vote(Data storage self, address account, bool inSupport, bool allowRevote) internal {
    require(block.timestamp < self.endTime);
    require(allowRevote || self.votesByAccount[account] == 0);
    // This is a re-vote, reverse existing value
    if(self.votesByAccount[account] == 1) {
      self.supporting--;
    } else if(self.votesByAccount[account] == 2) {
      self.against--;
    }

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
      // threshold - 1: 50%, 16: 100% 3.125% each step
      && (self.threshold == 16
        // Special case in order to use exclusive greater than in lower levels
        ? self.against == 0
        : (((self.supporting * 32) / (self.supporting + self.against)) > (self.threshold + 15)));
  }
}
