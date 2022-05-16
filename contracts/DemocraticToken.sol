// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract DemocraticToken {
  uint public totalSupply;
  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) public allowance;
  string public name = "Democratic Token";
  string public symbol = "DEMO";
  uint8 public decimals = 4;
  IVerification public verifications;

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  struct RegisteredAccount {
    uint lastFeeCollected;
    uint registrationDay;
    // 0: no vote, 1: support, 2: against
    mapping(uint => uint8) proposalVoted;
  }

  mapping(address => RegisteredAccount) public registered;

  event Test(uint out);

  struct Epoch {
    // Day number when epoch begins
    uint beginDay;
    // How many tokens per day per registered user
    uint dailyEmission;
    // How many days before uncollected emissions expire: 0=never expire
    uint16 expiryDayCount;
    // Minimum number of days between election start and end: 0=1 day elections
    uint16 epochElectionMinDays;
    // 0x0-0xffff percentage of votes that must be insupport for election to passs
    uint16 epochElectionThreshold;
    // 0x0-0xffff percentage of users who must vote for election to pass
    // TODO exclude inactive users from this part?
    //  instead of all registered users, only users who have collected before expiry?
    uint16 epochElectionMinParticipation;
  }

  struct Mint {
    uint amount;
    address recipient;
  }

  struct Ban {
    address toBan;
    uint banExpirationDay;
    bytes32 idHash;
  }

  struct Day {
    // Must have registered before start of election in order to vote
    // Number of users registered at end of this day (or currently if latest day)
    uint registeredCount;
    // Pointer to previous record
    uint previousDay;
    // Redundancy for easy access
    uint dayNumber;
  }
  mapping(uint => Day) public dayStats;
  uint latestDay;

  struct Proposal {
    // 0: epoch, 1: mint, 2: ban
    uint8 resourceType;
    uint resourceIndex;
    uint electionStartDay;
    uint electionEndDay;
    address proposer;
    bool hasBeenProcessed;
    uint epochProposalIndex;
    uint votesSupporting;
    uint votesAgainst;
    // Number of people who have voted so far
    uint voterCount;
    // Set on first vote
    uint registeredCount;
  }

  Epoch[] public epochs;
  // Initial epoch pushed to array in constructor
  uint public epochCount = 1;
  Epoch[] public pendingEpochs;
  uint public pendingEpochCount = 0;
  Mint[] public pendingMints;
  uint public pendingMintCount = 0;
  Ban[] public pendingBans;
  uint public pendingBanCount = 0;
  mapping(bytes32 => uint) activeBans;
  Proposal[] public proposals;
  uint public proposalCount = 0;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);
  event NewProposal(uint index, address indexed from);
  event ProposalProcessed(uint index, Proposal proposal);
  event NewEpoch(uint index, Epoch epochInserted);
  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationDay, bytes32 idHash);

  constructor(
    address _verifications,
    Epoch memory initialEpoch
  ) {
    require(_verifications != address(0),
      "Verifications contract must not be zero address");
    verifications = IVerification(_verifications);

    uint currentDay = daystamp();

    // Initial epoch always starts from current day
    initialEpoch.beginDay = currentDay;
    epochs.push(initialEpoch);

    dayStats[currentDay] = Day(0, 0, currentDay);
    latestDay = currentDay;
  }

  // TODO registrations happen by election?
  function registerAccount() external onlyVerified {
    uint currentDay = daystamp();
    bytes32 idHash = verifications.addressIdHash(msg.sender);
    require(activeBans[idHash] <= currentDay, "Account banned");
    registered[msg.sender].lastFeeCollected = currentDay - 1;
    registered[msg.sender].registrationDay = currentDay;
    updateRegisteredCount(false);
    emit Registration(msg.sender);
  }

  function unregisterAccount() external onlyRegistered {
    // This will not delete the epochProposalVoted mapping, which is fine
    delete registered[msg.sender];
    updateRegisteredCount(true);
    emit Unregistered(msg.sender);
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

  function epochOnDay(uint dayNumber) public view returns(Epoch memory epoch) {
    uint thisEpoch = epochs.length - 1;
    for(; thisEpoch >= 0; thisEpoch--) {
      if(epochs[thisEpoch].beginDay <= dayNumber) {
        return epochs[thisEpoch];
      }
    }
    return epochs[0];
  }

  function statsOfDay(uint dayNumber) public view returns(Day memory stats) {
    uint thisDayNumber = latestDay;
    Day memory thisDay = dayStats[thisDayNumber];
    // If no registrations or unregistrations happen, there will be no record
    // so return the last day before or on the dayNumber
    while(thisDay.previousDay > dayNumber) {
      thisDay = dayStats[thisDay.previousDay];
    }
    return thisDay;
  }

  function availableEmissions(address toCheck) external view returns(uint) {
    return availableEmissions(toCheck, daystamp());
  }

  function availableEmissions(address toCheck, uint onDay) public view returns(uint) {
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
    uint currentDay = daystamp();
    uint toCollect = availableEmissions(msg.sender, currentDay);
    _mint(msg.sender, toCollect);
    registered[msg.sender].lastFeeCollected = currentDay;
  }

  function newEpoch(Epoch memory epochToInsert) internal {
    uint currentDay = daystamp();
    uint thisEpoch = epochs.length - 1;
    require(epochToInsert.beginDay > currentDay, "Epoch must start in future");
    if(epochs[thisEpoch].beginDay >= epochToInsert.beginDay) {
      // This new epoch is not at the end
      for(; thisEpoch >= 0; thisEpoch--) {
        if(epochs[thisEpoch].beginDay == epochToInsert.beginDay) {
          // Overwrite this existing epoch, it begins on same day
          epochs[thisEpoch] = epochToInsert;
          emit NewEpoch(thisEpoch, epochToInsert);
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
      emit NewEpoch(thisEpoch + 1, epochToInsert);
    } else {
      // This is a new epoch at the end
      epochs.push(epochToInsert);
      emit NewEpoch(epochs.length - 1, epochToInsert);
    }
    epochCount++;
  }

  function proposeEpoch(
    Epoch memory proposedEpoch, uint electionStartDay, uint electionEndDay
  ) external onlyVerified onlyRegistered {
    // +2 because electionEndDay is inclusive, and at least one day in between
    //  because the election result must be processed before the new epoch begins
    require(proposedEpoch.beginDay >= electionEndDay + 2,
      "Epoch must start at least 2 days after election end");

    pendingEpochs.push(proposedEpoch);
    pendingEpochCount++;
    newProposal(0, pendingEpochs.length - 1, electionStartDay, electionEndDay);
  }

  function proposeMint(
    Mint memory proposedMint, uint electionStartDay, uint electionEndDay
  ) external onlyVerified onlyRegistered {
    pendingMints.push(proposedMint);
    pendingMintCount++;
    newProposal(1, pendingMints.length - 1, electionStartDay, electionEndDay);
  }

  function proposeBan(
    address toBan, uint banExpirationDay, uint electionStartDay, uint electionEndDay
  ) external onlyVerified onlyRegistered {
    require(registered[toBan].registrationDay > 0, "Cannot ban if not registered");

    pendingBans.push(Ban(
      toBan, banExpirationDay, verifications.addressIdHash(toBan)
    ));
    pendingBanCount++;
    newProposal(2, pendingBans.length - 1, electionStartDay, electionEndDay);
  }

  function newProposal(
    uint8 resourceType,
    uint resourceIndex,
    uint electionStartDay,
    uint electionEndDay
  ) internal {
    uint currentDay = daystamp();
    Epoch memory currentEpoch = epochOnDay(currentDay);
    require(electionStartDay >= currentDay, "Election cannot start in past");
    require(electionEndDay - electionStartDay >= currentEpoch.epochElectionMinDays,
      "Election must meet minimum duration");

    proposals.push(Proposal(
      resourceType,
      resourceIndex,
      electionStartDay,
      electionEndDay,
      msg.sender,
      false,
      proposals.length,
      0, 0, 0, 0
    ));
    proposalCount++;
    emit NewProposal(proposalCount - 1, msg.sender);
  }

  function vote (
    uint proposalIndex, bool inSupport, uint quadraticPayment
  ) external onlyVerified onlyRegistered {
    require(proposalIndex < proposalCount, "Invalid index specified");
    uint currentDay = daystamp();
    Proposal storage proposal = proposals[proposalIndex];
    RegisteredAccount storage voter = registered[msg.sender];
    require(voter.proposalVoted[proposalIndex] == 0,
      "Can only vote once per election");
    require(voter.registrationDay < proposal.electionStartDay,
      "Must have registered before election start");
    require(currentDay >= proposal.electionStartDay,
      "Election has not begun");
    require(currentDay <= proposal.electionEndDay,
      "Election has finished");
    require(balanceOf[msg.sender] >= quadraticPayment,
      "Insufficient balance");
    // The registeredCount value is not known when the proposal is created,
    //  therefore fill it on first vote
    if(proposal.registeredCount == 0) {
      // Fetch number of possible voters in this election
      Day memory stats = statsOfDay(proposal.electionStartDay - 1);
      proposal.registeredCount = stats.registeredCount;
    }
    uint votePower = sqrt(1 + (quadraticPayment / (10**decimals)));
    if(quadraticPayment > 0) {
      balanceOf[msg.sender] -= quadraticPayment;
      emit Transfer(msg.sender, address(0), quadraticPayment);
    }
    if(inSupport) {
      proposal.votesSupporting += votePower;
      voter.proposalVoted[proposalIndex] = 1;
    } else {
      proposal.votesAgainst += votePower;
      voter.proposalVoted[proposalIndex] = 2;
    }
    proposal.voterCount++;
  }

  function electionTabulation(uint proposalIndex) external view
    returns(bool participationMet, bool supportThresholdMet)
  {
    require(proposalIndex < proposalCount, "Invalid index specified");
    Proposal memory proposal = proposals[proposalIndex];
    return electionTabulation(proposal);
  }

  function electionTabulation(Proposal memory proposal) public view
    returns(bool participationMet, bool supportThresholdMet)
  {
    Epoch memory proposalEpoch = epochOnDay(proposal.electionStartDay);
    // TODO different participation and threshold for different proposal resources
    participationMet = (proposal.voterCount * type(uint16).max) >=
      (proposal.registeredCount * proposalEpoch.epochElectionMinParticipation);
    supportThresholdMet =
        (proposal.votesSupporting * type(uint16).max)
        / (proposal.votesSupporting + proposal.votesAgainst)
      >= proposalEpoch.epochElectionThreshold;
  }

  // Somebody must invoke this function after the election ends but before the
  //  resulting epoch is set to begin
  function processElectionResult(uint proposalIndex) external onlyVerified onlyRegistered {
    require(proposalIndex < proposalCount, "Invalid index specified");
    uint currentDay = daystamp();
    Proposal storage proposal = proposals[proposalIndex];
    require(!proposal.hasBeenProcessed, "Election has been processed already");
    require(currentDay > proposal.electionEndDay, "Election has not finished");
    (bool participationMet, bool supportThresholdMet) = electionTabulation(proposal);
    require(participationMet, "Minimum participation not met");
    require(supportThresholdMet, "Minimum support threshold not met");
    proposal.hasBeenProcessed = true;
    if(proposal.resourceType == 0) {
      newEpoch(pendingEpochs[proposal.resourceIndex]);
    } else if(proposal.resourceType == 1) {
      _mint(
        pendingMints[proposal.resourceIndex].recipient,
        pendingMints[proposal.resourceIndex].amount
      );
    } else if(proposal.resourceType == 2) {
      delete registered[pendingBans[proposal.resourceIndex].toBan];
      updateRegisteredCount(true);
      emit Unregistered(pendingBans[proposal.resourceIndex].toBan);
      emit AccountBanned(
        pendingBans[proposal.resourceIndex].toBan,
        pendingBans[proposal.resourceIndex].banExpirationDay,
        pendingBans[proposal.resourceIndex].idHash
      );
      activeBans[pendingBans[proposal.resourceIndex].idHash] =
        pendingBans[proposal.resourceIndex].banExpirationDay;
    }
    emit ProposalProcessed(proposalIndex, proposal);
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

  function daystamp() public view returns(uint) {
    return _daystamp(block.timestamp);
  }

  function daystamp(uint timestamp) external pure returns(uint) {
    return _daystamp(timestamp);
  }

  function _daystamp(uint timestamp) internal pure returns(uint) {
    return timestamp / SECONDS_PER_DAY;
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

  modifier notBanned() {
    // TODO write banning elections
    _;
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

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);
}
