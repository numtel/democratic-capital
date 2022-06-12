// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./ElectionBase.sol";
import "./safeTransfer.sol";

contract ElectionsSimpleQuadratic is ElectionBase {
  uint public durationSeconds;
  uint16 public threshold;
  uint16 public minParticipation;
  address public quadraticToken;
  uint public quadraticMultiplier;

  event DurationChanged(uint oldDuration, uint newDuration);
  event ThresholdChanged(uint16 oldThreshold, uint16 newThreshold);
  event MinParticipationChanged(uint16 oldMinParticipation, uint16 newMinParticipation);
  event QuadraticTokenChanged(address oldToken, address newToken);
  event QuadraticMultiplierChanged(uint oldMultiplier, uint newMultiplier);

  constructor(
    address _group,
    bytes[] memory _allowedInvokePrefixes,
    uint _durationSeconds,
    uint16 _threshold,
    uint16 _minParticipation,
    address _quadraticToken,
    uint _quadraticMultiplier,
    string memory _name
  )
  ElectionBase( _allowedInvokePrefixes)
  ChildBase(_group, _name) {
    durationSeconds = _durationSeconds;
    threshold = _threshold;
    minParticipation = _minParticipation;
    quadraticToken = _quadraticToken;
    quadraticMultiplier = _quadraticMultiplier;
  }

  function propose(bytes[] memory data) external {
    _propose(
        data,
      durationSeconds,
      threshold,
      (group.registeredCount() * minParticipation) / 0xffff
    );
  }

  function voteQuadratic(address key, bool inSupport, uint amount) external {
    requireAuth();
    require(group.joinedTimestamps(msg.sender) < elections[key].startTime,
      "Registered After Election Start");
    require(block.timestamp < elections[key].endTime, "Election Ended");
    require(elections[key].votesByAccount[msg.sender] == 0, "Cannot Vote Again");

    uint votePower = sqrt(1 + (amount / quadraticMultiplier));

    // Effects before interaction
    if(inSupport) {
      elections[key].supporting += votePower;
      elections[key].votesByAccount[msg.sender] = 1;
    } else {
      elections[key].against += votePower;
      elections[key].votesByAccount[msg.sender] = 2;
    }

    if(amount > 0) {
      safeTransfer.invokeFrom(quadraticToken, msg.sender, address(group), amount);
    }
  }

  function setDuration(uint _durationSeconds) external {
    allowed();
    emit DurationChanged(durationSeconds, _durationSeconds);
    durationSeconds = _durationSeconds;
  }
  function setThreshold(uint16 _threshold) external {
    allowed();
    emit ThresholdChanged(threshold, _threshold);
    threshold = _threshold;
  }
  function setMinParticipation(uint16 _minParticipation) external {
    allowed();
    emit MinParticipationChanged(minParticipation, _minParticipation);
    minParticipation = _minParticipation;
  }
  function setQuadraticToken(address _quadraticToken) external {
    allowed();
    emit QuadraticTokenChanged(quadraticToken, _quadraticToken);
    quadraticToken = _quadraticToken;
  }
  function setQuadraticMultiplier(uint _quadraticMultiplier) external {
    allowed();
    emit QuadraticMultiplierChanged(quadraticMultiplier, _quadraticMultiplier);
    quadraticMultiplier = _quadraticMultiplier;
  }

  function allowed() view internal {
    require(group.contractAllowed(msg.sender), 'Invalid Caller');
  }

  // From: https://github.com/Uniswap/v2-core/blob/v1.0.1/contracts/libraries/Math.sol
  // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
  function sqrt(uint y) internal pure returns (uint z) {
    if (y > 3) {
      z = y;
      uint x = y / 2 + 1;
      while (x < z) {
        z = x;
        x = (y / x + x) / 2;
      }
    } else if (y != 0) {
      z = 1;
    }
  }
}
