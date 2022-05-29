// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IOpenRegistrations.sol";
import "./IVerifiedGroup.sol";

contract OpenRegistrations {
  IVerifiedGroup public group;

  constructor(address _group) {
    group = IVerifiedGroup(_group);
  }

  // EIP-165
  function supportsInterface(bytes4 interfaceId) external pure returns(bool) {
    return interfaceId == thisInterfaceId();
  }
  function thisInterfaceId() public pure returns(bytes4) {
    return type(IOpenRegistrations).interfaceId;
  }

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    group.register(msg.sender);
  }
}
