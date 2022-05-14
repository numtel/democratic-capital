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

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;
  struct RegisteredAccount {
    uint lastFeeCollected;
  }

  mapping(address => RegisteredAccount) public registered;

  event Test(uint out);

  struct Epoch {
    // Day number when epoch begins
    uint beginDay;
    // How many tokens per day per registered user
    uint dailyEmission;
    // How many days before uncollected emissions expire
    uint16 expiryDayCount;
    uint16 minimumElectionDays;
    uint16 epochElectionThreshold;

  }

  struct EpochProposal {
    Epoch newEpoch;
    uint electionEndDay;

  }

  Epoch[] public epochs;
  uint public epochCount = 1;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);

  constructor(
    address _verifications,
    Epoch memory initialEpoch
  ) {
    require(_verifications != address(0),
      "Verifications contract must not be zero address");
    verifications = IVerification(_verifications);

    // Initial epoch always starts from current day
    initialEpoch.beginDay = _daystamp(block.timestamp);
    epochs.push(initialEpoch);
  }

  function registerAccount() external onlyVerified {
    registered[msg.sender].lastFeeCollected = _daystamp(block.timestamp) - 1;
  }

  function unregisterAccount() external onlyRegistered {
    delete registered[msg.sender];
  }

  function availableEmissions(address toCheck) external view returns(uint) {
    return _availableEmissions(toCheck, _daystamp(block.timestamp));
  }

  function availableEmissions(address toCheck, uint onDay) external view returns(uint) {
    return _availableEmissions(toCheck, onDay);
  }

  function _availableEmissions(address toCheck, uint onDay) internal view returns(uint) {
    uint collectBeginDay = registered[toCheck].lastFeeCollected;

    uint toCollect = 0;
    uint i = onDay;
    uint epochIndex = epochs.length - 1;
    uint epochBegins = epochs[epochIndex].beginDay;
    // The latest expiryDayCount always remains through all past epochs
    uint16 expiryDayCount = epochs[epochIndex].expiryDayCount;
    while(i > collectBeginDay
        && (expiryDayCount > 0 ? i + expiryDayCount > onDay : true)) {
      while(epochBegins > i) {
        if(epochIndex == 0) {
          // First epoch reached
          epochBegins = 0;
          break;
        }
        epochIndex--;
        epochBegins = epochs[epochIndex].beginDay;
      }
      if(epochBegins == 0) {
        // Went all the way past the start
        break;
      }
      toCollect += epochs[epochIndex].dailyEmission;
      i--;
    }
    return toCollect;
  }

  function collectEmissions() external onlyVerified onlyRegistered {
    uint currentDay = _daystamp(block.timestamp);
    uint toCollect = _availableEmissions(msg.sender, currentDay);
    _mint(msg.sender, toCollect);
    registered[msg.sender].lastFeeCollected = currentDay;
    // TODO emit FeeCollected event
  }

  // TODO permission control on this
  function newEpoch(Epoch calldata epochToInsert) public {
    uint currentDay = _daystamp(block.timestamp);
    uint thisEpoch = epochs.length - 1;
    require(epochToInsert.beginDay > currentDay, "Epoch must start in future");
    if(epochs[thisEpoch].beginDay >= epochToInsert.beginDay) {
      // This new epoch is not at the end
      for(; thisEpoch >= 0; thisEpoch--) {
        if(epochs[thisEpoch].beginDay == epochToInsert.beginDay) {
          // Overwrite this existing epoch, it begins on same day
          epochs[thisEpoch] = epochToInsert;
          return;
        } else if(epochs[thisEpoch].beginDay < epochToInsert.beginDay) {
          break;
        }
      }
      // Copy last epoch onto end
      epochs.push(epochs[epochs.length - 1]);
      // Move other epochs down the line (no insertAfter array method in solidity)
      uint updateEpoch;
      for(updateEpoch = epochs.length - 2; updateEpoch > thisEpoch; updateEpoch--) {
        epochs[updateEpoch] = epochs[updateEpoch - 1];
      }
      epochs[thisEpoch + 1] = epochToInsert;
    } else {
      // This is a new epoch at the end
      epochs.push(epochToInsert);
    }
    epochCount++;
  }

  function proposeEpoch(EpochProposal calldata proposal) external onlyVerified onlyRegistered {
    // TODO write this function
  }

  // TODO remove this function
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

  function daystamp(uint timestamp) external view returns(uint) {
    if(timestamp == 0) timestamp = block.timestamp;
    return _daystamp(timestamp);
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
  function addressIdHash(address toCheck) external view returns(bytes32);
}
