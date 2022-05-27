// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./Ownable.sol";

contract TestChild is Ownable {
  IVerifiedGroup committee;

  constructor(address parent) {
    _transferOwnership(parent);
    committee = IVerifiedGroup(parent);
  }

  function unregister(address account) public onlyOwner {
    committee.unregister(account);
  }

  function invokeUnregister(address account) public onlyOwner {
    committee.invoke(address(this), abi.encodeCall(this.unregister, (account)));
  }

}

interface IVerifiedGroup {
  function invoke(address to, bytes memory data) external;
  function unregister(address account) external;
}
