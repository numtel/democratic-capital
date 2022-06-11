// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroup.sol";

contract ChildFactory {
  mapping(address => address[]) public deployedByGroup;

  event NewDeployment(address group, address deployed);

  function requireMember(address group) internal view {
    IVerifiedGroup groupInstance = IVerifiedGroup(group);
    require(groupInstance.isVerified(msg.sender), 'Not Verified');
    require(groupInstance.isRegistered(msg.sender), 'Not Registered');
  }

  function groupCount(address group) external view returns(uint) {
    return deployedByGroup[group].length;
  }

}
