// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroup.sol";

contract ChildBase {
  address public meta;
  IVerifiedGroup public group;
  string public name;
  string public text;

  event NameChanged(string oldName, string newName);
  event TextChanged(string oldText, string newText);

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
    requireAllowed();
    emit NameChanged(name, _name);
    name = _name;
  }

  function setText(string memory _text) external {
    requireAllowed();
    emit TextChanged(text, _text);
    text = _text;
  }

  function requireAllowed() internal view {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
  }
}
