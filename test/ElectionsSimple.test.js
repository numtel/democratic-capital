const assert = require('assert');

exports.proposeMinThresholdFails = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const DURATION = 10, THRESHOLD = 0x7fff, MIN_PARTICIPATION = 0xffff;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[2], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  // These elections can only call any method
  const elections = await deployContract(accounts[0], 'ElectionsSimple',
    group.options.address, [], DURATION, THRESHOLD, MIN_PARTICIPATION);

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

  await elections.sendFrom(accounts[0]).vote(key, true);
  await elections.sendFrom(accounts[1]).vote(key, false);

  const details = await elections.methods.details(key).call();
  assert.strictEqual(Number(details.supporting), 1);
  assert.strictEqual(Number(details.against), 1);

  await increaseTime(DURATION);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[0]).process(key)), true,
    "Election did not pass");
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
};
