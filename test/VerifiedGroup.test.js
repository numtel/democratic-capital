const assert = require('assert');

const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

exports.requiresVerified = async function({
  web3, accounts, deployContract, throws,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, SECONDS_PER_DAY);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[0]).register(accounts[0])), true,
    'Not yet verified should throw');

  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);

  await verifiedGroup.sendFrom(accounts[0]).register(accounts[0]);

  const daystamp = Number(await verifiedGroup.methods.daystamp().call());

  // Use future daystamp just to make sure it works
  assert.strictEqual(
    Number((await verifiedGroup.methods.statsOfDay(daystamp + 1).call())
      .registeredCount),
    1, 'Should count registered user');

  await verifiedGroup.sendFrom(accounts[0]).unregister(accounts[0]);
  assert.strictEqual(
    Number((await verifiedGroup.methods.statsOfDay(daystamp).call())
      .registeredCount),
    0, 'Should decrement registered user');
};

// TODO test ban
