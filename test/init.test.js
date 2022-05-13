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
