const Web3 = require('web3');
const ganache = require('ganache');
const fs = require('fs');

const web3 = new Web3(ganache.provider({ logging: { quiet: true } }));
web3.eth.handleRevert = true;

const BUILD_DIR = 'build/';
const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;
const DECIMALS = 4;
const GAS_AMOUNT = 20000000;
const INITIAL_EMISSION = 100000;
const INITIAL_EPOCH = [0, INITIAL_EMISSION, 0, 0, 0xffff, 0xffff, 0];
const BURN_ACCOUNT = '0x0000000000000000000000000000000000000000';

function increaseTime(seconds) {
  return new Promise((resolve, reject) => {
    web3.currentProvider.send({
      jsonrpc: '2.0',
      method: 'evm_increaseTime',
      id: Date.now(),
      params: [seconds],
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
  })
}

const cases = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.js'))
  .reduce((out, caseFile) => {
    out[caseFile.slice(0, -8)] = require(`./${caseFile}`);
    return out;
  }, {});

(async function() {
  const accounts = await new Promise((resolve, reject) => {
    web3.eth.getAccounts((error, accounts) => {
      if(error) reject(error);
      else resolve(accounts);
    });
  });
  const currentTimestamp = (returnDay) =>
    Math.floor(Date.now() / (1000 * (returnDay ? 86400 : 1)));

  const contracts = {};
  // DemocraticToken must come after MockVerification since it uses the deployed
  //  address as a constructor argument
  for(let contractName of ['MockVerification', 'DemocraticToken']) {
    const bytecode = fs.readFileSync(`${BUILD_DIR}${contractName}.bin`, { encoding: 'utf8' });
    const abi = JSON.parse(fs.readFileSync(`${BUILD_DIR}${contractName}.abi`, { encoding: 'utf8' }));
    const contract = new web3.eth.Contract(abi);
    contracts[contractName] = await contract.deploy({
      data: bytecode,
      arguments: contractName === 'DemocraticToken'
        ? [ contracts.MockVerification.options.address, INITIAL_EPOCH ]
        : [],
    // No owner on these contracts, so account used doesn't matter
    }).send({ from: accounts[0], gas: GAS_AMOUNT });
    contracts[contractName].abi = abi;
    contracts[contractName].bytecode = bytecode;
  }

  // Run the test cases!
  let passCount = 0, failCount = 0; totalCount = 0;
  console.time('All Tests');
  for(let fileName of Object.keys(cases)) {
    const theseCases = cases[fileName];
    if(process.argv.length > 2 && fileName !== process.argv[2]) continue;
    for(let caseName of Object.keys(theseCases)) {
      if(process.argv.length > 3 && caseName !== process.argv[3]) continue;
      totalCount++;
      let failed = false;
      const caseTimerName = `  ${fileName} ${caseName}`;
      console.time(caseTimerName);
      try {
        await theseCases[caseName]({
          // Supply test context as options object in first argument to case
          web3, accounts, contracts, currentTimestamp, increaseTime,
          SECONDS_PER_YEAR, SECONDS_PER_DAY, GAS_AMOUNT, INITIAL_EMISSION,
          BURN_ACCOUNT, INITIAL_EPOCH, DECIMALS,
        });
      } catch(error) {
        console.error(error);
        failed = true;
      }
      if(!failed) {
        console.log('PASS');
        passCount++;
      } else {
        console.log('FAILURE');
        failCount++;
      }
      console.timeEnd(caseTimerName);
    }
  }
  console.log(`${passCount} passed, ${failCount} failed of ${totalCount} tests`);
  console.timeEnd('All Tests');
  if(failCount > 0) process.exit(1);
})();
