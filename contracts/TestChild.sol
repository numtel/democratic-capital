// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Ownable.sol";
import "./IVerifiedGroup.sol";

contract TestChild is Ownable {
  IVerifiedGroup group;
  uint public registeredCounter;
  uint public unregisteredCounter;

  event Registered(address account);
  event Unregistered(address account);

  constructor(address parent) {
    _transferOwnership(parent);
    group = IVerifiedGroup(parent);
  }

  function onAllow() external onlyOwner {
    group.hookRegister(this.incrementRegistered.selector);
    group.hookUnregister(this.incrementUnregistered.selector);
  }

  function incrementRegistered(address account) external onlyOwner {
    emit Registered(account);
    registeredCounter++;
  }

  function incrementUnregistered(address account) external onlyOwner {
    emit Unregistered(account);
    unregisteredCounter++;
  }

  function unregister(address account) public onlyOwner {
    group.unregister(account);
  }

}
