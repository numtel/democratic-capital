// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IElectionsByMedian.sol";
import "./IElectionsSimple.sol";
import "./IOpenRegistrations.sol";
import "./IOpenUnregistrations.sol";
import "./IVerifiedGroup.sol";

/*
  Maintain a list of child contract interfaceIds for the frontend
  in order to recognize the type of each child contract and display its UI
*/
contract TestInterfaceIds {
  bytes4 public ElectionsByMedian = type(IElectionsByMedian).interfaceId;
  bytes4 public ElectionsSimple = type(IElectionsSimple).interfaceId;
  bytes4 public OpenRegistrations = type(IOpenRegistrations).interfaceId;
  bytes4 public OpenUnregistrations = type(IOpenUnregistrations).interfaceId;
  bytes4 public VerifiedGroup = type(IVerifiedGroup).interfaceId;
}
