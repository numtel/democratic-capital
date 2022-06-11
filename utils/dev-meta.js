const fs = require('fs');
const zlib = require('zlib');

const OUT_DIR = 'meta/';
const BUILD_DIR = 'build/';
const SUFFIX = '_meta';

fs.mkdirSync(OUT_DIR);

const files = fs.readdirSync(BUILD_DIR)
  .filter(file => file.endsWith('.abi') && file.indexOf(SUFFIX) === -1);

for(let file of files) {
  const abiText = fs.readFileSync(BUILD_DIR + file);
  const zip = zlib.gzipSync(abiText);
  const source =
`// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

contract ${file.slice(0, -4)}_meta {
  function getABI() public pure returns (bytes memory) {
    return hex"${zip.toString('hex')}";
  }
}
`;
  const outFile = OUT_DIR + file.slice(0, -4) + SUFFIX + '.sol';
  fs.writeFileSync(outFile, source);
  console.log('Wrote', outFile);
}

