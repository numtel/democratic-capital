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
    mockVerification.options.address, accounts[0], DUMMY_PARAMS);

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
    mockVerification.options.address, accounts[0], REG_ELECTION_PARAMS);


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

exports.invokeBan = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], DUMMY_PARAMS);

  // Register second user
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    2, 'Should have 2 registered');

  const currentTime = (await web3.eth.getBlock('latest')).timestamp;
  await verifiedGroup.sendFrom(accounts[0]).proposeInvoke(
    verifiedGroup.options.address,
    verifiedGroup.methods.ban(accounts[1], currentTime + SECONDS_PER_DAY * 2).encodeABI());

  assert.strictEqual(
    Number(await verifiedGroup.methods.invokeElectionCount().call()),
    1);

  const proposalTx = await verifiedGroup.methods.invokeProposals(0).call();
  assert.strictEqual(proposalTx.to, verifiedGroup.options.address);

  await verifiedGroup.sendFrom(accounts[0]).invokeElectionVote(0, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);
  const events = (await verifiedGroup.sendFrom(accounts[0]).processInvokeElection(0)).events;
  assert.strictEqual(events.Unregistered.returnValues.account, accounts[1]);
  assert.strictEqual(events.AccountBanned.returnValues.account, accounts[1]);
  assert.strictEqual(events.TxSent.returnValues.to, verifiedGroup.options.address);

  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    1, 'Should have 1 registered');

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS)), true,
    'User is banned still');

  await increaseTime(SECONDS_PER_DAY * 1.1);

  // Ban duration has elapsed, user can register again
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  assert.strictEqual(
    await verifiedGroup.methods.isRegistered(accounts[1]).call(),
    true);

};

exports.childContractUnregister = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], DUMMY_PARAMS);
  const testChild = await deployContract(accounts[0], 'TestChild',
    verifiedGroup.options.address);

  // Allow child contract and invoke its method
  await verifiedGroup.sendFrom(accounts[0]).proposeAllowing(testChild.options.address);
  await verifiedGroup.sendFrom(accounts[0]).proposeInvoke(
    testChild.options.address,
    testChild.methods.unregister(accounts[0]).encodeABI());

  // Verify allowance election details
  assert.strictEqual(
    Number(await verifiedGroup.methods.allowanceElectionCount().call()),
    1);

  assert.strictEqual(
    await verifiedGroup.methods.allowanceElectionIndex(0).call(),
    testChild.options.address);

  // Vote in both elections
  await verifiedGroup.sendFrom(accounts[0]).allowanceElectionVote(testChild.options.address, true);
  await verifiedGroup.sendFrom(accounts[0]).invokeElectionVote(0, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  await verifiedGroup.sendFrom(accounts[0]).processAllowanceElection(testChild.options.address);
  const events = (await verifiedGroup.sendFrom(accounts[0]).processInvokeElection(0)).events;
  assert.strictEqual(events.Unregistered.returnValues.account, accounts[0]);
  assert.strictEqual(events.TxSent.returnValues.to, testChild.options.address);

  assert.strictEqual(
    Number(await verifiedGroup.methods.registeredCount().call()),
    0, 'Should have 0 registered');

  // Rejoin the group
  await verifiedGroup.sendFrom(accounts[0]).register(DUMMY_PARAMS);

  // Disallow child contract and also invoking it again
  await verifiedGroup.sendFrom(accounts[0]).proposeDisallowing(testChild.options.address);
  await verifiedGroup.sendFrom(accounts[0]).proposeInvoke(
    testChild.options.address,
    testChild.methods.unregister(accounts[0]).encodeABI());

  assert.strictEqual(
    Number(await verifiedGroup.methods.disallowanceElectionCount().call()),
    1);

  assert.strictEqual(
    await verifiedGroup.methods.disallowanceElectionIndex(0).call(),
    testChild.options.address);

  await verifiedGroup.sendFrom(accounts[0]).disallowanceElectionVote(testChild.options.address, true);
  await verifiedGroup.sendFrom(accounts[0]).invokeElectionVote(1, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  await verifiedGroup.sendFrom(accounts[0]).processDisallowanceElection(testChild.options.address);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[0]).processInvokeElection(1)), true,
    'No permission to invoke on parent contract');
};

