// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract DemocraticToken {
  uint public totalSupply;
  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) public allowance;
  string public name = "Democratic Token";
  string public symbol = "DEMO";
  uint8 public decimals = 18;
  IVerification public verifications;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);

  constructor(address _verifications) {
    require(_verifications != address(0),
      "Verifications contract must not be zero address");
    verifications = IVerification(_verifications);
  }

  modifier onlyVerified() {
    require(verifications.addressActive(msg.sender), "Must be verified");
    _;
  }

  function propose() external onlyVerified {
    uint amount = 1;
    address account = msg.sender;
    balanceOf[account] += amount;
    totalSupply += amount;
    emit Transfer(address(0), account, amount);
  }

  function transfer(address recipient, uint amount) external returns (bool) {
    balanceOf[msg.sender] -= amount;
    balanceOf[recipient] += amount;
    emit Transfer(msg.sender, recipient, amount);
    return true;
  }

  function approve(address spender, uint amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint amount) external returns (bool) {
    allowance[sender][msg.sender] -= amount;
    balanceOf[sender] -= amount;
    balanceOf[recipient] += amount;
    emit Transfer(sender, recipient, amount);
    return true;
  }

  function mint(address account, uint amount) external {
    balanceOf[account] += amount;
    totalSupply += amount;
    emit Transfer(address(0), account, amount);
  }
}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
}
