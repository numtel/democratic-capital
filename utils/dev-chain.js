const fs = require('fs');
const Web3 = require('web3');
const ganache = require('ganache');

const devSeed = require('../dev-seed.json');

const PORT = 8545;
const BUILD_DIR = 'build/';
const GAS_AMOUNT = 20000000;
const PROMPT = '> ';
const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

const currentTimestamp = (returnDay) =>
  Math.floor(Date.now() / (1000 * (returnDay ? SECONDS_PER_DAY : 1)));

const ganacheServer = ganache.server({
  wallet: { mnemonic: devSeed.seed },
  logging: { quiet: false },
});
ganacheServer.listen(PORT, async err => {
  if (err) throw err;
  console.log(`Ganache listening on port ${PORT}...`);
  await deployContracts();
});
const web3 = new Web3(ganacheServer.provider);

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

const commands = {
  help: async function() {
    for(let cur of Object.keys(commands)) {
      const argsString = commands[cur].toString()
        .match(/^async function\(([^\)]+)?/)[1];
      let args = [];
      if(argsString) {
        args = argsString
          .split(',')
          .map(arg => `[${arg.trim()}]`);
      }
      console.log(cur, args.join(' '));
    }
  },
  accounts: async function() {
    console.log(accounts.map((acct, i) => `${i}: ${acct}`).join('\n'));
  },
  verify: async function(address, expiration) {
    if(arguments.length === 0) return console.log('Address required');
    if(address.length !== 42) address = accounts[address];
    if(!address) return console.log('Address required');
    if(arguments.length === 1) expiration = currentTimestamp() + SECONDS_PER_YEAR;
    if(isNaN(expiration)) return console.log('Invalid expiration');
    await contracts.MockVerification.instance.methods.setStatus(
        address, expiration)
      .send({ from: accounts[0], gas: GAS_AMOUNT });
  },
  expiration: async function(address) {
    if(arguments.length === 0) return console.log('Address required');
    if(address.length !== 42) address = accounts[address];
    if(!address) return console.log('Address required');
    console.log(await
      contracts.MockVerification.instance.methods.addressExpiration(address).call());
  },
  nextday: async function() {
    await new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        id: Date.now(),
        params: [SECONDS_PER_DAY],
      }, (err, res) => {
        if(err) return reject(err);
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_mine',
          id: Date.now(),
        }, (err, res) => {
          if(err) return reject(err)
          resolve(res)
        });
      });
    });
  },
};
let accounts = [];

process.stdin.on('readable', async () => {
  let chunk;
  while (null !== (chunk = process.stdin.read())) {
    const argv = chunk.toString('utf8').trim().split(' ');
    if(argv[0] in commands) {
      await commands[argv[0]].apply(null, argv.slice(1));
    } else {
      console.log('Invalid command', argv[0]);
    }
    process.stdout.write(PROMPT);
  }
});

async function deployContracts() {
  accounts = await ganacheServer.provider.request({
    method: "eth_accounts",
    params: []
  });
  for(let contractName of Object.keys(contracts)) {
    console.log(`Deploying ${contractName}...`);
    const bytecode = fs.readFileSync(`${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const newContract = new web3.eth.Contract(abi);
    const deployed = await newContract.deploy({
      data: bytecode,
      arguments: 'constructorArgs' in contracts[contractName]
        ? contracts[contractName].constructorArgs.map(arg =>
            typeof arg === 'function' ? arg() : arg)
        : [],
    }).send({ from: accounts[0], gas: GAS_AMOUNT });
    contracts[contractName].instance = deployed;
  }
  // Provide contract addresses to frontend
  fs.writeFileSync(`${BUILD_DIR}config.js`, `
  window.config=${JSON.stringify({
    cacheABI: false,
    rpc: `http://localhost:${PORT}`,
    chain: '0x539',
    chainName: 'Localhost',
    nativeCurrency: {
      name: "ETH",
      symbol: "ETH",
      decimals: 18
    },
    blockExplorer: "https://etherscan.io",
    contracts: Object.keys(contracts).reduce((out, cur) => {
      out[cur] = {
        address: contracts[cur].instance.options.address,
      };
      return out;
    }, {}),
  })};
  `);
  console.log('Democratic Capital Development Chain CLI\nType "help" for commands, ctrl+c to exit');
  process.stdout.write(PROMPT);
}
