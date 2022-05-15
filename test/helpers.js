
exports.thisRegisteredUser = function(account, handler) {
  return (async function(options) {
    const {
      accounts, contracts, currentTimestamp, SECONDS_PER_YEAR, GAS_AMOUNT,
      web3, INITIAL_EMISSION, BURN_ACCOUNT, increaseTime, SECONDS_PER_DAY,
      INITIAL_EPOCH,
    } = options;

    // Allow specifying account index as number or full hex value as string
    if(typeof account === 'number') account = accounts[account];

    // Add extra options to help test case
    options.account = account;
    const sendFrom = options.sendFrom = (address) =>
      Object.keys(contracts.DemocraticToken.methods)
        .reduce((out, cur) => {
          const method = contracts.DemocraticToken.methods[cur];
          out[cur] = function() {
            return method.apply(null, arguments).send({ from: address, gas: GAS_AMOUNT });
          }
          return out;
        }, {});
    const send = options.send = sendFrom(account);
    const callFrom = options.callFrom = (address) =>
      Object.keys(contracts.DemocraticToken.methods)
        .reduce((out, cur) => {
          const method = contracts.DemocraticToken.methods[cur];
          out[cur] = function() {
            return method.apply(null, arguments).call({ from: address });
          }
          return out;
        }, {});
    const call = options.call = callFrom(account);
    const curDay = options.curDay = Math.floor(
      (await web3.eth.getBlock(await web3.eth.getBlockNumber()))
        .timestamp / SECONDS_PER_DAY) + 4;
    options.emissionDetails = async function(dayCount, debug) {
      const available = []
      for(let i = 0; i<dayCount; i++) {
        available.push(await call.availableEmissions(account, curDay + i));
      }
      if(debug) {
        console.log('Current day: ', curDay);
        const epochCount = await call.epochCount();
        for(let e = epochCount - 1; e>0; e--) {
          const epoch = await call.epochs(e);
          console.log(Object.keys(epoch).reduce((out, cur) => {
            if(isNaN(cur)) out[cur] = Number(epoch[cur]);
            return out;
          }, {}));
          if(epoch.beginDay < curDay) break;
        }
        console.log(available);
      }
      return available;
    };
    const Epoch = options.Epoch = function() {
      if(arguments.length >=1 && typeof arguments[0] === 'number')
        arguments[0] += curDay;
      return Array.from(arguments).concat(INITIAL_EPOCH.slice(arguments.length));
    }
    const registered = [];
    const register = options.register = async function(address) {
      await contracts.MockVerification.methods.setStatus(
          address, currentTimestamp() + SECONDS_PER_YEAR)
        .send({ from: address, gas: GAS_AMOUNT });
      await contracts.DemocraticToken.methods.registerAccount()
        .send({ from: address, gas: GAS_AMOUNT });
      // Reset balance
      const startBalance = await call.balanceOf(address);
      await contracts.DemocraticToken.methods.transfer(BURN_ACCOUNT, startBalance)
        .send({ from: address, gas: GAS_AMOUNT });
      registered.push(address);
    }

    // Set as passport verified
    await register(account);

    // Reset epoch to initial value
    const proposalIndex = (await send.proposeEpoch(
      Epoch(-1),
      curDay - 3,
      curDay - 3)).events.NewEpochProposal.returnValues.index;
    await increaseTime(SECONDS_PER_DAY);
    await send.voteOnEpochProposal(proposalIndex, true, 0);
    await increaseTime(SECONDS_PER_DAY);
    await send.processEpochElectionResult(proposalIndex);

    // Go to next day so test case can always set a new epoch at the start
    await increaseTime(SECONDS_PER_DAY * 2);
    // Reset accrued emissions
    await send.unregisterAccount();
    await send.registerAccount();

    // Call test case
    await handler.call(this, options);

    for(let address of registered) {
      // Reset balance
      const endBalance = await call.balanceOf(account);
      await contracts.DemocraticToken.methods.transfer(BURN_ACCOUNT, endBalance)
        .send({ from: address, gas: GAS_AMOUNT });
      // Reset verification
      await contracts.MockVerification.methods.setStatus(account, 0)
        .send({ from: address, gas: GAS_AMOUNT });
      // Reset registration
      await contracts.DemocraticToken.methods.unregisterAccount()
        .send({ from: address, gas: GAS_AMOUNT });
    }
  });
}

