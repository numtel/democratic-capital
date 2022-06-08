// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IRegistrationsByElection.sol";
import "./ChildBase.sol";

contract RegistrationsByElection is ChildBase {
  address public elections;
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('register(address)')));

  event ElectionsChanged(address indexed oldElections, address indexed newElections);

  constructor(address _group, address _elections, string memory _name)
      ChildBase(_group, type(IRegistrationsByElection).interfaceId, _name) {
    elections = _elections;
  }

  function setElections(address _elections) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit ElectionsChanged(elections, _elections);
    elections = _elections;
  }

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    require(!group.isRegistered(msg.sender), 'Already Registered');
    IElection electionContract = IElection(elections);
    electionContract.propose(abi.encodeWithSelector(SELECTOR, msg.sender));
  }
}

interface IElection {
  function propose(bytes memory data) external;
}

