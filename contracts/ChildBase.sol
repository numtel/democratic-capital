// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroup.sol";

contract ChildBase {
  address public meta;
  IVerifiedGroup public group;
  string public name;

  event NameChanged(string oldName, string newName);

  constructor(
    address _meta,
    address _group,
    string memory _name
  ) {
    meta = _meta;
    group = IVerifiedGroup(_group);
    name = _name;
  }

  function setName(string memory _name) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit NameChanged(name, _name);
    name = _name;
  }
}
