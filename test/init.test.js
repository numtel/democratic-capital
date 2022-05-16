const assert = require('assert');
const helpers = require('./helpers');

exports.verificationRequiredToRegister = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, DECIMALS,
  emissionDetails, register, accounts, sendFrom, callFrom,
  currentTimestamp, SECONDS_PER_YEAR, GAS_AMOUNT,
}) {
  const TEST_ACCT = accounts[1];
  let hadError = false;
  try {
    await sendFrom(TEST_ACCT).registerAccount();
  } catch(error) { hadError = true; }
  assert.strictEqual(hadError, true, 'Should fail before verification');

  await contracts.MockVerification.methods.setStatus(
      TEST_ACCT, currentTimestamp() + SECONDS_PER_YEAR)
    .send({ from: TEST_ACCT, gas: GAS_AMOUNT });

  // These will succeed now
  await sendFrom(TEST_ACCT).registerAccount();
  await sendFrom(TEST_ACCT).collectEmissions();

  // Reset verification
  await contracts.MockVerification.methods.setStatus(TEST_ACCT, 0)
    .send({ from: TEST_ACCT, gas: GAS_AMOUNT });

  let hadCollectError = false;
  try {
    await sendFrom(TEST_ACCT).collectEmissions();
  } catch(error) { hadCollectError = true; }
  assert.strictEqual(hadCollectError, true, 'Should fail without verification');

  await sendFrom(TEST_ACCT).unregisterAccount();
});

exports.collectAfter3Days = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY,
}) {
  // Go forward 2 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 2);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  assert.strictEqual(endBalance, INITIAL_EMISSION * 3, 'Balance should update');
});

