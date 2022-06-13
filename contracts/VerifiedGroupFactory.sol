// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./VerifiedGroup.sol";
import "./ChildFactory.sol";

/*{
  "type": "factory",
  "name": "Groups",
  "singular": "Group"
}*/
contract VerifiedGroupFactory is ChildFactory {
  struct GroupChild {
    address meta;
    address item;
  }
  mapping(address => GroupChild[]) public groupChildren;
  event NewChild(address indexed group, address indexed meta, address indexed deployed);

  constructor(address factoryMeta, address _childMeta)
    ChildFactory(factoryMeta, _childMeta, IVerifiedGroupFactory(address(0))) {}

  function deployNew(
    address verifications,
    string memory name
  ) external {
    VerifiedGroup newContract = new VerifiedGroup(childMeta, verifications, msg.sender, name);
    groupChildren[address(newContract)].push(GroupChild(address(0), address(newContract)));
    emit NewChild(address(newContract), address(0), address(newContract));
  }

  function registerChild(address group, address childMeta, address item) public {
    VerifiedGroup groupInstance = VerifiedGroup(group);
    require(groupInstance.isVerified(tx.origin), 'Not Verified');
    require(groupInstance.isRegistered(tx.origin), 'Not Registered');
    groupChildren[group].push(GroupChild(childMeta, item));
    emit NewChild(group, childMeta, item);
  }

  function childCount(address group) external view returns(uint) {
    return groupChildren[group].length;
  }
}
