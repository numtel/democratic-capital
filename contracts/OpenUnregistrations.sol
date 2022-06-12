// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ChildBase.sol";

contract OpenUnregistrations is ChildBase {
  constructor(address _meta, address _group, string memory _name)
    ChildBase(_meta, _group, _name) {}

  function unregister() external {
    group.unregister(msg.sender);
  }
}

