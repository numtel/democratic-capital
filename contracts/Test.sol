// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./TxSet.sol";
import "./MedianOfSixteen.sol";

contract Test {
  using TxSet for TxSet.Set;
  TxSet.Set epochTxs;

  using MedianOfSixteen for MedianOfSixteen.Data;
  MedianOfSixteen.Data medianTest;

  function setMOSValue(address account, uint8 value) public {
    medianTest.set(account, value);
  }
  function getMOS() public view returns(uint8) {
    return medianTest.median;
  }
}

