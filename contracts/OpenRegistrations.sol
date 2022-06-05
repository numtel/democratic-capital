// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IOpenRegistrations.sol";
import "./ChildBase.sol";

contract OpenRegistrations is ChildBase {
  constructor(address _group)
    ChildBase(_group, type(IOpenRegistrations).interfaceId) {}

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    group.register(msg.sender);
  }
}
