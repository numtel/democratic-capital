// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract DemocraticToken {
  uint public totalSupply;
  mapping(address => uint) public balanceOf;
  mapping(address => mapping(address => uint)) public allowance;
  string public name;
  string public symbol;
  uint8 public decimals = 4;
  IVerification public verifications;

  struct RegisteredAccount {
    uint lastFeeCollected;
    uint registrationDay;
    // 0: no vote, 1: support, 2: against
    mapping(uint => uint8) proposalVoted;
  }

  mapping(address => RegisteredAccount) public registered;

  struct Epoch {
    // Day number when epoch begins
    uint beginDay;
    // How many tokens per day per registered user
    uint dailyEmission;
    // TODO squeeze in a bit to toggle quadratic voting for each resource type
    // Params: 16 uint16s packed into one uint256
    // 0x0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff
    // 0: expiry day count
    // How many days before uncollected emissions expire: 0=never expire
    // 1: epoch election min days
    // Minimum number of days between election start and end: 0=1 day elections
    // 2: epoch election threshold
    // 0x0-0xffff percentage of votes that must be in support for election to passs
    // 3: epoch election min participation
    // 0x0-0xffff percentage of users who must vote for election to pass
    // TODO exclude inactive users from this part?
    //  instead of all registered users, only users who have collected before expiry?
    // 4: mint election min days
    // 5: mint election threshold
    // 6: mint election min participation
    // 7: ban election min days
    // 8: ban election threshold
    // 9: ban election min participation
    // a: custom_tx election min days
    // b: custom_tx election threshold
    // c: custom_tx election min participation
    // d: new registration election duration
    // ^ Pass 0 for registrations to happen without election
    // ^ Pass 1+ as number of days for new registration elections to last
    // e: registration election threshold
    // f: registration election min participation
    uint params;
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

  struct CustomTx {
    address to;
    bytes data;
  }

  struct RegistrationElection {
    address account;
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
    // 0: epoch, 1: mint, 2: ban, 3: custom_tx, 4: registration
    uint8 resourceType;
    uint resourceIndex;
    uint electionStartDay;
    uint electionEndDay;
    address proposer;
    bool hasBeenProcessed;
    uint proposalIndex;
    uint votesSupporting;
    uint votesAgainst;
    // Number of people who have voted so far
    uint voterCount;
    // Set on first vote
    uint registeredCount;
  }

  Epoch[] public epochs;
  Epoch[] public pendingEpochs;
  Mint[] public pendingMints;
  Ban[] public pendingBans;
  CustomTx[] public pendingCustomTx;
  address[] public pendingRegistrations;
  Proposal[] public proposals;
  mapping(bytes32 => uint) activeBans;
  mapping(uint => uint[]) public proposalsByDay;

  event Transfer(address indexed from, address indexed to, uint value);
  event Approval(address indexed owner, address indexed spender, uint value);
  event NewProposal(uint index, address indexed from);
  event ProposalProcessed(uint index, Proposal proposal);
  event NewEpoch(uint index, Epoch epochInserted);
  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationDay, bytes32 idHash);
  event CustomTxSent(address to, bytes data, bytes returned);
  event RegistrationPending(uint proposalIndex, address indexed account);
  event Vote(uint proposalIndex, address indexed voter, bool inSupport, uint votePower);

  constructor(
    address _verifications,
    string memory _name,
    string memory _symbol,
    Epoch memory initialEpoch
  ) {
    require(_verifications != address(0));
    verifications = IVerification(_verifications);

    name = _name;
    symbol = _symbol;

    uint currentDay = daystamp();

    // Initial epoch always starts from current day
    initialEpoch.beginDay = currentDay;
    epochs.push(initialEpoch);

    dayStats[currentDay] = Day(0, 0, currentDay);
    latestDay = currentDay;
  }

  function registerAccount() external {
    onlyVerified();
    uint currentDay = daystamp();
    bytes32 idHash = verifications.addressIdHash(msg.sender);
    // Account banned
    require(activeBans[idHash] <= currentDay);
    Epoch memory currentEpoch = epochOnDay(currentDay);
    uint16 regByElection = extract16From256(currentEpoch.params, 13);
    if(regByElection > 0) {
      // Begin election for registration
      emit RegistrationPending(proposals.length, msg.sender);
      newProposal(4, pendingRegistrations.length,
        currentDay + 1,
        currentDay + regByElection);
      pendingRegistrations.push(msg.sender);
    } else {
      // Election not required to register
      registered[msg.sender].lastFeeCollected = currentDay - 1;
      registered[msg.sender].registrationDay = currentDay;
      updateRegisteredCount(false);
      emit Registration(msg.sender);
    }
  }

  function unregisterAccount() external {
    onlyRegistered();
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
    for(uint thisEpoch = epochs.length - 1; thisEpoch >= 0; thisEpoch--) {
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
    while(thisDay.dayNumber > dayNumber) {
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
    uint16 expiryDayCount = extract16From256(epochs[epochIndex].params, 0);
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

  function collectEmissions() external {
    onlyVerified();
    onlyRegistered();
    uint currentDay = daystamp();
    uint toCollect = availableEmissions(msg.sender, currentDay);
    _mint(msg.sender, toCollect);
    registered[msg.sender].lastFeeCollected = currentDay;
  }

  function proposeEpoch(
    Epoch memory proposedEpoch, uint electionStartDay, uint electionEndDay
  ) external {
    onlyVerified();
    onlyRegistered();
    // +2 because electionEndDay is inclusive, and at least one day in between
    //  because the election result must be processed before the new epoch begins
    require(proposedEpoch.beginDay >= electionEndDay + 2);

    newProposal(0, pendingEpochs.length, electionStartDay, electionEndDay);
    pendingEpochs.push(proposedEpoch);
  }

  function proposeMint(
    uint amount, address recipient, uint electionStartDay, uint electionEndDay
  ) external {
    onlyVerified();
    onlyRegistered();
    newProposal(1, pendingMints.length, electionStartDay, electionEndDay);
    pendingMints.push(Mint(amount, recipient));
  }

  function proposeCustomTx(
    address to, bytes memory data, uint electionStartDay, uint electionEndDay
  ) external {
    onlyVerified();
    onlyRegistered();
    newProposal(3, pendingCustomTx.length, electionStartDay, electionEndDay);
    pendingCustomTx.push(CustomTx(to, data));
  }

  function proposeBan(
    address toBan, uint banExpirationDay, uint electionStartDay, uint electionEndDay
  ) external {
    onlyVerified();
    onlyRegistered();
    // Cannot ban if not registered
    require(registered[toBan].registrationDay > 0);

    newProposal(2, pendingBans.length, electionStartDay, electionEndDay);
    pendingBans.push(Ban(
      toBan, banExpirationDay, verifications.addressIdHash(toBan)
    ));
  }

  function newProposal(
    uint8 resourceType,
    uint resourceIndex,
    uint electionStartDay,
    uint electionEndDay
  ) internal {
    uint currentDay = daystamp();
    Epoch memory currentEpoch = epochOnDay(currentDay);
    // Election cannot start in past
    require(electionStartDay >= currentDay);
    // Election must meet minimum duration
    uint16 minDuration = extract16From256(currentEpoch.params, 1 + (3 * resourceType));
    // Registration election is special since 0 value disables elections
    if(resourceType == 4) minDuration--;
    require(electionEndDay - electionStartDay >= minDuration);

    for(uint e=electionStartDay; e<=electionEndDay; e++) {
      proposalsByDay[e].push(proposals.length);
    }
    emit NewProposal(proposals.length, msg.sender);
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
  }

  function vote (
    uint proposalIndex, bool inSupport, uint quadraticPayment
  ) external {
    onlyVerified();
    onlyRegistered();
    require(proposalIndex < proposals.length);
    uint currentDay = daystamp();
    Proposal storage proposal = proposals[proposalIndex];
    RegisteredAccount storage voter = registered[msg.sender];
    // Can only vote once per election
    require(voter.proposalVoted[proposalIndex] == 0);
    // Must have registered before election start
    require(voter.registrationDay < proposal.electionStartDay);
    // Election has not begin
    require(currentDay >= proposal.electionStartDay);
    // Election has finished
    require(currentDay <= proposal.electionEndDay);
    // Insufficient balance
    require(balanceOf[msg.sender] >= quadraticPayment);
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
    emit Vote(proposalIndex, msg.sender, inSupport, votePower);
  }

  // Somebody must invoke this function after the election ends but before the
  //  resulting epoch is set to begin
  // TODO epoch should have a reward parameter for invoking this function
  function processElectionResult(uint proposalIndex) external {
    onlyVerified();
    onlyRegistered();
    require(proposalIndex < proposals.length);
    uint currentDay = daystamp();
    Proposal storage proposal = proposals[proposalIndex];
    // Proposal election must not already have been processed
    require(!proposal.hasBeenProcessed, "EP");
    // Proposal election must have completed
    require(currentDay > proposal.electionEndDay, "EF");
    // TODO election participation/threshold should match current epoch, not epoch when election started?
    Epoch memory proposalEpoch = epochOnDay(proposal.electionStartDay);
    require(proposal.voterCount > 0);
    // Proposal votes must meet minimum participation level for this resource type
    require((proposal.voterCount * 0xffff) >=
      (proposal.registeredCount *
        extract16From256(proposalEpoch.params, 3 + (3 * proposal.resourceType))), "MP");
    // Proposal votes must meet the minimum threshold for this resource type
    require(
        (proposal.votesSupporting * 0xffff)
        / (proposal.votesSupporting + proposal.votesAgainst)
      >= extract16From256(proposalEpoch.params, 2 + (3 * proposal.resourceType)), "MT");

    proposal.hasBeenProcessed = true;

    if(proposal.resourceType == 0) { // Epoch
    /*
      TODO what to do if more than one epoch can be processed to start on the same day?
      if there are multiple epoch elections that end on the same day with the same begin day,
        then the one with the most participation that passes wins (A)
      if an election ends after another one (both pass) and they have same begin day
        then the earlier one is set to hasBeenProcessed when later one is processed (B)
      so, there needs to be a way to link epoch elections with matching epoch begin days
      TODO clean out processed proposals from proposals array in order to save gas

      Proposal[] competing;
      competing.push(thisProposal);
      for each proposal where resourceType == 0 and hasBeenProcessed == false and electionEndDay < currentDay
        if proposal.epoch.beginDay == thisProposal.epoch.beginDay
          if proposal.electionEndDay < thisProposal.electionEndDay
            // take care of (B)
            proposal.hasBeenProcessed = true
          else if proposal.electionEndDay == thisProposal.electionEndDay
            competing.push(proposal)
      uint maxParticipation;
      uint competingIndex;
      for each competing
        competing.hasBeenProcessed = true
        if competing.passed and competing.participation > maxParticipation
          maxParticipation = competing.participation
          competingIndex = competing.index
      // take care of (A)
      epochToInsert = competingIndex.epoch

    */
      Epoch memory epochToInsert = pendingEpochs[proposal.resourceIndex];
      uint thisEpoch = epochs.length - 1;
      // Epoch must start in future
      require(epochToInsert.beginDay > currentDay, "SF");
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
    } else if(proposal.resourceType == 1) { // Mint
      _mint(
        pendingMints[proposal.resourceIndex].recipient,
        pendingMints[proposal.resourceIndex].amount
      );
    } else if(proposal.resourceType == 2) { // Ban
      Ban storage pending = pendingBans[proposal.resourceIndex];
      delete registered[pending.toBan];
      updateRegisteredCount(true);
      emit Unregistered(pending.toBan);
      emit AccountBanned(
        pending.toBan,
        pending.banExpirationDay,
        pending.idHash
      );
      activeBans[pending.idHash] = pending.banExpirationDay;
    } else if(proposal.resourceType == 3) { // CustomTx
      CustomTx memory pending = pendingCustomTx[proposal.resourceIndex];
      (bool success, bytes memory data) = pending.to.call(
        pending.data);
      emit CustomTxSent(
        pending.to,
        pending.data,
        data);
      require(success);
    } else if(proposal.resourceType == 4) { // Registration
      address account = pendingRegistrations[proposal.resourceIndex];
      // TODO could register, collect emissions, unregister and then reregister to game emissions
      registered[account].lastFeeCollected = currentDay - 1;
      registered[account].registrationDay = currentDay;
      updateRegisteredCount(false);
      emit Registration(account);
    }
    emit ProposalProcessed(proposalIndex, proposal);
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
    return block.timestamp / 86400;
  }

  function _mint(address account, uint amount) internal {
    balanceOf[account] += amount;
    totalSupply += amount;
    emit Transfer(address(0), account, amount);
  }

  function onlyVerified() internal view {
    require(verifications.addressActive(msg.sender));
  }

  function onlyRegistered() internal view {
    require(registered[msg.sender].lastFeeCollected > 0);
  }

  function extract16From256(uint input, uint8 index) internal pure returns(uint16) {
    return uint16(input >> ((15 - index) * 16));
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
