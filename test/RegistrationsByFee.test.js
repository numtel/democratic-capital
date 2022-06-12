const assert = require('assert');

exports.succeeds = async function({
  web3, accounts, deployContract, BURN_ACCOUNT,
}) {
  const FEE = 10;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  await mockVerification.sendFrom(accounts[1]).setStatus(accounts[1], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  const token = await deployContract(accounts[0], 'TestERC20');
  const registrations = await deployContract(accounts[0], 'RegistrationsByFee',
    BURN_ACCOUNT, group.options.address, token.options.address, FEE, '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);
  await group.sendFrom(accounts[0]).allowContract(registrations.options.address);

  await token.sendFrom(accounts[1]).mint(accounts[1], FEE);
  await token.sendFrom(accounts[1]).approve(registrations.options.address, FEE);

  assert.strictEqual(Number(await group.methods.registeredCount().call()), 1);
  await registrations.sendFrom(accounts[1]).register();
  assert.strictEqual(Number(await group.methods.registeredCount().call()), 2);

  assert.strictEqual(Number(await token.methods.balanceOf(group.options.address).call()), FEE);
};


