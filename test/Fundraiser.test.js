const assert = require('assert');

exports.succeeds = async function({
  web3, accounts, deployContract, increaseTime, throws, BURN_ACCOUNT,
}) {
  const GOAL = 10, DURATION = 100;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  const token = await deployContract(accounts[0], 'TestERC20');
  const fundraiser = await deployContract(accounts[0], 'Fundraiser',
    BURN_ACCOUNT, group.options.address, token.options.address, GOAL, DURATION, '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  await token.sendFrom(accounts[1]).mint(accounts[1], GOAL);
  await token.sendFrom(accounts[1]).approve(fundraiser.options.address, GOAL);

  await fundraiser.sendFrom(accounts[1]).deposit(GOAL);
  assert.strictEqual(Number(await fundraiser.methods.totalDeposited().call()), GOAL);

  assert.strictEqual(await throws(() =>
    fundraiser.sendFrom(accounts[0]).collectSuccess(accounts[0])), true,
    "Cannot collect before end");

  await increaseTime(DURATION * 1.1);
  await fundraiser.sendFrom(accounts[0]).collectSuccess(accounts[0]);
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), GOAL);
};

exports.withdrawOnFailure = async function({
  web3, accounts, deployContract, increaseTime, throws, BURN_ACCOUNT,
}) {
  const GOAL = 10, DEPOSIT = 9, DURATION = 100;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  const token = await deployContract(accounts[0], 'TestERC20');
  const fundraiser = await deployContract(accounts[0], 'Fundraiser',
    BURN_ACCOUNT, group.options.address, token.options.address, GOAL, DURATION, '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  await token.sendFrom(accounts[1]).mint(accounts[1], DEPOSIT);
  await token.sendFrom(accounts[1]).approve(fundraiser.options.address, DEPOSIT);

  await fundraiser.sendFrom(accounts[1]).deposit(DEPOSIT);
  assert.strictEqual(Number(await fundraiser.methods.totalDeposited().call()), DEPOSIT);

  await increaseTime(DURATION * 1.1);
  assert.strictEqual(await throws(() =>
    fundraiser.sendFrom(accounts[0]).collectSuccess(accounts[0])), true,
    "Cannot collect without meeting goal");

  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), 0);
  await fundraiser.sendFrom(accounts[1]).withdraw();
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), DEPOSIT);

  // Ensure failure isn't because of lack of balance
  await token.sendFrom(accounts[1]).mint(fundraiser.options.address, DEPOSIT);
  assert.strictEqual(await throws(() =>
    fundraiser.sendFrom(accounts[1]).withdraw()), true,
    "Cannot withdraw twice");
  assert.strictEqual(Number(await token.methods.balanceOf(fundraiser.options.address).call()), DEPOSIT);
};



