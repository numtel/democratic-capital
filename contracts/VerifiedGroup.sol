// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./AddressSet.sol";
using AddressSet for AddressSet.Set;

contract VerifiedGroup {
  IVerification public verifications;
  uint public registeredCount;
  mapping(address => uint) public joinedTimestamps;
  mapping(bytes32 => uint) public activeBans;
  AddressSet.Set allowedContracts;

  event VerificationContractChanged(address indexed oldContract, address indexed newContract);
  event Registration(address indexed account);
  event Unregistered(address indexed account);
  event AccountBanned(address indexed account, uint banExpirationTimestamp, bytes32 idHash);
  event TxSent(address to, bytes data, bytes returned);

  constructor(address _verifications, address _firstAccount) {
    require(_verifications != address(0), 'Verifications cannot be 0 address');
    verifications = IVerification(_verifications);

    allowedContracts.insert(address(this));

    // Contract creator becomes first member automatically
    // in order to prevent any bots from taking over before it can start
    register(_firstAccount);
  }

  // General use view functions
  function isVerified(address account) public view returns(bool) {
    return verifications.addressActive(account);
  }

  function isRegistered(address account) public view returns(bool) {
    return joinedTimestamps[account] > 0;
  }

  function contractAllowed(address key) public view returns(bool) {
    // Admin mode when only one user
    if(registeredCount <= 1) return true;
    return allowedContracts.exists(key);
  }

  function allowedContractCount() external view returns(uint) {
    return allowedContracts.count();
  }

  function allowedContractIndex(uint index) external view returns(address) {
    return allowedContracts.keyList[index];
  }

  // Functions that can be invoked by allowed contracts
  function register(address account) public {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    require(isVerified(account), 'Not Verified');
    require(!isRegistered(account), 'Already Registered');
    bytes32 idHash = verifications.addressIdHash(account);
    require(activeBans[idHash] <= block.timestamp, 'Account Banned');
    joinedTimestamps[account] = block.timestamp;
    registeredCount++;
    emit Registration(account);
  }

  function unregister(address account) public {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    require(isRegistered(account), 'Not Registered');
    delete joinedTimestamps[account];
    registeredCount--;
    emit Unregistered(account);
  }

  function ban(address account, uint banExpirationTimestamp) external {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    unregister(account);
    bytes32 idHash = verifications.addressIdHash(account);
    activeBans[idHash] = banExpirationTimestamp;
    emit AccountBanned(account, banExpirationTimestamp, idHash);
  }

  function setVerifications(address _verifications) external {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    require(_verifications != address(0), 'Verifications cannot be 0 address');
    emit VerificationContractChanged(address(verifications), _verifications);
    verifications = IVerification(_verifications);
  }

  function allowContract(address contractToAllow) external {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    allowedContracts.insert(contractToAllow);
  }

  function disallowContract(address contractToDisallow) external {
    require(contractAllowed(msg.sender), 'Invalid Caller');
    allowedContracts.remove(contractToDisallow);
  }

  function invoke(address to, bytes memory data) external {
    require(allowedContracts.exists(msg.sender), 'Invalid Caller');
    (bool success, bytes memory returned) = to.call(data);
    emit TxSent(to, data, returned);
    require(success, 'Invoke Failed');
  }

}

interface IVerification {
  function addressActive(address toCheck) external view returns (bool);
  function addressExpiration(address toCheck) external view returns (uint);
  function addressIdHash(address toCheck) external view returns(bytes32);
}
