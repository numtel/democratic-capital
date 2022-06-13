
const metaABI = [{"inputs":[],"name":"getABI","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getCustom","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"}];

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
    contract.metadata = cached.custom;
    return contract;
  }
  const meta = new web3.eth.Contract(metaABI, '0x' + metaAddress.slice(-40));
  const zippedHex = await meta.methods.getABI().call();
  const zipped = fromHexString(zippedHex.slice(2));
  const gunzip = new Zlib.Gunzip(zipped);
  const plain = new TextDecoder().decode(gunzip.decompress());
  const abi = JSON.parse(plain);
  const contract = new web3.eth.Contract(abi, address);
  const customHex = await meta.methods.getCustom().call();
  if(customHex !== '0x00') {
    const zipped = fromHexString(customHex.slice(2));
    const gunzip = new Zlib.Gunzip(zipped);
    const plain = new TextDecoder().decode(gunzip.decompress());
    const custom = JSON.parse(plain);
    contract.metadata = custom;
  }
  if(app.cacheABI) {
    localStorage.setItem(metaAddress, JSON.stringify({
      abi, custom: contract.metadata
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

export function ellipseAddress(address) {
  return address.slice(0, 6) + '...' + address.slice(-4);
}

export const ZERO_ACCOUNT = '0x0000000000000000000000000000000000000000';

export function delay(ms) {
  return new Promise(resolve => {
    setTimeout(() => resolve(), ms);
  });
}
