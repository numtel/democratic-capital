// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroup.sol";

contract ChildBase {
  IVerifiedGroup public group;
  bytes4 public thisInterfaceId;

  constructor(address _group, bytes4 interfaceId) {
    thisInterfaceId = interfaceId;
    group = IVerifiedGroup(_group);
  }
  // EIP-165
  function supportsInterface(bytes4 interfaceId) external view returns(bool) {
    return interfaceId == thisInterfaceId;
  }
}
