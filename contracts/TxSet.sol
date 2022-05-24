// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

// Adapted from https://github.com/rob-Hitchens/SetTypes
library TxSet {
  struct Tx {
    address to;
    bytes data;
  }
  struct Set {
    mapping(bytes32 => uint) keyPointers;
    mapping(bytes32 => Tx) txs;
    Tx[] keyList;
  }

  event TxSent(address to, bytes data, bytes returned);

  function insert(Set storage self, address to, bytes memory data) internal {
    Tx memory key = Tx(to, data);
    require(!exists(self, key), "TxSet: key already exists in the set.");
    self.keyPointers[toBytes32(key)] = self.keyList.length;
    self.keyList.push(key);
  }
  function remove(Set storage self, address to, bytes memory data) internal {
    Tx memory key = Tx(to, data);
    require(exists(self, key), "TxSet: key does not exist in the set.");
    uint last = count(self) - 1;
    uint rowToReplace = self.keyPointers[toBytes32(key)];
    if(rowToReplace != last) {
      Tx memory keyToMove = self.keyList[last];
      self.keyPointers[toBytes32(keyToMove)] = rowToReplace;
      self.keyList[rowToReplace] = keyToMove;
    }
    delete self.keyPointers[toBytes32(key)];
    self.keyList.pop();
  }
  function count(Set storage self) internal view returns(uint) {
    return(self.keyList.length);
  }
  function exists(Set storage self, address to, bytes memory data) internal view returns (bool) {
    return exists(self, Tx(to, data));
  }
  function exists(Set storage self, Tx memory key) internal view returns (bool) {
    if(self.keyList.length == 0) return false;
    return toBytes32(self.keyList[self.keyPointers[toBytes32(key)]]) == toBytes32(key);
  }
  function keyAtIndex(Set storage self, uint index) internal view returns (Tx memory) {
    return self.keyList[index];
  }
  function toBytes32(Tx memory s) private pure returns (bytes32) {
    return(keccak256(abi.encode(s.to, s.data)));
  }
  function invokeAll(Set storage self) internal {
    for(uint i=0; i<self.keyList.length; i++) {
      (bool success, bytes memory data) = self.keyList[i].to.call(self.keyList[i].data);
      emit TxSent(self.keyList[i].to, self.keyList[i].data, data);
      require(success);
    }
  }
}
