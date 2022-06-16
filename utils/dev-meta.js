const fs = require('fs');
const zlib = require('zlib');

const OUT_DIR = 'meta/';
const BUILD_DIR = 'build/';
const CONTRACT_DIR = 'contracts/';
const SUFFIX = '_meta';

try {
  fs.mkdirSync(OUT_DIR);
} catch(error) {}

const files = fs.readdirSync(BUILD_DIR)
  .filter(file => file.endsWith('.abi') && file.indexOf(SUFFIX) === -1);

for(let file of files) {
  const abiText = fs.readFileSync(BUILD_DIR + file);
  const abiZip = zlib.gzipSync(abiText);
  let customZip, customText;
  try {
    const contractText = fs.readFileSync(CONTRACT_DIR + file.slice(0, -4) + '.sol', 'utf8');
    const customStart = contractText.indexOf('/*{');
    let customEnd;
    if(customStart !== -1) {
      customEnd = contractText.indexOf('}*/');
    }
    if(customStart !== -1 && customEnd > customStart) {
      customText = contractText.slice(customStart + 2, customEnd + 1);
      JSON.parse(customText);
      customZip = zlib.gzipSync(Buffer.from(customText, 'utf8'));
    }
  } catch(error) {
    if(error.message.indexOf('JSON') !== -1) {
      console.log("JSON Error in ", file.slice(0, -4));
      const pos = error.message.match(/position ([\d]+)/);
      if(pos) {
        const posVal = Number(pos[1]);
        console.log(customText.slice(posVal-100, posVal), '^', customText.slice(posVal, posVal+100));
      }
      throw error;
    }
  }
  const source =
`// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract ${file.slice(0, -4)}_meta {
  string public name = "${file.slice(0, -4)}";
  function getABI() public pure returns (bytes memory) {
    return hex"${abiZip.toString('hex')}";
  }
  function getCustom() public pure returns (bytes memory) {
    return hex"${customZip ? customZip.toString('hex') : '00'}";
  }
}
`;
  const outFile = OUT_DIR + file.slice(0, -4) + SUFFIX + '.sol';
  fs.writeFileSync(outFile, source);
  console.log('Wrote', outFile);
}

