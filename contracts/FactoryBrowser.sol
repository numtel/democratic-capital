// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

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

interface IVerifiedGroupFactory {
  struct GroupChild {
    address meta;
    address item;
  }
  function childCount(address group) external view returns(uint);
  function groupChildren(address group, uint index) external view returns(GroupChild memory);
}
