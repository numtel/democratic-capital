const assert = require('assert');

const SECONDS_PER_DAY = 60 * 60 * 24;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365;
const DUMMY_PARAMS = [1,1,1,1,1,1,1,1,1,1,1,1];

exports.requiresVerified = async function({
  web3, accounts, deployContract, throws,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // Contract constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, DUMMY_PARAMS);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS)), true,
    'Not yet verified should throw');

  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);

  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    1, 'Should have 1 registered');

  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    2, 'Should have 2 registered');

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[0]).unregister(accounts[1])), true,
    'Cannot unregister account that\'s not your own');
  await verifiedGroup.sendFrom(accounts[1]).unregister(accounts[1]);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    1, 'Should have 1 registered');
};

exports.registrationElection = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // Contract constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const REG_ELECTION_PARAMS = DUMMY_PARAMS.slice();
  REG_ELECTION_PARAMS[9] = 2; // 1 day long registration election required

  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, REG_ELECTION_PARAMS);


  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  // Initiate first registration election
  const regEvents = (await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS)).events;
  assert.strictEqual(
    regEvents.NewRegistrationElection.returnValues.account,
    accounts[1]);

  // Verify view function return values
  assert.strictEqual(
    Number(await verifiedGroup.methods.registrationElectionCount().call()),
    1);

  assert.strictEqual(
    await verifiedGroup.methods.registrationElectionIndex(0).call(),
    accounts[1]);

  // Deny the registration
  await verifiedGroup.sendFrom(accounts[0]).registrationElectionVote(
    accounts[1], false);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS)), true,
    'Election still in progress');

  await increaseTime(SECONDS_PER_DAY * 1.1);

  const electionDetails =
    await verifiedGroup.methods.registrationElection(accounts[1]).call();
  assert.strictEqual(Number(electionDetails.supporting), 0);
  assert.strictEqual(Number(electionDetails.against), 1);

  // Process result and verify verify that user is still not registered
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  assert.strictEqual(
    await verifiedGroup.methods.isRegistered(accounts[1]).call(),
    false);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registrationElectionCount().call()),
    0);

  // Initiate a second registration election
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);

  // Approve the registration
  await verifiedGroup.sendFrom(accounts[0]).registrationElectionVote(
    accounts[1], true);
  const election2Details =
    await verifiedGroup.methods.registrationElection(accounts[1]).call();
  assert.strictEqual(Number(election2Details.supporting), 1);
  assert.strictEqual(Number(election2Details.against), 0);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  // Process registration with successful election
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  // Verify results
  assert.strictEqual(
    await verifiedGroup.methods.isRegistered(accounts[1]).call(),
    true);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registrationElectionCount().call()),
    0);
};

// TODO test ban
// TODO test unregister from child contract
// TODO test changing verification contract
// TODO test child contract allowing/disallowing/invoking from
// TODO test setProposalConfig
