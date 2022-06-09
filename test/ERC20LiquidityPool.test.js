const assert = require('assert');

exports.mintAndBurnEqual = async function({
  web3, accounts, deployContract, throws,
}) {
  const BN = web3.utils.BN;
  const VALID_DIFF = new BN(3); // Small math discrepancy
  const inputs = [
  // account index, input 0, 1, remaining 0, 1
    [1, 10000, 100000, 0, 0],
    [2, 30000, 200000, 10000, 0],
    [3, 40000, 600000, 0, 200000]
  ].map(x => x.slice(0, 1).concat(x.slice(1).map(y=>new BN(y))));

  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  const tokenA = await deployContract(accounts[0], 'TestERC20');
  const tokenB = await deployContract(accounts[0], 'TestERC20');
  const pool = await deployContract(accounts[0], 'ERC20LiquidityPool',
    group.options.address, tokenA.options.address, tokenB.options.address, '', '', 4);

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  const lpBalances = [];
  // Deposit from each account
  for(let i = 0; i < inputs.length; i++) {
    const account = accounts[inputs[i][0]];
    await tokenA.sendFrom(account).mint(account, inputs[i][1]);
    await tokenA.sendFrom(account).approve(pool.options.address, inputs[i][1]);
    await tokenB.sendFrom(account).mint(account, inputs[i][2]);
    await tokenB.sendFrom(account).approve(pool.options.address, inputs[i][2]);

    await pool.sendFrom(account).deposit(inputs[i][1], inputs[i][2]);
    lpBalances.push(new BN(await pool.methods.balanceOf(account).call()));
    const balanceA = new BN(await tokenA.methods.balanceOf(account).call());
    const balanceB = new BN(await tokenB.methods.balanceOf(account).call());
    // Some is left over
    assert.ok(balanceA.eq(inputs[i][3]));
    assert.ok(balanceB.eq(inputs[i][4]));
  }

  // Withdraw from each account
  for(let i = 0; i < inputs.length; i++) {
    const account = accounts[inputs[i][0]];
    await pool.sendFrom(account).withdraw(lpBalances[i]);
    const balance = new BN(await pool.methods.balanceOf(account).call());
    assert.ok(balance.eq(new BN('0')), balance);
    const balanceA = new BN(await tokenA.methods.balanceOf(account).call())
    const balanceB = new BN(await tokenB.methods.balanceOf(account).call())
    const assertStr = `tokenA ${balanceA.toString(10)}, tokenB ${balanceB.toString(10)}`;
    assert.ok(inputs[i][1].sub(balanceA).abs().lte(VALID_DIFF), assertStr);
    assert.ok(inputs[i][2].sub(balanceB).abs().lte(VALID_DIFF), assertStr);
  }
};

exports.swap = async function({
  web3, accounts, deployContract, throws,
}) {
  const BN = web3.utils.BN;
  const inputs = [
  // account index, input 0, 1, swapFromToken, amountIn, minReceived
    [1, 0, 10000, 1000000, 1000, 100000],
    [1, 0, 500000, 100000, 1000, 200],
    [1, 1, 10000, 1000000, 1000, 10],
    [1, 1, 500000, 100000, 1000, 5000],
    // What happens when somebody tries to buy all of one side?
    [1, 0, 500000, 100000, 500000, 100000],
    // What happens whens somebody tries to buy more than one side?
    [1, 0, 500000, 100000, 600000, 0, throws],
    // What happens when somebody tries to buy zero?
    [1, 0, 500000, 100000, 0, 0, throws],
    // What happens when minReceived not met?
    [1, 0, 500000, 100000, 1000, 100001, throws],
  ].map(x => x.slice(0, 2).concat(x.slice(2,6).map(y=>new BN(y))).concat(x.slice(6)));

  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  // Deposit from each account
  for(let i = 0; i < inputs.length; i++) {
    const account = accounts[inputs[i][0]];
    const tokens = [
      await deployContract(accounts[0], 'TestERC20'),
      await deployContract(accounts[0], 'TestERC20'),
    ];
    const pool = await deployContract(accounts[0], 'ERC20LiquidityPool',
      group.options.address, tokens[0].options.address, tokens[1].options.address, '', '', 4);
    await tokens[0].sendFrom(account).mint(account, inputs[i][2]);
    await tokens[0].sendFrom(account).approve(pool.options.address, inputs[i][2]);
    await tokens[1].sendFrom(account).mint(account, inputs[i][3]);
    await tokens[1].sendFrom(account).approve(pool.options.address, inputs[i][3]);

    await pool.sendFrom(account).deposit(inputs[i][2], inputs[i][3]);

    await tokens[inputs[i][1]].sendFrom(account).mint(account, inputs[i][4]);
    await tokens[inputs[i][1]].sendFrom(account).approve(pool.options.address, inputs[i][4]);

    if(inputs[i][6] === throws) {
      assert.strictEqual(await throws(() =>
        pool.sendFrom(account).swap(inputs[i][1], inputs[i][4], inputs[i][5])), true);
    } else {
      await pool.sendFrom(account).swap(inputs[i][1], inputs[i][4], inputs[i][5]);
      const balances = [
        new BN(await tokens[inputs[i][1]].methods.balanceOf(account).call()),
        new BN(await tokens[inputs[i][1] === 0 ? 1 : 0].methods.balanceOf(account).call())
      ];
      assert.ok(balances[0].eq(new BN('0')), `index ${i}, from, ${balances[0]}`);
      assert.ok(balances[1].eq(inputs[i][5]), `index ${i}, to, ${balances[1]}`);
    }
  }
};

