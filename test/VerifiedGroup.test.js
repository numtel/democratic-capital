const assert = require('assert');

const SECONDS_PER_DAY = 60 * 60 * 24;

exports.comments = async function({
  web3, accounts, deployContract, throws, BURN_ACCOUNT,
}) {
  const TEXT = 'heyo';
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // Contract constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  const browser = await deployContract(accounts[0], 'FactoryBrowser',
    BURN_ACCOUNT);
  await group.sendFrom(accounts[0]).postComment(group.options.address, TEXT);
  const result = await browser.methods.commentsMany(
    group.options.address, group.options.address, 0, 10).call();
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].text, TEXT);
};

exports.requiresVerified = async function({
  web3, accounts, deployContract, throws, BURN_ACCOUNT,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // Contract constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  assert.strictEqual(await throws(() =>
    group.sendFrom(accounts[0]).register(accounts[1])), true,
    'Not yet verified should throw');

  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[1], 0);

  assert.strictEqual(
    Number(await group.methods.registeredCount().call()),
    1, 'Should have 1 registered');

  await group.sendFrom(accounts[0]).register(accounts[1]);
  assert.strictEqual(
    Number(await group.methods.registeredCount().call()),
    2, 'Should have 2 registered');

  assert.strictEqual(await throws(() =>
    group.sendFrom(accounts[1]).unregister(accounts[1])), true,
    'Cannot unregister if not from admin account');
  await group.sendFrom(accounts[0]).unregister(accounts[1]);
  assert.strictEqual(
    Number(await group.methods.registeredCount().call()),
    1, 'Should have 1 registered');
};

exports.ban = async function({
  web3, accounts, deployContract, throws, increaseTime, BURN_ACCOUNT,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  // Register second user
  await group.sendFrom(accounts[0]).register(accounts[1]);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
  // Unregister second user using invoke from child contract
  const currentTime = (await web3.eth.getBlock('latest')).timestamp;
  await group.sendFrom(accounts[0]).ban(accounts[1], currentTime + SECONDS_PER_DAY * 1);
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);

  // Second user cannot re-register until ban expires
  assert.strictEqual(await throws(() =>
    group.sendFrom(accounts[0]).register(accounts[1])), true,
    'User is banned');

  await increaseTime(SECONDS_PER_DAY * 1.1);

  // Ban has expired
  await group.sendFrom(accounts[0]).register(accounts[1]);
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
};

exports.childContractInvokeAndHooks = async function({
  web3, accounts, deployContract, throws, BURN_ACCOUNT,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  const testChild = await deployContract(accounts[0], 'TestChild',
    group.options.address);

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  await group.sendFrom(accounts[0]).allowContract(testChild.options.address);

  // Register second user
  await group.sendFrom(accounts[0]).register(accounts[1]);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
  // Unregister second user using invoke from child contract
  await group.sendFrom(accounts[0]).invoke(
    testChild.options.address,
    testChild.methods.invokeUnregister(accounts[1]).encodeABI());
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);

  // Register second user
  await group.sendFrom(accounts[0]).register(accounts[1]);
  assert.strictEqual(Number(await testChild.methods.registeredCounter().call()), 2);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);
  // Unregister second user directly from child contract
  await group.sendFrom(accounts[0]).invoke(
    testChild.options.address,
    testChild.methods.unregister(accounts[1]).encodeABI());
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);
  assert.strictEqual(Number(await testChild.methods.unregisteredCounter().call()), 2);

  // Ensure that hooks disable after disallow
  await group.sendFrom(accounts[0]).disallowContract(testChild.options.address);

  // Perform actions that will trigger hooks
  await group.sendFrom(accounts[0]).register(accounts[1]);
  await group.sendFrom(accounts[0]).unregister(accounts[1]);

  // Counters should not have updated after disallowing the contract
  assert.strictEqual(Number(await testChild.methods.registeredCounter().call()), 2);
  assert.strictEqual(Number(await testChild.methods.unregisteredCounter().call()), 2);

};

exports.changeVerificationContract = async function({
  web3, accounts, deployContract, throws, increaseTime, BURN_ACCOUNT,
}) {
  const mockVerification1 = await deployContract(accounts[0], 'MockVerification');
  const mockVerification2 = await deployContract(accounts[0], 'MockVerification');
  await mockVerification1.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification1.options.address, accounts[0], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  await group.sendFrom(accounts[0]).setVerifications(mockVerification2.options.address);

  assert.strictEqual(await throws(() =>
    group.sendFrom(accounts[0]).register(accounts[1])), true,
    'User not verified');

  await mockVerification2.sendFrom(accounts[0]).setStatus(accounts[1], 0);

  await group.sendFrom(accounts[0]).register(accounts[1]);
};

