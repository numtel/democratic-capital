const assert = require('assert');

exports.collectAvailable = async function({
  web3, accounts, deployContract, throws, increaseTime, BURN_ACCOUNT,
}) {
  const DECIMALS = 5, PERIOD = 6, AMOUNT = 400000;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], BURN_ACCOUNT, '');
  const token = await deployContract(accounts[0], 'ERC20Mintable',
    BURN_ACCOUNT, group.options.address, 'Test Token', 'TEST', DECIMALS);
  const emissions = await deployContract(accounts[0], 'MemberTokenEmissions',
    BURN_ACCOUNT, group.options.address, token.options.address, PERIOD, AMOUNT, '');
  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  // Ensure emissions don't start until contract is allowed
  await increaseTime(PERIOD * 2);
  await group.sendFrom(accounts[0]).allowContract(emissions.options.address);

  assert.strictEqual(
    Number(await token.methods.balanceOf(accounts[0]).call()),
    0);

  assert.strictEqual(
    Number(await emissions.methods.availableEmissions(accounts[0]).call()),
    0);

  await increaseTime(PERIOD);

  assert.strictEqual(
    Number(await emissions.methods.availableEmissions(accounts[0]).call()),
    AMOUNT);

  await increaseTime(PERIOD);

  assert.strictEqual(
    Number(await emissions.methods.availableEmissions(accounts[0]).call()),
    AMOUNT * 2);

  await emissions.sendFrom(accounts[0]).collectEmissions();

  assert.strictEqual(
    Number(await token.methods.balanceOf(accounts[0]).call()),
    AMOUNT * 2);

  assert.strictEqual(
    Number(await emissions.methods.availableEmissions(accounts[0]).call()),
    0);

  await increaseTime(PERIOD);

  assert.strictEqual(
    Number(await emissions.methods.availableEmissions(accounts[0]).call()),
    AMOUNT);
};


