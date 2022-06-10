// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IERC20LiquidityPool {
  function setSymbol(string memory _symbol) external;
  function mint(address account, uint amount) external;
  function tokens(uint index) external view returns(address);
  function reserves(uint index) external view returns(uint);
  function getReserves() external view returns(uint reserve0, uint reserve1);
  function deposit(uint amount0, uint amount1) external returns(uint liquidity);
  function withdraw(uint liquidity) external returns(uint amount0, uint amount1);
  function swap(uint8 fromToken, uint amountIn, uint minReceived) external returns(uint amountOut);
}
