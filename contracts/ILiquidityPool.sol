// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface ILiquidityPool {
  function tokenA() external view returns(address);
  function tokenB() external view returns(address);
  function reserveA() external view returns(uint);
  function reserveB() external view returns(uint);
  function deposit(uint amountA, uint amountB) external returns(uint amount);
  function withdraw(uint amount) external returns(uint amountA, uint amountB);
  function swapAForB(uint amountA, uint minB) external returns(uint amountB);
  function swapBForA(uint amountB, uint minB) external returns(uint amountA);
}
