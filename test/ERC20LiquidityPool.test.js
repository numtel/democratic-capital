const assert = require('assert');

exports.depositAndWithdrawEqual = async function({
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

exports.depositDevaluedAfterMint = async function({
  web3, accounts, deployContract, throws,
}) {
  const BN = web3.utils.BN;
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

  const AMOUNT_A = new BN(100000), AMOUNT_B = new BN(50000);

  await tokenA.sendFrom(accounts[0]).mint(accounts[0], AMOUNT_A);
  await tokenA.sendFrom(accounts[0]).approve(pool.options.address, AMOUNT_A);
  await tokenB.sendFrom(accounts[0]).mint(accounts[0], AMOUNT_B);
  await tokenB.sendFrom(accounts[0]).approve(pool.options.address, AMOUNT_B);

  await pool.sendFrom(accounts[0]).deposit(AMOUNT_A, AMOUNT_B);
  const liquidity = new BN(await pool.methods.balanceOf(accounts[0]).call());

  // Dilute liquidity by minting an equal amount to another user
  await pool.sendFrom(accounts[0]).mint(accounts[1], liquidity);

  await pool.sendFrom(accounts[0]).withdraw(liquidity);
  const balanceA = new BN(await tokenA.methods.balanceOf(accounts[0]).call())
  const balanceB = new BN(await tokenB.methods.balanceOf(accounts[0]).call())

  // TOken amounts withdrawn should be have of input
  assert.ok(AMOUNT_A.sub(balanceA).eq(balanceA));
  assert.ok(AMOUNT_B.sub(balanceB).eq(balanceB));

};
