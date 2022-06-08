// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IRegistrationsByElection {
  function elections() external view returns(address);
  function register() external;
  function setElections(address _elections) external;
}

