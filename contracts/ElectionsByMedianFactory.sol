// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionsByMedian.sol";
import "./IVerifiedGroup.sol";

contract ElectionsByMedianFactory {
  mapping(address => address[]) public deployedByGroup;

  event NewDeployment(address group, address deployed);

  function deployNew(address group, bytes[] memory allowedInvokePrefixes) external {
    IVerifiedGroup groupInstance = IVerifiedGroup(group);
    require(groupInstance.isRegistered(msg.sender)
        && groupInstance.isVerified(msg.sender),
      'Must be registered and verified');
    ElectionsByMedian newContract = new ElectionsByMedian(group, allowedInvokePrefixes);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}
