// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./MedianOfSixteen.sol";
using MedianOfSixteen for MedianOfSixteen.Data;

import "./ElectionBase.sol";

/*{
  "name": "Elections by Median",
  "overview": {
    "Median Configuration": {
      "function":"getProposalConfig",
      "display": [
        {"hint": "Number of Days",
         "special": [ {"value": "0", "label": "Not Set"} ]},
        {"type":"percentage",
         "special": [ {"value": "0", "label": ""} ],
         "min": 1,
         "max": 16,
         "minPercent": 50,
         "maxPercent": 100},
        {"type":"percentage",
         "special": [ {"value": "0", "label": ""} ],
         "min": 1,
         "max": 16,
         "minPercent": 0,
         "maxPercent": 100}
      ]
    },
    "My Configuration Ballot": {
      "function":"getProposalConfig",
      "args": ["account"],
      "display": [
        {"hint": "Number of Days",
         "special": [ {"value": "0", "label": "Not Set"} ]},
        {"type":"percentage",
         "special": [ {"value": "0", "label": ""} ],
         "min": 1,
         "max": 16,
         "minPercent": 50,
         "maxPercent": 100},
        {"type":"percentage",
         "special": [ {"value": "0", "label": ""} ],
         "min": 1,
         "max": 16,
         "minPercent": 0,
         "maxPercent": 100}
      ]
    },
    "proposalConfigCount": {}
  },
  "methods": {
    "propose": {
      "onlyMember": true,
      "fields": [
        {"input":"txs"}
      ]
    },
    "setText": {
      "onlyAllowed": true
    },
    "setName": {
      "onlyAllowed": true
    },
    "setProposalConfig": {
      "onlyMember": true,
      "fields": [
        {"input":"range",
         "min": 1,
         "max": 16,
         "hint": "Number of Days"},
        {"input":"percentage",
         "min": 1,
         "max": 16,
         "minPercent": 50,
         "maxPercent": 100},
        {"input":"percentage",
         "min": 1,
         "max": 16,
         "minPercent": 0,
         "maxPercent": 100}
      ]
    },
    "unsetProposalConfig": {
      "onlyMember": true,
      "fields": [
        {"hidden": "account"}
      ]
    }
  },
  "display": {
    "Proposals": {}
  }
}*/
contract ElectionsByMedian is ElectionBase {
  MedianOfSixteen.Data duration;
  MedianOfSixteen.Data threshold;
  MedianOfSixteen.Data minParticipation;

  uint constant SECONDS_PER_DAY = 60 * 60 * 24;

  constructor(
    address _meta,
    address _group,
    bytes[] memory _allowedInvokePrefixes,
    string memory _name
  )
  ElectionBase( _allowedInvokePrefixes)
  ChildBase(_meta, _group, _name) {}

  // Lifecycle methods
  function onAllow() external {
    require(msg.sender == address(group));
    group.hookUnregister(this.unsetProposalConfig.selector);
  }

  // General usage methods
  function propose(bytes[] memory data) external {
    require(proposalConfigCount() > 0, 'Missing Proposal Config');
    _propose(
        data,
      duration.median * SECONDS_PER_DAY,
      ((threshold.median - 1) * 2185) + 0x7fff,
      // minVoters - 1: 0%, 16: 100% 6.67% each step
      (group.registeredCount() * (minParticipation.median - 1)) / 15
    );
  }

  function setProposalConfig(
    uint8 _duration, uint8 _threshold, uint8 _minParticipation
  ) external {
    requireAuth();
    duration.set(msg.sender, _duration);
    threshold.set(msg.sender, _threshold);
    minParticipation.set(msg.sender, _minParticipation);
  }

  function unsetProposalConfig(address account) external {
    // Allow contracts to invoke this function so that
    // they can clean out any users that unregister
    require(account == msg.sender || group.contractAllowed(msg.sender));
    duration.unsetAccount(account);
    threshold.unsetAccount(account);
    minParticipation.unsetAccount(account);
  }

  function getProposalConfig(address account) external view
      returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation) {
    _duration = duration.accountValues[account];
    _threshold = threshold.accountValues[account];
    _minParticipation = minParticipation.accountValues[account];
  }

  function getProposalConfig() external view
      returns(uint8 _duration, uint8 _threshold, uint8 _minParticipation) {
    _duration = duration.median;
    _threshold = threshold.median;
    _minParticipation = minParticipation.median;
  }

  function proposalConfigCount() public view returns(uint) {
    return duration.count;
  }
}

