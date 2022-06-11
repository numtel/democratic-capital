const assert = require('assert');

exports.proposeMinThresholdFails = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const DURATION = 10, THRESHOLD = 0xffff, MIN_PARTICIPATION = 0xffff;
  const QUAD_MULTIPLIER = 10000;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[2], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  const token = await deployContract(accounts[0], 'TestERC20');
  // These elections can only call any method
  const elections = await deployContract(accounts[0], 'ElectionsSimpleQuadratic',
    group.options.address, [], DURATION, THRESHOLD, MIN_PARTICIPATION,
    token.options.address, QUAD_MULTIPLIER, '');


  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);
  await group.sendFrom(accounts[0]).register(accounts[1]);
  // Give a few seconds so registrations aren't in same second as proposal
  await increaseTime(3);

  const key = (await elections.sendFrom(accounts[0]).propose(
      group.methods.unregister(accounts[1]).encodeABI()
    )).events.NewElection.returnValues.key;

  await increaseTime(3);
  await group.sendFrom(accounts[0]).register(accounts[2]);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[2]).vote(key, true)), true,
    "Cannot vote if registered after election start");

  // First vote is free for quadratic so subtract one from x**2
  const tokenAmount0 = 15 * QUAD_MULTIPLIER;
  const tokenAmount1 = 3 * QUAD_MULTIPLIER;

  await token.sendFrom(accounts[0]).mint(accounts[0], tokenAmount0);
  await token.sendFrom(accounts[0]).approve(elections.options.address, tokenAmount0);
  await elections.sendFrom(accounts[0]).voteQuadratic(key, true, tokenAmount0);
  // Token balance has been spent
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[0]).call()), 0);

  await token.sendFrom(accounts[1]).mint(accounts[1], tokenAmount1);
  await token.sendFrom(accounts[1]).approve(elections.options.address, tokenAmount1);
  await elections.sendFrom(accounts[1]).voteQuadratic(key, false, tokenAmount1);
  // Token balance has been spent
  assert.strictEqual(Number(await token.methods.balanceOf(accounts[1]).call()), 0);

  // Group has all the tokens
  assert.strictEqual(
    Number(await token.methods.balanceOf(group.options.address).call()),
    tokenAmount0 + tokenAmount1);

  const details = await elections.methods.details(key).call();
  assert.strictEqual(Number(details.supporting), 4);
  assert.strictEqual(Number(details.against), 2);

  await increaseTime(DURATION);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[0]).process(key)), true,
    "Election did not pass");
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
};

