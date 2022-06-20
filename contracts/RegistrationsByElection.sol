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
    "register": {
      "fields": [{"hint":"Add a message to your registration proposal"}]
    }
  }
}*/
contract RegistrationsByElection is ChildBase {
  address public elections;
  bytes4 private constant SELECTOR_REGISTER = bytes4(keccak256(bytes('register(address)')));
  bytes4 private constant SELECTOR_TEXT = bytes4(keccak256(bytes('proposalText(string)')));

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

  function register(string calldata text) external {
    require(group.isVerified(msg.sender), 'Not Verified');
    require(!group.isRegistered(msg.sender), 'Already Registered');
    IElection electionContract = IElection(elections);
    bytes memory groupAddress = abi.encode(address(group)).slice(12, 20);
    bytes memory electionsAddress = abi.encode(elections).slice(12, 20);
    bytes[] memory txs = new bytes[](2);
    txs[0] = groupAddress.concat(abi.encodeWithSelector(SELECTOR_REGISTER, msg.sender));
    txs[1] = electionsAddress.concat(abi.encodeWithSelector(SELECTOR_TEXT, text));
    electionContract.propose(txs);
  }
}

interface IElection {
  function propose(bytes[] memory data) external;
}

