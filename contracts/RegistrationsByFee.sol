// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./IRegistrationsByFee.sol";
import "./ChildBase.sol";

contract RegistrationsByFee is ChildBase {
  address public feeToken;
  uint public amount;

  bytes4 private constant SELECTOR = bytes4(keccak256(bytes('transferFrom(address,address,uint256)')));

  event TokenChanged(address indexed oldToken, address indexed newToken);
  event AmountChanged(uint oldAmount, uint newAmount);

  constructor(address _group, address _token, uint _amount, string memory _name)
      ChildBase(_group, type(IRegistrationsByFee).interfaceId, _name) {
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
    // Safe transferFrom
    // https://github.com/Uniswap/v2-core/blob/8b82b04a0b9e696c0e83f8b2f00e5d7be6888c79/contracts/UniswapV2Pair.sol#L44
    (bool success, bytes memory data) = feeToken.call(abi.encodeWithSelector(SELECTOR, msg.sender, address(group), amount));
    require(success && (data.length == 0 || abi.decode(data, (bool))), 'TRANSFER_FAILED');
  }
}


