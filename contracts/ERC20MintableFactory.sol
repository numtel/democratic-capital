// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ERC20Mintable.sol";
import "./ChildFactory.sol";

contract ERC20MintableFactory is ChildFactory {
  function deployNew(
    address group,
    string memory name,
    string memory symbol,
    uint8 decimals
  ) external {
    requireMember(group);
    ERC20Mintable newContract = new ERC20Mintable(group, name, symbol, decimals);
    deployedByGroup[group].push(address(newContract));
    emit NewDeployment(group, address(newContract));
  }
}


