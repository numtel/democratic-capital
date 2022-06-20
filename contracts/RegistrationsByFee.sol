// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ChildBase.sol";
import "./safeTransfer.sol";

/*{
  "name": "Registrations By Fee",
  "overview": {
    "feeToken": { "display": ["token"] },
    "amount": {"decimals": "feeToken"}
  },
  "methods": {
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "setToken": {
      "onlyAllowed": true,
      "fields": [
        {"select":["Children"], "preview":"token"}
      ]
    },
    "setAmount": {
      "onlyAllowed": true,
      "fields": [
        {"decimals": "feeToken"}
      ]
    },
    "register": {
      "approve": ["feeToken"],
      "approveAmount": ["amount"]
    }
  }
}*/
contract RegistrationsByFee is ChildBase {
  address public feeToken;
  uint public amount;

  event TokenChanged(address indexed oldToken, address indexed newToken);
  event AmountChanged(uint oldAmount, uint newAmount);

  constructor(address _meta, address _group, address _token, uint _amount, string memory _name)
      ChildBase(_meta, _group, _name) {
    require(_amount > 0, 'Invalid Amount');
    feeToken = _token;
    amount = _amount;
  }

  function setToken(address _token) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    emit TokenChanged(feeToken, _token);
    feeToken = _token;
  }

  function setAmount(uint _amount) external {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
    require(_amount > 0, 'Invalid Amount');
    emit AmountChanged(amount, _amount);
    amount = _amount;
  }

  function register() external {
    require(group.isVerified(msg.sender), 'Not Verified');
    require(!group.isRegistered(msg.sender), 'Already Registered');
    group.register(msg.sender);
    safeTransfer.invokeFrom(feeToken, msg.sender, address(group), amount);
  }
}


