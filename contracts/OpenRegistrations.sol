// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ChildBase.sol";

contract OpenRegistrations is ChildBase {
  constructor(address _meta, address _group, string memory _name)
    ChildBase(_meta, _group, _name) {}

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    group.register(msg.sender);
  }
}
