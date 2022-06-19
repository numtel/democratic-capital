// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ChildBase.sol";
import "./BytesLib.sol";
using BytesLib for bytes;

/*{
  "name": "Open Registrations",
  "overview": {
    "elections": {}
  },
  "methods": {
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "setElections": {
      "onlyAllowed": true
    },
    "register": {}
  }
}*/
contract RegistrationsByElection is ChildBase {
  address public elections;
  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('register(address)')));

  event ElectionsChanged(address indexed oldElections, address indexed newElections);

  constructor(address _meta, address _group, address _elections, string memory _name)
      ChildBase(_meta, _group, _name) {
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
    bytes memory groupAddress = abi.encode(address(group)).slice(12, 20);
    bytes[] memory txs = new bytes[](1);
    txs[0] = groupAddress.concat(abi.encodeWithSelector(SELECTOR, msg.sender));
    electionContract.propose(txs);
  }
}

interface IElection {
  function propose(bytes[] memory data) external;
}

