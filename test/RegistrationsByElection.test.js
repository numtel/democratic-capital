const assert = require('assert');

exports.electionSucceeds = async function({
  web3, accounts, deployContract, throws, increaseTime, BURN_ACCOUNT,
}) {
  const DURATION = 10, THRESHOLD = 0x7fff, MIN_PARTICIPATION = 0xffff;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  // These elections can only call any method
  const elections = await deployContract(accounts[0], 'ElectionsSimple',
    BURN_ACCOUNT, group.options.address, [], DURATION, THRESHOLD, MIN_PARTICIPATION, '');
  const registrations = await deployContract(accounts[0], 'RegistrationsByElection',
    BURN_ACCOUNT, group.options.address, elections.options.address, '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(elections.options.address);
  await group.sendFrom(accounts[0]).allowContract(registrations.options.address);
  // Give a few seconds so registrations aren't in same second as proposal
  await increaseTime(3);

  await registrations.sendFrom(accounts[1]).register('');
  const electionData = await elections.methods.detailsMany(0, 1, accounts[0]).call();
  const key = electionData[0].key;

  await increaseTime(3);

  await elections.sendFrom(accounts[0]).vote(key, true);

  await increaseTime(DURATION);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);
  await elections.sendFrom(accounts[0]).process(key);
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
};

