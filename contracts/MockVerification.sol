// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract MockVerification {
  mapping(address => uint) public expirations;

  function setStatus(address account, uint expiration) external {
    expirations[account] = expiration;
  }

  function addressActive(address toCheck) external view returns (bool) {
    return expirations[toCheck] > block.timestamp;
  }

  function addressExpiration(address toCheck) external view returns (uint) {
    return expirations[toCheck];
  }
}
