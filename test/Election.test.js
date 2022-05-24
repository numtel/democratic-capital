const assert = require('assert');

exports.electionPasses = async function({
  web3, accounts, deployContract, increaseTime, throws,
}) {
  const headBlock = await web3.eth.getBlock("latest");
  const election = await deployContract(accounts[0], 'Election',
    headBlock.timestamp + 10, headBlock.timestamp + 20, 1, 0xffff,
    // Invocation doesn't happen on this test so pass dummy values
    accounts[0], 0xaabb);

  assert.strictEqual(await throws(() =>
    election.sendFrom(accounts[0]).vote(accounts[0], true)), true,
    "Cannot vote before start");

  await increaseTime(11);
  assert.strictEqual(await election.methods.isThresholdMet().call(), false);
  assert.strictEqual(await election.methods.isParticipationMet().call(), false);
  await election.sendFrom(accounts[0]).vote(accounts[0], false);
  // Change the vote
  await election.sendFrom(accounts[0]).vote(accounts[0], true);
  assert.strictEqual(await election.methods.isThresholdMet().call(), true);
  assert.strictEqual(await election.methods.isParticipationMet().call(), true);
  assert.strictEqual(await election.methods.hasPassed().call(), false);

  await increaseTime(15);

  assert.strictEqual(await election.methods.hasPassed().call(), true);

  assert.strictEqual(await throws(() =>
    election.sendFrom(accounts[0]).vote(accounts[0], true)), true,
    "Cannot vote after end");
};

