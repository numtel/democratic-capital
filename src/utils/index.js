
const metaABI = [{"inputs":[],"name":"getABI","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getCustom","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"}];

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export async function selfDescribingContract(address) {
  const web3 = app.web3;
  const metaAddress = await web3.eth.call({
    to: address,
    data: web3.eth.abi.encodeFunctionSignature('meta()'),
  });
  if(app.cacheABI && localStorage.hasOwnProperty(metaAddress)) {
    const cached = JSON.parse(localStorage.getItem(metaAddress));
    const contract = new web3.eth.Contract(cached.abi, address);
    contract.metadata = cached.custom || {};
    contract.metaname = cached.metaname;
    return contract;
  }
  const meta = new web3.eth.Contract(metaABI, '0x' + metaAddress.slice(-40));
  const metaname = await meta.methods.name().call();
  const zippedHex = await meta.methods.getABI().call();
  const zipped = fromHexString(zippedHex.slice(2));
  const gunzip = new Zlib.Gunzip(zipped);
  const plain = new TextDecoder().decode(gunzip.decompress());
  const abi = JSON.parse(plain);
  const contract = new web3.eth.Contract(abi, address);
  contract.metaname = metaname;
  const customHex = await meta.methods.getCustom().call();
  if(customHex !== '0x00') {
    const zipped = fromHexString(customHex.slice(2));
    const gunzip = new Zlib.Gunzip(zipped);
    const plain = new TextDecoder().decode(gunzip.decompress());
    const custom = JSON.parse(plain);
    contract.metadata = custom;
  } else {
    contract.metadata = {};
  }
  if(app.cacheABI) {
    localStorage.setItem(metaAddress, JSON.stringify({
      abi, custom: contract.metadata, metaname
    }));
  }
  return contract;
}

export function explorer(address) {
  return window.config.blockExplorer + '/address/' + address;
}

export function isAddress(address) {
  return typeof address === 'string' && address.match(/^0x[a-f0-9]{40}$/i);
}

export function isFunSig(value) {
  return typeof value === 'string' && value.match(/^0x[a-f0-9]{8}$/i);
}

export function ellipseAddress(address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export function remaining(seconds) {
  const units = [
    { value: 1, unit: 'second' },
    { value: 60, unit: 'minute' },
    { value: 60 * 60, unit: 'hour' },
    { value: 60 * 60 * 24, unit: 'day' },
  ];
  let remaining = seconds;
  let out = [];
  for(let i = units.length - 1; i >= 0;  i--) {
    if(remaining >= units[i].value) {
      const count = Math.floor(remaining / units[i].value);
      out.push(count.toString(10) + ' ' + units[i].unit + (count !== 1 ? 's' : ''));
      remaining = remaining - (count * units[i].value);
    }
  }
  return out.join(', ');
}

export const ZERO_ACCOUNT = '0x0000000000000000000000000000000000000000';

export function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}

export function applyDecimals(input, decimals) {
  decimals = Number(decimals);
  input = String(input);
  if(input === '0') return input;
  while(input.length <= decimals) {
    input = '0' + input;
  }
  const sep = decimalSeparator();
  input = input.slice(0, -decimals) + sep + input.slice(-decimals);
  while(input[input.length - 1] === '0') {
    input = input.slice(0, -1);
  }
  if(input[input.length - 1] === sep) {
    input = input.slice(0, -1);
  }
  return input;
}

export function reverseDecimals(input, decimals) {
  decimals = Number(decimals);
  input = String(input);
  if(input === '0') return input;
  const sep = decimalSeparator();
  const sepIndex = input.indexOf(sep);
  if(sepIndex === -1) {
    // Add all digits to end
    input += zeroStr(decimals);
  } else {
    const trailingZeros = decimals - (input.length - sepIndex - 1);
    if(trailingZeros < 0) {
      // Too many decimal places input
      input = input.slice(0, sepIndex) + input.slice(sepIndex + 1, trailingZeros);
    } else {
      // Right pad
      input = input.slice(0, sepIndex) + input.slice(sepIndex + 1) + zeroStr(trailingZeros);
    }
  }
  return input;
}

function zeroStr(length) {
  let str = '';
  while(str.length < length) {
    str += '0';
  }
  return str;
}

// From https://stackoverflow.com/q/2085275
function decimalSeparator() {
  const n = 1.1;
  return n.toLocaleString().substring(1, 2);
}
