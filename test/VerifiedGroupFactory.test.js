const assert = require('assert');

exports.invokeDeployNew = async function({
  web3, accounts, deployContract, loadContract, throws, BURN_ACCOUNT,
}) {
  const mockVerification = await deployContract(accounts[0], 'MockVerification');
  // Contract constructor requires verified user
  await mockVerification.sendFrom(accounts[0]).setStatus(accounts[0], 0);
  const rewriter = await deployContract(accounts[0], 'InvokeRewriter');
  const groupFactory = await deployContract(accounts[0], 'VerifiedGroupFactory',
    BURN_ACCOUNT, BURN_ACCOUNT, rewriter.options.address);
  const groupAddress = (await groupFactory.sendFrom(accounts[0]).deployNew(mockVerification.options.address, '')).events.NewChild.returnValues.deployed;
  const group = await loadContract('VerifiedGroup', groupAddress);

  const tokenFactory = await deployContract(accounts[0], 'ERC20MintableFactory',
    BURN_ACCOUNT, BURN_ACCOUNT, groupFactory.options.address);
  await group.sendFrom(accounts[0]).allowContract(tokenFactory.options.address);

  const MINT_AMOUNT = 10000;
  const TOKEN_COUNT = 9; // Maximum number of addressable newly-deployed contracts
  const txs = [];
  // Invoke 18 transactions, 9 token deploys and 9 mints
  for(let i = 0; i<TOKEN_COUNT; i++) {
    txs.push(tokenFactory.options.address +
      tokenFactory.methods.deployNew(group.options.address, '', '', 1).encodeABI().slice(2));
    txs.push('0x' + strRepeat(i+1, 40) + web3.eth.abi.encodeFunctionCall({
      name: 'mint', type: 'function',
      inputs: [{type: 'address', name: 'account'}, {type:'uint256', name:'amount'}]
    }, [accounts[0], MINT_AMOUNT * (i+1)]).slice(2));
  }
  await group.sendFrom(accounts[0]).invokeMany(txs);

  // Check that each token minted the correct amount
  for(let i = 0; i<TOKEN_COUNT; i++) {
    const tokenDetails = await groupFactory.methods.groupChildren(group.options.address, i).call();
    const token = await loadContract('IERC20', tokenDetails.item);
    const balance = await token.methods.balanceOf(accounts[0]).call();
    assert.equal(Number(balance), MINT_AMOUNT * (i+1));
  }
};

function strRepeat(char, len) {
  let out = '';
  while(out.length < len) {
    out += String(char);
  }
  return out;
}