exports.collectAfter7Days3Epochs = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, emissionDetails,
}) {
  // Configure the upcoming epochs
  const proposal1Index = (await send.proposeEpoch(
    Epoch(3, INITIAL_EMISSION * 2),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  const proposal2Index = (await send.proposeEpoch(
    Epoch(4, INITIAL_EMISSION * 3),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  const proposal3Index = (await send.proposeEpoch(
    Epoch(6, INITIAL_EMISSION * 4),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposal1Index, true, 0);
  await send.vote(proposal2Index, true, 0);
  await send.vote(proposal3Index, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  await send.processElectionResult(proposal1Index);
  await send.processElectionResult(proposal2Index);
  await send.processElectionResult(proposal3Index);

  // Go forward 6 days because day 0 gives first emission
  await increaseTime(SECONDS_PER_DAY * 4);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 1 day @ 4x, 2 days @ 3x, 1 day @ 2x, 3 days @ 1x
  assert.strictEqual(endBalance, INITIAL_EMISSION * 15, 'Balance should update');
});

exports.collectAfter10Days7DayExpiry = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, emissionDetails,
}) {
  const proposalIndex = (await send.proposeEpoch(
    Epoch(5, INITIAL_EMISSION * 2, 7),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposalIndex, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  await send.processElectionResult(proposalIndex);

  await increaseTime(SECONDS_PER_DAY * 7);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 5 days @ 2x, 2 days @ 1x, even though 10 passed
  assert.strictEqual(endBalance, INITIAL_EMISSION * 12, 'Balance should update');
});

exports.allowEpochOverwriteAndBeforeLast = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, emissionDetails,
}) {
  const proposal1Index = (await send.proposeEpoch(
    Epoch(3, INITIAL_EMISSION * 2),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  const proposal2Index = (await send.proposeEpoch(
    Epoch(5, INITIAL_EMISSION * 4),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  // Insert before last epoch
  const proposal3Index = (await send.proposeEpoch(
    Epoch(4, INITIAL_EMISSION * 5),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  // Overwrite existing epoch
  const proposal4Index = (await send.proposeEpoch(
    Epoch(3, INITIAL_EMISSION * 3),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposal1Index, true, 0);
  await send.vote(proposal2Index, true, 0);
  await send.vote(proposal3Index, true, 0);
  await send.vote(proposal4Index, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  await send.processElectionResult(proposal1Index);
  await send.processElectionResult(proposal2Index);
  await send.processElectionResult(proposal3Index);
  await send.processElectionResult(proposal4Index);

  await increaseTime(SECONDS_PER_DAY * 3);
  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 3@1x + 1@3x + 1@5x + 1@4x
  assert.strictEqual(endBalance, INITIAL_EMISSION * 15, 'Balance should update');
});

exports.epochElectionPasses = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, DECIMALS,
  emissionDetails, register, accounts, sendFrom, callFrom,
}) {
  // Propose epoch with threshold slightly above majority
  //  in order to test quadratic voting
  // 0xcccc would be absolute minimum threshold for
  //  4 support, 1 against: 0.8 * 0xffff
  const proposalIndex = (await send.proposeEpoch(
    Epoch(3, INITIAL_EMISSION * 2, 0, 0, 0x8fff, 0xffff),
    curDay + 1,
    curDay + 1)).events.NewProposal.returnValues.index;
  // Skip forward to start election
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposalIndex, true, 0);

  let hadError;
  try {
    await send.vote(proposalIndex, true, 0);
  } catch(error) {
    hadError = true;
  }
  assert.ok(hadError, 'Cannot vote twice in same election');

  // Skip forward to end election
  await increaseTime(SECONDS_PER_DAY);
  await send.processElectionResult(proposalIndex);

  let cantProcessElectionTwice;
  try {
    await send.processElectionResult(proposalIndex);
  } catch(error) {
    cantProcessElectionTwice = true;
  }
  assert.ok(cantProcessElectionTwice, 'Cannot process election results twice');

  // Register a competing voter
  await register(accounts[1]);
  // Skip forward to enter the new epoch
  await increaseTime(SECONDS_PER_DAY);

  // Propose another epoch and vote with 2 different accounts
  // One pays to quadruple their vote: sqrt(15+1)
  // The other does not pay
  const proposal2Index = (await send.proposeEpoch(
    Epoch(7, INITIAL_EMISSION * 3, 0, 0, 0xffff, 0xffff),
    curDay + 4,
    curDay + 4)).events.NewProposal.returnValues.index;
  // Skip forward to start election
  await increaseTime(SECONDS_PER_DAY);
  const QUAD_VOTE = 15 * Math.pow(10, DECIMALS);
  let failsBeforeCollectingEmissions;
  try {
    await send.vote(proposal2Index, true, QUAD_VOTE);
  } catch(error) {
    failsBeforeCollectingEmissions = true;
  }
  assert.ok(failsBeforeCollectingEmissions, "Balance required");
  await send.collectEmissions();
  await send.vote(proposal2Index, true, QUAD_VOTE);
  await sendFrom(accounts[1]).vote(proposal2Index, false, 0);

  await increaseTime(SECONDS_PER_DAY*2);

  await send.collectEmissions();

  const endBalance = Number(await call.balanceOf(account));
  // 3@1x + 4@2x - QUAD_VOTE
  assert.strictEqual(endBalance, INITIAL_EMISSION * 11 - QUAD_VOTE, 'Balance should update');

  const events = (await send.processElectionResult(proposal2Index)).events;
  assert.strictEqual(
    Number(events.ProposalProcessed.returnValues.proposal.votesSupporting),
    Math.sqrt((QUAD_VOTE / Math.pow(10, DECIMALS)) + 1),
    'Quadratic vote not counted correctly');
  // Move far enough forward so next test is past the second epoch
  await increaseTime(SECONDS_PER_DAY*3);
});

exports.mintElectionPasses = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION, BURN_ADDRESS,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, DECIMALS,
  emissionDetails, register, accounts, sendFrom, callFrom,
}) {
  const MINT_AMOUNT = 30 * Math.pow(10, DECIMALS);
  const MINT_RECIP = accounts[1];
  await register(MINT_RECIP);
  const proposalIndex = (await send.proposeMint([MINT_AMOUNT, MINT_RECIP], curDay+1, curDay+1)).events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposalIndex, true, 0);
  await sendFrom(MINT_RECIP).vote(proposalIndex, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  const events = (await send.processElectionResult(proposalIndex)).events;
  assert.strictEqual(events.Transfer.returnValues.from,
    '0x0000000000000000000000000000000000000000', 'From should be mint value');
  assert.strictEqual(events.Transfer.returnValues.to, MINT_RECIP);
  assert.strictEqual(Number(events.Transfer.returnValues.value), MINT_AMOUNT);
  const endBalance = Number(await call.balanceOf(MINT_RECIP));
  assert.strictEqual(endBalance, MINT_AMOUNT, 'Balance should update');
});

exports.banElectionPasses = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION, BURN_ADDRESS,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, DECIMALS,
  emissionDetails, register, accounts, sendFrom, callFrom,
}) {
  const BAN_END = curDay + 3;
  const BAN_RECIP = accounts[1];
  await register(BAN_RECIP);
  const proposalIndex = (await send.proposeBan(BAN_RECIP, BAN_END, curDay+1, curDay+1)).events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposalIndex, true, 0);
  // Who would vote to ban themselves? A test user!
  await sendFrom(BAN_RECIP).vote(proposalIndex, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  const events = (await send.processElectionResult(proposalIndex)).events;
  assert.strictEqual(events.Unregistered.returnValues.account, BAN_RECIP);

  let cannotPropose;
  try {
    await sendFrom(BAN_RECIP).proposeMint([1, BURN_ADDRESS], curDay+4, curDay+4)
  } catch(error) {
    cannotPropose = true;
  }
  assert.ok(cannotPropose, "Can't propose while deregistered");

  let registrationFailed;
  try {
    await sendFrom(BAN_RECIP).registerAccount();
  } catch(error) {
    registrationFailed = true;
  }
  assert.ok(registrationFailed, "Can't register while banned");

  await increaseTime(SECONDS_PER_DAY);
  // Registration will work now after ban expired
  await sendFrom(BAN_RECIP).registerAccount();
});

