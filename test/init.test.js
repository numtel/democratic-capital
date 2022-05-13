const assert = require('assert');
const helpers = require('./helpers');

exports.verificationRequired = async function({
  accounts, contracts, currentTimestamp, SECONDS_PER_YEAR, GAS_AMOUNT
}) {
  let hadError = false;
  try {
    await contracts.DemocraticToken.methods.propose()
      .send({ from: accounts[0], gas: GAS_AMOUNT });
  } catch(error) { hadError = true; }
  assert.strictEqual(hadError, true, 'Should fail before verification');

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
  assert.strictEqual(hadError, true, 'Should fail without verification');
};

exports.collectAfter3Days = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION, increaseTime, SECONDS_PER_DAY,
}) {
  // Go forward 2 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 2);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  assert.strictEqual(endBalance, INITIAL_EMISSION * 3, 'Balance should have updated');
});

exports.collectAfter6Days3Epochs = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay,
}) {
  // Configure the upcoming epochs
  await send.newEmissionEpoch(curDay, INITIAL_EMISSION * 2, 0);
  await send.newEmissionEpoch(curDay + 3, INITIAL_EMISSION * 3, 0);
  await send.newEmissionEpoch(curDay + 5, INITIAL_EMISSION * 4, 0);

  // Go forward 5 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 5);
  await send.collectEmissions();

  const endBalance = await call.balanceOf(account);
  // 1 day @ 4x, 2 days @ 3x , 3 days @ 2x
  assert.strictEqual(Number(endBalance), INITIAL_EMISSION * 16, 'Balance should have updated');
});

exports.collectAfter10Days7DayExpiry = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay,
}) {
  await send.newEmissionEpoch(curDay + 5, INITIAL_EMISSION * 2, 7);

  await increaseTime(SECONDS_PER_DAY * 9);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 5 days @ 2x, 2 days @ 1x, even though 10 passed
  assert.strictEqual(endBalance, INITIAL_EMISSION * 12, 'Balance should have updated');
});
