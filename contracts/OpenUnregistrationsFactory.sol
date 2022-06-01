// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./OpenUnregistrations.sol";
import "./IVerifiedGroup.sol";

contract OpenUnregistrationsFactory {
  mapping(address => address[]) public deployedByGroup;

  event NewDeployment(address group, address deployed);

  function deployNew(address group) external {
    IVerifiedGroup groupInstance = IVerifiedGroup(group);
    require(groupInstance.isRegistered(msg.sender)
        && groupInstance.isVerified(msg.sender),
      'Must be registered and verified');
    OpenUnregistrations newContract = new OpenUnregistrations(group);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


