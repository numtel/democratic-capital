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
      uint medianPos = self.count / 2;
      bool countIsEven = self.count % 2 == 0;
      uint soFar;
      uint curBucket;
      uint otherBucket;
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
      self.median = uint8(curBucket);
    }


  }
}
