
const metaABI = [{"inputs":[],"name":"getABI","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getCustom","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"}];

const fromHexString = (hexString) =>
  Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));

export async function selfDescribingContract(web3, address) {
  const metaAddress = await web3.eth.call({
    to: address,
    data: web3.eth.abi.encodeFunctionSignature('meta()'),
  });
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
  return contract;
}
