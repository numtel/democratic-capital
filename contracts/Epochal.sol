// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract Epochal {
  struct EpochTx {
    address to;
    bytes data;
  }

  EpochTx[] public epochTx;
  event TxSent(address to, bytes data, bytes returned);

  function addEpochTx(uint beforeIndex, address to, bytes memory data) public {
    if(beforeIndex == epochTx.length) {
      epochTx.push(EpochTx(to, data));
    } else {
      epochTx.push(EpochTx(
        epochTx[epochTx.length - 1].to,
        epochTx[epochTx.length - 1].data
      ));
      for(uint i=epochTx.length - 1; i>beforeIndex; i--) {
        epochTx[i] = epochTx[i - 1];
      }
      epochTx[beforeIndex] = EpochTx(to, data);
    }
  }
  function removeEpochTx(uint index) public {
    for(uint i=index; i<epochTx.length - 2; i++) {
      epochTx[i] = epochTx[i + 1];
    }
    epochTx.pop();
  }
  function updateEpochTx(uint index, address to, bytes memory data) public {
    epochTx[index] = EpochTx(to, data);
  }
  function invoke() public {
    for(uint i=0; i<epochTx.length; i++) {
      (bool success, bytes memory data) = epochTx[i].to.call(epochTx[i].data);
      emit TxSent(epochTx[i].to, epochTx[i].data, data);
      require(success);
    }
  }
}