exports.customTxElectionPasses = helpers.thisRegisteredUser(0,
async function({
  send, call, account, contracts, web3, INITIAL_EMISSION, BURN_ADDRESS,
  increaseTime, SECONDS_PER_DAY, curDay, Epoch, DECIMALS, GAS_AMOUNT,
  emissionDetails, register, accounts, sendFrom, callFrom,
}) {
  const TX_AMOUNT = INITIAL_EMISSION;
  const TX_DATA = web3.eth.abi.encodeFunctionCall({
    name: 'transfer', type: 'function', inputs: [
      {type: 'address', name: 'recipient'},
      {type: 'uint256', name: 'amount'}
    ]
  }, [account, TX_AMOUNT]);
  const proposalIndex = (await send.proposeCustomTx([
      contracts.DemocraticToken.options.address, TX_DATA], curDay+1, curDay+1))
    .events.NewProposal.returnValues.index;
  await increaseTime(SECONDS_PER_DAY);
  await send.vote(proposalIndex, true, 0);
  await increaseTime(SECONDS_PER_DAY);
  await send.collectEmissions();
  // Fund contract with tokens
  await send.transfer(contracts.DemocraticToken.options.address, TX_AMOUNT);
  const startBalance = Number(await call.balanceOf(account));

  const events = (await send.processElectionResult(proposalIndex)).events;
  assert.strictEqual(events.CustomTxSent.returnValues.to,
    contracts.DemocraticToken.options.address);
  assert.strictEqual(events.CustomTxSent.returnValues.data, TX_DATA);
  assert.strictEqual(events.CustomTxSent.returnValues.returned,
    '0x0000000000000000000000000000000000000000000000000000000000000001');

  const endBalance = Number(await call.balanceOf(account));
  assert.strictEqual(endBalance, startBalance + TX_AMOUNT, 'Balance should update');
});

// TODO check verified/registered permissions in all functions that require them
// TODO electionFailsThreshold
// TODO electionFailsParticipation
// TODO electionMaintainsRegisteredCount
