// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IFundraiser {
  function token() external view returns(address);
  function goalAmount() external view returns(uint);
  function endTime() external view returns(uint);
  function collected() external view returns(bool);
  function deposited(address) external view returns(uint);
  function withdrawn(address) external view returns(bool);
  function totalDeposited() external view returns(uint);
  function finished() external view returns(bool);
  function collectSuccess(address recipient) external;
  function deposit(uint amount) external;
  function withdraw() external;
}

