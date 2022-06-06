// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IOpenUnregistrations.sol";
import "./ChildBase.sol";

contract OpenUnregistrations is ChildBase {
  constructor(address _group, string memory _name)
    ChildBase(_group, type(IOpenUnregistrations).interfaceId, _name) {}

  function unregister() external {
    group.unregister(msg.sender);
  }
}

