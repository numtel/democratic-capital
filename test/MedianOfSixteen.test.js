const assert = require('assert');

exports.medianOfSixteen = async function({
  web3, accounts, deployContract,
}) {
  const test = await deployContract(accounts[0], 'TestMedianOfSixteen');
  await test.sendFrom(accounts[0]).setMOSValue(accounts[0], 1);
  // 1
  assert.strictEqual(Number(await test.methods.getMOS().call()), 1);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[1], 3);
  // 1, 3
  assert.strictEqual(Number(await test.methods.getMOS().call()), 2);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[2], 6);
  // 1, 3, 6
  assert.strictEqual(Number(await test.methods.getMOS().call()), 3);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[1], 10);
  // 1, 6, 10
  assert.strictEqual(Number(await test.methods.getMOS().call()), 6);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[3], 12);
  // 1, 6, 10, 12
  assert.strictEqual(Number(await test.methods.getMOS().call()), 8);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[4], 1);
  // 1, 1, 6, 10, 12
  assert.strictEqual(Number(await test.methods.getMOS().call()), 6);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[5], 12);
  // 1, 1, 6, 10, 12, 12
  assert.strictEqual(Number(await test.methods.getMOS().call()), 8);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[6], 14);
  // 1, 1, 6, 10, 12, 12, 14
  assert.strictEqual(Number(await test.methods.getMOS().call()), 10);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[7], 14);
  // 1, 1, 6, 10, 12, 12, 14, 14
  assert.strictEqual(Number(await test.methods.getMOS().call()), 11);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[8], 16);
  // 1, 1, 6, 10, 12, 12, 14, 14, 16
  assert.strictEqual(Number(await test.methods.getMOS().call()), 12);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[9], 2);
  // 1, 1, 2, 6, 10, 12, 12, 14, 14, 16
  assert.strictEqual(Number(await test.methods.getMOS().call()), 11);
};

exports.medianOfSixteen2 = async function({
  web3, accounts, deployContract,
}) {
  const test = await deployContract(accounts[0], 'TestMedianOfSixteen');
  await test.sendFrom(accounts[0]).setMOSValue(accounts[0], 16);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[1], 16);
  // 16, 16
  assert.strictEqual(Number(await test.methods.getMOS().call()), 16);
};

exports.medianOfSixteen3 = async function({
  web3, accounts, deployContract,
}) {
  const test = await deployContract(accounts[0], 'TestMedianOfSixteen');
  await test.sendFrom(accounts[0]).setMOSValue(accounts[0], 16);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[1], 15);
  // 15, 16
  assert.strictEqual(Number(await test.methods.getMOS().call()), 15);
};

exports.medianOfSixteenUnset = async function({
  web3, accounts, deployContract,
}) {
  const test = await deployContract(accounts[0], 'TestMedianOfSixteen');
  await test.sendFrom(accounts[0]).setMOSValue(accounts[0], 16);
  await test.sendFrom(accounts[0]).setMOSValue(accounts[1], 15);
  await test.sendFrom(accounts[0]).unsetMOSAccount(accounts[1]);

  // 16
  assert.strictEqual(Number(await test.methods.getMOS().call()), 16);

  await test.sendFrom(accounts[0]).unsetMOSAccount(accounts[0]);
  assert.strictEqual(Number(await test.methods.getMOS().call()), 0);
};
