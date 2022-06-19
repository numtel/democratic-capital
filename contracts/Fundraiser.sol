// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ChildBase.sol";
import "./safeTransfer.sol";
import "./IERC20.sol";

/*{
  "name": "Fundraiser",
  "overview": {
    "token": { "display": ["token"] },
    "goalAmount": {},
    "endTime": {"display":["timestamp"] },
    "finished": {},
    "My Deposits": {
      "function": "deposited",
      "args": ["account"]
    },
    "collected": {},
    "Withdrawn": {
      "function": "withdrawn",
      "args": ["account"]
    }
  },
  "methods": {
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "collectSuccess": {
      "onlyAllowed": true
    },
    "deposit": {
      "fields": [{}],
      "approve": ["token"]
    },
    "withdraw": {}
  }
}*/
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

  constructor(address _meta, address _group, address _token, uint _amount, uint _duration, string memory _name)
      ChildBase(_meta, _group, _name) {
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
    uint balance = IERC20(token).balanceOf(address(this));
    emit Success(balance, recipient);
    safeTransfer.invoke(token, recipient, balance);
  }

  function deposit(uint amount) external {
    require(!finished(), 'Campaign Finished');
    deposited[msg.sender] += amount;
    totalDeposited += amount;
    safeTransfer.invokeFrom(token, msg.sender, address(this), amount);
  }

  function withdraw() external {
    require(finished(), 'Not Yet Finished');
    require(totalDeposited < goalAmount, 'Goal Met');
    require(deposited[msg.sender] > 0, 'Nothing Deposited');
    require(withdrawn[msg.sender] == false, 'Already Withdrawn');
    withdrawn[msg.sender] = true;
    safeTransfer.invoke(token, msg.sender, deposited[msg.sender]);
  }
}



