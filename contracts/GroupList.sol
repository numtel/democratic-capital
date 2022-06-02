// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VerifiedGroup.sol";

contract GroupList {
  address[] public groups;

  event NewGroup(address group);

  function createGroup(address verifications) external {
    VerifiedGroup newGroup = new VerifiedGroup(verifications, msg.sender);
    groups.push(address(newGroup));
    emit NewGroup(address(newGroup));
  }

  function count() external view returns(uint) {
    return groups.length;
  }
}
