// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IVerifiedGroup.sol";

contract ChildBase {
  IVerifiedGroup public group;
  bytes4 public thisInterfaceId;
  string public name;

  event NameChanged(string oldName, string newName);

  constructor(
    address _group,
    bytes4 interfaceId,
    string memory _name
  ) {
    group = IVerifiedGroup(_group);
    thisInterfaceId = interfaceId;
    name = _name;
  }
  // EIP-165
  function supportsInterface(bytes4 interfaceId) external view returns(bool) {
    return interfaceId == thisInterfaceId;
  }

  function setName(string memory _name) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit NameChanged(name, _name);
    name = _name;
  }
}
