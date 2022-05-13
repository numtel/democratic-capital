const assert = require('assert');

exports.verificationRequired = async function({
  accounts, contracts, currentTimestamp, SECONDS_PER_YEAR, GAS_AMOUNT
}) {
  let hadError = false;
  try {
    await contracts.DemocraticToken.methods.propose()
      .send({ from: accounts[0], gas: GAS_AMOUNT });
  } catch(error) { hadError = true; }
  assert.equal(hadError, true, 'Should fail before verification');

  await contracts.MockVerification.methods.setStatus(
      accounts[0], currentTimestamp() + SECONDS_PER_YEAR)
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  // This will succeed now
  await contracts.DemocraticToken.methods.propose()
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  // Reset verification
  await contracts.MockVerification.methods.setStatus(accounts[0], 0)
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  hadError = false;
  try {
    await contracts.DemocraticToken.methods.propose()
      .send({ from: accounts[0], gas: GAS_AMOUNT });
  } catch(error) { hadError = true; }
  assert.equal(hadError, true, 'Should fail without verification');
};

exports.collectAfter3Days = async function({
  accounts, contracts, currentTimestamp, SECONDS_PER_YEAR, GAS_AMOUNT,
  web3, INITIAL_EMISSION, increaseTime, BURN_ACCOUNT,
}) {
  await contracts.MockVerification.methods.setStatus(
      accounts[0], currentTimestamp() + SECONDS_PER_YEAR)
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  await contracts.DemocraticToken.methods.registerAccount()
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  const startBalance =
    await contracts.DemocraticToken.methods.balanceOf(accounts[0]).call();
  assert.equal(Number(startBalance), 0, 'Balance should initialize to 0');

  // Go forward 2 days because day 0 gives first emission
  await increaseTime(86400 * 2);

  await contracts.DemocraticToken.methods.collectEmissions()
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  const endBalance =
    await contracts.DemocraticToken.methods.balanceOf(accounts[0]).call();
  assert.equal(Number(endBalance), INITIAL_EMISSION * 3, 'Balance should have updated');

  // Reset balance
  await contracts.DemocraticToken.methods.transfer(BURN_ACCOUNT, endBalance)
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  // Reset verification
  await contracts.MockVerification.methods.setStatus(accounts[0], 0)
    .send({ from: accounts[0], gas: GAS_AMOUNT });

  // Reset registrations
  await contracts.DemocraticToken.methods.unregisterAccount()
    .send({ from: accounts[0], gas: GAS_AMOUNT });
};
