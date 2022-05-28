// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VerifiedGroup.sol";

contract GroupList {
  address[] public groups;

  event NewGroup(address group);

  function createGroup(address verifications, uint8[12] memory params) external {
    VerifiedGroup newGroup = new VerifiedGroup(verifications, msg.sender, params);
    groups.push(address(newGroup));
    emit NewGroup(address(newGroup));
  }
}
