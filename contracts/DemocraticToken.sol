// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract DemocraticToken {
  uint public totalSupply;
  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) public allowance;
  string public name = "Democratic Token";
  string public symbol = "DEMO";
  uint8 public decimals = 18;
  IVerification public verifications;

  uint public SECONDS_PER_DAY = 60 * 60 * 24;
  struct RegisteredAccount {
    uint lastFeeCollected;
  }

  mapping(address => RegisteredAccount) public registered;

  struct EmissionEpoch {
    uint epochBegins;
    uint amount;
  }

  EmissionEpoch[] public emissions;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);

  constructor(address _verifications, uint dailyEmission) {
    require(_verifications != address(0),
      "Verifications contract must not be zero address");
    verifications = IVerification(_verifications);

    emissions.push(EmissionEpoch(_daystamp(block.timestamp), dailyEmission));
  }

  function registerAccount() external onlyVerified {
    registered[msg.sender].lastFeeCollected = _daystamp(block.timestamp) - 1;
  }

  function unregisterAccount() external onlyRegistered {
    delete registered[msg.sender];
  }

  // TODO only allow collecting emissions from most recent 2 weeks?
  // Otherwise, somebody could register, let emissions collect for months/years
  //  and then sell their fat stack? Is this a problem?
  // Or maybe have an argument that sets the max limit so that if somebody does
  //  wait a long time, they can still perform the transaction without hitting
  //  the gas limit?
  function collectEmissions() external onlyVerified onlyRegistered {
    uint currentDay = _daystamp(block.timestamp);
    uint collectFromDay = registered[msg.sender].lastFeeCollected;

    uint toCollect = 0;
    uint i = currentDay;
    uint epochIndex = emissions.length - 1;
    uint epochBegins = emissions[epochIndex].epochBegins;
    while(i > collectFromDay) {
      while(epochBegins > i) {
        if(epochIndex == 0) {
          // First epoch reached
          epochBegins = 0;
          break;
        }
        epochIndex--;
        epochBegins = emissions[epochIndex].epochBegins;
      }
      if(epochBegins == 0) {
        // Went all the way past the start
        break;
      }
      toCollect += emissions[epochIndex].amount;
      i--;
    }

    _mint(msg.sender, toCollect);
    registered[msg.sender].lastFeeCollected = currentDay;
    // TODO emit FeeCollected event
  }

  // TODO permission control on this
  // TODO put timestamp in proposal not at transaction time
  // TODO method to remove epochs set too far in future?
  function newEmissionEpoch(uint beginDay, uint dailyEmission) external {
    require(emissions[emissions.length - 1].epochBegins < beginDay,
      "Epoch must start after current last epoch");
    emissions.push(EmissionEpoch(beginDay, dailyEmission));
  }

  function propose() external onlyVerified {
    emit Transfer(address(0), msg.sender, 0);
  }

  function transfer(address recipient, uint amount) external returns (bool) {
    balanceOf[msg.sender] -= amount;
    balanceOf[recipient] += amount;
    emit Transfer(msg.sender, recipient, amount);
    return true;
  }

  function approve(address spender, uint amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function transferFrom(address sender, address recipient, uint amount) external returns (bool) {
    allowance[sender][msg.sender] -= amount;
    balanceOf[sender] -= amount;
    balanceOf[recipient] += amount;
    emit Transfer(sender, recipient, amount);
    return true;
  }

  function _daystamp(uint timestamp) internal pure returns(uint) {
    return timestamp / 86400;
  }

  function _mint(address account, uint amount) internal {
    balanceOf[account] += amount;
    totalSupply += amount;
    emit Transfer(address(0), account, amount);
  }

  modifier onlyVerified() {
    require(verifications.addressActive(msg.sender), "Must be verified");
    _;
  }

  modifier onlyRegistered() {
    require(registered[msg.sender].lastFeeCollected > 0, "Must be registered");
    _;
  }
}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
}
