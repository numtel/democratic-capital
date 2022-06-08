// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IMemberTokenEmissions {
  function tokenAddress() external view returns(address);
  function emissionPeriodSeconds() external view returns(uint);
  function emissionAmount() external view returns(uint);
  function availableEmissions(address account) external view returns(uint);
  function collectEmissions() external;
  function setToken(address _token) external;
  function setEmissionPeriodSeconds(uint _emissionPeriodSeconds) external;
  function setEmissionAmount(uint _emissionAmount) external;
}
