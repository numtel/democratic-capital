// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ILiquidityPool.sol";
import "./ChildBase.sol";
import "./ERC20.sol";

contract LiquidityPool is ERC20, ChildBase {
  address public tokenA;
  address public tokenB;

  uint public constant MINIMUM_DEPOSIT = 10**3;

  uint public reserveA;
  uint public reserveB;

  uint private unlocked = 1;
  modifier lock() {
    require(unlocked == 1, 'UniswapV2: LOCKED');
    unlocked = 0;
    _;
    unlocked = 1;
  }

  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
  bytes4 private constant SELECTOR_TRANSFER = bytes4(keccak256(bytes('transfer(address,uint256)')));

  function _safeTransfer(address token, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFER, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FAILED');
  }
  function _safeTransferFrom(address token, address from, address to, uint value) private {
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, from, to, value));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'UniswapV2: TRANSFER_FROM_FAILED');
  }

  constructor(address _group, address _tokenA, address _tokenB, string memory _name)
      ChildBase(_group, type(ILiquidityPool).interfaceId, _name) {
    tokenA = _tokenA;
    tokenB = _tokenB;
  }

  function mint(uint amountA, uint amountB) external lock returns(uint liquidity) {
    require(amountA > MINIMUM_DEPOSIT && amountB > MINIMUM_DEPOSIT, 'Deposit Too Small');
    uint amountAToTake;
    uint amountBToTake;
    if(reserveA == 0 || reserveB == 0) {
      // First deposit, allow any ratio
      amountAToTake = amountA;
      amountBToTake = amountB;
    } else {
      // Use input amounts as maximum in current reserve ratio
      if(reserveA < reserveB) {
        // Take all of amountB, use part of amountA
        amountAToTake = (amountB * reserveA) / reserveB;
        amountBToTake = amountB;
        if(amountAToTake > amountA) {
          amountAToTake = amountA;
          amountBToTake = (amountA * reserveB) / reserveA;
        }
      } else {
        // Take all of amountA, use part of amountB
        amountAToTake = amountA;
        amountBToTake = (amountA * reserveB) / reserveA;
        if(amountBToTake > amountB) {
          amountAToTake = (amountB * reserveA) / reserveB;
          amountBToTake = amountB;
        }
      }
    }
    reserveA += amountAToTake;
    reserveB += amountBToTake;
    liquidity = sqrt(amountAToTake * amountBToTake);
    _mint(msg.sender, liquidity);
    _safeTransferFrom(tokenA, msg.sender, address(this), amountAToTake);
    _safeTransferFrom(tokenB, msg.sender, address(this), amountBToTake);
  }

  function burn(uint liquidity) external lock returns(uint amountA, uint amountB) {
    require(balanceOf[msg.sender] >= liquidity, 'Insufficient Balance');
    amountA = (liquidity * reserveA) / totalSupply;
    amountB = (liquidity * reserveB) / totalSupply;
    reserveA -= amountA;
    reserveB -= amountB;

    balanceOf[msg.sender] -= liquidity;
    totalSupply -= liquidity;
    emit Transfer(msg.sender, address(0), liquidity);

    _safeTransfer(tokenA, msg.sender, amountA);
    _safeTransfer(tokenB, msg.sender, amountB);
  }

  function swapAForB(uint amountA, uint minB) external lock returns(uint amountB) {
    amountB = (amountA * reserveB) / reserveA;
    require(amountB >= minB, "Rate Too Low");

    reserveA += amountA;
    reserveB -= amountB;

    _safeTransferFrom(tokenA, msg.sender, address(this), amountA);
    _safeTransfer(tokenB, msg.sender, amountB);
  }

  function swapBForA(uint amountB, uint minA) external lock returns(uint amountA) {
    amountA = (amountB * reserveA) / reserveB;
    require(amountA >= minA, "Rate Too Low");

    reserveA -= amountA;
    reserveB += amountB;

    _safeTransferFrom(tokenB, msg.sender, address(this), amountB);
    _safeTransfer(tokenA, msg.sender, amountA);
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
