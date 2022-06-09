const assert = require('assert');

exports.mintAndBurnEqual = async function({
  web3, accounts, deployContract, increaseTime, throws,
}) {
  const BN = web3.utils.BN;
  const VALID_DIFF = new BN(3); // Small math discrepancy
  const INPUT_A = new BN(10000),
        INPUT_B = new BN(100000); // Ratio A/B:1/10
  const INPUT2_A = new BN(30000),
        INPUT2_B = new BN(200000);
  const INPUT3_A = new BN(40000),
        INPUT3_B = new BN(600000);
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    mockVerification.options.address, accounts[0], '');
  const tokenA = await deployContract(accounts[0], 'TestERC20');
  const tokenB = await deployContract(accounts[0], 'TestERC20');
  const pool = await deployContract(accounts[0], 'LiquidityPool',
    group.options.address, tokenA.options.address, tokenB.options.address, '');

  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  // Account 1 initializes the pool with their amounts
  await tokenA.sendFrom(accounts[1]).mint(accounts[1], INPUT_A);
  await tokenA.sendFrom(accounts[1]).approve(pool.options.address, INPUT_A);
  await tokenB.sendFrom(accounts[1]).mint(accounts[1], INPUT_B);
  await tokenB.sendFrom(accounts[1]).approve(pool.options.address, INPUT_B);

  await pool.sendFrom(accounts[1]).mint(INPUT_A, INPUT_B);
  const balance1 = new BN(await pool.methods.balanceOf(accounts[1]).call());

  // Account 2 deposits their amounts
  await tokenA.sendFrom(accounts[2]).mint(accounts[2], INPUT2_A);
  await tokenA.sendFrom(accounts[2]).approve(pool.options.address, INPUT2_A);
  await tokenB.sendFrom(accounts[2]).mint(accounts[2], INPUT2_B);
  await tokenB.sendFrom(accounts[2]).approve(pool.options.address, INPUT2_B);
  await pool.sendFrom(accounts[2]).mint(INPUT2_A, INPUT2_B);
  const balance2 = new BN(await pool.methods.balanceOf(accounts[2]).call());
  const balanceA2 = new BN(await tokenA.methods.balanceOf(accounts[2]).call());
  const balanceB2 = new BN(await tokenB.methods.balanceOf(accounts[2]).call());
  // Some is left over
  assert.ok(balanceA2.eq(new BN(10000)));
  assert.ok(balanceB2.eq(new BN(0)));

  // Account 3 deposits their amounts
  await tokenA.sendFrom(accounts[3]).mint(accounts[3], INPUT3_A);
  await tokenA.sendFrom(accounts[3]).approve(pool.options.address, INPUT3_A);
  await tokenB.sendFrom(accounts[3]).mint(accounts[3], INPUT3_B);
  await tokenB.sendFrom(accounts[3]).approve(pool.options.address, INPUT3_B);
  await pool.sendFrom(accounts[3]).mint(INPUT3_A, INPUT3_B);
  const balance3 = new BN(await pool.methods.balanceOf(accounts[3]).call());
  const balanceA3 = new BN(await tokenA.methods.balanceOf(accounts[3]).call());
  const balanceB3 = new BN(await tokenB.methods.balanceOf(accounts[3]).call());
  // Some is left over
  assert.ok(balanceA3.eq(new BN(0)));
  assert.ok(balanceB3.eq(new BN(200000)));

  // Account 1 retrieves what it deposited
  await pool.sendFrom(accounts[1]).burn(balance1);
  const balance1_2 = new BN(await pool.methods.balanceOf(accounts[1]).call());
  assert.ok(balance1_2.eq(new BN('0')), balance1_2);
  const balanceA1_2 = new BN(await tokenA.methods.balanceOf(accounts[1]).call())
  const balanceB1_2 = new BN(await tokenB.methods.balanceOf(accounts[1]).call())
  const balanceAB1_2Str = 'tokenA ' + balanceA1_2.toString(10) + ', tokenB ' + balanceB1_2.toString(10);
  assert.ok(INPUT_A.sub(balanceA1_2).abs().lte(VALID_DIFF), balanceAB1_2Str);
  assert.ok(INPUT_B.sub(balanceB1_2).abs().lte(VALID_DIFF), balanceAB1_2Str);

  // Account 2 retrieves what it deposited
  await pool.sendFrom(accounts[2]).burn(balance2);
  const balance2_2 = new BN(await pool.methods.balanceOf(accounts[2]).call());
  assert.ok(balance2_2.eq(new BN('0')), balance2_2);
  const balanceA2_2 = new BN(await tokenA.methods.balanceOf(accounts[2]).call())
  const balanceB2_2 = new BN(await tokenB.methods.balanceOf(accounts[2]).call())
  const balanceAB2_2Str = 'tokenA ' + balanceA2_2.toString(10) + ', tokenB ' + balanceB2_2.toString(10);
  assert.ok(INPUT2_A.sub(balanceA2_2).abs().lte(VALID_DIFF), balanceAB2_2Str);
  assert.ok(INPUT2_B.sub(balanceB2_2).abs().lte(VALID_DIFF), balanceAB2_2Str);

  // Account 3 retrieves what it deposited
  await pool.sendFrom(accounts[3]).burn(balance3);
  const balance3_2 = new BN(await pool.methods.balanceOf(accounts[3]).call());
  assert.ok(balance3_2.eq(new BN('0')), balance3_2);
  const balanceA3_2 = new BN(await tokenA.methods.balanceOf(accounts[3]).call())
  const balanceB3_2 = new BN(await tokenB.methods.balanceOf(accounts[3]).call())
  const balanceAB3_2Str = 'tokenA ' + balanceA3_2.toString(10) + ', tokenB ' + balanceB3_2.toString(10);
  assert.ok(INPUT3_A.sub(balanceA3_2).abs().lte(VALID_DIFF), balanceAB3_2Str);
  assert.ok(INPUT3_B.sub(balanceB3_2).abs().lte(VALID_DIFF), balanceAB3_2Str);
};

