const assert = require('assert');

const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;

exports.requiresVerified = async function({
  web3, accounts, deployContract, throws,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[0]).register(1, 1, 1)), true,
    'Not yet verified should throw');

  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);

  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    0, 'Should have 0 registered');

  await verifiedGroup.sendFrom(accounts[0]).register(1, 1, 1);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    1, 'Should have 1 registered');

  await verifiedGroup.sendFrom(accounts[0]).unregister(accounts[0]);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    0, 'Should have 0 registered');
};

// TODO test ban
// TODO test unregister from child contract
// TODO test changing verification contract
// TODO test child contract allowing/disallowing/invoking from
// TODO test setProposalConfig
