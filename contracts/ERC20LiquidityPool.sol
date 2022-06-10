// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IERC20LiquidityPool.sol";
import "./safeTransferLibrary.sol";
import "./ERC20Mintable.sol";

contract ERC20LiquidityPool is ERC20Mintable {
  address[2] public tokens;
  uint[2] public reserves;

  uint public constant MINIMUM_DEPOSIT = 10**3;

  uint private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, 'UniswapV2: LOCKED');
    unlocked = 0;
    _;
    unlocked = 1;
  }

  constructor(
    address _group,
    address _token0,
    address _token1,
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) ERC20Mintable(_group, _name, _symbol, _decimals) {
    tokens[0] = _token0;
    tokens[1] = _token1;
    thisInterfaceId = type(IERC20LiquidityPool).interfaceId;
  }

  // function mint() fom parent ERC20Mintable allows the group
  //  the ability to dilute liquidity

  function deposit(uint amount0, uint amount1) external lock returns(uint liquidity) {
    require(amount0 > MINIMUM_DEPOSIT && amount1 > MINIMUM_DEPOSIT, 'Deposit Too Small');
    uint amount0ToTake;
    uint amount1ToTake;
    if(reserves[0] == 0 || reserves[1] == 0) {
      // First deposit, allow any ratio
      amount0ToTake = amount0;
      amount1ToTake = amount1;
    } else {
      // Use input amounts as maximum in current reserve ratio
      if(reserves[0] < reserves[1]) {
        // Take all of amount1, use part of amount0
        amount0ToTake = (amount1 * reserves[0]) / reserves[1];
        amount1ToTake = amount1;
        if(amount0ToTake > amount0) {
          amount0ToTake = amount0;
          amount1ToTake = (amount0 * reserves[1]) / reserves[0];
        }
      } else {
        // Take all of amount0, use part of amount1
        amount0ToTake = amount0;
        amount1ToTake = (amount0 * reserves[1]) / reserves[0];
        if(amount1ToTake > amount1) {
          amount0ToTake = (amount1 * reserves[0]) / reserves[1];
          amount1ToTake = amount1;
        }
      }
    }
    reserves[0] += amount0ToTake;
    reserves[1] += amount1ToTake;
    liquidity = sqrt(amount0ToTake * amount1ToTake);
    _mint(msg.sender, liquidity);
    safeTransfer.invokeFrom(tokens[0], msg.sender, address(this), amount0ToTake);
    safeTransfer.invokeFrom(tokens[1], msg.sender, address(this), amount1ToTake);
  }

  function withdraw(uint liquidity) external lock returns(uint amount0, uint amount1) {
    require(balanceOf[msg.sender] >= liquidity, 'Insufficient Balance');
    amount0 = (liquidity * reserves[0]) / totalSupply;
    amount1 = (liquidity * reserves[1]) / totalSupply;
    reserves[0] -= amount0;
    reserves[1] -= amount1;

    balanceOf[msg.sender] -= liquidity;
    totalSupply -= liquidity;
    emit Transfer(msg.sender, address(0), liquidity);

    safeTransfer.invoke(tokens[0], msg.sender, amount0);
    safeTransfer.invoke(tokens[1], msg.sender, amount1);
  }

  function swap(uint8 fromToken, uint amountIn, uint minReceived) external lock returns(uint amountOut) {
    require(fromToken == 0 || fromToken == 1, "Invalid fromToken");
    require(amountIn > 0, "Invalid Amount");
    uint8 toToken = fromToken == 0 ? 1 : 0;

    reserves[fromToken] += amountIn;
    amountOut = (amountIn * reserves[toToken]) / reserves[fromToken];
    require(amountOut >= minReceived, "Rate Too Low");
    reserves[toToken] -= amountOut;

    safeTransfer.invokeFrom(tokens[fromToken], msg.sender, address(this), amountIn);
    safeTransfer.invoke(tokens[toToken], msg.sender, amountOut);
  }


  // From: https://github.com/Uniswap/v2-core/blob/v1.0.1/contracts/libraries/Math.sol
  // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
  function sqrt(uint y) internal pure returns (uint z) {
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }

}
