// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IElectionsByMedian.sol";
import "./IOpenUnregistrations.sol";
import "./IVerifiedGroup.sol";

contract OpenUnregistrations {
  IVerifiedGroup public group;
  address[] public elections;

  constructor(address _group, address[] memory _elections) {
    group = IVerifiedGroup(_group);
    elections = _elections;
  }

  // EIP-165
  function supportsInterface(bytes4 interfaceId) external pure returns(bool) {
    return interfaceId == thisInterfaceId();
  }
  function thisInterfaceId() public pure returns(bytes4) {
    return type(IOpenUnregistrations).interfaceId;
  }

  function unregister() external {
    group.unregister(msg.sender);
    for(uint i = 0; i < elections.length; i++) {
      IElectionsByMedian election = IElectionsByMedian(elections[i]);
      (uint8 _duration,,) =
        election.getProposalConfig(msg.sender);
      if(_duration > 0) {
        election.unsetProposalConfig(msg.sender);
      }
    }
  }
}

