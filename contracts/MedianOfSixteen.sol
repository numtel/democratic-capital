// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

library MedianOfSixteen {
  struct Data {
    mapping(address => uint8) accountValues;
    uint64[16] buckets;
    uint count;
    uint8 median;
  }
  function set(Data storage self, address account, uint8 value) internal {
    require(value > 0 && value < 17);
    if(self.accountValues[account] == value) return;
    if(self.accountValues[account] > 0) {
      // Updating an existing value
      self.buckets[self.accountValues[account] - 1]--;
    } else {
      self.count++;
    }
    self.buckets[value - 1]++;
    self.accountValues[account] = value;

    if(self.count == 1) {
      // This was the first setting
      self.median = value;
    } else {
      self.median = calculateMedian(self);
    }
  }
  function calculateMedian(Data storage self) internal view returns(uint8) {
    require(self.count > 0);
    uint medianPos = self.count / 2;
    bool countIsEven = self.count % 2 == 0;
    uint soFar;
    uint8 curBucket;
    uint8 otherBucket;
    while(soFar <= medianPos) {
      soFar += self.buckets[curBucket];
      curBucket++;
      if(countIsEven && soFar == medianPos && otherBucket == 0) {
        // Median is between 2 buckets
        otherBucket = curBucket;
      }
    }
    if(otherBucket > 0) {
      curBucket = (otherBucket + curBucket) / 2;
    }
    return curBucket;
  }
  function unsetAccount(Data storage self, address account) internal {
    require(self.accountValues[account] > 0);
    self.buckets[self.accountValues[account] - 1]--;
    self.count--;
    if(self.count == 0) {
      self.median = 0;
    } else {
      self.median = calculateMedian(self);
    }
    delete self.accountValues[account];
  }
}
