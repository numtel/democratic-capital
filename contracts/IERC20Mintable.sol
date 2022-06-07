// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IERC20Mintable {
  function totalSupply() external view returns (uint);
  function balanceOf(address account) external view returns (uint);
  function allowance(address owner, address spender) external view returns (uint);
  function transfer(address recipient, uint amount) external returns (bool);
  function approve(address spender, uint amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint amount) external returns (bool);
  function setSymbol(string memory _symbol) external;
  function setName(string memory _name) external;
  function mint(address account, uint amount) external;
}

