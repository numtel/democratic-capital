// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IOpenRegistrations.sol";
import "./ChildBase.sol";

contract OpenRegistrations is ChildBase {
  constructor(address _group, string memory _name)
    ChildBase(_group, type(IOpenRegistrations).interfaceId, _name) {}

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    group.register(msg.sender);
  }
}
