// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroupFactory.sol";

contract FactoryBrowser {
  function detailsMany(IVerifiedGroupFactory factory, address group, uint startIndex, uint fetchCount) external view returns(IVerifiedGroupFactory.GroupChild[] memory) {
    uint itemCount = factory.childCount(group);
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    IVerifiedGroupFactory.GroupChild[] memory out = new IVerifiedGroupFactory.GroupChild[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      out[i] = factory.groupChildren(group, i);
    }
    return out;
  }
}
