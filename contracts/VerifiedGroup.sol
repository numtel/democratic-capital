// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MedianOfSixteen.sol";
using MedianOfSixteen for MedianOfSixteen.Data;
import "./AddressSet.sol";
using AddressSet for AddressSet.Set;
import "./VoteSet.sol";
using VoteSet for VoteSet.Data;

contract VerifiedGroup {
  IVerification public verifications;
  mapping(address => uint) public joinedTimestamps;
  mapping(bytes32 => uint) public activeBans;
  mapping(address => VoteSet.Data) registrationElections;
  AddressSet.Set registrationProposals;

  uint constant PARAM_COUNT = 12;
  /*
    0: allow duration
    1: allow threshold
    2: allow min participation
    3: disallow duration
    4: disallow threshold
    5: disallow min participation
    6: invoke duration
    7: invoke threshold
    8: invoke min participation
    9: registration duration (offset by 1)
    10: registration threshold
    11: registration min participation
  */
  MedianOfSixteen.Data[PARAM_COUNT] proposalParameters;

  mapping(address => VoteSet.Data) allowanceElections;
  AddressSet.Set allowanceProposals;
  mapping(address => VoteSet.Data) disallowanceElections;
  AddressSet.Set disallowanceProposals;
  AddressSet.Set allowedContracts;

  mapping(uint => VoteSet.Data) invokeElections;
  struct Tx {
    address to;
    bytes data;
  }
  Tx[] invokeProposals;

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  event VerificationContractChanged(address indexed oldContract, address indexed newContract);
  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationTimestamp, bytes32 idHash);
  event TxSent(address to, bytes data, bytes returned);
  event NewAllowanceElection(address indexed contractToAllow);
  event NewDisallowanceElection(address indexed contractToDisallow);
  event NewInvokeElection(uint index);
  event NewRegistrationElection(address indexed account);

  constructor(address _verifications, uint8[PARAM_COUNT] memory _parameters) {
    require(_verifications != address(0));
    verifications = IVerification(_verifications);
    allowedContracts.insert(address(this));

    // Contract creator becomes first member automatically
    // in order to prevent any bots from taking over before it can start
    register(_parameters);
  }

  function isVerified(address account) public view returns(bool) {
    return verifications.addressActive(account);
  }

  function isRegistered(address account) public view returns(bool) {
    return joinedTimestamps[account] > 0;
  }
  function register(uint8[PARAM_COUNT] memory _parameters) public {
    require(isVerified(msg.sender), 'Not verified');
    if(proposalParameters[9].median > 1) {
      if(registrationElections[msg.sender].endTime > 0) {
        require(registrationElections[msg.sender].passed());
        registrationElections[msg.sender].processed = true;
        registrationProposals.remove(msg.sender);
        _register(_parameters);
      } else {
        emit NewRegistrationElection(msg.sender);
        registrationProposals.insert(msg.sender);
        configureElection(registrationElections[msg.sender], 3);
        // Registration election duration offset by 1
        //  since a median value of 1 signifies no election required
        registrationElections[msg.sender].endTime -= SECONDS_PER_DAY;
      }
    } else {
      _register(_parameters);
    }
  }

  function _register(uint8[PARAM_COUNT] memory _parameters) internal {
    bytes32 idHash = verifications.addressIdHash(msg.sender);
    require(activeBans[idHash] <= block.timestamp, 'Account Banned');
    joinedTimestamps[msg.sender] = block.timestamp;
    setProposalConfig(_parameters);
    emit Registration(msg.sender);
  }

  function setProposalConfig(uint8[PARAM_COUNT] memory _parameters) public {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    for(uint i = 0; i < PARAM_COUNT; i++) {
      proposalParameters[i].set(msg.sender, _parameters[i]);
    }
  }

  function getProposalConfig(address account) external view returns(uint8[PARAM_COUNT] memory out) {
    require(isRegistered(account));
    for(uint i = 0; i < PARAM_COUNT; i++) {
      out[i] = proposalParameters[i].accountValues[account];
    }
  }

  function getProposalConfig() external view returns(uint8[PARAM_COUNT] memory out) {
    for(uint i = 0; i < PARAM_COUNT; i++) {
      out[i] = proposalParameters[i].median;
    }
  }

  function unregister(address account) public {
    require(account == msg.sender || allowedContracts.exists(msg.sender));
    require(isRegistered(account), 'Not registered');
    delete joinedTimestamps[account];
    for(uint i = 0; i < PARAM_COUNT; i++) {
      proposalParameters[i].unsetAccount(account);
    }
    emit Unregistered(account);
  }

  function registeredCount() public view returns(uint) {
    return proposalParameters[0].count;
  }

  function ban(address account, uint banExpirationTimestamp) external {
    require(allowedContracts.exists(msg.sender));
    unregister(account);
    bytes32 idHash = verifications.addressIdHash(account);
    activeBans[idHash] = banExpirationTimestamp;
    emit AccountBanned(account, banExpirationTimestamp, idHash);
  }

  function setVerifications(address _verifications) external {
    require(allowedContracts.exists(msg.sender));
    require(_verifications != address(0));
    emit VerificationContractChanged(address(verifications), _verifications);
    verifications = IVerification(_verifications);
  }

  function configureElection(VoteSet.Data storage election, uint electionType) internal {
    require(electionType < PARAM_COUNT / 3);
    election.endTime =
      block.timestamp + (proposalParameters[electionType * 3].median * SECONDS_PER_DAY);
    election.threshold = proposalParameters[(electionType * 3) + 1].median;
    election.minVoters =
      (registeredCount() * proposalParameters[(electionType * 3) + 2].median) / 16;
  }

  function proposeAllowing(address contractToAllow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(!allowanceProposals.exists(contractToAllow));
    emit NewAllowanceElection(contractToAllow);
    allowanceProposals.insert(contractToAllow);
    configureElection(allowanceElections[contractToAllow], 0);
  }

  function proposeDisallowing(address contractToDisallow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(!disallowanceProposals.exists(contractToDisallow));
    emit NewDisallowanceElection(contractToDisallow);
    disallowanceProposals.insert(contractToDisallow);
    configureElection(disallowanceElections[contractToDisallow], 1);
  }

  function proposeInvoke(address to, bytes memory data) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    emit NewInvokeElection(invokeProposals.length);
    configureElection(invokeElections[invokeProposals.length], 2);
    invokeProposals.push(Tx(to, data));
  }

  function allowanceElectionCount() external view returns(uint) {
    return allowanceProposals.count();
  }

  function disallowanceElectionCount() external view returns(uint) {
    return disallowanceProposals.count();
  }

  function invokeElectionCount() external view returns(uint) {
    return invokeProposals.length;
  }

  function registrationElectionCount() external view returns(uint) {
    return registrationProposals.count();
  }

  function allowanceElectionIndex(uint index) external view returns(address) {
    return allowanceProposals.keyList[index];
  }

  function disallowanceElectionIndex(uint index) external view returns(address) {
    return disallowanceProposals.keyList[index];
  }

  function registrationElectionIndex(uint index) external view returns(address) {
    return registrationProposals.keyList[index];
  }

  function electionDetails(VoteSet.Data storage election) internal view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    require(election.endTime > 0);
    endTime = election.endTime;
    threshold = election.threshold;
    minVoters = election.minVoters;
    processed = election.processed;
    supporting = election.supporting;
    against = election.against;
  }

  function allowanceElection(address contractToAllow) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    return electionDetails(allowanceElections[contractToAllow]);
  }

  function disallowanceElection(address contractToDisallow) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    return electionDetails(disallowanceElections[contractToDisallow]);
  }

  function registrationElection(address account) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    return electionDetails(registrationElections[account]);
  }

  function invokeElection(uint index) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    return electionDetails(invokeElections[index]);
  }

  function processAllowanceElection(address contractToAllow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(allowanceElections[contractToAllow].endTime > 0);
    require(allowanceElections[contractToAllow].processed == false);
    allowanceElections[contractToAllow].processed = true;
    if(allowanceElections[contractToAllow].passed()) {
      allowedContracts.insert(contractToAllow);
    }
  }

  function processDisallowanceElection(address contractToDisallow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(disallowanceElections[contractToDisallow].endTime > 0);
    require(disallowanceElections[contractToDisallow].processed == false);
    disallowanceElections[contractToDisallow].processed = true;
    if(disallowanceElections[contractToDisallow].passed()) {
      allowedContracts.remove(contractToDisallow);
    }
  }

  function processInvokeElection(uint index) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(invokeElections[index].endTime > 0);
    require(invokeElections[index].processed == false);
    invokeElections[index].processed = true;
    if(invokeElections[index].passed()) {
      (bool success, bytes memory returned) =
        invokeProposals[index].to.call(invokeProposals[index].data);
      emit TxSent(invokeProposals[index].to, invokeProposals[index].data, returned);
      require(success);
    }
  }

  function invoke(address to, bytes memory data) external {
    require(allowedContracts.exists(msg.sender));
    (bool success, bytes memory returned) = to.call(data);
    emit TxSent(to, data, returned);
    require(success);
  }

}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);
}
