// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20LiquidityPool.sol";
import "./ChildFactory.sol";
import "./safeTransfer.sol";

contract ERC20LiquidityPoolFactory is ChildFactory {
  mapping(address => mapping(address => mapping(address => address))) public getPairByGroup;

  uint private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, 'LOCKED');
    unlocked = 0;
    _;
    unlocked = 1;
  }

  function deployNew(
    address group,
    address token0,
    address token1,
    string memory name,
    string memory symbol,
    uint8 decimals
  ) external {
    requireMember(group);
    require(token0 != token1, 'IDENTICAL_ADDRESSES');
    (token0, token1) = token0 < token1 ? (token0, token1) : (token1, token0);
    require(token0 != address(0), 'ZERO_ADDRESS');
    // Tokens addresses are in numerical order so only need to check one way
    require(getPairByGroup[group][token0][token1] == address(0), 'PAIR_EXISTS');

    ERC20LiquidityPool newContract = new ERC20LiquidityPool(
      group, token0, token1, name, symbol, decimals);

    getPairByGroup[group][token0][token1] = address(newContract);
    // Also provide reverse in order to aid frontends
    getPairByGroup[group][token1][token0] = address(newContract);

    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }

  function swapRouter(address group, address[] memory tokens, uint amountIn, uint minReceived) external lock returns(uint amountOut) {
    uint curAmount = amountIn;
    for(uint i = 0; i<tokens.length - 1; i++) {
      address poolAddress = getPairByGroup[group][tokens[i]][tokens[i+1]];
      require(poolAddress != address(0), 'NO_POOL_EXISTS');
      if(i == 0) {
        safeTransfer.invokeFrom(tokens[0], msg.sender, poolAddress, amountIn);
      }
      ERC20LiquidityPool pool = ERC20LiquidityPool(poolAddress);
      uint8 fromToken = pool.tokens(0) == tokens[i] ? 0 : 1;
      if(i == tokens.length - 2) {
        // Last hop in the chain, output to sender
        curAmount = pool.swapRoute(fromToken, msg.sender);
      } else {
        // Output to next pool
        address nextPoolAddress = getPairByGroup[group][tokens[i+1]][tokens[i+2]];
        curAmount = pool.swapRoute(fromToken, nextPoolAddress);
      }
    }
    require(curAmount >= minReceived, "Rate Too Low");
    return curAmount;
  }
}


