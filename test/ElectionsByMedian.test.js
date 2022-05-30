const assert = require('assert');

exports.configAndUnregistrationHook = async function({
  web3, accounts, deployContract, throws
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0]);
  const elections = await deployContract(accounts[0], 'ElectionsByMedian',
    group.options.address);

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

