// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VerifiedGroup.sol";

contract VerifiedGroupFactory {
  address[] public groups;

  event NewGroup(address group);

  function createGroup(address verifications, string memory name) external {
    VerifiedGroup newGroup = new VerifiedGroup(verifications, msg.sender, name);
    groups.push(address(newGroup));
    emit NewGroup(address(newGroup));
  }

  function count() external view returns(uint) {
    return groups.length;
  }
}
