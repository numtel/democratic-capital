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
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY,
}) {
  // Go forward 2 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 2);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  assert.strictEqual(endBalance, INITIAL_EMISSION * 3, 'Balance should update');
});

exports.collectAfter7Days3Epochs = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch,
}) {
  // Configure the upcoming epochs
  await send.newEpoch(Epoch(1, INITIAL_EMISSION * 2));
  await send.newEpoch(Epoch(4, INITIAL_EMISSION * 3));
  await send.newEpoch(Epoch(6, INITIAL_EMISSION * 4));

  // Go forward 6 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 6);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 1 day @ 4x, 2 days @ 3x, 3 days @ 2x, 1 day @ 1x
  assert.strictEqual(endBalance, INITIAL_EMISSION * 17, 'Balance should update');
});

exports.collectAfter10Days7DayExpiry = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch,
}) {
  await send.newEpoch(Epoch(5, INITIAL_EMISSION * 2, 7));

  await increaseTime(SECONDS_PER_DAY * 9);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 5 days @ 2x, 2 days @ 1x, even though 10 passed
  assert.strictEqual(endBalance, INITIAL_EMISSION * 12, 'Balance should update');
});

exports.allowEpochOverwriteAndBeforeLast = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch,
}) {
  await send.newEpoch(Epoch(1, INITIAL_EMISSION * 2));
  await send.newEpoch(Epoch(3, INITIAL_EMISSION * 4));
  // Insert before last epoch
  await send.newEpoch(Epoch(2, INITIAL_EMISSION * 5));
  // Overwrite existing epoch
  await send.newEpoch(Epoch(1, INITIAL_EMISSION * 3));

  await increaseTime(SECONDS_PER_DAY * 3);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 1@1x + 1@3x + 1@5x + 1@4x
  assert.strictEqual(endBalance, INITIAL_EMISSION * 13, 'Balance should update');
});
