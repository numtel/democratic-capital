const assert = require('assert');


exports.swapRouter = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const cases = [
    { mints: [10000, 10000],
      deposits: [
        [ 5000, 5000 ], // tokens 0,1 in pool 0
      ],
      in: 1000, out: 833 },
    { mints: [10000, 1000000],
      deposits: [
        [ 10000, 1000000 ], // tokens 0,1 in pool 0
      ],
      in: 1000, out: 90909 },
    { mints: [11000, 909091],
      deposits: [
        [ 11000, 909091 ], // tokens 0,1 in pool 0
      ],
      in: 1000, out: 75757 },
    { mints: [500000, 100000],
      deposits: [
        [ 500000, 100000 ], // tokens 0,1 in pool 0
      ],
      in: 500000, out: 50000 },
    { mints: [500000, 100000],
      deposits: [
        [ 500000, 100000 ], // tokens 0,1 in pool 0
      ],
      in: 0, out: 0, error: throws },
    { mints: [10000, 10000, 10000],
      deposits: [
        [ 5000, 5000 ], // tokens 0,1 in pool 0
        [ 5000, 5000 ], // tokens 1,2 in pool 1
      ],
      in: 1000, out: 714 },
    { mints: [10000, 10000, 10000],
      deposits: [
        [ 5000, 5000 ], // tokens 0,1 in pool 0
        [ 5000, 5000 ], // tokens 1,2 in pool 1
      ],
      in: 1000, out: 715, // minReceived not met error!
      error: throws },
    { mints: [100000, 100000, 100000, 100000],
      deposits: [
        [ 100000, 20000 ], // tokens 0,1 in pool 0
        [ 80000, 50000 ], // tokens 1,2 in pool 1
        [ 50000, 100000 ], // tokens 2,3 in pool 2
      ],
      in: 1000, out: 245 },
    { mints: [100000, 100000, 100000, 100000],
      deposits: [
        [ 50000, 50000 ], // tokens 0,1 in pool 0
        [ 50000, 50000 ], // tokens 1,2 in pool 1
        [ 50000, 50000 ], // tokens 2,3 in pool 2
      ],
      in: 1000, out: 942 },
  ];
  const BN = web3.utils.BN;
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // VerifiedGroup constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const group = await deployContract(accounts[0], 'VerifiedGroup',
    BURN_ACCOUNT, mockVerification.options.address, accounts[0], '');
  // accounts[0] is adminstrator of group
  await group.sendFrom(accounts[0]).allowContract(accounts[0]);

  for(let params of cases) {
    const factory = await deployContract(accounts[0], 'ERC20LiquidityPoolFactory', BURN_ACCOUNT, BURN_ACCOUNT);

    const tokens = [];
    for(let i = 0; i < params.mints.length; i++) {
      tokens.push(await deployContract(accounts[0], 'TestERC20'));
    };

    const pools = [];
    for(let i = 0; i < tokens.length - 1; i++) {
      const poolAddress = (await factory.sendFrom(accounts[0]).deployNew(
        group.options.address,
        tokens[i].options.address,
        tokens[i + 1].options.address,
        0, '', '', 4)).events.NewDeployment.returnValues.deployed;
      pools.push(await loadContract('ERC20LiquidityPool', poolAddress));
    }

    // Mint tokens
    for(let i = 0; i < tokens.length; i++) {
      await tokens[i].sendFrom(accounts[0]).mint(accounts[0], params.mints[i]);
    }

    // Deposit into pools
    for(let i = 0; i < tokens.length - 1; i++) {
      await tokens[i].sendFrom(accounts[0]).approve(pools[i].options.address, params.deposits[i][0]);
      await tokens[i+1].sendFrom(accounts[0]).approve(pools[i].options.address, params.deposits[i][1]);
      const poolToken0 = await pools[i].methods.tokens(0).call();
      const isFlipped = poolToken0 !== tokens[i].options.address;
      await pools[i].sendFrom(accounts[0]).deposit(params.deposits[i][isFlipped ? 1 : 0], params.deposits[i][isFlipped ? 0 : 1]);
    }

    // Prepare to swap
    await tokens[0].sendFrom(accounts[1]).mint(accounts[1], params.in);
    await tokens[0].sendFrom(accounts[1]).approve(factory.options.address, params.in);

    if(params.error === throws) {
      assert.strictEqual(await throws(() =>
        factory.sendFrom(accounts[1]).swapRouter(
          group.options.address,
          tokens.map(token => token.options.address),
          params.in,
          params.out)
        ), true);
    } else {
      await factory.sendFrom(accounts[1]).swapRouter(
        group.options.address,
        tokens.map(token => token.options.address),
        params.in,
        params.out);

      const out = new BN(await tokens[tokens.length - 1].methods.balanceOf(accounts[1]).call());
      assert.ok(out.eq(new BN(params.out)), `${out.toString(10)} != ${params.out}`);
    }
  }
}
