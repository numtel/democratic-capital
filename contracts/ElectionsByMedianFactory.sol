// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionsByMedian.sol";
import "./ChildFactory.sol";

contract ElectionsByMedianFactory is ChildFactory {
  function deployNew(address group, bytes[] memory allowedInvokePrefixes, string memory name) external {
    requireMember(group);
    ElectionsByMedian newContract = new ElectionsByMedian(group, allowedInvokePrefixes, name);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}
