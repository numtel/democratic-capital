// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IOpenUnregistrations.sol";
import "./IVerifiedGroup.sol";

contract OpenUnregistrations {
  IVerifiedGroup public group;

  constructor(address _group) {
    group = IVerifiedGroup(_group);
  }

  // EIP-165
  function supportsInterface(bytes4 interfaceId) external pure returns(bool) {
    return interfaceId == thisInterfaceId();
  }
  function thisInterfaceId() public pure returns(bytes4) {
    return type(IOpenUnregistrations).interfaceId;
  }

  function unregister() external {
    group.unregister(msg.sender);
  }
}

