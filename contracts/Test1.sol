// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/*{
  "name": "First Test Custom Metadata"
}*/
contract Test1 {
  uint stater;
  address public meta;

  constructor(address _meta) {
    meta = _meta;
  }
  function test() external pure returns(uint) {
    return 123;
  }
  function test2(uint foo) external {
    stater = foo;
  }
}
