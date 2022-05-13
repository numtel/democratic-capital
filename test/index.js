const Web3 = require('web3');
const ganache = require('ganache');
const fs = require('fs');

const web3 = new Web3(ganache.provider({ logging: { quiet: true } }));
web3.eth.handleRevert = true;

const BUILD_DIR = 'build/';
const SECONDS_PER_YEAR = 60 * 60 * 24 * 365;
const GAS_AMOUNT = 20000000;

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
  const currentTimestamp = () => Math.floor(Date.now() / 1000);

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
        ? [ contracts.MockVerification.options.address ]
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
    for(let caseName of Object.keys(theseCases)) {
      totalCount++;
      let failed = false;
      const caseTimerName = `  ${fileName} ${caseName}`;
      console.time(caseTimerName);
      try {
        await theseCases[caseName]({
          // Supply test context as options object in first argument to case
          web3, accounts, contracts, currentTimestamp,
          SECONDS_PER_YEAR, GAS_AMOUNT,
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
