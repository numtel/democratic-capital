// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IVerifiedGroupFactory {
  struct GroupChild {
    address meta;
    address item;
    uint created;
  }
  function rewriter() external view returns(address);
  function childCount(address group) external view returns(uint);
  function groupChildren(address group, uint index) external view returns(GroupChild memory);
  function registerChild(address group, address childMeta, address item) external;
}
