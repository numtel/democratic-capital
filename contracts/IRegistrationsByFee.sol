// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IRegistrationsByFee {
  function feeToken() external view returns(address);
  function amount() external view returns(uint);
  function register() external;
  function setToken(address _token) external;
  function setAmount(uint _amount) external;
}