exports.childContractInvoke = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], DUMMY_PARAMS);
  const testChild = await deployContract(accounts[0], 'TestChild',
    verifiedGroup.options.address);

  // Allow child contract and invoke its method
  await verifiedGroup.sendFrom(accounts[0]).proposeAllowing(testChild.options.address);
  await verifiedGroup.sendFrom(accounts[0]).proposeInvoke(
    testChild.options.address,
    testChild.methods.invokeUnregister(accounts[0]).encodeABI());

  // Vote in both elections
  await verifiedGroup.sendFrom(accounts[0]).allowanceElectionVote(testChild.options.address, true);
  await verifiedGroup.sendFrom(accounts[0]).invokeElectionVote(0, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);

  await verifiedGroup.sendFrom(accounts[0]).processAllowanceElection(testChild.options.address);
  const events = (await verifiedGroup.sendFrom(accounts[0]).processInvokeElection(0)).events;
  assert.strictEqual(events.TxSent.length, 2);
  assert.strictEqual(events.Unregistered.returnValues.account, accounts[0]);
};

exports.changeVerificationContract = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification1 = await deployContract(accounts[0], 'MockVerification');
  const mockVerification2 = await deployContract(accounts[0], 'MockVerification');
  await mockVerification1.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification1.options.address, accounts[0], DUMMY_PARAMS);

  await verifiedGroup.sendFrom(accounts[0]).proposeInvoke(
    verifiedGroup.options.address,
    verifiedGroup.methods.setVerifications(mockVerification2.options.address).encodeABI());

  await verifiedGroup.sendFrom(accounts[0]).invokeElectionVote(0, true);

  await increaseTime(SECONDS_PER_DAY * 1.1);
  const events = (await verifiedGroup.sendFrom(accounts[0]).processInvokeElection(0)).events;
  assert.strictEqual(
    events.VerificationContractChanged.returnValues.oldContract,
    mockVerification1.options.address);
  assert.strictEqual(
    events.VerificationContractChanged.returnValues.newContract,
    mockVerification2.options.address);

  assert.strictEqual(await throws(() =>
    verifiedGroup.sendFrom(accounts[0]).setProposalConfig(DUMMY_PARAMS)), true,
    'User not verified');

  await mockVerification2.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);

  await verifiedGroup.sendFrom(accounts[0]).setProposalConfig(DUMMY_PARAMS);
};

exports.setProposalConfig = async function({
  web3, accounts, deployContract, throws, increaseTime,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[1],
    Math.floor(Date.now() / 1000) + SECONDS_PER_YEAR);
  const verifiedGroup = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], DUMMY_PARAMS);

  function allSame(checkAgainst, array) {
    for(let i=0; i<checkAgainst.length; i++)
      if(Number(array[i]) !== checkAgainst[i]) return false;
    return true;
  }
  assert.strictEqual(allSame(DUMMY_PARAMS,
    await verifiedGroup.methods.getProposalConfig().call()), true);

  const OTHER_PARAMS = [3,3,3,3,3,3,3,3,3,3,3,3];
  const MEDIAN_PARAMS = [2,2,2,2,2,2,2,2,2,2,2,2];
  // Must register new user first since the OTHER_PARAMS will turn on registration elections
  await verifiedGroup.sendFrom(accounts[1]).register(DUMMY_PARAMS);
  await verifiedGroup.sendFrom(accounts[0]).setProposalConfig(OTHER_PARAMS);

  assert.strictEqual(allSame(OTHER_PARAMS,
    await verifiedGroup.methods.getProposalConfig(accounts[0]).call()), true);
  assert.strictEqual(allSame(DUMMY_PARAMS,
    await verifiedGroup.methods.getProposalConfig(accounts[1]).call()), true);
  assert.strictEqual(allSame(MEDIAN_PARAMS,
    await verifiedGroup.methods.getProposalConfig().call()), true);
};

