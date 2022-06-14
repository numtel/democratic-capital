// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IVerifiedGroup {
  function name() external view returns(string memory);
  function setName(string memory _name) external;
  function joinedTimestamps(address account) external view returns(uint);
  function registeredCount() external view returns(uint);
  function isVerified(address account) external view returns(bool);
  function isRegistered(address account) external view returns(bool);
  function contractAllowed(address key) external view returns(bool);
  function allowedContractCount() external view returns(uint);
  function allowedContractIndex(uint index) external view returns(address);
  function postComment(address item, string memory text) external;
  function register(address account) external;
  function unregister(address account) external;
  function ban(address account, uint banExpirationTimestamp) external;
  function setVerifications(address _verifications) external;
  function allowContract(address contractToAllow) external;
  function hookRegister(bytes4 selector) external;
  function hookUnregister(bytes4 selector) external;
  function disallowContract(address contractToDisallow) external;
  function invoke(address to, bytes memory data) external;
}

