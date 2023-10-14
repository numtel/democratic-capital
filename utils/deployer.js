const fs = require('fs');
const Web3 = require('web3');
const BUILD_DIR = 'build/';

const secrets = require('../../deploy-demo.json');
const chain = process.argv[2];
if(!(chain in secrets.chains))
  throw new Error('Invalid chain name! Specify chain name as first argument');

const chainParams = secrets.chains[chain];

const web3 = new Web3(chainParams.rpc);

const signer = web3.eth.accounts.privateKeyToAccount(secrets.private);
web3.eth.accounts.wallet.add(signer);

const contracts = {
  MockVerification: {},
  InvokeRewriter: {},
  FactoryBrowser_meta: {},
  FactoryBrowser: { constructorArgs: [
    () => contracts.FactoryBrowser_meta.instance.options.address,
  ]},
  ...factory('VerifiedGroup'), // Special case
  ...factory('ERC20LiquidityPool'),
  ...factory('ERC20Mintable'),
  ...factory('ElectionsByMedian'),
  ...factory('ElectionsSimple'),
  ...factory('ElectionsSimpleQuadratic'),
  ...factory('Fundraiser'),
  ...factory('MemberTokenEmissions'),
  ...factory('OpenRegistrations'),
  ...factory('OpenUnregistrations'),
  ...factory('RegistrationsByElection'),
  ...factory('RegistrationsByFee'),
};

function factory(childName) {
  const factoryArgs = [
    () => contracts[childName + 'Factory_meta'].instance.options.address,
    () => contracts[childName + '_meta'].instance.options.address,
  ];
  if(childName !== 'VerifiedGroup') {
    factoryArgs.push(
      () => contracts['VerifiedGroupFactory'].instance.options.address);
  } else {
    factoryArgs.push(
      () => contracts['InvokeRewriter'].instance.options.address);
  }
  return {
    [childName + '_meta']: {},
    [childName + 'Factory_meta'] : {},
    [childName + 'Factory']: { constructorArgs: factoryArgs },
  }
}

async function deployContracts() {
  for(let contractName of Object.keys(contracts)) {
    console.log(`Deploying ${contractName}...`);
    const bytecode = fs.readFileSync(`${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const newContract = new web3.eth.Contract(abi);
    const balance = await web3.eth.getBalance(secrets.public);
    console.log('gas: ', chainParams.gas, 'fee: ', chainParams.gas*chainParams.gasPrice, 'balance: ', balance, secrets.public);
    const deployed = await newContract.deploy({
      data: bytecode,
      arguments: 'constructorArgs' in contracts[contractName]
        ? contracts[contractName].constructorArgs.map(arg =>
            typeof arg === 'function' ? arg() : arg)
        : [],
    }).send({ from: secrets.public, gas: chainParams.gas });
    contracts[contractName].instance = deployed;
  }
  // Provide contract addresses to frontend
  fs.writeFileSync(`${BUILD_DIR}config.js`, `
  window.config=${JSON.stringify({
    cacheABI: true,
    rpc: chainParams.rpc,
    chain: chainParams.chain,
    chainName: 'Deployed',
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorer: chainParams.explorer,
    contracts: Object.keys(contracts).reduce((out, cur) => {
      out[cur] = {
        address: contracts[cur].instance.options.address,
      };
      return out;
    }, {}),
  })};
  `);
}

deployContracts();
