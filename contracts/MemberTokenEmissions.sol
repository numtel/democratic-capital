// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IERC20Mintable.sol";
import "./ChildBase.sol";

/*{
  "name": "Member Token Emissions for ERC20Mintable",
  "overview": {
    "tokenAddress": { "display": ["token"] },
    "emissionPeriodSeconds": {"display":["seconds"] },
    "emissionAmount": {"decimals": "tokenAddress"},
    "beginEmissions": {"display": ["timestamp"]},
    "lastCollected": {
      "display": ["timestamp"],
      "args": ["account"]
    },
    "availableEmissions": {
      "args": ["account"],
      "decimals": "tokenAddress"
    }
  },
  "methods": {
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "setToken": {
      "onlyAllowed": true,
      "fields": [
        {"select":["Children"], "preview":"token"}
      ]
    },
    "setEmissionPeriodSeconds": {
      "onlyAllowed": true
    },
    "setEmissionAmount": {
      "onlyAllowed": true,
      "fields": [
        {"decimals": "tokenAddress"}
      ]
    },
    "collectEmissions": {
      "onlyMember": true
    }
  }
}*/
contract MemberTokenEmissions is ChildBase {
  address public tokenAddress;
  uint public emissionPeriodSeconds;
  uint public emissionAmount;

  mapping(address => uint) public lastCollected;
  uint public beginEmissions;

  event TokenChanged(address indexed oldToken, address indexed newToken);
  event PeriodChanged(uint oldPeriodSeconds, uint newPeriodSeconds);
  event AmountChanged(uint oldAmount, uint newAmount);
  event Collected(address indexed account, uint amount);

  constructor(
    address _meta,
    address _group,
    address _tokenAddress,
    uint _emissionPeriodSeconds,
    uint _emissionAmount,
    string memory _name
  ) ChildBase(_meta, _group, _name) {
    tokenAddress = _tokenAddress;
    emissionPeriodSeconds = _emissionPeriodSeconds;
    emissionAmount = _emissionAmount;
  }

  // Lifecycle methods
  function onAllow() external {
    require(msg.sender == address(group));
    beginEmissions = block.timestamp;
  }


  function availableEmissions(address account) public view returns(uint) {
    require(group.isVerified(account), 'Not Verified');
    require(group.isRegistered(account), 'Not Registered');
    if(beginEmissions == 0) {
      return 0;
    }
    uint collectFrom = lastCollected[account];
    if(collectFrom == 0) {
      collectFrom = group.joinedTimestamps(account);
    }
    if(collectFrom < beginEmissions) {
      collectFrom = beginEmissions;
    }
    return ((block.timestamp - collectFrom) / emissionPeriodSeconds) * emissionAmount;
  }

  function collectEmissions() external {
    uint available = availableEmissions(msg.sender);
    emit Collected(msg.sender, available);
    if(available > 0) {
      lastCollected[msg.sender] = block.timestamp;
      IERC20Mintable token = IERC20Mintable(tokenAddress);
      token.mint(msg.sender, available);
    }
  }

  function setToken(address _token) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit TokenChanged(tokenAddress, _token);
    tokenAddress = _token;
  }

  function setEmissionPeriodSeconds(uint _emissionPeriodSeconds) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit PeriodChanged(emissionPeriodSeconds, _emissionPeriodSeconds);
    emissionPeriodSeconds = _emissionPeriodSeconds;
  }

  function setEmissionAmount(uint _emissionAmount) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit AmountChanged(emissionAmount, _emissionAmount);
    emissionAmount = _emissionAmount;
  }
}

