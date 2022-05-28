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
  function vote(Data storage self, address account, bool inSupport) internal {
    require(block.timestamp < self.endTime);
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
  // TODO change range of minVoters and threshold
  // threshold - 1: 50%, 16: 100% 3.125% each step
  // minvoters - 1: 0%, 16: 100% 6.67% each step
  function passed(Data storage self) internal view returns(bool) {
    return block.timestamp > self.endTime
      && ((self.against + self.supporting) >= self.minVoters)
      && (((self.supporting * 16) / (self.supporting + self.against)) >= self.threshold);
  }
}
