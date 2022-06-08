// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IFundraiser.sol";
import "./ChildBase.sol";

contract Fundraiser is ChildBase {
  address public token;
  bool public collected;
  uint public goalAmount;
  uint public endTime;

  uint public totalDeposited;
  mapping(address => uint) public deposited;
  // Preserve deposit amounts for posterity
  mapping(address => bool) public withdrawn;

  event Success(uint amount, address indexed recipient);

  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));
  bytes4 private constant SELECTOR_TRANSFER = bytes4(keccak256(bytes('transfer(address,uint256)')));

  constructor(address _group, address _token, uint _amount, uint _duration, string memory _name)
      ChildBase(_group, type(IFundraiser).interfaceId, _name) {
    require(_amount > 0, 'Invalid Amount');
    require(_duration > 0, 'Invalid Duration');
    token = _token;
    goalAmount = _amount;
    endTime = block.timestamp + _duration;
  }

  function finished() public view returns(bool) {
    return endTime < block.timestamp;
  }

  function collectSuccess(address recipient) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    require(finished(), 'Not Yet Finished');
    require(totalDeposited >= goalAmount, 'Goal Not Met');
    collected = true;
    emit Success(totalDeposited, recipient);
    // Safe transferFrom
    // https://github.com/Uniswap/v2-core/blob/8b82b04a0b9e696c0e83f8b2f00e5d7be6888c79/contracts/UniswapV2Pair.sol#L44
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFER, recipient, totalDeposited));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FAILED');
  }

  function deposit(uint amount) external {
    require(!finished(), 'Campaign Finished');
    deposited[msg.sender] += amount;
    totalDeposited += amount;
    // Safe transferFrom
    // https://github.com/Uniswap/v2-core/blob/8b82b04a0b9e696c0e83f8b2f00e5d7be6888c79/contracts/UniswapV2Pair.sol#L44
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR, msg.sender, address(this), amount));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'DEPOSIT_FAILED');
  }

  function withdraw() external {
    require(finished(), 'Not Yet Finished');
    require(totalDeposited < goalAmount, 'Goal Met');
    require(deposited[msg.sender] > 0, 'Nothing Deposited');
    require(withdrawn[msg.sender] == false, 'Already Withdrawn');
    withdrawn[msg.sender] = true;
    // Safe transferFrom
    // https://github.com/Uniswap/v2-core/blob/8b82b04a0b9e696c0e83f8b2f00e5d7be6888c79/contracts/UniswapV2Pair.sol#L44
    (bool success, bytes memory data) = token.call(abi.encodeWithSelector(SELECTOR_TRANSFER, msg.sender, deposited[msg.sender]));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'WITHDRAW_FAILED');
  }
}



