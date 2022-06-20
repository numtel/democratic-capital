// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "./IVerifiedGroupFactory.sol";

import "./BytesLib.sol";
using BytesLib for bytes;

contract InvokeRewriter {
  function rewrite(bytes memory data, IVerifiedGroupFactory origin, address group, uint startChildCount) external view returns(address, bytes memory) {
    for(uint i = 0; i < data.length - 20; i++) {
      uint point = addrIndex(uint8(data[i]));
      if(point != 255 &&
         data[i] == data[i+1] &&
         data[i] == data[i+2] &&
         data[i] == data[i+3] &&
         data[i] == data[i+4] &&
         data[i] == data[i+5] &&
         data[i] == data[i+6] &&
         data[i] == data[i+7] &&
         data[i] == data[i+8] &&
         data[i] == data[i+9] &&
         data[i] == data[i+10] &&
         data[i] == data[i+11] &&
         data[i] == data[i+12] &&
         data[i] == data[i+13] &&
         data[i] == data[i+14] &&
         data[i] == data[i+15] &&
         data[i] == data[i+16] &&
         data[i] == data[i+17] &&
         data[i] == data[i+18] &&
         data[i] == data[i+19]) {
        address item = origin.groupChildren(group, startChildCount + point).item;
        data = data.slice(0, i).concat(abi.encodePacked(bytes20(item))).concat(data.slice(i + 20, data.length - i - 20));
      }
    }
    return (data.toAddress(0), data.slice(20, data.length - 20));
  }
  function addrIndex(uint8 point) internal pure returns(uint) {
    if(point == 0x11) return 0;
    if(point == 0x22) return 1;
    if(point == 0x33) return 2;
    if(point == 0x44) return 3;
    if(point == 0x55) return 4;
    if(point == 0x66) return 5;
    if(point == 0x77) return 6;
    if(point == 0x88) return 7;
    if(point == 0x99) return 8;
    return 255; // Error case
  }
}
