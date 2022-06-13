// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract ChildFactory {
  address public meta;
  address public childMeta;
  IVerifiedGroupFactory public parentFactory;

  constructor(address factoryMeta, address _childMeta, IVerifiedGroupFactory _parentFactory) {
    meta = factoryMeta;
    childMeta = _childMeta;
    parentFactory = _parentFactory;
  }
}

interface IVerifiedGroupFactory {
  function registerChild(address group, address childMeta, address item) external;
}
