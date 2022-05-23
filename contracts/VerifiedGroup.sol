// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract VerifiedGroup {
  IVerification public verifications;
  mapping(address => uint) public joinedTimestamps;
  mapping(bytes32 => uint) public activeBans;
  struct Day {
    uint registeredCount;
    // Pointer to previous record
    uint previousDay;
    // Redundancy for easy access
    uint dayNumber;
  }
  mapping(uint => Day) public dayStats;
  uint latestDay;
  uint secondsPerDay;

  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationDay, bytes32 idHash);

  constructor(address _verifications, uint _secondsPerDay) {
    require(_verifications != address(0));
    verifications = IVerification(_verifications);
    require(_secondsPerDay > 0);
    secondsPerDay = _secondsPerDay;
  }

  function daystamp() public view returns(uint) {
    return block.timestamp / secondsPerDay;
  }

  function isVerified(address account) public view returns(bool) {
    return verifications.addressActive(account);
  }

  function isRegistered(address account) public view returns(bool) {
    return joinedTimestamps[account] > 0;
  }
  function register(address account) public {
    require(isVerified(account), 'Not verified');
    bytes32 idHash = verifications.addressIdHash(account);
    // Account banned
    require(activeBans[idHash] <= block.timestamp, 'Account Banned');
    joinedTimestamps[account] = block.timestamp;
    updateRegisteredCount(false);
    emit Registration(account);
  }

  function unregister(address account) public {
    require(isRegistered(account), 'Not registered');
    delete joinedTimestamps[account];
    updateRegisteredCount(true);
    emit Unregistered(account);
  }

  function ban(address account, uint banExpirationTimestamp) public {
    unregister(account);
    bytes32 idHash = verifications.addressIdHash(account);
    activeBans[idHash] = banExpirationTimestamp;
    emit AccountBanned(account, banExpirationTimestamp, idHash);
  }

  function updateRegisteredCount(bool decrement) internal {
    uint currentDay = daystamp();
    if(dayStats[currentDay].dayNumber > 0) {
      // A record already exists for today
      if(decrement) {
        dayStats[currentDay].registeredCount--;
      } else {
        dayStats[currentDay].registeredCount++;
      }
    } else {
      // Need to create a new record for today
      if(decrement) {
        dayStats[currentDay].registeredCount = dayStats[latestDay].registeredCount - 1;
      } else {
        dayStats[currentDay].registeredCount = dayStats[latestDay].registeredCount + 1;
      }
      dayStats[currentDay].previousDay = latestDay;
      dayStats[currentDay].dayNumber = currentDay;
      latestDay = currentDay;
    }
  }

  function statsOfDay(uint dayNumber) public view returns(Day memory stats) {
    uint thisDayNumber = latestDay;
    Day memory thisDay = dayStats[thisDayNumber];
    // If no registrations or unregistrations happen, there will be no record
    // so return the last day before or on the dayNumber
    while(thisDay.dayNumber > dayNumber) {
      thisDay = dayStats[thisDay.previousDay];
    }
    return thisDay;
  }
}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);
}
