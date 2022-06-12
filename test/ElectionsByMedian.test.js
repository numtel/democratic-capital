const assert = require('assert');

const SECONDS_PER_DAY = 60 * 60 * 24;

exports.configAndUnregistrationHook = async function({
  web3, accounts, deployContract, throws
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  const elections = await deployContract(accounts[0], 'ElectionsByMedian',
    group.options.address, [], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);

  await elections.sendFrom(accounts[0]).setProposalConfig(1, 1, 1);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[1]).setProposalConfig(1, 1, 1)), true,
    'User not registered');

  await group.sendFrom(accounts[0]).register(accounts[1]);
  await elections.sendFrom(accounts[1]).setProposalConfig(3, 3, 3);

  const account1Medians = await elections.methods.getProposalConfig(accounts[1]).call();
  assert.strictEqual(Number(account1Medians._duration), 3);
  assert.strictEqual(Number(account1Medians._threshold), 3);
  assert.strictEqual(Number(account1Medians._minParticipation), 3);


  const medians = await elections.methods.getProposalConfig().call();
  assert.strictEqual(Number(medians._duration), 2);
  assert.strictEqual(Number(medians._threshold), 2);
  assert.strictEqual(Number(medians._minParticipation), 2);

  // Unregister user and invoke the election unregistration hook
  await group.sendFrom(accounts[0]).unregister(accounts[1]);

  // Medians will have updated after unregistering the account
  const medians2 = await elections.methods.getProposalConfig().call();
  assert.strictEqual(Number(medians2._duration), 1);
  assert.strictEqual(Number(medians2._threshold), 1);
  assert.strictEqual(Number(medians2._minParticipation), 1);

};

exports.proposeWithFilter = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  // XXX Is there a simpler way to get the function selector?
  const unregisterSelector = group.methods.unregister(accounts[0]).encodeABI().slice(2, 10);
  // These elections can only call the unregister method
  const elections = await deployContract(accounts[0], 'ElectionsByMedian',
    group.options.address, [ group.options.address + unregisterSelector ], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);
  await elections.sendFrom(accounts[0]).setProposalConfig(1, 1, 1);

  // Register second user for proposal to unregister
  await group.sendFrom(accounts[0]).register(accounts[1]);

  // Give a few seconds so registrations aren't in same second as proposal
  await increaseTime(3);

  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[0]).propose([
      group.options.address + group.methods.register(accounts[2]).encodeABI().slice(2)
    ])), true,
    'Does not match filter');

  const key = (await elections.sendFrom(accounts[0]).propose([
      group.options.address + group.methods.unregister(accounts[1]).encodeABI().slice(2)
    ])).events.NewElection.returnValues.key;

  await elections.sendFrom(accounts[0]).vote(key, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
  await elections.sendFrom(accounts[0]).process(key);
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);
};

exports.proposeWithoutFilter = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  // These elections can only call any method
  const elections = await deployContract(accounts[0], 'ElectionsByMedian',
    group.options.address, [], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);
  await elections.sendFrom(accounts[0]).setProposalConfig(1, 1, 1);

  // Give a few seconds so registrations aren't in same second as proposal
  await increaseTime(3);

  const key = (await elections.sendFrom(accounts[0]).propose([
      group.options.address + group.methods.register(accounts[1]).encodeABI().slice(2)
    ])).events.NewElection.returnValues.key;

  await elections.sendFrom(accounts[0]).vote(key, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);
  await elections.sendFrom(accounts[0]).process(key);
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
};


exports.proposeMinThresholdFails = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[2], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  // These elections can only call any method
  const elections = await deployContract(accounts[0], 'ElectionsByMedian',
    group.options.address, [], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);
  await group.sendFrom(accounts[0]).register(accounts[1]);
  await elections.sendFrom(accounts[0]).setProposalConfig(1, 1, 1);
  // Give a few seconds so registrations aren't in same second as proposal
  await increaseTime(3);

  const key = (await elections.sendFrom(accounts[0]).propose([
      group.options.address + group.methods.unregister(accounts[1]).encodeABI().slice(2)
    ])).events.NewElection.returnValues.key;

  await increaseTime(SECONDS_PER_DAY * 0.1);
  await group.sendFrom(accounts[0]).register(accounts[2]);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[2]).vote(key, true)), true,
    "Cannot vote if registered after election start");

  await elections.sendFrom(accounts[0]).vote(key, true);
  await elections.sendFrom(accounts[1]).vote(key, false);

  const details = await elections.methods.details(key).call();
  assert.strictEqual(Number(details.supporting), 1);
  assert.strictEqual(Number(details.against), 1);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
  assert.strictEqual(await throws(() =>
    elections.sendFrom(accounts[0]).process(key)), true,
    "Election did not pass");
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 3);
};

// TODO test threshold at max
// TODO test participation at max
