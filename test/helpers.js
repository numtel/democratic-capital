
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
    const send = options.send = Object.keys(contracts.DemocraticToken.methods)
      .reduce((out, cur) => {
        const method = contracts.DemocraticToken.methods[cur];
        out[cur] = function() {
          return method.apply(null, arguments).send({ from: account, gas: GAS_AMOUNT });
        }
        return out;
      }, {});
    const call = options.call = Object.keys(contracts.DemocraticToken.methods)
      .reduce((out, cur) => {
        const method = contracts.DemocraticToken.methods[cur];
        out[cur] = function() {
          return method.apply(null, arguments).call({ from: account });
        }
        return out;
      }, {});
    const curDay = options.curDay = Math.floor(
      (await web3.eth.getBlock(await web3.eth.getBlockNumber()))
        .timestamp / SECONDS_PER_DAY) + 2;
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

    // Reset epoch to initial value
    await send.newEpoch(Epoch(-1));

    // Go to next day so test case can always set a new epoch at the start
    await increaseTime(SECONDS_PER_DAY * 2);

    // Set as passport verified
    await contracts.MockVerification.methods.setStatus(
        account, currentTimestamp() + SECONDS_PER_YEAR)
      .send({ from: account, gas: GAS_AMOUNT });
    await send.registerAccount();

    // Reset balance
    const startBalance = await call.balanceOf(account);
    await send.transfer(BURN_ACCOUNT, startBalance);

    // Call test case
    await handler.call(this, options);

    // Reset balance
    const endBalance = await call.balanceOf(account);
    await send.transfer(BURN_ACCOUNT, endBalance);

    // Reset verification
    await contracts.MockVerification.methods.setStatus(account, 0)
      .send({ from: account, gas: GAS_AMOUNT });

    // Reset registrations
    await send.unregisterAccount();
  });
}

