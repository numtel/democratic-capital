// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroupFactory.sol";
import "./IVerifiedGroup.sol";

contract FactoryBrowser {
  struct ItemDetails {
    address meta;
    address item;
    uint created;
    string metaname;
    string name;
  }
  struct AllowedDetails {
    address meta;
    address item;
    string metaname;
    string name;
  }
  address public meta;

  bytes4 private constant NAME_SELECTOR = bytes4(keccak256(bytes('name()')));
  bytes4 private constant META_SELECTOR = bytes4(keccak256(bytes('meta()')));

  constructor(address _meta) {
    meta = _meta;
  }

  function detailsMany(IVerifiedGroupFactory factory, address group, uint startIndex, uint fetchCount) external returns(ItemDetails[] memory) {
    uint itemCount = factory.childCount(group);
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    ItemDetails[] memory out = new ItemDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      IVerifiedGroupFactory.GroupChild memory raw = factory.groupChildren(group, startIndex + i);
      out[i] = ItemDetails(raw.meta, raw.item, raw.created, safeName(raw.meta), safeName(raw.item));
    }
    return out;
  }

  function allowedMany(IVerifiedGroup group, uint startIndex, uint fetchCount) external returns(AllowedDetails[] memory) {
    uint itemCount = group.allowedContractCount();
    require(startIndex < itemCount);
    if(startIndex + fetchCount >= itemCount) {
      fetchCount = itemCount - startIndex;
    }
    AllowedDetails[] memory out = new AllowedDetails[](fetchCount);
    for(uint i; i < fetchCount; i++) {
      address raw = group.allowedContractIndex(startIndex + i);
      address metaAddr = safeMeta(raw);
      out[i] = AllowedDetails(metaAddr, raw, safeName(metaAddr), safeName(raw));
    }
    return out;
  }

  function safeName(address raw) public returns(string memory) {
    if(!isContract(raw)) return "";
    (bool success, bytes memory data) = raw.call(abi.encodeWithSelector(NAME_SELECTOR));
    if(success) {
      return abi.decode(data, (string));
    }
    return "";
  }

  function safeMeta(address raw) public returns(address) {
    if(!isContract(raw)) return address(0);
    (bool success, bytes memory data) = raw.call(abi.encodeWithSelector(META_SELECTOR));
    if(success) {
      return abi.decode(data, (address));
    }
    return address(0);
  }
  function isContract(address _addr) private view returns (bool){
    uint32 size;
    assembly {
      size := extcodesize(_addr)
    }
    return (size > 0);
  }
}

