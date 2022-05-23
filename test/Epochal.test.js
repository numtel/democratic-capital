const assert = require('assert');

exports.addRemoveUpdateInvokeSuccess = async function({
  web3, accounts, deployContract,
}) {
  const testToken = await deployContract(accounts[0], 'TestERC20');
  const epochal = await deployContract(accounts[0], 'Epochal');

  const MINT_AMOUNT = 10;
  // Add first tx to end
  await epochal.sendFrom(accounts[0]).addEpochTx(0,
    testToken.options.address,
    web3.eth.abi.encodeFunctionCall({
      name: 'transfer', type: 'function', inputs: [
        {type: 'address', name: 'recipient'},
        {type: 'uint256', name: 'amount'}
      ]
    }, [accounts[0], MINT_AMOUNT]));
  // Add tx at beginning
  await epochal.sendFrom(accounts[0]).addEpochTx(0,
    testToken.options.address,
    web3.eth.abi.encodeFunctionCall({
      name: 'mint', type: 'function', inputs: [
        {type: 'address', name: 'account'},
        {type: 'uint256', name: 'amount'}
      ]
    }, [epochal.options.address, MINT_AMOUNT * 4]));
  // Update transfer tx
  await epochal.sendFrom(accounts[0]).updateEpochTx(1,
    testToken.options.address,
    web3.eth.abi.encodeFunctionCall({
      name: 'transfer', type: 'function', inputs: [
        {type: 'address', name: 'recipient'},
        {type: 'uint256', name: 'amount'}
      ]
    }, [accounts[0], MINT_AMOUNT * 2]));
  // Add 2 more tx in order to remove them
  // One at the end...
  await epochal.sendFrom(accounts[0]).addEpochTx(2,
    testToken.options.address,
    web3.eth.abi.encodeFunctionCall({
      name: 'transfer', type: 'function', inputs: [
        {type: 'address', name: 'recipient'},
        {type: 'uint256', name: 'amount'}
      ]
    }, [accounts[0], MINT_AMOUNT * 10]));
  // And one in the middle
  await epochal.sendFrom(accounts[0]).addEpochTx(1,
    testToken.options.address,
    web3.eth.abi.encodeFunctionCall({
      name: 'transfer', type: 'function', inputs: [
        {type: 'address', name: 'recipient'},
        {type: 'uint256', name: 'amount'}
      ]
    }, [accounts[0], MINT_AMOUNT * 10]));
  // Remove one in the middle
  await epochal.sendFrom(accounts[0]).removeEpochTx(1);
  // Remove the one from the end
  await epochal.sendFrom(accounts[0]).removeEpochTx(2);

  // Call all the epoch tx
  await epochal.sendFrom(accounts[0]).invoke();

  // Balances should match sequence
  assert.strictEqual(
    Number(await testToken.methods.balanceOf(accounts[0]).call()),
    MINT_AMOUNT * 2);
  assert.strictEqual(
    Number(await testToken.methods.balanceOf(epochal.options.address).call()),
    MINT_AMOUNT * 2);
};
