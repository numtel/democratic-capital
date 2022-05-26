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

  MedianOfSixteen.Data proposalDuration;
  MedianOfSixteen.Data proposalThreshold;
  MedianOfSixteen.Data proposalMinParticipation;

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

  constructor(
    address _verifications
  ) {
    require(_verifications != address(0));
    verifications = IVerification(_verifications);
  }

  function isVerified(address account) public view returns(bool) {
    return verifications.addressActive(account);
  }

  function isRegistered(address account) public view returns(bool) {
    return joinedTimestamps[account] > 0;
  }
  // TODO registration elections
  function register(
    uint8 _proposalDuration,
    uint8 _proposalThreshold,
    uint8 _proposalMinParticipation
  ) external {
    address account = msg.sender;
    require(isVerified(account), 'Not verified');
    bytes32 idHash = verifications.addressIdHash(account);
    require(activeBans[idHash] <= block.timestamp, 'Account Banned');
    joinedTimestamps[account] = block.timestamp;
    proposalDuration.set(account, _proposalDuration);
    proposalThreshold.set(account, _proposalThreshold);
    proposalMinParticipation.set(account, _proposalMinParticipation);
    emit Registration(account);
  }

  function unregister(address account) public {
    require(account == msg.sender || allowedContracts.exists(msg.sender));
    require(isRegistered(account), 'Not registered');
    delete joinedTimestamps[account];
    proposalDuration.unsetAccount(account);
    proposalThreshold.unsetAccount(account);
    proposalMinParticipation.unsetAccount(account);
    emit Unregistered(account);
  }

  function registeredCount() public view returns(uint) {
    return proposalDuration.count;
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

  function setProposalConfig(
    uint8 _proposalDuration,
    uint8 _proposalThreshold,
    uint8 _proposalMinParticipation
  ) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    proposalDuration.set(msg.sender, _proposalDuration);
    proposalThreshold.set(msg.sender, _proposalThreshold);
    proposalMinParticipation.set(msg.sender, _proposalMinParticipation);
  }

  function configureElection(VoteSet.Data storage election) internal {
    election.endTime =
      block.timestamp + (proposalDuration.median * SECONDS_PER_DAY);
    election.threshold = proposalThreshold.median;
    election.minVoters =
      (registeredCount() * proposalMinParticipation.median) / 16;
  }

  function proposeAllowing(address contractToAllow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(!allowanceProposals.exists(contractToAllow));
    allowanceProposals.insert(contractToAllow);
    configureElection(allowanceElections[contractToAllow]);
  }

  function proposeDisallowing(address contractToDisallow) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    require(!disallowanceProposals.exists(contractToDisallow));
    disallowanceProposals.insert(contractToDisallow);
    configureElection(disallowanceElections[contractToDisallow]);
  }

  function proposeInvoke(address to, bytes memory data) external {
    require(isRegistered(msg.sender));
    require(isVerified(msg.sender), 'Not verified');
    configureElection(invokeElections[invokeProposals.length]);
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

  function allowanceElectionIndex(uint index) external view returns(address) {
    return allowanceProposals.keyList[index];
  }

  function disallowanceElectionIndex(uint index) external view returns(address) {
    return disallowanceProposals.keyList[index];
  }

  function allowanceElection(address contractToAllow) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    require(allowanceElections[contractToAllow].endTime > 0);
    endTime = allowanceElections[contractToAllow].endTime;
    threshold = allowanceElections[contractToAllow].threshold;
    minVoters = allowanceElections[contractToAllow].minVoters;
    processed = allowanceElections[contractToAllow].processed;
    supporting = allowanceElections[contractToAllow].supporting;
    against = allowanceElections[contractToAllow].against;
  }

  function disallowanceElection(address contractToDisallow) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    require(disallowanceElections[contractToDisallow].endTime > 0);
    endTime = disallowanceElections[contractToDisallow].endTime;
    threshold = disallowanceElections[contractToDisallow].threshold;
    minVoters = disallowanceElections[contractToDisallow].minVoters;
    processed = disallowanceElections[contractToDisallow].processed;
    supporting = disallowanceElections[contractToDisallow].supporting;
    against = disallowanceElections[contractToDisallow].against;
  }

  function invokeElection(uint index) external view returns(
    uint endTime, uint8 threshold, uint minVoters, bool processed,
    uint supporting, uint against
  ) {
    require(invokeElections[index].endTime > 0);
    endTime = invokeElections[index].endTime;
    threshold = invokeElections[index].threshold;
    minVoters = invokeElections[index].minVoters;
    processed = invokeElections[index].processed;
    supporting = invokeElections[index].supporting;
    against = invokeElections[index].against;
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
